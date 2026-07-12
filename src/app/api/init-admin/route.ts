/**
 * Temporary admin initialization endpoint
 * WARNING: This should be removed after first use!
 */

import { NextResponse } from 'next/server';
import { createAdminUser } from '@/lib/db';
import { hashPassword } from '@/lib/auth-utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, email, fullName } = body;

    if (!username || !password || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: username, password, email' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin user
    const result = await createAdminUser(
      {
        username,
        password_hash: passwordHash,
        email,
        full_name: fullName || 'Admin User',
      },
      null
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Admin user created successfully',
        user: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Init Admin] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create admin user' },
      { status: 500 }
    );
  }
}
