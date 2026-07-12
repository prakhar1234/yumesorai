/**
 * Temporary admin initialization endpoint
 * WARNING: This should be removed after first use!
 *
 * Supports force deletion and recreation of admin users
 */

import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { hashPassword } from '@/lib/auth-utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, email, fullName, force } = body;

    if (!username || !password || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: username, password, email' },
        { status: 400 }
      );
    }

    const client = await getPool().connect();

    try {
      // If force=true, delete existing user first
      if (force) {
        await client.query('DELETE FROM admin_users WHERE username = $1', [username]);
        console.log(`[Init Admin] Deleted existing user: ${username}`);
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create admin user with upsert
      const result = await client.query(
        `INSERT INTO admin_users (id, username, password_hash, email, full_name, is_active)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true)
         ON CONFLICT (username) DO UPDATE SET
           password_hash = $2,
           email = $3,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, username, email, full_name`,
        [username, passwordHash, email, fullName || 'Admin User']
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Admin user created/updated successfully',
          user: result.rows[0],
        },
        { status: 201 }
      );
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Init Admin] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create admin user' },
      { status: 500 }
    );
  }
}
