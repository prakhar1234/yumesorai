/**
 * Test Orchestration System
 * Coordinates test execution based on feature dependencies
 */

import { TestCase, TestResult, TestRun, TestOrchestration, ExecutionContext } from './types';
import { FeatureRegistryManager } from './feature-registry';

export class TestOrchestrator {
  private featureRegistry: FeatureRegistryManager;
  private testRegistry: Map<string, TestCase>;
  private testResults: Map<string, TestResult>;

  constructor(featureRegistry: FeatureRegistryManager) {
    this.featureRegistry = featureRegistry;
    this.testRegistry = new Map();
    this.testResults = new Map();
    this.registerDefaultTests();
  }

  /**
   * Register tests for all features
   */
  private registerDefaultTests(): void {
    const features = this.featureRegistry.getAllFeatures();

    features.forEach((feature) => {
      if (feature.category === 'form') {
        // E2E tests for forms
        this.registerTest({
          id: `${feature.id}-e2e-load`,
          name: `${feature.name}: Load and Display`,
          description: `Verify ${feature.name} loads correctly`,
          type: 'e2e',
          featureId: feature.id,
          dependsOnTests: feature.dependencies.map((depId) => `${depId}-api`),
          timeout: 15000,
          retryOnFailure: true,
          maxRetries: 2,
          tags: ['e2e', 'smoke'],
        });

        this.registerTest({
          id: `${feature.id}-e2e-form`,
          name: `${feature.name}: Fill and Submit`,
          description: `Verify ${feature.name} can be filled and submitted`,
          type: 'e2e',
          featureId: feature.id,
          dependsOnTests: [`${feature.id}-e2e-load`],
          timeout: 20000,
          retryOnFailure: true,
          maxRetries: 2,
          tags: ['e2e', 'functional'],
        });

        this.registerTest({
          id: `${feature.id}-e2e-validation`,
          name: `${feature.name}: Validation`,
          description: `Verify ${feature.name} validates input correctly`,
          type: 'e2e',
          featureId: feature.id,
          dependsOnTests: [`${feature.id}-e2e-load`],
          timeout: 15000,
          retryOnFailure: true,
          maxRetries: 2,
          tags: ['e2e', 'validation'],
        });
      }

      if (feature.category === 'api' || feature.apiEndpoints?.length) {
        // API tests
        this.registerTest({
          id: `${feature.id}-api`,
          name: `${feature.name}: API Validation`,
          description: `Verify ${feature.name} API works correctly`,
          type: 'api',
          featureId: feature.id,
          dependsOnTests: feature.dependencies.map((depId) => `${depId}-api`),
          timeout: 10000,
          retryOnFailure: true,
          maxRetries: 2,
          tags: ['api', 'smoke'],
        });
      }

      if (feature.category === 'integration') {
        // Integration tests
        this.registerTest({
          id: `${feature.id}-integration`,
          name: `${feature.name}: Integration`,
          description: `Verify ${feature.name} integrates correctly`,
          type: 'integration',
          featureId: feature.id,
          dependsOnTests: [],
          timeout: 15000,
          retryOnFailure: true,
          maxRetries: 1,
          tags: ['integration'],
        });
      }
    });
  }

  /**
   * Register a test case
   */
  registerTest(test: TestCase): void {
    this.testRegistry.set(test.id, test);
  }

  /**
   * Get a test case by ID
   */
  getTest(testId: string): TestCase | undefined {
    return this.testRegistry.get(testId);
  }

  /**
   * Get all tests for a feature
   */
  getTestsForFeature(featureId: string): TestCase[] {
    return Array.from(this.testRegistry.values()).filter(
      (test) => test.featureId === featureId
    );
  }

  /**
   * Plan test execution based on features to test
   * Returns ordered test execution plan with parallelization opportunities
   */
  planTestExecution(featureIds: string[], deploymentId: string): TestOrchestration {
    const testsToRun = new Set<TestCase>();
    const testIds = new Set<string>();

    // Collect tests for all features (including their dependencies)
    featureIds.forEach((featureId) => {
      const feature = this.featureRegistry.getFeature(featureId);
      if (feature) {
        const deps = this.featureRegistry.getTransitiveDependencies(featureId);

        // Add tests for the feature and its dependencies
        [feature, ...deps].forEach((f) => {
          this.getTestsForFeature(f.id).forEach((test) => {
            testsToRun.add(test);
            testIds.add(test.id);
          });
        });
      }
    });

    // Topologically sort tests based on dependencies
    const executionOrder = this.topologicalSort(Array.from(testsToRun));

    // Group tests that can run in parallel
    const parallelGroups = this.createParallelGroups(executionOrder);

    // Estimate total duration
    const estimatedDuration = this.estimateDuration(Array.from(testsToRun));

    return {
      deploymentId,
      testQueue: Array.from(testsToRun),
      executionOrder,
      parallelGroups,
      status: 'pending',
      estimatedDuration,
    };
  }

  /**
   * Topologically sort tests based on dependencies
   */
  private topologicalSort(tests: TestCase[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const testMap = new Map(tests.map((t) => [t.id, t]));

    const visit = (testId: string) => {
      if (visited.has(testId)) return;
      visited.add(testId);

      const test = testMap.get(testId);
      if (!test) return;

      test.dependsOnTests.forEach((depId) => {
        if (testMap.has(depId)) {
          visit(depId);
        }
      });

      result.push(testId);
    };

    tests.forEach((test) => visit(test.id));
    return result;
  }

  /**
   * Create groups of tests that can run in parallel
   */
  private createParallelGroups(executionOrder: string[]): string[][] {
    const testMap = new Map(
      Array.from(this.testRegistry.entries()).map(([id, test]) => [id, test])
    );

    const groups: string[][] = [];
    const processed = new Set<string>();

    executionOrder.forEach((testId) => {
      if (processed.has(testId)) return;

      const test = testMap.get(testId);
      if (!test) return;

      // Find tests that can run in parallel with this one
      const group = [testId];
      processed.add(testId);

      executionOrder.forEach((otherId) => {
        if (processed.has(otherId)) return;

        const otherTest = testMap.get(otherId);
        if (!otherTest) return;

        // Check if they can run in parallel
        if (!otherTest.dependsOnTests.includes(testId) && !test.dependsOnTests.includes(otherId)) {
          // Check if they have no common dependencies
          const otherDeps = new Set(otherTest.dependsOnTests);
          const testDeps = new Set(test.dependsOnTests);

          let hasCommonDep = false;
          otherDeps.forEach((dep) => {
            if (testDeps.has(dep)) hasCommonDep = true;
          });

          if (!hasCommonDep) {
            group.push(otherId);
            processed.add(otherId);
          }
        }
      });

      if (group.length > 0) {
        groups.push(group);
      }
    });

    return groups;
  }

  /**
   * Estimate total test duration
   */
  private estimateDuration(tests: TestCase[]): number {
    // Estimate based on parallel groups
    const executionOrder = this.topologicalSort(tests);
    const parallelGroups = this.createParallelGroups(executionOrder);

    let totalDuration = 0;
    parallelGroups.forEach((group) => {
      const maxGroupDuration = Math.max(
        ...group.map((testId) => {
          const test = this.testRegistry.get(testId);
          return test?.timeout || 10000;
        })
      );
      totalDuration += maxGroupDuration;
    });

    return totalDuration;
  }

  /**
   * Record test result
   */
  recordResult(result: TestResult): void {
    this.testResults.set(result.testId, result);
  }

  /**
   * Get test results
   */
  getResults(testIds?: string[]): TestResult[] {
    if (testIds) {
      return testIds
        .map((id) => this.testResults.get(id))
        .filter((r): r is TestResult => r !== undefined);
    }
    return Array.from(this.testResults.values());
  }

  /**
   * Get test result by ID
   */
  getResult(testId: string): TestResult | undefined {
    return this.testResults.get(testId);
  }

  /**
   * Get flaky tests (tests that fail intermittently)
   */
  getFlakyTests(): TestCase[] {
    const flakyTestIds = new Set<string>();

    this.testResults.forEach((result, testId) => {
      if (result.status === 'flaky') {
        flakyTestIds.add(testId);
      }
    });

    return Array.from(flakyTestIds)
      .map((id) => this.testRegistry.get(id))
      .filter((t): t is TestCase => t !== undefined);
  }

  /**
   * Clear results (useful for new test runs)
   */
  clearResults(): void {
    this.testResults.clear();
  }

  /**
   * Get test statistics
   */
  getStatistics() {
    const results = Array.from(this.testResults.values());
    const total = results.length;
    const passed = results.filter((r) => r.status === 'passed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const flaky = results.filter((r) => r.status === 'flaky').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = total > 0 ? totalDuration / total : 0;

    const passingRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      total,
      passed,
      failed,
      flaky,
      skipped,
      totalDuration,
      avgDuration,
      passingRate: Math.round(passingRate * 100) / 100,
    };
  }
}

export function createTestOrchestrator(featureRegistry: FeatureRegistryManager): TestOrchestrator {
  return new TestOrchestrator(featureRegistry);
}
