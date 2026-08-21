/**
 * Type definitions for the Testing Agent System
 * Handles feature tracking, deployment monitoring, test execution, and result reporting
 */

// =====================================================
// FEATURE SYSTEM TYPES
// =====================================================

export interface Feature {
  id: string;
  name: string;
  description: string;
  category: 'form' | 'api' | 'integration' | 'utility';
  apiEndpoints?: string[];
  formPages?: string[];
  dependencies: string[]; // List of feature IDs this depends on
  tags: string[];
  lastModified: Date;
}

export interface FeatureRegistry {
  features: Feature[];
  lastUpdated: Date;
}

// =====================================================
// DEPLOYMENT SYSTEM TYPES
// =====================================================

export type DeploymentStatus = 'pending' | 'building' | 'deploying' | 'success' | 'failed' | 'cancelled';

export interface RailwayDeployment {
  id: string;
  status: DeploymentStatus;
  createdAt: Date;
  updatedAt: Date;
  commitSha: string;
  commitMessage: string;
  environment: 'staging' | 'production';
  duration: number; // milliseconds
  logs: string;
}

export interface DeploymentEvent {
  projectId: string;
  environmentId: string;
  deployment: RailwayDeployment;
  trigger: 'github-push' | 'manual' | 'rollback';
}

// =====================================================
// TEST SYSTEM TYPES
// =====================================================

export type TestType = 'e2e' | 'api' | 'integration' | 'accessibility';
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'flaky';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  type: TestType;
  featureId: string;
  dependsOnTests: string[];
  timeout: number; // milliseconds
  retryOnFailure: boolean;
  maxRetries: number;
  tags: string[];
}

export interface TestResult {
  testId: string;
  testName: string;
  status: TestStatus;
  duration: number; // milliseconds
  startTime: Date;
  endTime: Date;
  error?: {
    message: string;
    stack: string;
  };
  output: string;
  attachments: {
    screenshot?: string;
    trace?: string;
    video?: string;
  };
  retryCount: number;
}

export interface TestRun {
  id: string;
  deploymentId: string;
  featureIds: string[];
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

// =====================================================
// GIT SYSTEM TYPES
// =====================================================

export interface GitEvent {
  type: 'push' | 'pull_request' | 'merge';
  repository: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  author: string;
  changedFiles: string[];
  timestamp: Date;
}

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

// =====================================================
// ORCHESTRATION TYPES
// =====================================================

export interface TestOrchestration {
  deploymentId: string;
  testQueue: TestCase[];
  executionOrder: string[]; // Test IDs in dependency order
  parallelGroups: string[][]; // Groups of tests that can run in parallel
  status: 'pending' | 'running' | 'completed' | 'failed';
  estimatedDuration: number;
}

// =====================================================
// NOTIFICATION TYPES
// =====================================================

export type NotificationChannel = 'slack' | 'email' | 'webhook' | 'console';

export interface Notification {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
  status: 'pending' | 'sent' | 'failed';
}

// =====================================================
// CONFIGURATION TYPES
// =====================================================

export interface TestingAgentConfig {
  railway: {
    projectId: string;
    environmentId: string;
    apiToken: string;
    pollInterval: number; // milliseconds
    maxPollAttempts: number;
  };
  github: {
    owner: string;
    repo: string;
    token: string;
    webhookSecret: string;
  };
  testing: {
    baseUrl: string;
    headless: boolean;
    timeout: number;
    retryFlaky: boolean;
    maxRetries: number;
  };
  notifications: {
    slack?: {
      webhookUrl: string;
      channel: string;
    };
    email?: {
      provider: string;
      from: string;
      recipients: string[];
    };
  };
  features: {
    registryPath: string;
    autoDetect: boolean;
  };
}

// =====================================================
// EXECUTION CONTEXT TYPES
// =====================================================

export interface ExecutionContext {
  deploymentId: string;
  testRunId: string;
  currentTest: TestCase;
  environment: 'production' | 'staging' | 'local';
  baseUrl: string;
  startTime: Date;
  timeout: number;
  metadata: Record<string, unknown>;
}
