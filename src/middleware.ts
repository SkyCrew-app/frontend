import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {jwtDecode} from 'jwt-decode';

interface CustomJwtPayload {
  exp: number;
  role?: string;
  [key: string]: any;
}

const publicPaths = new Set([
  '/',
  '/auth/2fa',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/new-account',
  '/system/notconnected',
  '/system/unauthorized',
  '/system/maintenance',
]);

const roleBasedRoutes: Record<string, string[]> = {
  '/admin': ['Administrateur'],
  '/user-management': ['user', 'user'],
};

async function isInMaintenanceMode(req: NextRequest): Promise<boolean> {
  try {
    console.log('[middleware] 🔍 Checking maintenance status…');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: `query { getSiteStatus }` }),
    });
    const json = await res.json();
    const status = json.data?.getSiteStatus ?? false;
    console.log('[middleware] 🔔 getSiteStatus =', status);
    return status;
  } catch (err) {
    console.error('[middleware] ❌ Error fetching maintenance status:', err);
    return process.env.NODE_ENV === 'production';
  }
}

export async function middleware(req: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = req.nextUrl;

  // 1️⃣ Ignorer les statics
  if (pathname.startsWith('/_next') || pathname.includes('/static')) {
    return response;
  }

  // 2️⃣ Autoriser la page maintenance pour éviter la boucle
  // if (pathname === '/system/maintenance') {
  //   return response;
  // }

  // // 3️⃣ Vérifier la maintenance
  // const inMaintenance = await isInMaintenanceMode(req);
  // if (inMaintenance) {
  //   response.cookies.delete('token');
  //   return NextResponse.redirect(new URL('/system/maintenance', req.url));
  // }

  // 4️⃣ Routes publiques
  if (publicPaths.has(pathname)) {
    return response;
  }

  // 5️⃣ Authentification & rôle
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/system/notconnected', req.url));
  }

  try {
    // UTILISATION CORRECTE de jwtDecode
    const decoded = jwtDecode<CustomJwtPayload>(token);
    const { exp, role } = decoded;

    // expiration du token
    if (exp * 1000 < Date.now()) {
      response.cookies.delete('token');
      return NextResponse.redirect(new URL('/system/notconnected', req.url));
    }

    // contrôle des rôles
    if (role) {
      for (const [route, allowed] of Object.entries(roleBasedRoutes)) {
        if (pathname.startsWith(route) && !allowed.includes(role)) {
          return NextResponse.redirect(new URL('/system/unauthorized', req.url));
        }
      }
    }

    // renouvellement du cookie
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 3600,
    });
  } catch (err) {
    response.cookies.delete('token');
    return NextResponse.redirect(new URL('/system/notconnected', req.url));
  }

  return response;
}

export const config = {
  matcher: ['/:path*'],
};
