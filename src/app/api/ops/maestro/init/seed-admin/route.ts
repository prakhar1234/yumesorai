/**
 * POST /api/ops/maestro/init/seed-admin
 * One-time endpoint to seed initial admin user
 * This endpoint creates the admin user if it doesn't exist
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST(request: NextRequest) {
  try {
    // Security: Check for a one-time token (optional safety measure)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.SEED_TOKEN || 'seed-admin-one-time';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const pool = new Pool({ connectionString: databaseUrl });
    const client = await pool.connect();

    try {
      // Check if admin user already exists
      const checkResult = await client.query(
        'SELECT id FROM admin_users WHERE username = $1',
        ['yumesorai']
      );

      if (checkResult.rows.length > 0) {
        await pool.end();
        return NextResponse.json(
          { message: 'Admin user already exists', success: false },
          { status: 200 }
        );
      }

      // Hash password (dynamic import to avoid edge runtime issues)
      const password = 'YumeSorai123!';
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.default.hash(password, 12);

      // Insert admin user
      await client.query(
        `INSERT INTO admin_users (username, password_hash, email, full_name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        ['yumesorai', passwordHash, 'admin@yumesorai.com', 'Initial Admin', true]
      );

      await pool.end();

      return NextResponse.json(
        {
          success: true,
          message: 'Admin user created successfully',
          credentials: {
            username: 'yumesorai',
            password: 'YumeSorai123!',
          },
        },
        { status: 201 }
      );
    } catch (error) {
      await pool.end();
      throw error;
    }
  } catch (error) {
    console.error('[Init] Seed admin error:', error);
    return NextResponse.json(
      { error: 'Failed to seed admin user', details: String(error) },
      { status: 500 }
    );
  }
}
