/**
 * GET /api/ops/maestro/users - List admin users
 * POST /api/ops/maestro/users - Create new admin user
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, validatePasswordStrength } from '@/lib/auth-jwt';
import { hashPassword } from '@/lib/auth-utils';
import { getAllAdminUsers, createAdminUser, getUserByUsername } from '@/lib/db';

async function requireAuth(request: NextRequest) {
  const token = request.cookies.get('maestro_token')?.value;

  if (!token) {
    return { user: null, error: 'Unauthorized' };
  }

  const payload = await verifyJWT(token);

  if (!payload || !payload.userId) {
    return { user: null, error: 'Unauthorized' };
  }

  return { user: payload, error: null };
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);

    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const users = await getAllAdminUsers();

    return NextResponse.json(
      {
        users: users.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          full_name: u.full_name,
          is_active: u.is_active,
          last_login_at: u.last_login_at,
          created_at: u.created_at,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Users] Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);

    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const body = await request.json();
    const { username, password, email, full_name } = body;

    // Validate input
    if (!username || !password || !email) {
      return NextResponse.json(
        { error: 'username, password, and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', errors: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await createAdminUser({
      username,
      password_hash: passwordHash,
      email,
      full_name,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          full_name: newUser.full_name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Users] Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
