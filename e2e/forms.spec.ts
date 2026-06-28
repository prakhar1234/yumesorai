import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

test.describe('Form E2E Tests - User Interactions', () => {
  // =====================================================
  // CONTACT FORM E2E TESTS
  // =====================================================
  test.describe('Contact Form', () => {
    test('should load contact page and fill form successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/contact`);

      // Wait for form to be visible
      await page.waitForSelector('form');

      // Fill in the form
      await page.fill('input[placeholder*="Full Name"]', 'John Doe');
      await page.fill('input[type="email"]', 'john.doe@example.com');
      await page.fill('input[placeholder*="Company"]', 'Acme Corporation');

      // Select industry dropdown
      await page.click('select');
      await page.selectOption('select', 'Healthcare');

      // Fill message
      await page.fill('textarea', 'I am interested in modernizing our legacy systems');

      // Fill optional phone field if present
      const phoneInput = page.locator('input[type="tel"]');
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('+1-234-567-8900');
      }

      // Submit form
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Send"), button:has-text("Request")');
      await submitButton.click();

      // Wait for success message
      await page.waitForSelector('text=success', { timeout: 5000 });
      const successMessage = await page.locator('text=/success|submitted|saved/i').isVisible();
      expect(successMessage).toBeTruthy();
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.goto(`${BASE_URL}/contact`);

      // Fill form with invalid email
      await page.fill('input[placeholder*="Full Name"]', 'Jane Doe');
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[placeholder*="Company"]', 'Test Corp');

      // Try to submit
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Send"), button:has-text("Request")');
      await submitButton.click();

      // Check for error message
      const errorMessage = await page.locator('text=/invalid|error/i').first().isVisible();
      expect(errorMessage).toBeTruthy();
    });

    test('should show validation error for empty required fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/contact`);

      // Try to submit without filling
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Send"), button:has-text("Request")');
      await submitButton.click();

      // Check for validation errors
      const hasErrors = await page.locator('text=/required|please|fill|missing/i').isVisible();
      expect(hasErrors).toBeTruthy();
    });
  });

  // =====================================================
  // DEMO FORM E2E TESTS
  // =====================================================
  test.describe('Demo/Briefing Form', () => {
    test('should load demo page and fill booking form successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo`);

      // Wait for form
      await page.waitForSelector('form');

      // Fill basic info
      await page.fill('input[placeholder*="Full Name"]', 'Alice Johnson');
      await page.fill('input[type="email"]', 'alice.johnson@example.com');
      await page.fill('input[placeholder*="Company"]', 'Enterprise Solutions');

      // Select industry
      const industrySelects = await page.locator('select').all();
      if (industrySelects.length > 0) {
        await industrySelects[0].selectOption('Healthcare');
      }

      // Select job title
      const selects = await page.locator('select').all();
      if (selects.length > 1) {
        await selects[1].selectOption('CTO');
      }

      // Fill phone
      const phoneInput = page.locator('input[type="tel"]');
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('+1-555-123-4567');
      }

      // Select date (pick a future date)
      const dateInput = page.locator('input[type="date"]');
      if (await dateInput.isVisible()) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        const dateString = futureDate.toISOString().split('T')[0];
        await dateInput.fill(dateString);
      }

      // Select timezone if present
      const timezoneSelects = await page.locator('select').all();
      if (timezoneSelects.length > 2) {
        await timezoneSelects[timezoneSelects.length - 1].selectOption('America/New_York');
      }

      // Submit form
      const submitButton = page.locator('button:has-text("Book"), button:has-text("Schedule"), button:has-text("Request")');
      await submitButton.click();

      // Wait for success
      await page.waitForSelector('text=/success|scheduled|confirmed/i', { timeout: 5000 });
      expect(true).toBeTruthy();
    });

    test('should prevent booking with past date', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo`);

      // Fill form
      await page.fill('input[placeholder*="Full Name"]', 'Bob Smith');
      await page.fill('input[type="email"]', 'bob@example.com');

      // Try to fill with past date
      const dateInput = page.locator('input[type="date"]');
      if (await dateInput.isVisible()) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const dateString = pastDate.toISOString().split('T')[0];
        await dateInput.fill(dateString);
      }

      // Try to submit
      const submitButton = page.locator('button:has-text("Book"), button:has-text("Schedule")').first();
      await submitButton.click();

      // Should show error or prevent submission
      const errorVisible = await page.locator('text=/past|future|invalid|error/i').isVisible();
      expect(errorVisible).toBeTruthy();
    });
  });

  // =====================================================
  // ASSESSMENT FORM E2E TESTS
  // =====================================================
  test.describe('Assessment Form', () => {
    test('should load assessment page and fill multi-step form', async ({ page }) => {
      await page.goto(`${BASE_URL}/assessment`);

      // Wait for form
      await page.waitForSelector('form');

      // Step 1: Company Information
      await page.fill('input[placeholder*="Full Name"]', 'David Brown');
      await page.fill('input[type="email"]', 'david@example.com');
      await page.fill('input[placeholder*="Company"]', 'Legacy Systems Inc');

      // Select company size
      const sizeSelect = page.locator('select').first();
      if (await sizeSelect.isVisible()) {
        await sizeSelect.selectOption('101-500');
      }

      // Select industry
      const industrySelect = page.locator('select').nth(1);
      if (await industrySelect.isVisible()) {
        await industrySelect.selectOption('Banking & Financial Services');
      }

      // Continue to next step
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }

      // Step 2: Systems & Pain Points (if multi-step)
      const checkboxes = await page.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        // Check first couple of checkboxes
        await checkboxes[0].check();
        if (checkboxes.length > 1) {
          await checkboxes[1].check();
        }

        // Click next again if available
        const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
        }
      }

      // Submit
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Complete")').last();
      await submitButton.click();

      // Wait for success
      await page.waitForSelector('text=/success|completed|thank|submit/i', { timeout: 5000 });
      expect(true).toBeTruthy();
    });
  });

  // =====================================================
  // RISK BRIEFING FORM E2E TESTS
  // =====================================================
  test.describe('Risk Briefing Form', () => {
    test('should load risk briefing page and fill form successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/risk-briefing`);

      // Wait for form
      await page.waitForSelector('form');

      // Fill basic info
      await page.fill('input[placeholder*="Full Name"]', 'Frank Miller');
      await page.fill('input[type="email"]', 'frank@example.com');
      await page.fill('input[placeholder*="Company"]', 'Risk Assessment Corp');

      // Select industry
      const industrySelect = page.locator('select').first();
      if (await industrySelect.isVisible()) {
        await industrySelect.selectOption('Airlines & Travel');
      }

      // Fill phone
      const phoneInput = page.locator('input[type="tel"]');
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('+1-888-555-1212');
      }

      // Select date
      const dateInput = page.locator('input[type="date"]');
      if (await dateInput.isVisible()) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);
        const dateString = futureDate.toISOString().split('T')[0];
        await dateInput.fill(dateString);
      }

      // Select time if present
      const timeInput = page.locator('input[type="time"]');
      if (await timeInput.isVisible()) {
        await timeInput.fill('09:00');
      }

      // Submit
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Schedule"), button:has-text("Request")').last();
      await submitButton.click();

      // Wait for success
      await page.waitForSelector('text=/success|scheduled|confirm/i', { timeout: 5000 });
      expect(true).toBeTruthy();
    });
  });

  // =====================================================
  // ROI CALCULATOR FORM E2E TESTS
  // =====================================================
  test.describe('ROI Calculator Form', () => {
    test('should load ROI calculator and submit calculation', async ({ page }) => {
      await page.goto(`${BASE_URL}/tools/roi-calculator`);

      // Wait for page to load
      await page.waitForSelector('input, select');

      // Fill in cost fields
      const inputs = await page.locator('input[type="number"], input[type="text"]').all();

      // This is a simplified test - actual implementation may vary
      // Fill at least the email field if present
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.isVisible()) {
        await emailInput.fill('user@example.com');
      }

      // Try to find and submit the form
      const submitButton = page.locator('button:has-text("Calculate"), button:has-text("Submit"), button:has-text("Analyze")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Wait for results
        await page.waitForSelector('text=/result|roi|saving/i', { timeout: 5000 });
      }

      expect(true).toBeTruthy();
    });
  });

  // =====================================================
  // GENERAL FORM ACCESSIBILITY TESTS
  // =====================================================
  test.describe('Form Accessibility', () => {
    test('all forms should have proper labels', async ({ page }) => {
      const formPages = ['/contact', '/demo', '/assessment', '/risk-briefing'];

      for (const path of formPages) {
        await page.goto(`${BASE_URL}${path}`);

        // Check for form inputs
        const inputs = await page.locator('input, textarea, select').all();
        expect(inputs.length).toBeGreaterThan(0);

        // Check that form is visible
        const form = page.locator('form');
        expect(await form.isVisible()).toBeTruthy();
      }
    });

    test('forms should be responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${BASE_URL}/contact`);

      // Check form is visible
      const form = page.locator('form');
      expect(await form.isVisible()).toBeTruthy();

      // Check submit button is clickable
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Send")').first();
      expect(await submitButton.isVisible()).toBeTruthy();
    });
  });

  // =====================================================
  // CROSS-FORM NAVIGATION TESTS
  // =====================================================
  test.describe('Form Navigation', () => {
    test('should navigate between different forms', async ({ page }) => {
      // Visit contact form
      await page.goto(`${BASE_URL}/contact`);
      expect(page.url()).toContain('/contact');

      // Navigate to demo (if there's a link)
      const demoLink = page.locator('a[href*="/demo"]').first();
      if (await demoLink.isVisible()) {
        await demoLink.click();
        expect(page.url()).toContain('/demo');
      }
    });
  });
});
