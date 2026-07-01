# Testing Agent System

A sophisticated automated testing framework that monitors code changes, coordinates test execution based on feature dependencies, and provides comprehensive test orchestration.

## Overview

The Testing Agent System provides:

- **Feature Registry**: Track features and their dependencies
- **Deployment Monitoring**: Real-time Railway deployment status checking
- **Test Orchestration**: Intelligent test scheduling based on dependencies
- **Parallel Execution**: Run independent tests simultaneously
- **GitHub Integration**: Automatic testing on push events
- **E2E Testing**: Production website testing with Playwright
- **Result Reporting**: Detailed test reports and notifications

## Architecture

### Components

```
agent-systems/testing-agent/
├── types.ts                 # Type definitions
├── feature-registry.ts      # Feature tracking and dependency management
├── railway-integration.ts   # Railway API integration for deployment monitoring
├── test-orchestrator.ts     # Test planning and execution coordination
├── test-runner.ts           # Playwright test execution
├── agent.ts                 # Main testing agent coordinator
├── github-webhook.ts        # GitHub webhook handler
├── cli.ts                   # Command-line interface
├── config.example.ts        # Configuration template
├── features.json            # Feature registry database
├── index.ts                 # Main export file
└── README.md                # This file
```

### How It Works

1. **GitHub Push Event**: Developer pushes code to GitHub
2. **Webhook Triggered**: GitHub webhook sends push event to testing agent
3. **File Analysis**: Testing agent determines which features were modified
4. **Deployment Monitoring**: Waits for Railway deployment to complete
5. **Test Planning**: Orchestrator plans which tests to run based on dependencies
6. **Test Execution**: Tests run in parallel groups (E2E and API tests)
7. **Result Reporting**: Results are recorded and notifications sent

## Setup

### 1. Environment Configuration

Create `.env.local` file with:

```bash
# Railway Configuration
RAILWAY_PROJECT_ID=your-project-id
RAILWAY_ENVIRONMENT_ID=your-environment-id
RAILWAY_API_TOKEN=your-api-token

# Testing Configuration
TEST_BASE_URL=https://yourdomain.com

# GitHub Configuration (optional)
GITHUB_OWNER=your-username
GITHUB_REPO=yumesorai-website
GITHUB_TOKEN=your-github-token

# Slack Notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### 2. Get Railway API Token

1. Go to [Railway Dashboard](https://railway.app)
2. Navigate to your project settings
3. Find "API Tokens" section
4. Create or copy existing token
5. Add to `.env.local` as `RAILWAY_API_TOKEN`

### 3. Get Project IDs

In Railway dashboard:
- **Project ID**: Copy from project URL or settings
- **Environment ID**: Copy from environment selector

### 4. GitHub Webhook Setup

To enable automatic testing on push:

1. Go to GitHub repository Settings → Webhooks
2. Add webhook with:
   - **URL**: `https://yourdomain.com/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Set same as `GITHUB_WEBHOOK_SECRET` env var
   - **Events**: Send everything (or select specific events)

## Usage

### Command Line

```bash
# List all features
npm run test:agent list features

# Show feature details
npm run test:agent show feature contact-form

# Plan test execution
npm run test:agent plan contact-form,demo-form

# Run tests for specific features
npm run test:agent run --features contact-form,demo-form

# Show test status
npm run test:agent status

# Validate feature registry
npm run test:agent registry validate

# Show configuration
npm run test:agent config show
```

### Programmatic Usage

```typescript
import {
  createTestingAgent,
  getFeatureRegistry,
  createTestOrchestrator,
} from './agent-systems/testing-agent';

const config = {
  railway: {
    projectId: process.env.RAILWAY_PROJECT_ID!,
    environmentId: process.env.RAILWAY_ENVIRONMENT_ID!,
    apiToken: process.env.RAILWAY_API_TOKEN!,
    pollInterval: 5000,
    maxPollAttempts: 60,
  },
  // ... other config
};

const agent = createTestingAgent(config);

// Handle Git event
await agent.handleGitEvent({
  type: 'push',
  repository: 'yumesorai/yumesorai-website',
  branch: 'main',
  commitSha: 'abc123...',
  commitMessage: 'Add contact form feature',
  author: 'john@example.com',
  changedFiles: ['src/app/api/contact/route.ts'],
  timestamp: new Date(),
});
```

### Express Integration

```typescript
import express from 'express';
import { createTestingAgent, githubWebhookMiddleware } from './agent-systems/testing-agent';

const app = express();
const agent = createTestingAgent(config);

// GitHub webhook endpoint
app.post('/api/webhooks/github', githubWebhookMiddleware(agent, process.env.GITHUB_WEBHOOK_SECRET!));

app.listen(3000);
```

## Feature Registry

### Feature Structure

Features are defined in `features.json`:

```json
{
  "id": "contact-form",
  "name": "Contact Form",
  "description": "Contact form for lead generation",
  "category": "form",
  "apiEndpoints": ["/api/contact"],
  "formPages": ["/contact"],
  "dependencies": ["email-service", "form-validation"],
  "tags": ["form", "frontend", "critical"],
  "lastModified": "2026-06-28T00:00:00Z"
}
```

### Dependency Graph

Features can depend on other features. When a feature changes:
1. The feature itself is tested
2. All transitive dependents are tested (features that depend on this one)

Example:
```
contact-form → depends on → email-service
assessment-form → depends on → email-service
                             → hubspot-integration

Change email-service:
  Test: email-service, contact-form, assessment-form
```

### Adding Features

```typescript
const registry = getFeatureRegistry();

registry.addFeature({
  id: 'new-feature',
  name: 'New Feature',
  description: 'Feature description',
  category: 'form',
  apiEndpoints: ['/api/new-feature'],
  formPages: ['/new-feature'],
  dependencies: [],
  tags: ['new'],
  lastModified: new Date(),
});

registry.saveRegistry();
```

## Test Orchestration

### Test Planning

The orchestrator:
1. Identifies affected features
2. Determines all dependent features
3. Collects tests for all affected features
4. Topologically sorts tests by dependencies
5. Groups independent tests for parallel execution
6. Estimates total duration

### Parallel Execution

Tests are grouped by dependency:

```
Group 1 (parallel): [test-contact-load, test-demo-load]
  └─ Both load tests can run together

Group 2 (parallel): [test-contact-submit, test-demo-submit]
  └─ Both submit tests can run together (after load tests)

Group 3: [test-email-service]
  └─ Email service test runs after dependent form tests
```

### Test Registry

The system automatically registers tests for each feature:

- **E2E Tests**: Load, form interaction, validation
- **API Tests**: Validation, submission, error handling
- **Integration Tests**: Service integration

## Railway Integration

### Deployment Monitoring

The system monitors Railway deployments:

```typescript
const railway = createRailwayIntegration(
  projectId,
  environmentId,
  apiToken
);

// Wait for deployment to complete
const result = await railway.waitForDeploymentCompletion(deploymentId, (attempt, status) => {
  console.log(`Status: ${status}`);
});

// Check accessibility
const accessible = await railway.isDeploymentAccessible(baseUrl);
```

### Polling Strategy

- **Initial wait**: 5 seconds
- **Max attempts**: 60 (5 minutes total)
- **Backoff**: Exponential with 1.5x multiplier, capped at 30s
- **Accessibility check**: 5 attempts with 2s delay

## Test Results

### Result Structure

Each test result includes:

```typescript
{
  testId: string;
  testName: string;
  status: 'passed' | 'failed' | 'flaky' | 'skipped';
  duration: number; // milliseconds
  startTime: Date;
  endTime: Date;
  error?: { message: string; stack: string };
  output: string;
  attachments: {
    screenshot?: string;
    trace?: string;
    video?: string;
  };
  retryCount: number;
}
```

### Flaky Test Handling

Tests that fail on first attempt but pass on retry are marked as "flaky":

```typescript
// Test configuration
{
  retryOnFailure: true,
  maxRetries: 2,
}

// If fails then passes: status = 'flaky'
// If fails twice: status = 'failed'
// If passes: status = 'passed'
```

## Notifications

### Slack Integration

```typescript
// Automatically sends on test completion:
// - Success message with stats
// - Failure details with logs
// - Custom channel support
```

### Email Integration

```typescript
// Sends to configured recipients:
// - Test summary
// - Results breakdown
// - Failure details
```

## Best Practices

### Feature Management

1. **Keep dependencies updated**: When adding a feature, declare all dependencies
2. **Minimize dependencies**: Reduce feature coupling for faster tests
3. **Use tags**: Organize features with meaningful tags
4. **Document changes**: Update `lastModified` when changing features

### Test Configuration

1. **Appropriate timeouts**: Set test timeouts based on actual needs
2. **Retry strategy**: Enable retries for flaky E2E tests only
3. **Parallel groups**: Leverage parallel execution for speed
4. **Meaningful names**: Use descriptive test names for clarity

### Deployment

1. **Check signals**: Ensure Railway API tokens are valid
2. **Webhook secrets**: Configure GitHub webhook secrets for security
3. **Base URL**: Use production URLs for accurate E2E testing
4. **Notifications**: Set up Slack/Email for team visibility

## Troubleshooting

### Tests Not Running

1. Check Railway credentials: `npm run test:agent config show`
2. Validate feature registry: `npm run test:agent registry validate`
3. Check deployment status: Review Railway dashboard

### Deployment Timeout

- Increase `maxPollAttempts` in configuration
- Check Railway for deployment errors
- Review deployment logs on Railway dashboard

### Tests Failing

1. Check test output: `npm run test:e2e:ui` for interactive debugging
2. Verify base URL is correct
3. Check for environment-specific issues
4. Review Playwright traces in `playwright-report/`

### Webhook Not Triggering

1. Verify webhook URL is accessible
2. Check webhook secret matches configuration
3. Review GitHub webhook delivery logs
4. Ensure webhook is enabled for "All events"

## API Reference

### FeatureRegistryManager

```typescript
// Get all features
getAllFeatures(): Feature[]

// Get feature by ID
getFeature(featureId: string): Feature | undefined

// Get dependent features
getDependents(featureId: string): Feature[]

// Get all dependencies (transitive)
getTransitiveDependencies(featureId: string): Feature[]

// Get all dependents (transitive)
getTransitiveDependents(featureId: string): Feature[]

// Identify affected features from file changes
getAffectedFeatures(changedFiles: string[]): Feature[]

// Validate dependency graph for cycles
validateDependencies(): { valid: boolean; errors: string[] }
```

### TestOrchestrator

```typescript
// Plan test execution
planTestExecution(featureIds: string[], deploymentId: string): TestOrchestration

// Record test result
recordResult(result: TestResult): void

// Get test results
getResults(testIds?: string[]): TestResult[]

// Get flaky tests
getFlakyTests(): TestCase[]

// Get statistics
getStatistics(): {
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  totalDuration: number;
  avgDuration: number;
  passingRate: number;
}
```

### TestRunner

```typescript
// Run single test
runTest(test: TestCase, retryCount?: number): Promise<TestResult>

// Run multiple tests
runTests(tests: TestCase[]): Promise<TestResult[]>

// Run tests in parallel
runTestsInParallel(parallelGroups: string[][], testMap: Map<string, TestCase>): Promise<TestResult[]>

// Get test report
getTestReport(results: TestResult[]): Promise<{
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  duration: number;
  successRate: number;
}>
```

## Contributing

To add new features to the testing system:

1. Update `features.json` with feature definition
2. Register tests in `test-orchestrator.ts`
3. Update CLI commands if needed
4. Test with: `npm run test:agent plan your-feature`

## License

MIT
