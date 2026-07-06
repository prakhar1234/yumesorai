/**
 * POST /api/ops/maestro/auth/logout
 * Logout endpoint - clears JWT cookie
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    // Clear JWT cookie
    response.cookies.set('maestro_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/ops/maestro',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
