import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('token');
  const publicPaths = ['/', '/auth/2fa', '/auth/forgot-password', '/auth/reset-password', '/auth/new-account', '/system/notconnected', '/system/unauthorized'];
  const isStaticFile = req.nextUrl.pathname.startsWith('/_next') || req.nextUrl.pathname.includes('/static');
  const isPublicPath = publicPaths.includes(req.nextUrl.pathname);

  if (isStaticFile || isPublicPath) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/system/notconnected', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
