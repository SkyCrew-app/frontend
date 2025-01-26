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

async function isInMaintenanceMode() {
  try {
    const response = await fetch('http://localhost:3000/graphql', {
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

    if (result.data && typeof result.data.getSiteStatus === 'boolean') {
      return result.data.getSiteStatus;
    } else {
      console.error('Unexpected response structure:', result);
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du mode maintenance:', error);
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const isStaticFile = req.nextUrl.pathname.startsWith('/_next') || req.nextUrl.pathname.includes('/static');
  if (isStaticFile) {
    return NextResponse.next();
  }

  const maintenance = await isInMaintenanceMode();
  if (maintenance && req.nextUrl.pathname !== '/system/maintenance') {
    const maintenanceUrl = new URL('/system/maintenance', req.url);
    return NextResponse.redirect(maintenanceUrl);
  }

  if (maintenance && req.nextUrl.pathname === '/system/maintenance') {
    return NextResponse.next();
  }

  const isPublicPath = publicPaths.has(req.nextUrl.pathname);
  if (isPublicPath) {
    return NextResponse.next();
  }

  const token = req.cookies.get('token');
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

