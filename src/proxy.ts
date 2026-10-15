import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from "jwt-decode";
import { getServerGraphqlUrl, stripBasePath, withBasePath } from '@/lib/runtime-config';
import {
  canOpenPage,
  isNextAsset,
  isPublicFile,
  LEGACY_SITE_STATUS_QUERY,
  needsLegacyStatusQuery,
  readSiteStatus,
  secondsLeft,
  SITE_STATUS_QUERY,
  statusRedirect,
  type SiteStatus,
} from '@/lib/proxy-rules';
import { contentSecurityPolicy, createNonce, isWorkerScript } from '@/lib/content-security-policy';

interface CustomJwtPayload {
  exp: number;
  role?: string;
  [key: string]: any;
}

const publicPaths = new Set(['/', '/auth/2fa', '/auth/forgot-password', '/auth/reset-password', '/auth/new-account', '/system/notconnected', '/system/unauthorized', '/system/maintenance', '/system/suspended']);

async function askSiteStatus(query: string) {
  const response = await fetch(getServerGraphqlUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  return response.json();
}

// State of the installation, or null when the API cannot be reached.
async function siteStatus(): Promise<SiteStatus | null> {
  try {
    const answer = await askSiteStatus(SITE_STATUS_QUERY);
    // An API older than the suspension rejects the whole question: ask the
    // older one, the installation is then never suspended.
    if (needsLegacyStatusQuery(answer)) {
      return { ...readSiteStatus(await askSiteStatus(LEGACY_SITE_STATUS_QUERY)), suspended: false };
    }
    return readSiteStatus(answer);
  } catch (error) {
    console.error('Erreur maintenance:', error);
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const pathname = stripBasePath(req.nextUrl.pathname);
  if (isNextAsset(pathname)) return NextResponse.next();

  // Next.js reads the nonce from the policy on the request and puts it on
  // the scripts it writes; the layout reads x-nonce for the theme script.
  const nonce = createNonce();
  const policy = isWorkerScript(pathname) ? null : contentSecurityPolicy({ nonce, host: req.headers.get('host') });
  const headers = new Headers(req.headers);
  headers.set('x-nonce', nonce);
  if (policy) headers.set('Content-Security-Policy', policy);

  // Files of public/ are the same for everyone: no session, no maintenance check.
  const response = isPublicFile(pathname) ? NextResponse.next({ request: { headers } }) : await route(req, pathname, headers);
  if (policy) response.headers.set('Content-Security-Policy', policy);
  return response;
}

// The session cookie belongs to the API, which sets it at sign-in for the life
// of the token and clears it at sign-out. The proxy only reads it: a cookie
// written here could reach the browser after a sign-out (answers to link
// prefetches still on their way) and open the session again.
async function route(req: NextRequest, pathname: string, headers: Headers) {
  const status = await siteStatus();
  if (!status) {
    return NextResponse.rewrite(new URL(withBasePath('/system/sitedown'), req.url), { request: { headers } });
  }
  // Suspension first, then maintenance.
  const statusPage = statusRedirect(status, pathname);
  if (statusPage) {
    return NextResponse.redirect(new URL(withBasePath(statusPage), req.url));
  }

  const isPublicPath = publicPaths.has(pathname);
  if (isPublicPath) {
    return NextResponse.next({ request: { headers } });
  }

  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL(withBasePath('/system/notconnected'), req.url));
  }

  try {
    const decodedToken = jwtDecode<CustomJwtPayload>(token);

    // A token without expiry counts as expired.
    if (secondsLeft(decodedToken.exp) <= 0) {
      return NextResponse.redirect(new URL(withBasePath('/system/notconnected'), req.url));
    }

    // Comfort only: the API decides what each role may read and change.
    if (!canOpenPage(decodedToken.role, pathname)) {
      return NextResponse.redirect(new URL(withBasePath('/system/unauthorized'), req.url));
    }

  } catch {
    return NextResponse.redirect(new URL(withBasePath('/system/notconnected'), req.url));
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/:path*'],
};
