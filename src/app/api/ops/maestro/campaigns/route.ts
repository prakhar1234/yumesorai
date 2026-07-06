/**
 * GET /api/ops/maestro/campaigns - List campaigns
 * POST /api/ops/maestro/campaigns - Create campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-jwt';
import {
  getCampaigns,
  createCampaign,
  createCampaignRecipients,
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

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);

    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const campaigns = await getCampaigns({
      status: status,
      limit,
      offset,
    });

    return NextResponse.json(
      {
        campaigns: campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          subject: c.subject,
          status: c.status,
          total_recipients: c.total_recipients,
          successful_sends: c.successful_sends,
          failed_sends: c.failed_sends,
          created_at: c.created_at,
          updated_at: c.updated_at,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Campaigns] Get campaigns error:', error);
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
    const { name, subject, content, from_email, recipients } = body;

    // Validate input
    if (!name || !subject || !content) {
      return NextResponse.json(
        { error: 'name, subject, and content are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'recipients array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter((r) => !emailRegex.test(r.email));

    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: 'Invalid email format in recipients' },
        { status: 400 }
      );
    }

    // Create campaign
    const campaign = await createCampaign({
      name,
      subject,
      content,
      from_email,
      created_by: user.userId,
    });

    // Create recipients
    const createdRecipients = await createCampaignRecipients(campaign.id, recipients);

    // Update campaign with recipient count
    const recipientCount = createdRecipients.length;

    return NextResponse.json(
      {
        success: true,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          status: campaign.status,
          total_recipients: recipientCount,
          successful_sends: 0,
          failed_sends: 0,
          created_at: campaign.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Campaigns] Create campaign error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
