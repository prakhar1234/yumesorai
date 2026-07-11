/**
 * Middleware for protecting /ops/maestro/* routes
 * Ensures only authenticated users can access management pages
 */

import { NextRequest, NextResponse } from 'next/server';

// Note: We cannot use verifyJWT directly in middleware due to Edge Runtime constraints
// Instead, we verify the token exists and let the API routes do full verification

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/ops/maestro/login'];

export function middleware(request: NextRequest) {
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

  // Token exists, allow the request through
  // The API routes and server components will perform full JWT verification
  // This middleware just ensures the token cookie is present for protected routes
  return NextResponse.next();
}

export const config = {
  matcher: ['/ops/maestro/:path*'],
};
