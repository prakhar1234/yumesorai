#!/usr/bin/env node

/**
 * Testing Agent CLI
 * Command-line interface for the testing agent
 */

import path from 'path';
import fs from 'fs';
import { TestingAgent, createTestingAgent } from './agent';
import { TestingAgentConfig } from './types';
import { getFeatureRegistry } from './feature-registry';
import { createTestOrchestrator } from './test-orchestrator';

interface CLIOptions {
  command: string;
  subcommand?: string;
  features?: string[];
  config?: string;
  baseUrl?: string;
  headless?: boolean;
  help?: boolean;
}

/**
 * Parse CLI arguments
 */
function parseArguments(): CLIOptions {
  const args = process.argv.slice(2);

  const options: CLIOptions = {
    command: args[0] || 'help',
    subcommand: args[1],
    features: [],
    config: path.join(process.cwd(), '.env.local'),
    headless: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--config') {
      options.config = args[i + 1];
      i++;
    } else if (arg === '--base-url') {
      options.baseUrl = args[i + 1];
      i++;
    } else if (arg === '--headed') {
      options.headless = false;
    } else if (arg === '--features') {
      options.features = args[i + 1]?.split(',') || [];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

/**
 * Load configuration from environment
 */
function loadConfig(configPath: string): TestingAgentConfig {
  // Load environment variables
  if (fs.existsSync(configPath)) {
    const envContent = fs.readFileSync(configPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const [key, value] = line.split('=');
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    });
  }

  return {
    railway: {
      projectId: process.env.RAILWAY_PROJECT_ID || '',
      environmentId: process.env.RAILWAY_ENVIRONMENT_ID || '',
      apiToken: process.env.RAILWAY_API_TOKEN || '',
      pollInterval: 5000,
      maxPollAttempts: 60,
    },
    github: {
      owner: process.env.GITHUB_OWNER || 'yumesorai',
      repo: process.env.GITHUB_REPO || 'yumesorai-website',
      token: process.env.GITHUB_TOKEN || '',
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    },
    testing: {
      baseUrl: process.env.TEST_BASE_URL || 'https://yumesorai.com',
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
        from: 'testing@yumesorai.com',
        recipients: ['team@yumesorai.com'],
      },
    },
    features: {
      registryPath: path.join(process.cwd(), 'agent-systems/testing-agent/features.json'),
      autoDetect: false,
    },
  };
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Testing Agent CLI

Usage: npm run test:agent <command> [options]

Commands:
  list features        List all registered features
  show feature <id>    Show feature details
  plan <features>      Plan tests for features (comma-separated)
  run <features>       Run tests for features
  status               Show current test status
  registry validate    Validate feature registry
  registry export      Export registry as JSON
  config show          Show current configuration
  help                 Show this help message

Options:
  --config <path>      Path to config file (default: .env.local)
  --base-url <url>     Base URL for tests (default: TEST_BASE_URL env var)
  --headed             Show browser window during tests (default: headless)
  --features <list>    Comma-separated list of feature IDs
  --help, -h           Show this help message

Examples:
  npm run test:agent list features
  npm run test:agent show feature contact-form
  npm run test:agent run --features contact-form,demo-form
  npm run test:agent plan contact-form
  npm run test:agent registry validate
  npm run test:agent config show
  `);
}

/**
 * Handle commands
 */
async function handleCommand(options: CLIOptions): Promise<void> {
  if (options.help || options.command === 'help') {
    printHelp();
    return;
  }

  const config = loadConfig(options.config || '');
  const registry = getFeatureRegistry(config.features.registryPath);
  const orchestrator = createTestOrchestrator(registry);

  switch (options.command) {
    case 'list':
      if (options.subcommand === 'features') {
        handleListFeatures(registry);
      }
      break;

    case 'show':
      if (options.subcommand === 'feature') {
        handleShowFeature(registry, options.features?.[0]);
      }
      break;

    case 'plan':
      handlePlanTests(registry, orchestrator, options.features || []);
      break;

    case 'run':
      await handleRunTests(config, options);
      break;

    case 'status':
      handleStatus(orchestrator);
      break;

    case 'registry':
      if (options.subcommand === 'validate') {
        handleValidateRegistry(registry);
      } else if (options.subcommand === 'export') {
        handleExportRegistry(registry);
      }
      break;

    case 'config':
      if (options.subcommand === 'show') {
        handleShowConfig(config);
      }
      break;

    default:
      console.error(`Unknown command: ${options.command}`);
      printHelp();
  }
}

/**
 * Handle list features command
 */
function handleListFeatures(registry: ReturnType<typeof getFeatureRegistry>): void {
  const features = registry.getAllFeatures();

  console.log('\nRegistered Features:\n');

  features.forEach((feature) => {
    console.log(`  ${feature.id}`);
    console.log(`    Name: ${feature.name}`);
    console.log(`    Category: ${feature.category}`);
    console.log(`    Dependencies: ${feature.dependencies.join(', ') || 'none'}`);
  });

  console.log(`\nTotal: ${features.length} features\n`);
}

/**
 * Handle show feature command
 */
function handleShowFeature(
  registry: ReturnType<typeof getFeatureRegistry>,
  featureId?: string
): void {
  if (!featureId) {
    console.error('Feature ID required');
    return;
  }

  const feature = registry.getFeature(featureId);
  if (!feature) {
    console.error(`Feature not found: ${featureId}`);
    return;
  }

  console.log(`\nFeature: ${feature.name}`);
  console.log('='.repeat(50));
  console.log(`ID: ${feature.id}`);
  console.log(`Category: ${feature.category}`);
  console.log(`Description: ${feature.description}`);
  console.log(`Tags: ${feature.tags.join(', ')}`);

  if (feature.apiEndpoints?.length) {
    console.log(`\nAPI Endpoints:`);
    feature.apiEndpoints.forEach((ep) => console.log(`  - ${ep}`));
  }

  if (feature.formPages?.length) {
    console.log(`\nForm Pages:`);
    feature.formPages.forEach((page) => console.log(`  - ${page}`));
  }

  if (feature.dependencies.length > 0) {
    console.log(`\nDependencies:`);
    feature.dependencies.forEach((dep) => console.log(`  - ${dep}`));
  }

  const dependents = registry.getDependents(feature.id);
  if (dependents.length > 0) {
    console.log(`\nDependents (features that depend on this):`);
    dependents.forEach((dep) => console.log(`  - ${dep.name}`));
  }

  console.log();
}

/**
 * Handle plan tests command
 */
function handlePlanTests(
  registry: ReturnType<typeof getFeatureRegistry>,
  orchestrator: ReturnType<typeof createTestOrchestrator>,
  features: string[]
): void {
  if (features.length === 0) {
    console.error('Features required');
    return;
  }

  const plan = orchestrator.planTestExecution(features, 'manual-plan');

  console.log('\nTest Execution Plan');
  console.log('='.repeat(50));
  console.log(`Features to test: ${features.join(', ')}`);
  console.log(`Total tests: ${plan.testQueue.length}`);
  console.log(`Parallel groups: ${plan.parallelGroups.length}`);
  console.log(`Estimated duration: ${(plan.estimatedDuration / 1000).toFixed(1)}s\n`);

  console.log('Execution Groups:');
  plan.parallelGroups.forEach((group, index) => {
    console.log(`\n  Group ${index + 1}:`);
    group.forEach((testId) => {
      const test = orchestrator['testRegistry']?.get(testId);
      if (test) {
        console.log(`    - ${test.name} (${test.timeout}ms)`);
      }
    });
  });

  console.log();
}

/**
 * Handle run tests command
 */
async function handleRunTests(config: TestingAgentConfig, options: CLIOptions): Promise<void> {
  if (!options.features || options.features.length === 0) {
    console.error('Features required for running tests');
    return;
  }

  if (options.baseUrl) {
    config.testing.baseUrl = options.baseUrl;
  }
  config.testing.headless = options.headless;

  console.log(`Running tests for: ${options.features.join(', ')}`);
  console.log(`Base URL: ${config.testing.baseUrl}`);
  console.log(`Mode: ${config.testing.headless ? 'headless' : 'headed'}\n`);

  const agent = createTestingAgent(config);

  // Simulate running tests
  // In a real scenario, this would trigger the test orchestrator
  const registry = getFeatureRegistry(config.features.registryPath);
  const orchestrator = createTestOrchestrator(registry);
  const plan = orchestrator.planTestExecution(options.features, `manual-run-${Date.now()}`);

  console.log(`Planned ${plan.testQueue.length} tests`);
  console.log(`Estimated duration: ${(plan.estimatedDuration / 1000).toFixed(1)}s`);
  console.log(`\nNote: Actual test execution would happen here with Playwright\n`);
}

/**
 * Handle status command
 */
function handleStatus(orchestrator: ReturnType<typeof createTestOrchestrator>): void {
  const stats = orchestrator.getStatistics();

  console.log('\nTest Statistics:');
  console.log('='.repeat(50));
  console.log(`Total tests: ${stats.total}`);
  console.log(`Passed: ${stats.passed}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Flaky: ${stats.flaky}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Success rate: ${stats.passingRate}%`);
  console.log(`Total duration: ${(stats.totalDuration / 1000).toFixed(1)}s`);
  console.log();
}

/**
 * Handle validate registry command
 */
function handleValidateRegistry(registry: ReturnType<typeof getFeatureRegistry>): void {
  const validation = registry['validateDependencies']?.();

  if (!validation) {
    console.log('Registry validation not available');
    return;
  }

  console.log('\nRegistry Validation:');
  console.log('='.repeat(50));

  if (validation.valid) {
    console.log('✓ Registry is valid');
    console.log(`  Features: ${registry.getAllFeatures().length}`);
  } else {
    console.log('✗ Registry has errors:');
    validation.errors.forEach((error) => console.log(`  - ${error}`));
  }

  console.log();
}

/**
 * Handle export registry command
 */
function handleExportRegistry(registry: ReturnType<typeof getFeatureRegistry>): void {
  const features = registry.getAllFeatures();
  const output = {
    features,
    timestamp: new Date().toISOString(),
    count: features.length,
  };

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Handle show config command
 */
function handleShowConfig(config: TestingAgentConfig): void {
  console.log('\nCurrent Configuration:');
  console.log('='.repeat(50));
  console.log(`\nRailway:`);
  console.log(`  Project ID: ${config.railway.projectId || '(not set)'}`);
  console.log(`  Environment ID: ${config.railway.environmentId || '(not set)'}`);
  console.log(`  Poll interval: ${config.railway.pollInterval}ms`);
  console.log(`  Max poll attempts: ${config.railway.maxPollAttempts}`);

  console.log(`\nTesting:`);
  console.log(`  Base URL: ${config.testing.baseUrl}`);
  console.log(`  Headless: ${config.testing.headless}`);
  console.log(`  Timeout: ${config.testing.timeout}ms`);
  console.log(`  Retry flaky: ${config.testing.retryFlaky}`);
  console.log(`  Max retries: ${config.testing.maxRetries}`);

  console.log(`\nGitHub:`);
  console.log(`  Owner: ${config.github.owner}`);
  console.log(`  Repo: ${config.github.repo}`);
  console.log(`  Token: ${config.github.token ? '(set)' : '(not set)'}`);

  console.log();
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const options = parseArguments();

  try {
    await handleCommand(options);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run CLI
if (require.main === module) {
  main();
}

export { parseArguments, handleCommand };
