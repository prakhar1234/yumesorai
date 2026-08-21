/**
 * Testing Agent Configuration Example
 * Copy this to config.ts and fill in your actual values
 */

import { TestingAgentConfig } from './types';

export const testingAgentConfig: TestingAgentConfig = {
  railway: {
    // Get these from Railway dashboard:
    // 1. Go to your project settings
    // 2. API tokens section
    // 3. Create or use existing token
    projectId: process.env.RAILWAY_PROJECT_ID || 'your-project-id',
    environmentId: process.env.RAILWAY_ENVIRONMENT_ID || 'your-environment-id',
    apiToken: process.env.RAILWAY_API_TOKEN || 'your-api-token',

    // Poll for deployment status every 5 seconds
    pollInterval: 5000,

    // Stop polling after 60 attempts (5 minutes total)
    maxPollAttempts: 60,
  },

  github: {
    owner: process.env.GITHUB_OWNER || 'your-username',
    repo: process.env.GITHUB_REPO || 'yumesorai-website',
    token: process.env.GITHUB_TOKEN || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
  },

  testing: {
    // Production website URL - tests run against this
    baseUrl: process.env.TEST_BASE_URL || 'https://yumesorai.com',

    // Run tests in headless mode (no UI)
    headless: true,

    // Individual test timeout
    timeout: 30000,

    // Retry flaky tests automatically
    retryFlaky: true,

    // Maximum retry attempts for failed tests
    maxRetries: 2,
  },

  notifications: {
    // Slack notifications (optional)
    slack: {
      // Get webhook URL from Slack app settings
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
      channel: '#testing',
    },

    // Email notifications (optional)
    email: {
      provider: 'resend', // or 'sendgrid', 'mailgun', etc.
      from: 'testing@yumesorai.com',
      recipients: ['team@yumesorai.com'],
    },
  },

  features: {
    // Path to feature registry file
    registryPath: './agent-systems/testing-agent/features.json',

    // Auto-detect features from codebase
    autoDetect: false,
  },
};

/**
 * Environment Variables Reference
 *
 * Required:
 * - RAILWAY_PROJECT_ID: Your Railway project ID
 * - RAILWAY_ENVIRONMENT_ID: Your Railway environment ID
 * - RAILWAY_API_TOKEN: Your Railway API token
 *
 * Optional:
 * - TEST_BASE_URL: Base URL for E2E tests (default: https://yumesorai.com)
 * - GITHUB_OWNER: GitHub organization/username
 * - GITHUB_REPO: Repository name
 * - GITHUB_TOKEN: GitHub API token for CI/CD integration
 * - SLACK_WEBHOOK_URL: Slack webhook for notifications
 *
 * Example .env.local:
 * RAILWAY_PROJECT_ID=abc123xyz
 * RAILWAY_ENVIRONMENT_ID=prod-123
 * RAILWAY_API_TOKEN=your_token_here
 * TEST_BASE_URL=https://yumesorai.com
 * SLACK_WEBHOOK_URL=https://hooks.slack.com/...
 */
