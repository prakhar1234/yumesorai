/**
 * Database Query Endpoint
 * Used by E2E tests to verify data persistence
 * Only available in development/test environments
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  // Only allow in development/test environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Database query endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as { query?: string };
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter required' },
        { status: 400 }
      );
    }

    // Whitelist allowed tables to prevent arbitrary queries
    const allowedTables = [
      'contact_submissions',
      'demo_bookings',
      'assessment_submissions',
      'risk_briefing_bookings',
      'roi_calculator_submissions',
    ];

    const queryLowercase = query.toLowerCase();
    const isAllowed = allowedTables.some((table) =>
      queryLowercase.includes(table)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Query contains disallowed table' },
        { status: 400 }
      );
    }

    // Prevent INSERT, UPDATE, DELETE in test queries
    const forbiddenOps = ['insert', 'update', 'delete', 'drop', 'alter'];
    const hasForbiddenOp = forbiddenOps.some((op) =>
      queryLowercase.includes(op)
    );

    if (hasForbiddenOp) {
      return NextResponse.json(
        { error: 'Only SELECT queries are allowed' },
        { status: 400 }
      );
    }

    // Execute query
    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query(query);
      return NextResponse.json({
        success: true,
        rows: result.rows,
        rowCount: result.rowCount,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DB Query API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute query',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
