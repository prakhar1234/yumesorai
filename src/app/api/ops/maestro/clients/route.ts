/**
 * GET /api/ops/maestro/clients - List clients
 * POST /api/ops/maestro/clients - Create client
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-jwt';
import {
  getClients,
  createClient,
  getClientByEmail,
} from '@/lib/db';

console.log('[Clients API] Route handler loaded');

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
    const { error } = await requireAuth(request);

    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const clients = await getClients({
      source: source,
      search: search,
      limit,
      offset,
    });

    return NextResponse.json(
      {
        clients: clients.map((c) => ({
          id: c.id,
          email: c.email,
          name: c.name,
          company: c.company,
          phone: c.phone,
          industry: c.industry,
          source: c.source,
          tags: c.tags,
          notes: c.notes,
          last_emailed_at: c.last_emailed_at,
          total_emails_sent: c.total_emails_sent,
          total_emails_failed: c.total_emails_failed,
          created_at: c.created_at,
          updated_at: c.updated_at,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Clients] Get clients error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);

    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, name, company, phone, industry, source, tags, notes } = body;

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'email is required' },
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

    // Check for duplicate email
    const existing = await getClientByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists', clientId: existing.id },
        { status: 409 }
      );
    }

    const client = await createClient(
      {
        email,
        name,
        company,
        phone,
        industry,
        source,
        tags,
        notes,
      },
      user.userId
    );

    return NextResponse.json(
      {
        client: {
          id: client.id,
          email: client.email,
          name: client.name,
          company: client.company,
          phone: client.phone,
          industry: client.industry,
          source: client.source,
          tags: client.tags,
          notes: client.notes,
          created_at: client.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Clients] Create client error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
