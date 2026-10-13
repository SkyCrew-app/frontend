#!/bin/sh
# A throwaway stack for the browser journeys, apart from the development one:
# its own PostgreSQL, Redis and mail sink (Docker), the API built from a
# checkout of the backend with the demo data, and this frontend as a
# production build. The continuous integration runs the same script.
#
#   e2e/support/stack.sh up      start everything (a few minutes the first time)
#   e2e/support/stack.sh env     print the variables the suite needs: eval "$(e2e/support/stack.sh env)"
#   e2e/support/stack.sh logs    end of the logs of the API and of the frontend
#   e2e/support/stack.sh down    stop and remove everything
#
# Settings, through the environment:
#   BACKEND_DIR      checkout of the backend, dependencies installed   (default ../backend)
#   E2E_WEB_PORT     frontend       (default 5273)
#   E2E_API_PORT     API            (default 3100)
#   E2E_DB_PORT      PostgreSQL     (default 5442)
#   E2E_REDIS_PORT   Redis          (default 6390)
#   E2E_SMTP_PORT    mail sink      (default 1035; its inbox is on E2E_MAIL_PORT, default 8035)
#   E2E_SKIP_BUILD   1 to start what is already built
set -eu

FRONTEND_DIR=$(cd "$(dirname "$0")/../.." && pwd)
BACKEND_DIR=${BACKEND_DIR:-$FRONTEND_DIR/../backend}
WEB_PORT=${E2E_WEB_PORT:-5273}
API_PORT=${E2E_API_PORT:-3100}
DB_PORT=${E2E_DB_PORT:-5442}
REDIS_PORT=${E2E_REDIS_PORT:-6390}
SMTP_PORT=${E2E_SMTP_PORT:-1035}
MAIL_UI_PORT=${E2E_MAIL_PORT:-8035}

DB_CONTAINER=skycrew-e2e-db
REDIS_CONTAINER=skycrew-e2e-redis
MAIL_CONTAINER=skycrew-e2e-mail
STATE=$FRONTEND_DIR/e2e/.stack

say() { printf '\n== %s\n' "$*"; }
fail() { printf '\nFAILED: %s\n' "$*" >&2; exit 1; }

# Runs a step with its output in a file; a failure shows the end of it.
step() { # <log name> <command...>
  log=$STATE/$1.log; shift
  if ! "$@" >"$log" 2>&1; then
    tail -n 60 "$log" >&2
    fail "\"$*\" did not complete (whole output: $log)"
  fi
}

wait_for() { # <what> <url> <log name> <seconds>
  i=0
  until curl -fsS -o /dev/null "$2" 2>/dev/null; do
    i=$((i + 2))
    if [ $i -ge "$4" ] || ! kill -0 "$(cat "$STATE/$3.pid")" 2>/dev/null; then
      tail -n 60 "$STATE/$3.log" >&2
      fail "$1 did not answer on $2"
    fi
    sleep 2
  done
}

stop_process() { # <name>
  [ -f "$STATE/$1.pid" ] || return 0
  pid=$(cat "$STATE/$1.pid")
  kill "$pid" 2>/dev/null || true
  rm -f "$STATE/$1.pid"
}

down() {
  stop_process frontend
  stop_process backend
  docker rm -f "$DB_CONTAINER" "$REDIS_CONTAINER" "$MAIL_CONTAINER" >/dev/null 2>&1 || true
}

print_env() {
  cat <<EOF
export E2E_BASE_URL=http://localhost:$WEB_PORT
export E2E_DB_CONTAINER=$DB_CONTAINER
export E2E_DOCKER=$(command -v docker)
EOF
}

up() {
  [ -f "$BACKEND_DIR/package.json" ] || fail "no backend at $BACKEND_DIR (set BACKEND_DIR)"
  [ -d "$BACKEND_DIR/node_modules" ] || fail "the dependencies of the backend are not installed in $BACKEND_DIR"
  [ -d "$FRONTEND_DIR/node_modules" ] || fail "the dependencies of the frontend are not installed"
  command -v docker >/dev/null || fail "docker is needed for the database"
  mkdir -p "$STATE"
  down

  say "Database, cache and mail sink"
  docker run -d --name "$DB_CONTAINER" -p "127.0.0.1:$DB_PORT:5432" \
    -e POSTGRES_USER=skycrew -e POSTGRES_PASSWORD=e2e -e POSTGRES_DB=skycrew postgres:16-alpine >/dev/null
  docker run -d --name "$REDIS_CONTAINER" -p "127.0.0.1:$REDIS_PORT:6379" redis:7-alpine >/dev/null
  docker run -d --name "$MAIL_CONTAINER" -p "127.0.0.1:$SMTP_PORT:1025" -p "127.0.0.1:$MAIL_UI_PORT:8025" \
    mailhog/mailhog >/dev/null
  i=0
  until docker exec "$DB_CONTAINER" pg_isready -q -U skycrew -d skycrew; do
    i=$((i + 1)); [ $i -lt 30 ] || fail "the database did not start"
    sleep 2
  done

  # What the API reads. Everything it needs is set here, so that a .env file
  # of the checkout cannot send it to another database.
  export NODE_ENV=development PORT="$API_PORT" GRAPHQL_ENDPOINT=/graphql
  export BASE_URL="http://localhost:$API_PORT" FRONTEND_URL="http://localhost:$WEB_PORT"
  export ALLOWED_ORIGINS="http://localhost:$WEB_PORT"
  export DATABASE_URL="postgresql://skycrew:e2e@localhost:$DB_PORT/skycrew"
  export DB_HOST=localhost DB_PORT="$DB_PORT" DB_NAME=skycrew DB_USER=skycrew DB_PASSWORD=e2e
  # The schema comes from the migrations, as on a server.
  export DB_SYNCHRONIZE=false
  export REDIS_HOST=localhost REDIS_PORT="$REDIS_PORT"
  export MAIL_HOST=localhost MAIL_PORT="$SMTP_PORT" MAIL_AUTH=false MAIL_SECURE=false
  export MAIL_USER=null MAIL_PASSWORD=null MAIL_FROM=no-reply@skycrew.test
  export JWT_SECRET=e2e-secret-not-for-production-0123456789 JWT_EXPIRES_IN=2h
  export ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=E2e-admin-1234
  # Writes are enabled: the journeys create, change and delete.
  export DEMO_MODE=false SEED_ON_START=false ENABLE_SWAGGER=false
  # No third party is reached during the journeys.
  export STRIPE_SECRET_KEY="" STRIPE_WEBHOOK_SECRET="" PAYPAL_CLIENT_ID="" PAYPAL_CLIENT_SECRET=""
  export OPENWEATHERMAP_API_KEY="" OPENAIP_API_KEY="" API_NINJAS_KEY="" SENTRY_SECRET_KEY=""

  say "API: build, demo data, start"
  cd "$BACKEND_DIR"
  [ "${E2E_SKIP_BUILD:-}" = 1 ] || step backend-build npm run build
  step backend-seed node dist/src/db/run-seeders.js --demo --fresh
  nohup node dist/src/main.js >"$STATE/backend.log" 2>&1 </dev/null &
  echo $! >"$STATE/backend.pid"
  wait_for "the API" "http://localhost:$API_PORT/health/ready" backend 120

  say "Frontend: production build, start"
  cd "$FRONTEND_DIR"
  if [ "${E2E_SKIP_BUILD:-}" != 1 ]; then
    # Addresses read by the browser are fixed when the frontend is built. The
    # airport picker only asks when a key is set; the suite answers in its place.
    step frontend-build env NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
      NEXT_PUBLIC_API_URL="http://localhost:$API_PORT/graphql" NEXT_PUBLIC_GRAPHQL_URL="" NEXT_PUBLIC_BACKEND_URL="" \
      NEXT_PUBLIC_BASE_PATH="" NEXT_PUBLIC_DEMO_MODE=false \
      NEXT_PUBLIC_OPENAIP_API_KEY="${NEXT_PUBLIC_OPENAIP_API_KEY:-e2e-placeholder}" \
      npm run build
    # The self-contained server, put together as the container image does.
    rm -rf .next/standalone/.next/static .next/standalone/public
    cp -R .next/static .next/standalone/.next/static
    cp -R public .next/standalone/public
  fi
  [ -f .next/standalone/server.js ] || fail "no production build in .next/standalone"
  # HOSTNAME is set by the shell to the name of the machine: the server would listen there only.
  cd .next/standalone
  PORT="$WEB_PORT" HOSTNAME=127.0.0.1 NODE_ENV=production \
    nohup node server.js >"$STATE/frontend.log" 2>&1 </dev/null &
  echo $! >"$STATE/frontend.pid"
  cd "$FRONTEND_DIR"
  wait_for "the frontend" "http://127.0.0.1:$WEB_PORT/system/notconnected" frontend 60

  say "The stack is up"
  echo "frontend http://localhost:$WEB_PORT, API http://localhost:$API_PORT, mail inbox http://localhost:$MAIL_UI_PORT"
  echo "To run the journeys against it:"
  print_env
  echo "npm run e2e"
}

case ${1:-} in
  up) up ;;
  down) down; echo "stopped" ;;
  env) print_env ;;
  logs)
    for name in backend frontend; do
      printf '\n== %s\n' "$name"; tail -n "${2:-80}" "$STATE/$name.log" 2>/dev/null || echo "(no log)"
    done ;;
  *) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 64 ;;
esac
