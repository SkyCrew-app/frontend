import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from "jwt-decode";
import { getServerGraphqlUrl, stripBasePath, withBasePath } from '@/lib/runtime-config';
import { canOpenPage, isNextAsset, isPublicFile, secondsLeft } from '@/lib/proxy-rules';
import { contentSecurityPolicy, createNonce, isWorkerScript } from '@/lib/content-security-policy';

interface CustomJwtPayload {
  exp: number;
  role?: string;
  [key: string]: any;
}

const publicPaths = new Set(['/', '/auth/2fa', '/auth/forgot-password', '/auth/reset-password', '/auth/new-account', '/system/notconnected', '/system/unauthorized', '/system/maintenance']);

async function isInMaintenanceMode(req: NextRequest) {
  try {
    const response = await fetch(getServerGraphqlUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query GetSiteStatus {
            getSiteStatus
          }
        `
      }),
    });

    const result = await response.json();
    return result.data?.getSiteStatus ?? false;
  } catch (error) {
    console.error('Erreur maintenance:', error);
    return NextResponse.redirect(new URL(withBasePath('/system/sitedown'), req.url))
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
  const maintenance = await isInMaintenanceMode(req);
  if (maintenance.status === 307) {
    return NextResponse.rewrite(new URL(withBasePath('/system/sitedown'), req.url), { request: { headers } });
  }
  if (maintenance && !pathname.startsWith('/system/maintenance')) {
    return NextResponse.redirect(new URL(withBasePath('/system/maintenance'), req.url));
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
