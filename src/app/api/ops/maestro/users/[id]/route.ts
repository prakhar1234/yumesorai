/**
 * PATCH /api/ops/maestro/users/[id] - Update admin user
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-jwt';
import { getUserById, updateAdminUser } from '@/lib/db';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireAuth(request);

    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const userToUpdate = await getUserById(params.id);

    if (!userToUpdate) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate email if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Update user
    await updateAdminUser(params.id, {
      email: body.email,
      full_name: body.full_name,
      is_active: body.is_active,
    });

    // Get updated user
    const updatedUser = await getUserById(params.id);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          full_name: updatedUser.full_name,
          is_active: updatedUser.is_active,
          last_login_at: updatedUser.last_login_at,
          created_at: updatedUser.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Users] Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
