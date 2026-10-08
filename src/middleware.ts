import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from "jwt-decode";
import { getGraphqlUrl, stripBasePath, withBasePath } from '@/lib/runtime-config';

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
    const response = await fetch(getGraphqlUrl(), {
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

export async function middleware(req: NextRequest) {
  const response = NextResponse.next();
  const pathname = stripBasePath(req.nextUrl.pathname);
  const isStaticFile = pathname.startsWith('/_next') || pathname.includes('/static');

  if (isStaticFile) return response;

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

    if ((decodedToken.exp * 1000) < Date.now()) {
      response.cookies.delete('token');
      return NextResponse.redirect(new URL(withBasePath('/system/notconnected'), req.url));
    }

    const userRole = decodedToken.role;
    if (userRole) {
      for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
        if (pathname.startsWith(route) && !allowedRoles.includes(userRole)) {
          return NextResponse.redirect(new URL(withBasePath('/system/unauthorized'), req.url));
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
    return NextResponse.redirect(new URL(withBasePath('/system/notconnected'), req.url));
  }

  return response;
}

export const config = {
  matcher: ['/:path*'],
};
