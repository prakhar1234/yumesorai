/**
 * POST /api/ops/maestro/auth/login
 * Login endpoint - validates credentials and returns JWT
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, updateUserLastLogin } from '@/lib/db';
import {
  signJWT,
  setAuthCookie,
  createUserPayload,
} from '@/lib/auth-jwt';
import { verifyPassword } from '@/lib/auth-utils';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter: 5 attempts per 15 minutes per IP
const loginLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60,
});

// Helper to add CORS headers to response
function addCORSHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  return response;
}

// Handle GET requests
export async function GET(request: NextRequest) {
  const response = new NextResponse(
    JSON.stringify({ error: 'Method not allowed. Use POST to login.' }),
    { status: 405 }
  );
  response.headers.set('Content-Type', 'application/json');
  response.headers.set('Allow', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return response;
}

// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Allow', 'POST, OPTIONS');

  return response;
}

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      let text = await request.text();

      // Fix for reverse proxy escaping issue - remove backslash before ! if present
      // The reverse proxy escapes ! as \! which is invalid JSON
      text = text.replace(/\\!/g, '!');

      body = JSON.parse(text);
    } catch (parseError: any) {
      console.error('[Auth] JSON parse error:', parseError.message);
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        )
      );
    }

    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Username and password are required' },
          { status: 400 }
        )
      );
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    try {
      await loginLimiter.consume(ip);
    } catch (error) {
      console.warn(`[Auth] Login rate limit exceeded for IP: ${ip}`);
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Too many login attempts. Please try again later.' },
          { status: 429 }
        )
      );
    }

    // Get user from database
    const user = await getUserByUsername(username);

    if (!user) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        )
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        )
      );
    }

    // Update last login
    await updateUserLastLogin(user.id);

    // Create JWT token
    const payload = createUserPayload(user.id, user.username, user.email);
    const token = await signJWT(payload);

    // Set cookie
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
        },
      },
      { status: 200 }
    );

    // Set JWT cookie
    response.cookies.set('maestro_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    });

    return addCORSHeaders(response);
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return addCORSHeaders(
      NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    );
  }
}
