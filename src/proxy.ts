import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from "jwt-decode";
import { getServerGraphqlUrl, stripBasePath, withBasePath } from '@/lib/runtime-config';
import { canOpenPage, isNextAsset, sessionCookieMaxAge } from '@/lib/proxy-rules';

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
  const response = NextResponse.next();
  const pathname = stripBasePath(req.nextUrl.pathname);
  if (isNextAsset(pathname)) return response;

  const maintenance = await isInMaintenanceMode(req);
  if (maintenance.status === 307) {
    return NextResponse.rewrite(new URL(withBasePath('/system/sitedown'), req.url));
  }
  if (maintenance && !pathname.startsWith('/system/maintenance')) {
    response.cookies.delete('token');
    return NextResponse.redirect(new URL(withBasePath('/system/maintenance'), req.url));
  }

  const isPublicPath = publicPaths.has(pathname);
  if (isPublicPath) {
    return NextResponse.next();
  }

  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL(withBasePath('/system/notconnected'), req.url));
  }

  try {
    const decodedToken = jwtDecode<CustomJwtPayload>(token);

    // What is left of the token: a token without expiry counts as expired.
    const maxAge = sessionCookieMaxAge(decodedToken.exp);

    if (maxAge <= 0) {
      response.cookies.delete('token');
      return NextResponse.redirect(new URL(withBasePath('/system/notconnected'), req.url));
    }

    // Comfort only: the API decides what each role may read and change.
    if (!canOpenPage(decodedToken.role, pathname)) {
      return NextResponse.redirect(new URL(withBasePath('/system/unauthorized'), req.url));
    }

    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge,
    });

  } catch {
    response.cookies.delete('token');
    return NextResponse.redirect(new URL(withBasePath('/system/notconnected'), req.url));
  }

  return response;
}

export const config = {
  matcher: ['/:path*'],
};
