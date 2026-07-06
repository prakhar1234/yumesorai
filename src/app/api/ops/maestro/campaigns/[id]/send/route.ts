/**
 * POST /api/ops/maestro/campaigns/[id]/send
 * Send emails for a campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-jwt';
import {
  getCampaignById,
  getPendingRecipients,
  updateRecipientStatus,
  updateCampaign,
} from '@/lib/db';
import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return new Resend(apiKey);
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);

    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
    }

    const campaign = await getCampaignById(params.id);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Can only send draft campaigns
    if (campaign.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only send draft campaigns' },
        { status: 400 }
      );
    }

    // Get pending recipients
    const pendingRecipients = await getPendingRecipients(params.id);

    if (pendingRecipients.length === 0) {
      return NextResponse.json(
        { error: 'No pending recipients to send to' },
        { status: 400 }
      );
    }

    // Update campaign status to sending
    await updateCampaign(params.id, { status: 'sending' });

    let successCount = 0;
    let failureCount = 0;

    // Send emails
    const resend = getResendClient();

    for (const recipient of pendingRecipients) {
      try {
        const response = await resend.emails.send({
          from: campaign.from_email || process.env.RESEND_FROM_EMAIL || 'noreply@resend.dev',
          to: recipient.email,
          subject: campaign.subject,
          html: campaign.content,
        });

        if (response.data && response.data.id) {
          // Email sent successfully
          await updateRecipientStatus(
            recipient.id,
            'sent',
            response.data.id,
            null
          );
          successCount++;
        } else {
          // Email failed - no ID returned
          await updateRecipientStatus(
            recipient.id,
            'failed',
            null,
            'Failed to send email - no message ID returned'
          );
          failureCount++;
        }
      } catch (emailError: any) {
        // Email send error
        const errorMessage = emailError?.message || 'Failed to send email';
        await updateRecipientStatus(
          recipient.id,
          'failed',
          null,
          errorMessage
        );
        failureCount++;
      }
    }

    // Update campaign status to completed
    await updateCampaign(params.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      successful_sends: successCount,
      failed_sends: failureCount,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Campaign sent: ${successCount} successful, ${failureCount} failed`,
        stats: {
          total: pendingRecipients.length,
          successful: successCount,
          failed: failureCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Campaigns] Send campaign error:', error);

    // Update campaign status to failed
    try {
      await updateCampaign(params.id, { status: 'failed' });
    } catch (updateError) {
      console.error('[Campaigns] Failed to update campaign status:', updateError);
    }

    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    );
  }
}
