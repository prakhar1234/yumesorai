# Testing Agent Implementation Guide

Complete guide to implementing and integrating the Testing Agent System with your yumesorai-website project.

## Phase 1: Configuration Setup

### Step 1: Environment Variables

Create `.env.local` in project root:

```bash
# Railway API Configuration
RAILWAY_PROJECT_ID=your_project_id
RAILWAY_ENVIRONMENT_ID=your_environment_id
RAILWAY_API_TOKEN=your_api_token

# Testing Configuration
TEST_BASE_URL=https://yourdomain.com
TEST_HEADLESS=true

# GitHub Configuration
GITHUB_OWNER=yumesorai
GITHUB_REPO=yumesorai-website
GITHUB_TOKEN=your_github_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Step 2: Get Railway Credentials

1. **Login to Railway Dashboard**: https://railway.app
2. **Navigate to Project Settings**
3. **Find "API Tokens" section**
4. **Create or copy API token**
5. **Copy Project ID** from project URL: `https://railway.app/project/{projectId}`
6. **Get Environment ID** from environment selector dropdown

### Step 3: Verify Package Dependencies

Ensure `ts-node` is available:

```bash
npm install --save-dev ts-node
```

## Phase 2: Command Line Testing

### Test the CLI

```bash
# List all features
npm run test:agent list features

# Show feature details
npm run test:agent show feature contact-form

# Validate feature registry
npm run test:agent validate

# View current configuration
npm run test:agent config show
```

### Expected Output

```
Registered Features:

  contact-form
    Name: Contact Form
    Category: form
    Dependencies: email-service, form-validation

  demo-form
    Name: Demo Booking Form
    Category: form
    Dependencies: email-service, calendar-integration, form-validation

... (more features)

Total: 10 features
```

## Phase 3: API Integration

### Option A: Express/Node.js Server

If you have a Node.js server, add webhook handler:

```typescript
// In your main server file (e.g., server.ts or api/webhooks/github/route.ts)

import { createTestingAgent, githubWebhookMiddleware } from '../agent-systems/testing-agent';
import { testingAgentConfig } from '../agent-systems/testing-agent/config';

const app = express();

// Create testing agent instance
const testingAgent = createTestingAgent(testingAgentConfig);

// Add webhook endpoint
app.post(
  '/api/webhooks/github',
  githubWebhookMiddleware(testingAgent, process.env.GITHUB_WEBHOOK_SECRET!)
);

app.listen(3000);
```

### Option B: AWS Lambda / Vercel

Create a serverless function:

```typescript
// api/webhooks/github.ts (or .js)

import { createTestingAgent, githubWebhookMiddleware } from '../../agent-systems/testing-agent';

const testingAgent = createTestingAgent({
  railway: {
    projectId: process.env.RAILWAY_PROJECT_ID!,
    environmentId: process.env.RAILWAY_ENVIRONMENT_ID!,
    apiToken: process.env.RAILWAY_API_TOKEN!,
    pollInterval: 5000,
    maxPollAttempts: 60,
  },
  github: {
    owner: 'yumesorai',
    repo: 'yumesorai-website',
    token: process.env.GITHUB_TOKEN || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
  },
  testing: {
    baseUrl: process.env.TEST_BASE_URL || 'https://yourdomain.com',
    headless: true,
    timeout: 30000,
    retryFlaky: true,
    maxRetries: 2,
  },
  notifications: {
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
      channel: '#testing',
    },
    email: {
      provider: 'resend',
      from: 'testing@yourdomain.com',
      recipients: ['team@yourdomain.com'],
    },
  },
  features: {
    registryPath: './agent-systems/testing-agent/features.json',
    autoDetect: false,
  },
});

const handler = githubWebhookMiddleware(testingAgent, process.env.GITHUB_WEBHOOK_SECRET!);

export default handler;
```

## Phase 4: GitHub Webhook Configuration

### Setup Webhook in GitHub

1. **Open Repository Settings**
   - Go to: https://github.com/your-org/yumesorai-website/settings

2. **Navigate to Webhooks**
   - Sidebar: "Code and automation" → "Webhooks"

3. **Add New Webhook**
   - Click "Add webhook"

4. **Configure Webhook**
   - **Payload URL**: `https://yourdomain.com/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Set to `GITHUB_WEBHOOK_SECRET` value
   - **Which events?**: Select "Send me everything"
   - **Active**: Check enabled

5. **Click "Add webhook"**

### Verify Webhook

After adding:
- Scroll down to "Recent Deliveries"
- You should see test deliveries
- Click on a delivery to see request/response
- Response should be `{"status":"ok"}` with status 200

## Phase 5: Feature Registry Customization

### Understanding the Registry

Each feature in `features.json` represents a component:

```json
{
  "id": "unique-id",
  "name": "Human Readable Name",
  "description": "What this feature does",
  "category": "form | api | integration | utility",
  "apiEndpoints": ["/api/endpoint"],
  "formPages": ["/page"],
  "dependencies": ["other-feature-id"],
  "tags": ["tag1", "tag2"],
  "lastModified": "2026-06-28T00:00:00Z"
}
```

### Add New Feature

When you add a new form or API endpoint:

1. **Edit `features.json`**
2. **Add feature object**
3. **Set dependencies** (what services it needs)
4. **Save file**

Example - Adding a new form:

```json
{
  "id": "new-form",
  "name": "New Form Name",
  "description": "What the form does",
  "category": "form",
  "apiEndpoints": ["/api/new-form"],
  "formPages": ["/new-form"],
  "dependencies": ["email-service", "form-validation"],
  "tags": ["form", "new"],
  "lastModified": "2026-07-01T12:00:00Z"
}
```

### Update Feature

When you modify a feature:

```typescript
const registry = getFeatureRegistry();

registry.updateFeature('contact-form', {
  description: 'Updated description',
  lastModified: new Date(),
});

registry.saveRegistry();
```

## Phase 6: Test Planning

### Plan Tests for Features

Before running tests, plan them:

```bash
npm run test:agent plan contact-form,demo-form
```

This shows:
- Total tests to run
- Parallel groups
- Estimated duration

### Run Specific Features

```bash
# Test single feature
npm run test:agent run --features contact-form

# Test multiple features
npm run test:agent run --features contact-form,demo-form,assessment-form

# Test with custom base URL
npm run test:agent run --features contact-form --base-url https://staging.yourdomain.com

# Test in headed mode (show browser)
npm run test:agent run --features contact-form --headed
```

## Phase 7: Monitoring and Maintenance

### Check Status

```bash
npm run test:agent:status
```

### Validate Registry

```bash
npm run test:agent:validate
```

Check for:
- Circular dependencies
- Invalid feature references
- Missing required fields

### View Test History

Tests are automatically logged. To see results:

```bash
# Check Railway dashboard for deployment logs
# Review test results in your Slack channel
# Check email notifications
```

## Phase 8: Integration with CI/CD

### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run API tests
        run: npm run test:api

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

      - name: Comment PR with test results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            // Parse and comment test results
```

### Railway Deployment

Tests automatically trigger on successful deployment. No additional setup needed.

## Troubleshooting

### Issue: "Railway API token invalid"

**Solution:**
1. Go to Railway dashboard
2. Create new API token (old one may be expired)
3. Update `RAILWAY_API_TOKEN` in `.env.local`

### Issue: "Deployment not found"

**Solution:**
1. Check that commit was pushed to correct branch
2. Verify Railway project settings
3. Check that environment ID is correct

### Issue: "Tests timing out"

**Solution:**
1. Increase timeout: `TEST_TIMEOUT=60000`
2. Check that `TEST_BASE_URL` is correct
3. Verify deployment is actually running
4. Check Railway deployment logs

### Issue: "GitHub webhook not triggering"

**Solution:**
1. Verify webhook URL is correct and accessible
2. Check webhook secret matches `GITHUB_WEBHOOK_SECRET`
3. Review GitHub webhook delivery logs for errors
4. Ensure webhook is set to "Send everything"

### Issue: "Feature not detected in changes"

**Solution:**
1. Verify file paths in `apiEndpoints` and `formPages`
2. Run: `npm run test:agent list features` to see registry
3. Update feature definitions if necessary
4. Check that changed files match feature patterns

## Best Practices

### Feature Management

✅ **Do:**
- Keep feature IDs lowercase with hyphens: `contact-form`
- Update `lastModified` when changes are made
- List all dependencies explicitly
- Use descriptive feature names

❌ **Don't:**
- Use spaces or special characters in feature IDs
- Ignore circular dependency warnings
- Add unnecessary features to registry
- Keep outdated dependencies

### Testing

✅ **Do:**
- Run tests after modifying features
- Use `--features` flag to test specific features
- Monitor test results in Slack/Email
- Plan tests before running them

❌ **Don't:**
- Skip test validation
- Ignore flaky test patterns
- Deploy without running tests
- Disable retry logic

### Deployment

✅ **Do:**
- Wait for Railway deployment to complete before testing
- Use production URL for E2E tests
- Monitor deployment logs on Railway
- Keep API tokens secure

❌ **Don't:**
- Use expired Railway tokens
- Test against staging if deploying to production
- Share webhook secrets in version control
- Disable GitHub webhook verification

## Next Steps

1. **Test locally**: Run `npm run test:agent list features`
2. **Setup GitHub webhook**: Configure in repository settings
3. **Push a change**: Make a Git commit and push to trigger tests
4. **Monitor results**: Check Slack/Email for test notifications
5. **Iterate**: Update features and tests as needed

## Support

For issues:
1. Check `agent-systems/testing-agent/README.md`
2. Review troubleshooting section above
3. Check Railway dashboard for deployment logs
4. Review GitHub webhook deliveries for errors

## Files Created

```
agent-systems/testing-agent/
├── types.ts                 # Core type definitions
├── feature-registry.ts      # Feature management
├── railway-integration.ts   # Railway API client
├── test-orchestrator.ts     # Test scheduling
├── test-runner.ts           # Playwright integration
├── agent.ts                 # Main orchestrator
├── github-webhook.ts        # GitHub webhook handler
├── cli.ts                   # Command-line interface
├── config.example.ts        # Configuration template
├── features.json            # Feature registry database
├── index.ts                 # Main export file
├── README.md                # System documentation
├── IMPLEMENTATION_GUIDE.md  # This file
└── .env.local (create)      # Environment variables
```

Total: ~2000 lines of TypeScript code implementing a production-ready testing agent system.
