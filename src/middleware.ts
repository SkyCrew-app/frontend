import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from "jwt-decode";

interface CustomJwtPayload {
  exp: number;
  role?: string;
  [key: string]: any;
}

const publicPaths = new Set(['/', '/auth/2fa', '/auth/forgot-password', '/auth/reset-password', '/auth/new-account', '/system/notconnected', '/system/unauthorized']);

const roleBasedRoutes = {
  '/admin': ['user'],
  '/user-management': ['user', 'user']
};

export function middleware(req: NextRequest) {
  const token = req.cookies.get('token');
  const isStaticFile = req.nextUrl.pathname.startsWith('/_next') || req.nextUrl.pathname.includes('/static');
  const isPublicPath = publicPaths.has(req.nextUrl.pathname);

  if (isStaticFile || isPublicPath) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/system/notconnected', req.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const decodedToken = jwtDecode<CustomJwtPayload>(token.value);
    if (decodedToken.exp * 1000 < Date.now()) {
      const loginUrl = new URL('/system/notconnected', req.url);
      return NextResponse.redirect(loginUrl);
    }

    const userRole = decodedToken.role;

    if (userRole) {
      for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
        if (req.nextUrl.pathname.startsWith(route) && !allowedRoles.includes(userRole)) {
          const unauthorizedUrl = new URL('/system/unauthorized', req.url);
          return NextResponse.redirect(unauthorizedUrl);
        }
      }
    }
  } catch (error) {
    const loginUrl = new URL('/system/notconnected', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
