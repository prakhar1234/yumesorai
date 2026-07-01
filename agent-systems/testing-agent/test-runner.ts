/**
 * Test Runner
 * Executes tests using Playwright and handles retries and reporting
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { TestResult, TestCase, ExecutionContext } from './types';

const execAsync = promisify(exec);

export interface TestRunnerOptions {
  headless?: boolean;
  timeout?: number;
  baseUrl?: string;
  project?: string;
  workers?: number;
}

export class TestRunner {
  private baseUrl: string;
  private headless: boolean;
  private timeout: number;
  private workers: number;

  constructor(options: TestRunnerOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.TEST_BASE_URL || 'http://localhost:3000';
    this.headless = options.headless !== false;
    this.timeout = options.timeout || 30000;
    this.workers = options.workers || 1;
  }

  /**
   * Run a single test
   */
  async runTest(test: TestCase, retryCount: number = 0): Promise<TestResult> {
    const startTime = new Date();

    try {
      const result = await this.executeTest(test);

      return {
        testId: test.id,
        testName: test.name,
        status: 'passed',
        duration: new Date().getTime() - startTime.getTime(),
        startTime,
        endTime: new Date(),
        output: result.output,
        attachments: result.attachments,
        retryCount,
      };
    } catch (error: any) {
      const duration = new Date().getTime() - startTime.getTime();

      // Check if test should be retried
      if (retryCount < test.maxRetries && test.retryOnFailure) {
        console.log(`Test ${test.id} failed, retrying... (attempt ${retryCount + 1}/${test.maxRetries})`);
        await this.sleep(2000); // Wait before retry
        return this.runTest(test, retryCount + 1);
      }

      return {
        testId: test.id,
        testName: test.name,
        status: retryCount > 0 ? 'flaky' : 'failed',
        duration,
        startTime,
        endTime: new Date(),
        error: {
          message: error.message || 'Unknown error',
          stack: error.stack || '',
        },
        output: error.output || '',
        attachments: error.attachments || {},
        retryCount,
      };
    }
  }

  /**
   * Run multiple tests
   */
  async runTests(tests: TestCase[]): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const test of tests) {
      const result = await this.runTest(test);
      results.push(result);
      console.log(
        `✓ ${test.name}: ${result.status} (${result.duration}ms)`
      );
    }

    return results;
  }

  /**
   * Run tests in parallel groups
   */
  async runTestsInParallel(
    parallelGroups: string[][],
    testMap: Map<string, TestCase>
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const group of parallelGroups) {
      const groupTests = group
        .map((testId) => testMap.get(testId))
        .filter((t): t is TestCase => t !== undefined);

      const groupResults = await Promise.all(
        groupTests.map((test) => this.runTest(test))
      );

      results.push(...groupResults);
    }

    return results;
  }

  /**
   * Execute test using Playwright
   */
  private async executeTest(
    test: TestCase
  ): Promise<{ output: string; attachments: Record<string, string> }> {
    const env = {
      ...process.env,
      TEST_BASE_URL: this.baseUrl,
      PLAYWRIGHT_HEADLESS: this.headless ? '1' : '0',
    };

    try {
      let command = '';

      if (test.type === 'e2e') {
        // Run specific E2E test
        command = `npm run test:e2e -- --grep "${test.name}"`;
      } else if (test.type === 'api') {
        // Run API tests
        command = `npm run test:api -- --grep "${test.name}"`;
      } else if (test.type === 'integration') {
        // Run integration tests
        command = `npm run test:api -- --grep "${test.name}"`;
      } else {
        // Default to E2E
        command = `npm run test:e2e -- --grep "${test.name}"`;
      }

      const { stdout, stderr } = await execAsync(command, {
        env,
        timeout: test.timeout,
        cwd: process.cwd(),
      });

      const output = stdout + stderr;

      // Check for success indicators
      if (
        output.includes('passed') ||
        output.includes('✓') ||
        !output.includes('failed')
      ) {
        return {
          output,
          attachments: {},
        };
      }

      throw new Error(`Test execution failed: ${output}`);
    } catch (error: any) {
      throw {
        message: error.message,
        output: error.stdout || error.stderr || '',
        attachments: {},
      };
    }
  }

  /**
   * Run full test suite
   */
  async runFullSuite(): Promise<TestResult[]> {
    const { stdout } = await execAsync('npm run test:all', {
      env: {
        ...process.env,
        TEST_BASE_URL: this.baseUrl,
      },
    });

    // Parse output to extract test results
    // This is a simplified version - full implementation would parse more details
    return this.parseTestOutput(stdout);
  }

  /**
   * Run E2E tests only
   */
  async runE2ETests(): Promise<TestResult[]> {
    const { stdout } = await execAsync('npm run test:e2e', {
      env: {
        ...process.env,
        TEST_BASE_URL: this.baseUrl,
      },
    });

    return this.parseTestOutput(stdout);
  }

  /**
   * Run API tests only
   */
  async runAPITests(): Promise<TestResult[]> {
    const { stdout } = await execAsync('npm run test:api', {
      env: {
        ...process.env,
        TEST_BASE_URL: this.baseUrl,
      },
    });

    return this.parseTestOutput(stdout);
  }

  /**
   * Parse test output
   */
  private parseTestOutput(output: string): TestResult[] {
    // This would parse Playwright/Vitest output format
    // For now, return empty array - full implementation depends on test format
    return [];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get test report
   */
  async getTestReport(
    results: TestResult[]
  ): Promise<{
    total: number;
    passed: number;
    failed: number;
    flaky: number;
    duration: number;
    successRate: number;
  }> {
    const total = results.length;
    const passed = results.filter((r) => r.status === 'passed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const flaky = results.filter((r) => r.status === 'flaky').length;
    const duration = results.reduce((sum, r) => sum + r.duration, 0);
    const successRate =
      total > 0 ? Math.round(((passed + flaky) / total) * 100) : 0;

    return {
      total,
      passed,
      failed,
      flaky,
      duration,
      successRate,
    };
  }
}

export function createTestRunner(options?: TestRunnerOptions): TestRunner {
  return new TestRunner(options);
}
