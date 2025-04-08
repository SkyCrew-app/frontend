import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from "jwt-decode";

interface CustomJwtPayload {
  exp: number;
  role?: string;
  [key: string]: any;
}

const publicPaths = new Set(['/', '/auth/2fa', '/auth/forgot-password', '/auth/reset-password', '/auth/new-account', '/system/notconnected', '/system/unauthorized', '/system/maintenance']);

const roleBasedRoutes = {
  '/admin': ['Administrateur'],
  '/user-management': ['user', 'user']
};

async function isInMaintenanceMode(req: NextRequest) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/graphql`, {
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
    return NextResponse.redirect(new URL('/system/sitedown', req.url))
  }
}

export async function middleware(req: NextRequest) {
  const response = NextResponse.next();
  const isStaticFile = req.nextUrl.pathname.startsWith('/_next') || req.nextUrl.pathname.includes('/static');

  if (isStaticFile) return response;

  const maintenance = await isInMaintenanceMode(req);
  if (maintenance.status === 307) {
    return NextResponse.rewrite(new URL('/system/sitedown', req.url));
  }
  if (maintenance && !req.nextUrl.pathname.startsWith('/system/maintenance')) {
    response.cookies.delete('token');
    return NextResponse.redirect(new URL('/system/maintenance', req.url));
  }

  const isPublicPath = publicPaths.has(req.nextUrl.pathname);
  if (isPublicPath) {
    return NextResponse.next();
  }

  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/system/notconnected', req.url));
  }

  try {
    const decodedToken = jwtDecode<CustomJwtPayload>(token);

    if ((decodedToken.exp * 1000) < Date.now()) {
      response.cookies.delete('token');
      return NextResponse.redirect(new URL('/system/notconnected', req.url));
    }

    const userRole = decodedToken.role;
    if (userRole) {
      for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
        if (req.nextUrl.pathname.startsWith(route) && !allowedRoles.includes(userRole)) {
          return NextResponse.redirect(new URL('/system/unauthorized', req.url));
        }
      }
    }

    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 3600
    });

  } catch (error) {
    response.cookies.delete('token');
    return NextResponse.redirect(new URL('/system/notconnected', req.url));
  }

  return response;
}

export const config = {
  matcher: ['/:path*'],
};
