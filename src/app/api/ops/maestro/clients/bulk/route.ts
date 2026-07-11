/**
 * POST /api/ops/maestro/clients/bulk - Bulk upload clients
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-jwt';
import { createBulkClients } from '@/lib/db';

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

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);

    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const clients = body.clients || [];

    if (!Array.isArray(clients)) {
      return NextResponse.json(
        { error: 'clients must be an array' },
        { status: 400 }
      );
    }

    if (clients.length === 0) {
      return NextResponse.json(
        { error: 'No clients provided' },
        { status: 400 }
      );
    }

    // Validate emails before processing
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validationErrors: { email: string; error: string }[] = [];

    for (const client of clients) {
      if (!client.email) {
        validationErrors.push({
          email: `Row ${clients.indexOf(client) + 1}`,
          error: 'Email is required',
        });
      } else if (!emailRegex.test(client.email)) {
        validationErrors.push({
          email: client.email,
          error: 'Invalid email format',
        });
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validationErrors },
        { status: 400 }
      );
    }

    const result = await createBulkClients(clients, user.userId);

    return NextResponse.json(
      {
        created: result.created,
        duplicates: result.duplicates,
        errors: result.errors,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Clients] Bulk upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
