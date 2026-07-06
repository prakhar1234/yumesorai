/**
 * GET /api/ops/maestro/config/email - Get email configuration
 * PATCH /api/ops/maestro/config/email - Update email configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-jwt';
import { getEmailConfiguration, updateEmailConfiguration } from '@/lib/db';

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
    const { user, error } = await requireAuth(request);

    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const config = await getEmailConfiguration();

    return NextResponse.json(
      {
        config: {
          auto_email_enabled: config.auto_email_enabled,
          default_from_email: config.default_from_email,
          default_subject: config.default_subject,
          default_content: config.default_content,
          rate_limit_per_hour: config.rate_limit_per_hour,
          updated_at: config.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Config] Get email config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);

    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate email if provided
    if (body.default_from_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.default_from_email)) {
        return NextResponse.json(
          { error: 'Invalid email format for default_from_email' },
          { status: 400 }
        );
      }
    }

    const config = await updateEmailConfiguration(
      {
        auto_email_enabled: body.auto_email_enabled,
        default_from_email: body.default_from_email,
        default_subject: body.default_subject,
        default_content: body.default_content,
        rate_limit_per_hour: body.rate_limit_per_hour,
      },
      user.userId
    );

    return NextResponse.json(
      {
        success: true,
        config: {
          auto_email_enabled: config.auto_email_enabled,
          default_from_email: config.default_from_email,
          default_subject: config.default_subject,
          default_content: config.default_content,
          rate_limit_per_hour: config.rate_limit_per_hour,
          updated_at: config.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Config] Update email config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
