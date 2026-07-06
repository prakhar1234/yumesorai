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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    try {
      await loginLimiter.consume(ip);
    } catch (error) {
      console.warn(`[Auth] Login rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Get user from database
    const user = await getUserByUsername(username);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
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
      path: '/ops/maestro',
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
