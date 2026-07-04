/**
 * GitHub Webhook Handler
 * Receives push events from GitHub and triggers the testing agent
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// In-memory test run store (for demo purposes - use database in production)
const testRuns: Map<string, { status: string; timestamp: Date; result: string }> = new Map();

/**
 * Verify GitHub webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expectedSignature = `sha256=${hash}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Parse webhook payload
 */
function parseWebhookPayload(
  body: Record<string, unknown>
) {
  const ref = (body.ref as string) || '';
  const branch = ref.replace('refs/heads/', '');
  const commitSha = (body.after as string) || '';
  const repository = ((body.repository as Record<string, unknown>)?.full_name as string) || '';
  const pusher = ((body.pusher as Record<string, unknown>)?.name as string) || 'Unknown';

  // Get commit message
  let commitMessage = 'No message';
  const headCommit = body.head_commit as Record<string, unknown> | undefined;
  if (headCommit?.message) {
    commitMessage = ((headCommit.message as string) || '').split('\n')[0];
  } else {
    const commits = body.commits as Array<Record<string, unknown>> | undefined;
    if (commits && Array.isArray(commits) && commits.length > 0) {
      const firstCommit = commits[0];
      commitMessage = ((firstCommit.message as string) || '').split('\n')[0];
    }
  }

  // Collect changed files
  const changedFiles = new Set<string>();
  if (body.commits && Array.isArray(body.commits)) {
    (body.commits as Array<Record<string, unknown>>).forEach((commit) => {
      ((commit.added as string[]) || []).forEach((file: string) => changedFiles.add(file));
      ((commit.modified as string[]) || []).forEach((file: string) => changedFiles.add(file));
      ((commit.removed as string[]) || []).forEach((file: string) => changedFiles.add(file));
    });
  }

  return {
    branch,
    commitSha,
    repository,
    pusher,
    commitMessage,
    changedFiles: Array.from(changedFiles),
    timestamp: new Date(),
  };
}

/**
 * Identify affected features from changed files
 */
function identifyAffectedFeatures(changedFiles: string[]): string[] {
  const featureMap: Record<string, string[]> = {
    'contact-form': ['src/app/api/contact', 'app/contact'],
    'demo-form': ['src/app/api/demo', 'app/demo'],
    'assessment-form': ['src/app/api/assessment', 'app/assessment'],
    'risk-briefing-form': ['src/app/api/risk-briefing', 'app/risk-briefing'],
    'roi-calculator': ['src/app/api/roi-calculator', 'app/tools/roi-calculator'],
    'email-service': ['src/app/api/internal/send-bulk-email', 'src/lib/email'],
    'form-validation': ['src/app/api'],
  };

  const affected = new Set<string>();

  changedFiles.forEach((file) => {
    Object.entries(featureMap).forEach(([feature, paths]) => {
      if (paths.some((path) => file.includes(path))) {
        affected.add(feature);
      }
    });
  });

  return Array.from(affected);
}

/**
 * Handle GitHub push event
 */
async function handlePushEvent(
  body: Record<string, unknown>
): Promise<{ status: string; message: string }> {
  const eventData = parseWebhookPayload(body);

  // Only process main, develop, and staging branches
  const allowedBranches = ['main', 'master', 'develop', 'staging'];
  if (!allowedBranches.includes(eventData.branch)) {
    return {
      status: 'skipped',
      message: `Skipped testing for branch: ${eventData.branch}`,
    };
  }

  // Identify affected features
  const affectedFeatures = identifyAffectedFeatures(eventData.changedFiles);

  if (affectedFeatures.length === 0) {
    return {
      status: 'skipped',
      message: 'No feature changes detected',
    };
  }

  // Create test run record
  const testRunId = `${eventData.repository}-${eventData.commitSha.slice(0, 7)}-${Date.now()}`;
  testRuns.set(testRunId, {
    status: 'queued',
    timestamp: new Date(),
    result: `Detected changes in: ${affectedFeatures.join(', ')}`,
  });

  console.log(`\n${'='.repeat(70)}`);
  console.log('GitHub Webhook: Push Event Received');
  console.log('='.repeat(70));
  console.log(`Repository: ${eventData.repository}`);
  console.log(`Branch: ${eventData.branch}`);
  console.log(`Commit: ${eventData.commitSha.slice(0, 7)} - ${eventData.commitMessage}`);
  console.log(`Author: ${eventData.pusher}`);
  console.log(`Changed Files: ${eventData.changedFiles.length}`);
  console.log(`Affected Features: ${affectedFeatures.join(', ')}`);
  console.log(`Test Run ID: ${testRunId}`);
  console.log('='.repeat(70));

  // TODO: In production, this would:
  // 1. Call the Testing Agent's handleGitEvent() method
  // 2. Monitor Railway deployment
  // 3. Execute tests
  // 4. Send notifications

  return {
    status: 'accepted',
    message: `Test run ${testRunId} queued for features: ${affectedFeatures.join(', ')}`,
  };
}

/**
 * Handle webhook request
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn(
        'Warning: GITHUB_WEBHOOK_SECRET not configured - webhook signature verification disabled'
      );
    }

    // Get headers
    const eventType = request.headers.get('x-github-event') || '';
    const signature = request.headers.get('x-hub-signature-256') || '';

    // Get raw body for signature verification
    const body = await request.json();
    const bodyString = JSON.stringify(body);

    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(bodyString, signature, webhookSecret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Handle different event types
    let result: { status: string; message: string };

    switch (eventType) {
      case 'push':
        result = await handlePushEvent(body);
        break;

      case 'ping':
        result = {
          status: 'pong',
          message: 'GitHub webhook is properly configured',
        };
        break;

      default:
        result = {
          status: 'unhandled',
          message: `Unhandled event type: ${eventType}`,
        };
    }

    console.log(`Webhook response: ${result.status} - ${result.message}\n`);

    return NextResponse.json(
      {
        status: result.status,
        message: result.message,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle OPTIONS request (for CORS preflight)
 */
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    { status: 'ok' },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Hub-Signature-256, X-GitHub-Event',
      },
    }
  );
}

/**
 * Get webhook status (for testing)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const testRunId = request.nextUrl.searchParams.get('testRunId');

  if (testRunId) {
    const testRun = testRuns.get(testRunId);
    if (testRun) {
      return NextResponse.json({
        testRunId,
        status: testRun.status,
        timestamp: testRun.timestamp,
        result: testRun.result,
      });
    }
    return NextResponse.json(
      { error: 'Test run not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: 'webhook_configured',
    endpoint: '/api/webhooks/github',
    events: ['push', 'ping'],
    totalTestRuns: testRuns.size,
    recentTestRuns: Array.from(testRuns.entries())
      .slice(-5)
      .map(([id, run]) => ({ id, ...run })),
  });
}
