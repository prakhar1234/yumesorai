/**
 * E2E Tests with Database Verification
 * Tests API submissions and verifies data persistence in PostgreSQL
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Helper function to query database
async function queryDatabase(query: string): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/api/db-query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Database query failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.rows || [];
}

test.describe('Form E2E + Database Verification Tests', () => {
  // =====================================================
  // CONTACT FORM - API + DATABASE VERIFICATION
  // =====================================================
  test.describe('Contact Form - Database Verification', () => {
    test('should save contact submission to database', async ({ page }) => {
      const testData = {
        name: 'Database Test User',
        email: `contact-db-test-${Date.now()}@example.com`,
        company: 'Test Corporation',
        industry: 'Technology',
        phone: '555-0001',
        message: 'Testing database persistence',
      };

      // Submit via API
      const apiResponse = await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });

      expect(apiResponse.status).toBe(201);
      const apiResult = await apiResponse.json();
      expect(apiResult.success).toBeTruthy();

      // Verify data in database
      const dbResults = await queryDatabase(
        `SELECT * FROM contact_submissions WHERE email = '${testData.email}' LIMIT 1`
      );

      expect(dbResults.length).toBe(1);
      const savedData = dbResults[0];
      expect(savedData.name).toBe(testData.name);
      expect(savedData.email).toBe(testData.email);
      expect(savedData.company).toBe(testData.company);
      expect(savedData.industry).toBe(testData.industry);
      expect(savedData.phone).toBe(testData.phone);
      expect(savedData.message).toBe(testData.message);
      expect(savedData.id).toBeDefined();
      expect(savedData.created_at).toBeDefined();
    });

    test('should reject invalid email before database insertion', async ({
      page,
    }) => {
      const testData = {
        name: 'Invalid Email Test',
        email: 'invalid-email-format',
        company: 'Test Corp',
        industry: 'Finance',
        message: 'This should fail validation',
      };

      // Submit via API with invalid email
      const apiResponse = await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });

      expect(apiResponse.status).toBe(400);
      const apiResult = await apiResponse.json();
      expect(apiResult.error).toBeDefined();

      // Verify data was NOT saved to database
      const dbResults = await queryDatabase(
        `SELECT * FROM contact_submissions WHERE email = '${testData.email}'`
      );

      expect(dbResults.length).toBe(0);
    });

    test('should reject missing required fields', async ({ page }) => {
      const testData = {
        name: 'Incomplete Test',
        // Missing required fields: email, company, industry, message
      };

      const apiResponse = await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });

      expect(apiResponse.status).toBe(400);
    });
  });

  // =====================================================
  // DEMO BOOKING - API + DATABASE VERIFICATION
  // =====================================================
  test.describe('Demo Booking Form - Database Verification', () => {
    test('should save demo booking to database', async ({ page }) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

      const testData = {
        name: 'Demo Tester',
        email: `demo-db-test-${Date.now()}@example.com`,
        company: 'Demo Corp',
        industry: 'Healthcare',
        jobTitle: 'CTO',
        phone: '555-0002',
        preferredDate: futureDate.toISOString(),
        timezone: 'UTC',
      };

      const apiResponse = await fetch(`${BASE_URL}/api/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });

      expect(apiResponse.status).toBe(201);
      const apiResult = await apiResponse.json();
      expect(apiResult.success).toBeTruthy();
      expect(apiResult.demoDate).toBeDefined();

      // Verify data in database
      const dbResults = await queryDatabase(
        `SELECT * FROM demo_bookings WHERE email = '${testData.email}' LIMIT 1`
      );

      expect(dbResults.length).toBe(1);
      const savedData = dbResults[0];
      expect(savedData.name).toBe(testData.name);
      expect(savedData.email).toBe(testData.email);
      expect(savedData.company).toBe(testData.company);
      expect(savedData.id).toBeDefined();
    });

    test('should reject past dates', async ({ page }) => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const testData = {
        name: 'Past Date Tester',
        email: `demo-past-${Date.now()}@example.com`,
        company: 'Demo Corp',
        industry: 'Finance',
        jobTitle: 'Manager',
        phone: '555-0003',
        preferredDate: pastDate.toISOString(),
        timezone: 'UTC',
      };

      const apiResponse = await fetch(`${BASE_URL}/api/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });

      expect(apiResponse.status).toBe(400);

      // Verify data was NOT saved
      const dbResults = await queryDatabase(
        `SELECT * FROM demo_bookings WHERE email = '${testData.email}'`
      );

      expect(dbResults.length).toBe(0);
    });
  });

  // =====================================================
  // ASSESSMENT - API + DATABASE VERIFICATION
  // =====================================================
  test.describe('Assessment Form - Database Verification', () => {
    test('should save assessment submission to database', async ({ page }) => {
      const testData = {
        name: 'Assessment Tester',
        email: `assessment-db-test-${Date.now()}@example.com`,
        company: 'Assessment Corp',
        industry: 'Banking',
        systemType: 'COBOL',
        cobolLines: 500000,
        challenges: 'Maintenance costs, talent shortage',
      };

      const apiResponse = await fetch(`${BASE_URL}/api/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });

      expect(apiResponse.status).toBe(201);
      const apiResult = await apiResponse.json();
      expect(apiResult.success).toBeTruthy();

      // Verify data in database
      const dbResults = await queryDatabase(
        `SELECT * FROM assessment_submissions WHERE email = '${testData.email}' LIMIT 1`
      );

      expect(dbResults.length).toBe(1);
      const savedData = dbResults[0];
      expect(savedData.name).toBe(testData.name);
      expect(savedData.email).toBe(testData.email);
      expect(savedData.company).toBe(testData.company);
      expect(savedData.industry).toBe(testData.industry);
    });
  });

  // =====================================================
  // RISK BRIEFING - API + DATABASE VERIFICATION
  // =====================================================
  test.describe('Risk Briefing Form - Database Verification', () => {
    test('should save risk briefing to database', async ({ page }) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      const testData = {
        name: 'Risk Briefing Tester',
        email: `risk-db-test-${Date.now()}@example.com`,
        company: 'Risk Corp',
        industry: 'Insurance',
        phone: '555-0004',
        preferredDate: futureDate.toISOString().split('T')[0],
        preferredTime: '14:00',
        timezone: 'UTC',
      };

      const apiResponse = await fetch(`${BASE_URL}/api/risk-briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });

      expect(apiResponse.status).toBe(201);
      const apiResult = await apiResponse.json();
      expect(apiResult.success).toBeTruthy();

      // Verify data in database
      const dbResults = await queryDatabase(
        `SELECT * FROM risk_briefing_bookings WHERE email = '${testData.email}' LIMIT 1`
      );

      expect(dbResults.length).toBe(1);
      const savedData = dbResults[0];
      expect(savedData.name).toBe(testData.name);
      expect(savedData.email).toBe(testData.email);
      expect(savedData.company).toBe(testData.company);
    });
  });

  // =====================================================
  // ROI CALCULATOR - API + DATABASE VERIFICATION
  // =====================================================
  test.describe('ROI Calculator - Database Verification', () => {
    test('should save ROI calculation to database', async ({ page }) => {
      const testData = {
        email: `roi-db-test-${Date.now()}@example.com`,
        company: 'ROI Test Corp',
        currentCost: 1000000,
        migrationMethod: 'Phased',
        timelineMonths: 18,
        estimatedSavings: 450000,
        roiPercentage: 45,
        breakEvenMonths: 12,
      };

      const apiResponse = await fetch(`${BASE_URL}/api/roi-calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });

      expect(apiResponse.status).toBe(201);
      const apiResult = await apiResponse.json();
      expect(apiResult.success).toBeTruthy();

      // Verify data in database
      const dbResults = await queryDatabase(
        `SELECT * FROM roi_calculator_submissions WHERE email = '${testData.email}' LIMIT 1`
      );

      expect(dbResults.length).toBe(1);
      const savedData = dbResults[0];
      expect(savedData.email).toBe(testData.email);
      expect(Number(savedData.annual_spend)).toBe(testData.currentCost);
      expect(Number(savedData.expected_savings_percent)).toBe(testData.roiPercentage);
    });
  });

  // =====================================================
  // CROSS-FORM TESTS
  // =====================================================
  test.describe('Cross-Form Database Consistency', () => {
    test('should have correct submission counts after multiple submissions', async ({
      page,
    }) => {
      // Get initial counts
      const initialStats = await (
        await fetch(`${BASE_URL}/api/contact`)
      ).json();

      const initialContactCount = initialStats.stats.contacts || 0;

      // Submit a new contact
      const newContact = {
        name: 'Count Test',
        email: `count-test-${Date.now()}@example.com`,
        company: 'Count Corp',
        industry: 'Tech',
        message: 'Testing count increment',
      };

      await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });

      // Get updated counts
      const updatedStats = await (
        await fetch(`${BASE_URL}/api/contact`)
      ).json();

      const updatedContactCount = updatedStats.stats.contacts || 0;

      // Verify count increased by 1
      expect(updatedContactCount).toBe(initialContactCount + 1);
    });
  });
});
