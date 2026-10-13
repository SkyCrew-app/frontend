#!/bin/sh
# Checks a built image of the web application: what it must hold, then that
# it starts and answers with the security headers.
#
#   .github/scripts/image-smoke.sh <image>
#
# The image is started alone, without the API: the page then served is the
# "site unavailable" one, which is enough to see the server at work.
set -eu

IMAGE=${1:?image to check}

fail() { echo "FAILED: $*" >&2; exit 1; }
inside() { docker run --rm --entrypoint sh "$IMAGE" -c "$1"; }

echo "== Content of $IMAGE"
inside 'test -f server.js' || fail "server.js is missing (the entry point of the image)"
inside 'ls .next/static/chunks/*.js >/dev/null 2>&1' || fail "the scripts of the pages are missing (.next/static)"
inside 'test -f public/manifest.json' || fail "the public files are missing"
inside 'test -s public/sw.js' || fail "the offline worker is missing (public/sw.js)"
[ "$(inside 'id -u')" != 0 ] || fail "the image runs as root"
echo "entry point, page scripts, public files and offline worker are there"

echo "== Start-up of $IMAGE"
NAME=skycrew-smoke-web-$$
cleanup() {
  status=$?
  trap - EXIT
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

docker run -d --name "$NAME" "$IMAGE" >/dev/null

# The same address as the health check of the image.
PAGE=http://127.0.0.1:3000/system/notconnected
i=0
while :; do
  state=$(docker inspect -f '{{.State.Status}}' "$NAME")
  if [ "$state" = running ] && docker exec "$NAME" wget -q -O /dev/null "$PAGE" 2>/dev/null; then
    break
  fi
  i=$((i + 1))
  if [ "$state" != running ] || [ $i -ge 30 ]; then
    docker logs --tail 60 "$NAME" >&2 || true
    fail "the web application did not answer (container: $state)"
  fi
  sleep 2
done

headers=$(docker exec "$NAME" wget -S -q -O /dev/null "$PAGE" 2>&1 | tr 'A-Z' 'a-z')
policy=$(printf '%s\n' "$headers" | grep '^ *content-security-policy:' || true)
scripts=$(printf '%s\n' "$policy" | sed -n "s/.*script-src \([^;]*\).*/\1/p")

[ -n "$policy" ] || fail "no Content-Security-Policy header on the pages"
if printf '%s\n' "$headers" | grep -q 'content-security-policy-report-only'; then
  fail "the Content-Security-Policy is only reported, not enforced"
fi
case $scripts in
  *"'nonce-"*) ;;
  *) fail "scripts are not tied to a nonce: script-src $scripts" ;;
esac
case $scripts in
  *unsafe-inline* | *unsafe-eval*) fail "scripts may run inline or be evaluated: script-src $scripts" ;;
esac
printf '%s\n' "$headers" | grep -q 'x-frame-options: deny' || fail "the X-Frame-Options header is missing"
echo "the pages answer, with an enforced Content-Security-Policy tied to a nonce"

# Public files are served to everyone, session or not: a redirection to the
# "not connected" page would answer with a page instead of the file.
fetch() { docker exec "$NAME" wget -q -O - "http://127.0.0.1:3000$1" 2>/dev/null; }
fetch /manifest.json | grep -q '"short_name"' || fail "/manifest.json is not served without a session"
fetch /sw.js | head -c 2000 | grep -q . || fail "/sw.js is not served without a session"
fetch /sw.js | head -c 200 | grep -qi '<!doctype' && fail "/sw.js is answered by a page, not by the offline worker"
[ "$(fetch /images/icon-192.png | head -c 4 | tail -c 3)" = PNG ] || fail "/images/icon-192.png is not served without a session"
echo "the public files (manifest, offline worker, icons) are served without a session"
