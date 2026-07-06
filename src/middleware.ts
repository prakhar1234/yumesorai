/**
 * Middleware for protecting /ops/maestro/* routes
 * Ensures only authenticated users can access management pages
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-jwt';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/ops/maestro/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply middleware to /ops/maestro/* routes
  if (!pathname.startsWith('/ops/maestro')) {
    return NextResponse.next();
  }

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get('maestro_token')?.value;

  if (!token) {
    // Redirect to login if no token
    const loginUrl = new URL('/ops/maestro/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  try {
    const payload = await verifyJWT(token);

    if (!payload) {
      // Token verification failed, redirect to login
      const loginUrl = new URL('/ops/maestro/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Token is valid, add user info to headers for use in server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId || '');
    requestHeaders.set('x-username', payload.username || '');
    requestHeaders.set('x-user-email', payload.email || '');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('[Middleware] JWT verification error:', error);

    // On error, redirect to login
    const loginUrl = new URL('/ops/maestro/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/ops/maestro/:path*'],
};
