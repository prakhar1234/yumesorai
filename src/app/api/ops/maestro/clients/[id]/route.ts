/**
 * GET /api/ops/maestro/clients/[id] - Get client
 * PUT /api/ops/maestro/clients/[id] - Update client
 * DELETE /api/ops/maestro/clients/[id] - Delete client
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-jwt';
import {
  getClientById,
  updateClient,
  deleteClient,
  getClientEmailHistory,
} from '@/lib/db';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireAuth(request);

    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const client = await getClientById(params.id);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get email history
    const emailHistory = await getClientEmailHistory(client.email);

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
          last_emailed_at: client.last_emailed_at,
          total_emails_sent: client.total_emails_sent,
          total_emails_failed: client.total_emails_failed,
          created_at: client.created_at,
          updated_at: client.updated_at,
        },
        emailHistory,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Clients] Get client error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireAuth(request);

    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const body = await request.json();
    const { name, company, phone, industry, tags, notes } = body;

    // Check if client exists
    const existing = await getClientById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const updatedClient = await updateClient(params.id, {
      name,
      company,
      phone,
      industry,
      tags,
      notes,
    });

    return NextResponse.json(
      {
        client: {
          id: updatedClient.id,
          email: updatedClient.email,
          name: updatedClient.name,
          company: updatedClient.company,
          phone: updatedClient.phone,
          industry: updatedClient.industry,
          source: updatedClient.source,
          tags: updatedClient.tags,
          notes: updatedClient.notes,
          updated_at: updatedClient.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Clients] Update client error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireAuth(request);

    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    // Check if client exists
    const existing = await getClientById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    await deleteClient(params.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Clients] Delete client error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
