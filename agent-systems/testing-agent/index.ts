/**
 * Testing Agent - Main Export
 * Central point for accessing all testing agent functionality
 */

// Type exports
export {
  Feature,
  FeatureRegistry,
  RailwayDeployment,
  DeploymentStatus,
  DeploymentEvent,
  TestCase,
  TestResult,
  TestRun,
  TestType,
  TestStatus,
  GitEvent,
  GitFileChange,
  TestOrchestration,
  Notification,
  NotificationChannel,
  TestingAgentConfig,
  ExecutionContext,
} from './types';

// Class exports
export { FeatureRegistryManager, getFeatureRegistry } from './feature-registry';
export { RailwayIntegration, createRailwayIntegration } from './railway-integration';
export { TestOrchestrator, createTestOrchestrator } from './test-orchestrator';
export { TestRunner, createTestRunner } from './test-runner';
export { TestingAgent, createTestingAgent } from './agent';
export {
  GitHubWebhookHandler,
  githubWebhookMiddleware,
  createGitHubWebhookHandler,
} from './github-webhook';

// Configuration
export { testingAgentConfig } from './config.example';
