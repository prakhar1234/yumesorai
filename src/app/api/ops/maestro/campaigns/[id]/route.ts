/**
 * GET /api/ops/maestro/campaigns/[id] - Get campaign details
 * PATCH /api/ops/maestro/campaigns/[id] - Update campaign
 * DELETE /api/ops/maestro/campaigns/[id] - Delete campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-jwt';
import {
  getCampaignById,
  getCampaignRecipients,
  updateCampaign,
  deleteCampaign,
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

    const campaign = await getCampaignById(params.id);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get recipients and statistics
    const recipients = await getCampaignRecipients(params.id);
    const sentCount = recipients.filter((r) => r.status === 'sent').length;
    const failedCount = recipients.filter((r) => r.status === 'failed').length;

    return NextResponse.json(
      {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          content: campaign.content,
          from_email: campaign.from_email,
          status: campaign.status,
          total_recipients: recipients.length,
          successful_sends: sentCount,
          failed_sends: failedCount,
          scheduled_at: campaign.scheduled_at,
          completed_at: campaign.completed_at,
          created_at: campaign.created_at,
          updated_at: campaign.updated_at,
        },
        recipients: recipients.map((r) => ({
          id: r.id,
          email: r.email,
          name: r.name,
          status: r.status,
          message_id: r.message_id,
          error_message: r.error_message,
          sent_at: r.sent_at,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Campaigns] Get campaign error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
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

    const campaign = await getCampaignById(params.id);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Can only edit draft campaigns
    if (campaign.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only edit draft campaigns' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Update campaign
    const updatedCampaign = await updateCampaign(params.id, {
      name: body.name,
      subject: body.subject,
      content: body.content,
      from_email: body.from_email,
    });

    return NextResponse.json(
      {
        success: true,
        campaign: {
          id: updatedCampaign.id,
          name: updatedCampaign.name,
          subject: updatedCampaign.subject,
          content: updatedCampaign.content,
          from_email: updatedCampaign.from_email,
          status: updatedCampaign.status,
          updated_at: updatedCampaign.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Campaigns] Update campaign error:', error);
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

    const campaign = await getCampaignById(params.id);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Delete campaign (cascade deletes recipients)
    await deleteCampaign(params.id);

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Campaigns] Delete campaign error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
