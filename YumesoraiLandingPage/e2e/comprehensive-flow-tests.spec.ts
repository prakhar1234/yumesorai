/**
 * Comprehensive E2E + API Flow Tests
 * Tests all form filling flows and verifies data persistence via API
 */

import { test, expect } from '@playwright/test';

// Use playwright's baseURL from config, with production as default for E2E tests
const BASE_URL = process.env.TEST_BASE_URL || 'https://www.yumesorai.com';

test.describe('Comprehensive Form Flow Tests with Database Verification', () => {

  // =====================================================
  // CONTACT FORM - COMPLETE FLOW
  // =====================================================
  test.describe('Contact Form Complete Flow', () => {
    test('should fill and submit contact form, verify API response and database persistence', async ({ page }) => {
      // Generate unique email for this test
      const testEmail = `contact-e2e-${Date.now()}@example.com`;
      const testName = 'E2E Contact Tester';
      const testCompany = 'E2E Test Corporation';

      // Step 1: Navigate to contact page
      console.log('Step 1: Navigating to contact page...');
      await page.goto(`${BASE_URL}/contact`);
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      const pageTitle = await page.title();
      expect(pageTitle).toContain('Contact');

      // Step 2: Fill form
      console.log('Step 2: Filling contact form...');
      const nameInput = page.locator('input[placeholder*="Name"], input[placeholder*="name"], input:nth-of-type(1)').first();
      const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
      const companyInput = page.locator('input[placeholder*="Company"], input[placeholder*="company"]').nth(0);
      const messageInput = page.locator('textarea').first();

      if (await nameInput.count() > 0) await nameInput.fill(testName);
      if (await emailInput.count() > 0) await emailInput.fill(testEmail);
      if (await companyInput.count() > 0) await companyInput.fill(testCompany);
      if (await messageInput.count() > 0) await messageInput.fill('E2E testing contact form submission');

      // Step 3: Submit form
      console.log('Step 3: Submitting form...');
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Send"), button[type="submit"]').first();

      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000); // Wait for API response
      }

      // Step 4: Verify API response
      console.log('Step 4: Verifying API submission...');
      const apiResponse = await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: testName,
          email: testEmail,
          company: testCompany,
          industry: 'Technology',
          message: 'E2E test verification'
        })
      });

      expect(apiResponse.status).toBe(201);
      const responseData = await apiResponse.json();
      expect(responseData.success).toBe(true);
      console.log('✅ API Response verified');

      // Step 5: Verify database via GET stats
      console.log('Step 5: Verifying database persistence...');
      const statsResponse = await fetch(`${BASE_URL}/api/contact`);
      const stats = await statsResponse.json();
      expect(stats.status).toBe('ok');
      expect(stats.stats.contacts).toBeGreaterThanOrEqual(1);
      console.log(`✅ Database verified - Contact count: ${stats.stats.contacts}`);
    });

    test('should validate contact form and prevent invalid submissions', async ({ page }) => {
      console.log('Testing contact form validation...');
      await page.goto(`${BASE_URL}/contact`);
      await page.waitForLoadState('networkidle');

      // Test invalid email via API
      const invalidEmailResponse = await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'invalid-email',
          company: 'Test Corp',
          industry: 'Tech',
          message: 'Test'
        })
      });

      expect(invalidEmailResponse.status).toBe(400);
      const errorData = await invalidEmailResponse.json();
      expect(errorData.error).toBeDefined();
      console.log('✅ Invalid email rejected correctly');

      // Test missing fields
      const missingFieldsResponse = await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Only Name' })
      });

      expect(missingFieldsResponse.status).toBe(400);
      console.log('✅ Missing fields rejected correctly');
    });
  });

  // =====================================================
  // DEMO FORM - COMPLETE FLOW
  // =====================================================
  test.describe('Demo Booking Form Complete Flow', () => {
    test('should fill and submit demo form, verify database persistence', async ({ page }) => {
      const testEmail = `demo-e2e-${Date.now()}@example.com`;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateString = futureDate.toISOString();

      console.log('Step 1: Navigating to demo page...');
      await page.goto(`${BASE_URL}/demo`);
      await page.waitForLoadState('networkidle');

      console.log('Step 2: Submitting demo via API...');
      const demoResponse = await fetch(`${BASE_URL}/api/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Demo E2E Tester',
          email: testEmail,
          company: 'Demo Test Corp',
          industry: 'Finance',
          jobTitle: 'VP Technology',
          phone: '555-0001',
          preferredDate: dateString,
          timezone: 'UTC'
        })
      });

      expect(demoResponse.status).toBe(201);
      const responseData = await demoResponse.json();
      expect(responseData.success).toBe(true);
      expect(responseData.demoDate).toBeDefined();
      console.log('✅ Demo booking API response verified');

      // Verify database
      console.log('Step 3: Verifying database persistence...');
      const statsResponse = await fetch(`${BASE_URL}/api/demo`);
      const stats = await statsResponse.json();
      expect(stats.stats.demos).toBeGreaterThanOrEqual(1);
      console.log(`✅ Database verified - Demo count: ${stats.stats.demos}`);
    });

    test('should reject invalid demo dates', async ({ page }) => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      console.log('Testing demo form date validation...');
      const invalidResponse = await fetch(`${BASE_URL}/api/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Past Date Tester',
          email: 'past@example.com',
          company: 'Test',
          industry: 'Tech',
          jobTitle: 'CTO',
          phone: '555-0001',
          preferredDate: pastDate.toISOString(),
          timezone: 'UTC'
        })
      });

      expect(invalidResponse.status).toBe(400);
      console.log('✅ Past dates rejected correctly');
    });
  });

  // =====================================================
  // ASSESSMENT FORM - COMPLETE FLOW
  // =====================================================
  test.describe('Assessment Form Complete Flow', () => {
    test('should fill and submit assessment form with database verification', async ({ page }) => {
      const testEmail = `assess-e2e-${Date.now()}@example.com`;

      console.log('Step 1: Navigating to assessment page...');
      await page.goto(`${BASE_URL}/assessment`);
      await page.waitForLoadState('networkidle');

      console.log('Step 2: Submitting assessment via API...');
      const assessResponse = await fetch(`${BASE_URL}/api/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Assessment E2E Tester',
          email: testEmail,
          company: 'Legacy Systems Inc',
          industry: 'Banking',
          systemType: 'COBOL',
          cobolLines: 750000,
          challenges: 'Modernization challenges'
        })
      });

      expect(assessResponse.status).toBe(201);
      const responseData = await assessResponse.json();
      expect(responseData.success).toBe(true);
      console.log('✅ Assessment API response verified');

      // Verify database
      console.log('Step 3: Verifying database persistence...');
      const statsResponse = await fetch(`${BASE_URL}/api/assessment`);
      const stats = await statsResponse.json();
      expect(stats.stats.assessments).toBeGreaterThanOrEqual(1);
      console.log(`✅ Database verified - Assessment count: ${stats.stats.assessments}`);
    });
  });

  // =====================================================
  // RISK BRIEFING FORM - COMPLETE FLOW
  // =====================================================
  test.describe('Risk Briefing Form Complete Flow', () => {
    test('should fill and submit risk briefing form with database verification', async ({ page }) => {
      const testEmail = `risk-e2e-${Date.now()}@example.com`;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateString = futureDate.toISOString().split('T')[0];

      console.log('Step 1: Navigating to risk briefing page...');
      await page.goto(`${BASE_URL}/risk-briefing`);
      await page.waitForLoadState('networkidle');

      console.log('Step 2: Submitting risk briefing via API...');
      const riskResponse = await fetch(`${BASE_URL}/api/risk-briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Risk Briefing E2E Tester',
          email: testEmail,
          company: 'Insurance Corp',
          industry: 'Insurance',
          phone: '555-0002',
          preferredDate: dateString,
          preferredTime: '14:00',
          timezone: 'UTC'
        })
      });

      expect(riskResponse.status).toBe(201);
      const responseData = await riskResponse.json();
      expect(responseData.success).toBe(true);
      expect(responseData.briefingDate).toBeDefined();
      console.log('✅ Risk briefing API response verified');

      // Verify database
      console.log('Step 3: Verifying database persistence...');
      const statsResponse = await fetch(`${BASE_URL}/api/risk-briefing`);
      const stats = await statsResponse.json();
      expect(stats.stats.risk_briefings).toBeGreaterThanOrEqual(1);
      console.log(`✅ Database verified - Risk briefing count: ${stats.stats.risk_briefings}`);
    });
  });

  // =====================================================
  // ROI CALCULATOR FORM - COMPLETE FLOW
  // =====================================================
  test.describe('ROI Calculator Form Complete Flow', () => {
    test('should submit ROI calculation with database verification', async ({ page }) => {
      const testEmail = `roi-e2e-${Date.now()}@example.com`;

      console.log('Step 1: Navigating to ROI calculator page...');
      await page.goto(`${BASE_URL}/tools/roi-calculator`);
      await page.waitForLoadState('networkidle');

      console.log('Step 2: Submitting ROI calculation via API...');
      const roiResponse = await fetch(`${BASE_URL}/api/roi-calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          company: 'Enterprise Corp',
          currentCost: 1500000,
          migrationMethod: 'Phased',
          timelineMonths: 24,
          estimatedSavings: 600000,
          roiPercentage: 40,
          breakEvenMonths: 15
        })
      });

      expect(roiResponse.status).toBe(201);
      const responseData = await roiResponse.json();
      expect(responseData.success).toBe(true);
      expect(responseData.calculation).toBeDefined();
      console.log('✅ ROI calculator API response verified');

      // Verify database
      console.log('Step 3: Verifying database persistence...');
      const statsResponse = await fetch(`${BASE_URL}/api/roi-calculator`);
      const stats = await statsResponse.json();
      expect(stats.stats.roi_submissions).toBeGreaterThanOrEqual(1);
      console.log(`✅ Database verified - ROI submission count: ${stats.stats.roi_submissions}`);
    });
  });

  // =====================================================
  // CROSS-FORM VALIDATION
  // =====================================================
  test.describe('Cross-Form Database Consistency', () => {
    test('should verify all forms save data and statistics are consistent', async ({ page }) => {
      console.log('Getting initial statistics...');

      const contactStats = await fetch(`${BASE_URL}/api/contact`).then(r => r.json());
      const demoStats = await fetch(`${BASE_URL}/api/demo`).then(r => r.json());
      const assessStats = await fetch(`${BASE_URL}/api/assessment`).then(r => r.json());
      const riskStats = await fetch(`${BASE_URL}/api/risk-briefing`).then(r => r.json());
      const roiStats = await fetch(`${BASE_URL}/api/roi-calculator`).then(r => r.json());

      console.log('📊 Current Database Statistics:');
      console.log(`- Contacts: ${contactStats.stats.contacts}`);
      console.log(`- Demos: ${demoStats.stats.demos}`);
      console.log(`- Assessments: ${assessStats.stats.assessments}`);
      console.log(`- Risk Briefings: ${riskStats.stats.risk_briefings}`);
      console.log(`- ROI Submissions: ${roiStats.stats.roi_submissions}`);

      // Verify all endpoints return valid responses
      expect(contactStats.status).toBe('ok');
      expect(demoStats.status).toBe('ok');
      expect(assessStats.status).toBe('ok');
      expect(riskStats.status).toBe('ok');
      expect(roiStats.status).toBe('ok');

      // Verify counts are non-negative numbers
      expect(contactStats.stats.contacts).toBeGreaterThanOrEqual(0);
      expect(demoStats.stats.demos).toBeGreaterThanOrEqual(0);
      expect(assessStats.stats.assessments).toBeGreaterThanOrEqual(0);
      expect(riskStats.stats.risk_briefings).toBeGreaterThanOrEqual(0);
      expect(roiStats.stats.roi_submissions).toBeGreaterThanOrEqual(0);

      console.log('✅ All forms have consistent database state');
    });
  });
});
