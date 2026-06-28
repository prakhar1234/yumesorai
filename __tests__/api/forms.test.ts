import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Form API Endpoints - Integration Tests', () => {
  // =====================================================
  // CONTACT FORM API TESTS
  // =====================================================
  describe('POST /api/contact', () => {
    it('should successfully submit contact form with valid data', async () => {
      const response = await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          company: 'Acme Corp',
          industry: 'Healthcare',
          message: 'Interested in your legacy modernization services',
          phone: '+1-234-567-8900',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('saved successfully');
    });

    it('should reject contact form with missing required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          // missing company, industry, message
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject contact form with invalid email', async () => {
      const response = await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'invalid-email',
          company: 'Acme Corp',
          industry: 'Healthcare',
          message: 'Test message',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid email');
    });

    it('should accept contact form with optional phone field', async () => {
      const response = await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Smith',
          email: 'jane@example.com',
          company: 'Tech Solutions Inc',
          industry: 'Banking & Financial Services',
          message: 'Want to discuss modernization strategy',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should reject invalid request body', async () => {
      const response = await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid request body');
    });
  });

  // =====================================================
  // DEMO FORM API TESTS
  // =====================================================
  describe('POST /api/demo', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateString = futureDate.toISOString().split('T')[0];

    it('should successfully submit demo booking with valid data', async () => {
      const response = await fetch(`${BASE_URL}/api/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alice Johnson',
          email: 'alice@example.com',
          company: 'Enterprise Corp',
          industry: 'Healthcare',
          jobTitle: 'CTO',
          phone: '+1-555-123-4567',
          preferredDate: futureDateString,
          timezone: 'America/New_York',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.demoDate).toBeDefined();
    });

    it('should reject demo booking with missing required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alice Johnson',
          email: 'alice@example.com',
          // missing company, industry, jobTitle, phone, preferredDate, timezone
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject demo booking with past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const pastDateString = pastDate.toISOString().split('T')[0];

      const response = await fetch(`${BASE_URL}/api/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bob Smith',
          email: 'bob@example.com',
          company: 'Test Inc',
          industry: 'Airlines & Travel',
          jobTitle: 'VP Engineering',
          phone: '+1-555-999-8888',
          preferredDate: pastDateString,
          timezone: 'America/Chicago',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('future');
    });

    it('should reject demo booking with invalid email', async () => {
      const response = await fetch(`${BASE_URL}/api/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'not-an-email',
          company: 'Test Corp',
          industry: 'Banking & Financial Services',
          jobTitle: 'CIO',
          phone: '+1-234-567-8900',
          preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          timezone: 'UTC',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid email');
    });

    it('should accept demo booking with optional message field', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 10);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const response = await fetch(`${BASE_URL}/api/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Carol White',
          email: 'carol@example.com',
          company: 'Startup Ltd',
          industry: 'Healthcare',
          jobTitle: 'Other',
          phone: '+1-777-123-4567',
          preferredDate: futureDateString,
          timezone: 'America/Los_Angeles',
          message: 'I have specific questions about COBOL modernization',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  // =====================================================
  // ASSESSMENT FORM API TESTS
  // =====================================================
  describe('POST /api/assessment', () => {
    it('should successfully submit assessment with valid data', async () => {
      const response = await fetch(`${BASE_URL}/api/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'David Brown',
          email: 'david@example.com',
          company: 'Legacy Systems Inc',
          industry: 'Banking & Financial Services',
          systemType: 'COBOL Mainframes',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should reject assessment with missing required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'David Brown',
          email: 'david@example.com',
          // missing company, industry, systemType
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject assessment with invalid email', async () => {
      const response = await fetch(`${BASE_URL}/api/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'invalid@',
          company: 'Test Corp',
          industry: 'Healthcare',
          systemType: 'Legacy Databases',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid email');
    });

    it('should accept assessment with optional cobolLines field', async () => {
      const response = await fetch(`${BASE_URL}/api/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Emma Davis',
          email: 'emma@example.com',
          company: 'Financial Giant',
          industry: 'Banking & Financial Services',
          systemType: 'COBOL Mainframes',
          cobolLines: 5000000,
          challenges: 'Talent shortage, compliance requirements',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  // =====================================================
  // RISK BRIEFING FORM API TESTS
  // =====================================================
  describe('POST /api/risk-briefing', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const futureDateString = futureDate.toISOString().split('T')[0];

    it('should successfully submit risk briefing with valid data', async () => {
      const response = await fetch(`${BASE_URL}/api/risk-briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Frank Miller',
          email: 'frank@example.com',
          company: 'Risk Assessment Corp',
          industry: 'Airlines & Travel',
          phone: '+1-888-555-1212',
          preferredDate: futureDateString,
          preferredTime: '09:00',
          timezone: 'America/New_York',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.briefingDate).toBeDefined();
    });

    it('should reject risk briefing with missing required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/risk-briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Frank Miller',
          email: 'frank@example.com',
          // missing company, industry, phone, preferredDate, preferredTime, timezone
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject risk briefing with past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);
      const pastDateString = pastDate.toISOString().split('T')[0];

      const response = await fetch(`${BASE_URL}/api/risk-briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Grace Lee',
          email: 'grace@example.com',
          company: 'Old Tech Ltd',
          industry: 'Government',
          phone: '+1-999-888-7777',
          preferredDate: pastDateString,
          preferredTime: '14:00',
          timezone: 'America/Denver',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('future');
    });

    it('should reject risk briefing with invalid email', async () => {
      const response = await fetch(`${BASE_URL}/api/risk-briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Henry Wong',
          email: 'henry-invalid-email',
          company: 'Test Inc',
          industry: 'Healthcare',
          phone: '+1-333-444-5555',
          preferredDate: futureDateString,
          preferredTime: '10:00',
          timezone: 'UTC',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid email');
    });

    it('should accept risk briefing with optional message field', async () => {
      const response = await fetch(`${BASE_URL}/api/risk-briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Iris Johnson',
          email: 'iris@example.com',
          company: 'Insurance Co',
          industry: 'Insurance',
          phone: '+1-666-777-8888',
          preferredDate: futureDateString,
          preferredTime: '15:00',
          timezone: 'America/Chicago',
          message: 'Interested in compliance risk assessment',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  // =====================================================
  // ROI CALCULATOR API TESTS
  // =====================================================
  describe('POST /api/roi-calculator', () => {
    it('should successfully submit ROI calculation with valid data', async () => {
      const response = await fetch(`${BASE_URL}/api/roi-calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'jack@example.com',
          company: 'Finance Corp',
          currentCost: 2500000,
          migrationMethod: 'phased-approach',
          timelineMonths: 18,
          estimatedSavings: 1500000,
          roiPercentage: 60,
          breakEvenMonths: 12,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.calculation).toBeDefined();
    });

    it('should reject ROI calculation with missing required numeric fields', async () => {
      const response = await fetch(`${BASE_URL}/api/roi-calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'jack@example.com',
          company: 'Finance Corp',
          currentCost: 2500000,
          // missing other required fields
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject ROI calculation with invalid email', async () => {
      const response = await fetch(`${BASE_URL}/api/roi-calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid email',
          company: 'Finance Corp',
          currentCost: 2500000,
          migrationMethod: 'phased-approach',
          timelineMonths: 18,
          estimatedSavings: 1500000,
          roiPercentage: 60,
          breakEvenMonths: 12,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid email');
    });

    it('should accept ROI calculation without email (optional field)', async () => {
      const response = await fetch(`${BASE_URL}/api/roi-calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentCost: 5000000,
          migrationMethod: 'big-bang',
          timelineMonths: 12,
          estimatedSavings: 3000000,
          roiPercentage: 60,
          breakEvenMonths: 10,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
