import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/archived/**'],
  fullyParallel: !isCI,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: 'html',
  timeout: 60 * 1000, // 60 second timeout for slower production environments
  use: {
    baseURL: process.env.TEST_BASE_URL || 'https://www.yumesorai.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 60 * 1000, // Extended timeout for navigation
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  ...(isCI && {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 120 * 1000,
    },
  }),
});
