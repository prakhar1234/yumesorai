/**
 * GET /api/ops/maestro/auth/me
 * Get current authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-jwt';
import { getUserById } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies
    const token = request.cookies.get('maestro_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = await verifyJWT(token);

    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await getUserById(payload.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          is_active: user.is_active,
          last_login_at: user.last_login_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth] Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
