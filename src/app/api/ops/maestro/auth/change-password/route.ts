/**
 * POST /api/ops/maestro/auth/change-password
 * Change password for authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, validatePasswordStrength } from '@/lib/auth-jwt';
import { verifyPassword, hashPassword } from '@/lib/auth-utils';
import { getUserById, updateUserPassword } from '@/lib/db';

export async function POST(request: NextRequest) {
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

    // Get request body
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
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

    // Verify current password
    const passwordValid = await verifyPassword(currentPassword, user.password_hash);

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);

    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', errors: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password in database
    await updateUserPassword(user.id, newPasswordHash);

    return NextResponse.json(
      { success: true, message: 'Password updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth] Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
