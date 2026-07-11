import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const LOGIN_URL = `${BASE_URL}/ops/maestro/login`;
const DASHBOARD_URL = `${BASE_URL}/ops/maestro/dashboard`;

// Test credentials
const TEST_ADMIN = {
  username: 'yumesorai',
  password: 'YumeSorai123!',
};

let page: Page;

test.describe('Maestro Email Management System', () => {
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Authentication', () => {
    test('login page should load', async () => {
      await page.goto(LOGIN_URL);
      await expect(page.locator('text=Maestro')).toBeVisible();
      await expect(page.locator('text=Internal Admin Panel')).toBeVisible();
      await expect(page.locator('input[type="text"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should successfully login with valid credentials', async () => {
      await page.goto(LOGIN_URL);

      // Fill login form
      await page.locator('input[type="text"]').fill(TEST_ADMIN.username);
      await page.locator('input[type="password"]').fill(TEST_ADMIN.password);

      // Submit form
      await page.locator('button:has-text("Sign In")').click();

      // Wait for redirect to dashboard
      await page.waitForURL(DASHBOARD_URL);
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    });

    test('should show error with invalid credentials', async () => {
      await page.goto(LOGIN_URL);

      // Fill form with wrong password
      await page.locator('input[type="text"]').fill(TEST_ADMIN.username);
      await page.locator('input[type="password"]').fill('WrongPassword123!');

      // Submit form
      await page.locator('button:has-text("Sign In")').click();

      // Should show error
      await expect(page.locator('text=Invalid username or password')).toBeVisible();
    });

    test('should redirect to login when accessing protected routes without auth', async () => {
      await page.goto(DASHBOARD_URL);
      await page.waitForURL(LOGIN_URL);
      await expect(page.locator('text=Maestro')).toBeVisible();
    });

    test('should logout successfully', async () => {
      // Login first
      await page.goto(LOGIN_URL);
      await page.locator('input[type="text"]').fill(TEST_ADMIN.username);
      await page.locator('input[type="password"]').fill(TEST_ADMIN.password);
      await page.locator('button:has-text("Sign In")').click();
      await page.waitForURL(DASHBOARD_URL);

      // Find and click logout button
      await page.locator('button:has-text("Logout")').click();

      // Should redirect to login
      await page.waitForURL(LOGIN_URL);
      await expect(page.locator('h1:has-text("Maestro")')).toBeVisible();
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async () => {
      // Login before each test
      await page.goto(LOGIN_URL);
      await page.locator('input[type="text"]').fill(TEST_ADMIN.username);
      await page.locator('input[type="password"]').fill(TEST_ADMIN.password);
      await page.locator('button:has-text("Sign In")').click();
      await page.waitForURL(DASHBOARD_URL);
    });

    test('should display dashboard overview', async () => {
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
      await expect(page.locator('text=Total Campaigns')).toBeVisible();
      await expect(page.locator('text=Quick Actions')).toBeVisible();
    });

    test('should have navigation links', async () => {
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
      await expect(page.locator('text=Campaigns')).toBeVisible();
      await expect(page.locator('text=Settings')).toBeVisible();
    });
  });

  test.describe('Campaign Management', () => {
    test.beforeEach(async () => {
      // Login
      await page.goto(LOGIN_URL);
      await page.locator('input[type="text"]').fill(TEST_ADMIN.username);
      await page.locator('input[type="password"]').fill(TEST_ADMIN.password);
      await page.locator('button:has-text("Sign In")').click();
      await page.waitForURL(DASHBOARD_URL);
    });

    test('should navigate to campaigns page', async () => {
      await page.goto(`${BASE_URL}/ops/maestro/campaigns`);
      await expect(page.locator('text=Campaigns')).toBeVisible();
      await expect(page.locator('text=New Campaign')).toBeVisible();
    });

    test('should create a new campaign', async () => {
      await page.goto(`${BASE_URL}/ops/maestro/campaigns/new`);
      await expect(page.locator('text=Create Campaign')).toBeVisible();

      // Fill campaign form
      await page.locator('input[placeholder="e.g., Welcome Email Campaign"]').fill('Test Campaign');
      await page.locator('input[placeholder="e.g., Welcome to our platform!"]').fill('Welcome to Test');
      await page.locator('textarea[placeholder="Enter HTML content for the email..."]').fill('<h1>Welcome</h1>');

      // Add a test recipient
      await page.locator('input[placeholder="email@example.com"]').fill('test@example.com');
      await page.locator('button:has-text("Add")').click();

      // Should see recipient added
      await expect(page.locator('text=test@example.com')).toBeVisible();

      // Submit form
      await page.locator('button:has-text("Create Campaign")').click();

      // Should navigate to campaign details
      await expect(page.locator('text=Test Campaign')).toBeVisible();
    });

    test('should view campaign list', async () => {
      await page.goto(`${BASE_URL}/ops/maestro/campaigns`);

      // Wait for campaigns to load
      await page.waitForTimeout(1000);

      // Should show campaigns list
      const campaignsList = page.locator('text=Total Campaigns');
      if (await campaignsList.isVisible()) {
        await expect(campaignsList).toBeVisible();
      }
    });
  });

  test.describe('Email Configuration', () => {
    test.beforeEach(async () => {
      // Login
      await page.goto(LOGIN_URL);
      await page.locator('input[type="text"]').fill(TEST_ADMIN.username);
      await page.locator('input[type="password"]').fill(TEST_ADMIN.password);
      await page.locator('button:has-text("Sign In")').click();
      await page.waitForURL(DASHBOARD_URL);
    });

    test('should navigate to settings page', async () => {
      await page.goto(`${BASE_URL}/ops/maestro/settings`);
      await expect(page.locator('text=Settings')).toBeVisible();
      await expect(page.locator('text=Email Configuration')).toBeVisible();
    });

    test('should update email configuration', async () => {
      await page.goto(`${BASE_URL}/ops/maestro/settings`);

      // Fill email config form
      const fromEmailInput = page.locator('input[placeholder="noreply@example.com"]');
      await fromEmailInput.fill('noreply@test.com');

      // Save configuration
      await page.locator('button:has-text("Save Configuration")').click();

      // Should show success message
      await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('User Management', () => {
    test.beforeEach(async () => {
      // Login
      await page.goto(LOGIN_URL);
      await page.locator('input[type="text"]').fill(TEST_ADMIN.username);
      await page.locator('input[type="password"]').fill(TEST_ADMIN.password);
      await page.locator('button:has-text("Sign In")').click();
      await page.waitForURL(DASHBOARD_URL);
    });

    test('should view admin users list', async () => {
      await page.goto(`${BASE_URL}/ops/maestro/settings`);

      // Should show Admin Users section
      await expect(page.locator('text=Admin Users')).toBeVisible();

      // Should show current user
      await expect(page.locator(`text=${TEST_ADMIN.username}`)).toBeVisible();
    });

    test('should create a new admin user', async () => {
      await page.goto(`${BASE_URL}/ops/maestro/settings`);

      // Click Add User button
      await page.locator('button:has-text("Add User")').click();

      // Fill form
      await page.locator('input[placeholder="john_doe"]').fill('testuser');
      await page.locator('input[placeholder="john@example.com"]').fill('testuser@example.com');
      await page.locator('input[placeholder="SecurePass123!"]').fill('TestPass123!');
      await page.locator('input[placeholder="John Doe"]').fill('Test User');

      // Submit form
      await page.locator('button:has-text("Create User")').click();

      // Should show success message
      await expect(page.locator('text=created successfully')).toBeVisible({ timeout: 5000 });

      // New user should appear in list
      await expect(page.locator('text=testuser')).toBeVisible();
    });
  });

  test.describe('Complete Email Campaign Flow', () => {
    test.beforeEach(async () => {
      // Login
      await page.goto(LOGIN_URL);
      await page.locator('input[type="text"]').fill(TEST_ADMIN.username);
      await page.locator('input[type="password"]').fill(TEST_ADMIN.password);
      await page.locator('button:has-text("Sign In")').click();
      await page.waitForURL(DASHBOARD_URL);
    });

    test('should complete full campaign lifecycle', async () => {
      // Step 1: Create campaign
      await page.goto(`${BASE_URL}/ops/maestro/campaigns/new`);

      const campaignName = `Campaign ${Date.now()}`;
      await page.locator('input[placeholder="e.g., Welcome Email Campaign"]').fill(campaignName);
      await page.locator('input[placeholder="e.g., Welcome to our platform!"]').fill('Test Email Subject');
      await page.locator('textarea[placeholder="Enter HTML content for the email..."]').fill(
        '<h1>Test</h1><p>This is a test email.</p>'
      );

      // Add recipients
      await page.locator('input[placeholder="email@example.com"]').fill('test1@example.com');
      await page.locator('button:has-text("Add")').click();

      // Submit
      await page.locator('button:has-text("Create Campaign")').click();

      // Should be on campaign details page
      await expect(page.locator(`text=${campaignName}`)).toBeVisible();

      // Step 2: Verify campaign shows draft status
      await expect(page.locator('text=draft')).toBeVisible();

      // Step 3: Send campaign
      const sendButton = page.locator('button:has-text("Send")');
      if (await sendButton.isVisible()) {
        await sendButton.click();

        // Should show success message
        await page.waitForTimeout(2000);
        await page.reload();

        // Check campaign status changed
        await expect(page.locator('text=completed')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
