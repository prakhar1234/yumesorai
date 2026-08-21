/**
 * Testing Agent - Main Coordinator
 * Orchestrates the entire testing workflow
 */

import { FeatureRegistryManager, getFeatureRegistry } from './feature-registry';
import { RailwayIntegration, createRailwayIntegration } from './railway-integration';
import { TestOrchestrator, createTestOrchestrator } from './test-orchestrator';
import { TestRunner, createTestRunner } from './test-runner';
import { TestingAgentConfig, GitEvent, TestRun, DeploymentEvent } from './types';
import fs from 'fs';

export class TestingAgent {
  private config: TestingAgentConfig;
  private featureRegistry: FeatureRegistryManager;
  private railwayIntegration: RailwayIntegration;
  private testOrchestrator: TestOrchestrator;
  private testRunner: TestRunner;
  private testRuns: Map<string, TestRun>;

  constructor(config: TestingAgentConfig) {
    this.config = config;
    this.featureRegistry = getFeatureRegistry(config.features.registryPath);
    this.railwayIntegration = createRailwayIntegration(
      config.railway.projectId,
      config.railway.environmentId,
      config.railway.apiToken,
      {
        pollInterval: config.railway.pollInterval,
        maxPollAttempts: config.railway.maxPollAttempts,
      }
    );
    this.testOrchestrator = createTestOrchestrator(this.featureRegistry);
    this.testRunner = createTestRunner({
      baseUrl: config.testing.baseUrl,
      headless: config.testing.headless,
      timeout: config.testing.timeout,
    });
    this.testRuns = new Map();
  }

  /**
   * Main entry point: Handle Git push event
   */
  async handleGitEvent(event: GitEvent): Promise<void> {
    console.log(
      `\n${'='.repeat(60)}`
    );
    console.log(`Testing Agent: Processing Git ${event.type} event`);
    console.log(`Branch: ${event.branch}`);
    console.log(`Commit: ${event.commitSha.slice(0, 7)} - ${event.commitMessage}`);
    console.log(`Changed files: ${event.changedFiles.length}`);
    console.log('='.repeat(60));

    // Only process main/master branch
    if (!['main', 'master', 'develop'].includes(event.branch)) {
      console.log(`Skipping test run for branch: ${event.branch}`);
      return;
    }

    try {
      // Step 1: Determine affected features
      const affectedFeatures = this.featureRegistry.getAffectedFeatures(
        event.changedFiles
      );

      if (affectedFeatures.length === 0) {
        console.log('No feature changes detected, skipping tests');
        return;
      }

      console.log(`\nAffected features: ${affectedFeatures.map((f) => f.name).join(', ')}`);

      // Step 2: Wait for deployment to complete
      const deployment = await this.waitForDeploymentCompletion(
        event.commitSha
      );

      if (!deployment) {
        console.error('Deployment failed or timed out');
        return;
      }

      // Step 3: Verify deployment is accessible
      const accessible = await this.railwayIntegration.isDeploymentAccessible(
        this.config.testing.baseUrl
      );

      if (!accessible) {
        console.error('Deployment is not accessible');
        return;
      }

      // Step 4: Run tests
      await this.runTests(
        affectedFeatures.map((f) => f.id),
        deployment.id
      );
    } catch (error) {
      console.error('Error in testing agent:', error);
      await this.notifyFailure(error);
    }
  }

  /**
   * Handle deployment events from Railway webhooks
   */
  async handleDeploymentEvent(event: DeploymentEvent): Promise<void> {
    console.log(`\nDeployment event: ${event.deployment.status}`);

    if (event.deployment.status !== 'success') {
      console.log('Deployment did not succeed, skipping tests');
      return;
    }

    // Get the commit that was deployed
    const commitSha = event.deployment.commitSha;
    if (!commitSha) {
      console.log('No commit SHA found, cannot determine affected features');
      return;
    }

    // You would need to get the Git event details from your Git system
    // This is a simplified example
    console.log(`Deployment successful for commit: ${commitSha.slice(0, 7)}`);
  }

  /**
   * Wait for deployment to complete
   */
  private async waitForDeploymentCompletion(
    commitSha: string
  ): Promise<{ id: string } | null> {
    console.log('\nWaiting for deployment to complete...');

    // First, get the deployment for this commit
    const deployments = await this.railwayIntegration.getDeploymentsByCommit(
      commitSha
    );

    if (deployments.length === 0) {
      console.log('No deployment found for commit');
      return null;
    }

    const deployment = deployments[0];
    console.log(`Found deployment: ${deployment.id}`);

    // Wait for it to complete
    const result = await this.railwayIntegration.waitForDeploymentCompletion(
      deployment.id,
      (attempt, status) => {
        console.log(
          `  Deployment status: ${status} (attempt ${attempt + 1}/${this.config.railway.maxPollAttempts})`
        );
      }
    );

    if (!result.success) {
      console.error('Deployment failed or timed out');
      return null;
    }

    console.log(
      `Deployment completed successfully in ${(result.duration / 1000).toFixed(1)}s`
    );
    return { id: deployment.id };
  }

  /**
   * Run tests for specific features
   */
  private async runTests(
    featureIds: string[],
    deploymentId: string
  ): Promise<void> {
    console.log(`\nPlanning test execution for ${featureIds.length} features...`);

    // Plan test execution
    const orchestration = this.testOrchestrator.planTestExecution(
      featureIds,
      deploymentId
    );

    console.log(`Planned ${orchestration.testQueue.length} tests`);
    console.log(`Parallel groups: ${orchestration.parallelGroups.length}`);
    console.log(
      `Estimated duration: ${(orchestration.estimatedDuration / 1000).toFixed(1)}s`
    );

    // Create test run
    const testRun: TestRun = {
      id: `${Date.now()}`,
      deploymentId,
      featureIds,
      startTime: new Date(),
      status: 'running',
      results: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      },
    };

    this.testRuns.set(testRun.id, testRun);

    console.log(`\nRunning tests (Test Run: ${testRun.id})...`);

    // Run tests in parallel groups
    const testMap = new Map(
      orchestration.testQueue.map((t) => [t.id, t])
    );

    const startTime = Date.now();
    const results = await this.testRunner.runTestsInParallel(
      orchestration.parallelGroups,
      testMap
    );

    const duration = Date.now() - startTime;

    // Record results
    results.forEach((result) => {
      this.testOrchestrator.recordResult(result);
      testRun.results.push(result);
    });

    // Update test run
    testRun.endTime = new Date();
    testRun.status = results.some((r) => r.status === 'failed') ? 'failed' : 'completed';
    testRun.summary = {
      total: results.length,
      passed: results.filter((r) => r.status === 'passed').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      duration,
    };

    // Print summary
    this.printTestSummary(testRun);

    // Send notifications
    await this.notifyTestResults(testRun);
  }

  /**
   * Print test summary
   */
  private printTestSummary(testRun: TestRun): void {
    const stats = testRun.summary;
    const successRate =
      stats.total > 0
        ? Math.round(((stats.passed + (stats.total - stats.failed - stats.skipped)) / stats.total) * 100)
        : 0;

    console.log(`\n${'='.repeat(60)}`);
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${stats.total}`);
    console.log(`Passed: ${stats.passed}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Duration: ${(stats.duration / 1000).toFixed(1)}s`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Status: ${testRun.status === 'completed' ? '✓ PASSED' : '✗ FAILED'}`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Notify test results
   */
  private async notifyTestResults(testRun: TestRun): Promise<void> {
    const message =
      testRun.status === 'completed'
        ? `✓ All tests passed (${testRun.summary.passed}/${testRun.summary.total})`
        : `✗ Tests failed (${testRun.summary.failed} failures)`;

    console.log(`Sending notifications: ${message}`);

    // TODO: Implement Slack/Email notifications
    // This would use the config.notifications settings
  }

  /**
   * Notify failure
   */
  private async notifyFailure(error: any): Promise<void> {
    console.error(`Notifying team of failure: ${error.message}`);
    // TODO: Implement failure notifications
  }

  /**
   * Get test run history
   */
  getTestRunHistory(): TestRun[] {
    return Array.from(this.testRuns.values());
  }

  /**
   * Save test results to file
   */
  saveTestResults(testRunId: string, outputPath: string): void {
    const testRun = this.testRuns.get(testRunId);
    if (!testRun) {
      console.error(`Test run ${testRunId} not found`);
      return;
    }

    const report = {
      testRunId,
      timestamp: new Date().toISOString(),
      duration: testRun.summary.duration,
      summary: testRun.summary,
      features: testRun.featureIds,
      results: testRun.results.map((r) => ({
        testId: r.testId,
        name: r.testName,
        status: r.status,
        duration: r.duration,
        error: r.error,
      })),
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Test results saved to: ${outputPath}`);
  }
}

export function createTestingAgent(config: TestingAgentConfig): TestingAgent {
  return new TestingAgent(config);
}
