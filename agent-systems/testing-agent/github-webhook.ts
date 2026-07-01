/**
 * GitHub Webhook Handler
 * Receives push events from GitHub and triggers testing
 */

import crypto from 'crypto';
import { GitEvent } from './types';
import { TestingAgent } from './agent';

export interface WebhookPayload {
  ref: string;
  after: string;
  repository: {
    name: string;
    full_name: string;
    owner: {
      name: string;
      login: string;
    };
  };
  pusher: {
    name: string;
    email: string;
  };
  head_commit?: {
    message: string;
    author: {
      name: string;
      email: string;
    };
  };
  commits: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    modified: string[];
    added: string[];
    removed: string[];
  }>;
}

export class GitHubWebhookHandler {
  private webhookSecret: string;
  private testingAgent: TestingAgent;

  constructor(webhookSecret: string, testingAgent: TestingAgent) {
    this.webhookSecret = webhookSecret;
    this.testingAgent = testingAgent;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(
    payload: string,
    signature: string
  ): boolean {
    if (!this.webhookSecret) {
      console.warn('Webhook secret not configured, skipping verification');
      return true;
    }

    const hash = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    const expectedSignature = `sha256=${hash}`;
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Handle push event
   */
  async handlePushEvent(payload: WebhookPayload): Promise<void> {
    const branch = payload.ref.replace('refs/heads/', '');
    const commitSha = payload.after;
    const repository = payload.repository.full_name;

    console.log(`\nGitHub Webhook: Push event received`);
    console.log(`Repository: ${repository}`);
    console.log(`Branch: ${branch}`);
    console.log(`Commit: ${commitSha.slice(0, 7)}`);

    // Collect all changed files
    const changedFiles = new Set<string>();

    if (payload.commits && Array.isArray(payload.commits)) {
      payload.commits.forEach((commit) => {
        (commit.added || []).forEach((file) => changedFiles.add(file));
        (commit.modified || []).forEach((file) => changedFiles.add(file));
        (commit.removed || []).forEach((file) => changedFiles.add(file));
      });
    }

    const changedFilesList = Array.from(changedFiles);
    console.log(`Files changed: ${changedFilesList.length}`);

    // Get commit message
    let commitMessage = 'No message';
    if (payload.head_commit?.message) {
      commitMessage = payload.head_commit.message.split('\n')[0];
    } else if (payload.commits && payload.commits.length > 0) {
      commitMessage = payload.commits[0].message.split('\n')[0];
    }

    // Get author
    let author = 'Unknown';
    if (payload.pusher?.name) {
      author = payload.pusher.name;
    } else if (payload.head_commit?.author?.name) {
      author = payload.head_commit.author.name;
    }

    // Create Git event
    const gitEvent: GitEvent = {
      type: 'push',
      repository,
      branch,
      commitSha,
      commitMessage,
      author,
      changedFiles: changedFilesList,
      timestamp: new Date(),
    };

    // Handle the event
    try {
      await this.testingAgent.handleGitEvent(gitEvent);
    } catch (error) {
      console.error('Error handling Git event:', error);
    }
  }

  /**
   * Handle pull request event
   */
  async handlePullRequestEvent(payload: any): Promise<void> {
    const action = payload.action;
    const pullRequest = payload.pull_request;

    console.log(`\nGitHub Webhook: Pull request ${action}`);
    console.log(`PR: #${pullRequest.number} - ${pullRequest.title}`);
    console.log(`Branch: ${pullRequest.head.ref}`);

    // For PRs, we might want to run tests but not deploy
    // This is left as an exercise - you could create a separate event handler
  }

  /**
   * Handle release event
   */
  async handleReleaseEvent(payload: any): Promise<void> {
    const action = payload.action;
    const release = payload.release;

    console.log(`\nGitHub Webhook: Release ${action}`);
    console.log(`Release: ${release.tag_name}`);

    // Run comprehensive tests on release
  }
}

/**
 * Express/Node.js middleware for GitHub webhooks
 * Usage:
 * app.post('/webhooks/github', githubWebhookMiddleware(testingAgent, webhookSecret))
 */
export function githubWebhookMiddleware(
  testingAgent: TestingAgent,
  webhookSecret: string
) {
  const handler = new GitHubWebhookHandler(webhookSecret, testingAgent);

  return async (req: any, res: any) => {
    const signature = req.headers['x-hub-signature-256'] || '';
    const eventType = req.headers['x-github-event'] || '';

    // Get raw body for signature verification
    let rawBody: string;
    if (typeof req.rawBody === 'string') {
      rawBody = req.rawBody;
    } else if (Buffer.isBuffer(req.rawBody)) {
      rawBody = req.rawBody.toString('utf-8');
    } else {
      rawBody = JSON.stringify(req.body);
    }

    // Verify signature
    if (!handler.verifySignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    try {
      switch (eventType) {
        case 'push':
          await handler.handlePushEvent(req.body);
          break;

        case 'pull_request':
          await handler.handlePullRequestEvent(req.body);
          break;

        case 'release':
          await handler.handleReleaseEvent(req.body);
          break;

        default:
          console.log(`Unhandled webhook event: ${eventType}`);
      }

      res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function createGitHubWebhookHandler(
  webhookSecret: string,
  testingAgent: TestingAgent
): GitHubWebhookHandler {
  return new GitHubWebhookHandler(webhookSecret, testingAgent);
}
