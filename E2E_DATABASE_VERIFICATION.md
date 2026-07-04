# E2E + Database Verification Tests

## Overview

The testing agent now has **comprehensive E2E + database verification** capabilities. Tests not only verify API responses and UI interactions but also confirm that data is properly persisted to the PostgreSQL database.

## What Changed

### 1. New Test File: `e2e/forms-with-db-verification.spec.ts`

Enhanced E2E tests that:
- Submit data via API endpoints
- Query the database to verify persistence
- Validate data integrity and field values
- Test error scenarios (invalid data should NOT be saved)
- Verify row counts and statistics

### 2. New API Endpoint: `POST /api/db-query`

Secure database query endpoint for testing:
- **Only available in development/test environments** (blocked in production)
- Whitelisted table access (no arbitrary queries)
- SELECT-only operations (no INSERT, UPDATE, DELETE)
- Returns query results for test assertions

### 3. Testing Agent Integration

The testing agent (`test-runner.ts`) executes these tests via:

```bash
npm run test:e2e -- --grep "Database Verification"
```

Tests run with:
- Playwright browser automation
- Database verification via API queries
- Automatic data isolation (unique emails per test)
- Retry logic for flaky tests

---

## Test Structure

### Contact Form Tests

```typescript
test('should save contact submission to database', async ({ page }) => {
  // 1. Submit form via API
  const apiResponse = await fetch(`${BASE_URL}/api/contact`, {
    method: 'POST',
    body: JSON.stringify(testData),
  });

  // 2. Verify API response
  expect(apiResponse.status).toBe(201);

  // 3. Query database for the submitted data
  const dbResults = await queryDatabase(
    `SELECT * FROM contact_submissions WHERE email = '${testData.email}'`
  );

  // 4. Assert data integrity
  expect(dbResults[0].name).toBe(testData.name);
  expect(dbResults[0].email).toBe(testData.email);
});
```

### Validation Error Tests

```typescript
test('should reject invalid email before database insertion', async () => {
  // Submit with invalid email
  const response = await fetch(`${BASE_URL}/api/contact`, {
    method: 'POST',
    body: JSON.stringify({ email: 'invalid-format' }),
  });

  // Verify API rejects it
  expect(response.status).toBe(400);

  // Verify data was NOT saved to database
  const dbResults = await queryDatabase(
    `SELECT * FROM contact_submissions WHERE email = 'invalid-format'`
  );
  expect(dbResults.length).toBe(0);
});
```

---

## Test Coverage

### Forms Tested

| Form | Tests | Coverage |
|------|-------|----------|
| Contact | 3 | Submission, validation, missing fields |
| Demo Booking | 2 | Submission, date validation |
| Assessment | 1 | Submission with database verification |
| Risk Briefing | 1 | Submission with database verification |
| ROI Calculator | 1 | Submission with database verification |
| Cross-Form | 1 | Statistics consistency |

**Total: 9 database verification tests**

### Test Types

1. **Happy Path Tests**
   - Valid data submitted
   - Data persists to database
   - Correct fields saved
   - Timestamps generated

2. **Validation Tests**
   - Invalid email rejected before save
   - Missing required fields rejected
   - Past dates rejected
   - Invalid data NOT in database

3. **Integration Tests**
   - API response + database state consistency
   - Statistics endpoint accuracy
   - Cross-form submission tracking

---

## Running the Tests

### Run All Database Verification Tests

```bash
npm run test:e2e -- --grep "Database Verification"
```

### Run Specific Test Suite

```bash
# Contact form tests
npm run test:e2e -- --grep "Contact Form - Database Verification"

# Demo booking tests
npm run test:e2e -- --grep "Demo Booking Form - Database Verification"
```

### Run with Headed Browser (see what's happening)

```bash
npm run test:e2e:headed -- --grep "Database Verification"
```

### Run All E2E Tests (including database verification)

```bash
npm run test:e2e
```

---

## How Testing Agent Uses These Tests

### Automated Testing Flow

1. **Code Push to GitHub**
   - Webhook triggers testing agent
   - Agent identifies affected features

2. **Feature Dependency Resolution**
   - Determines which forms depend on database
   - Plans test execution order

3. **Railway Deployment Check**
   - Waits for deployment to complete
   - Checks production environment accessibility

4. **Test Execution**
   ```
   Parallel Group 1: Contact Form Tests
   ├─ Load contact page
   ├─ Submit valid data
   └─ Verify database persistence

   Parallel Group 2: Demo Booking Tests
   ├─ Submit future date
   └─ Verify database persistence

   ... (other forms)
   ```

5. **Results Reporting**
   - Success: ✅ Form data persists
   - Failure: ❌ Data not found in database
   - Flaky: ⚠️ Inconsistent results

---

## Database Query Examples

### Verify Contact Submission

```typescript
const results = await queryDatabase(
  `SELECT * FROM contact_submissions
   WHERE email = 'test@example.com'
   LIMIT 1`
);

// Assertions
expect(results[0].name).toBe('John Doe');
expect(results[0].company).toBe('Acme Corp');
expect(results[0].created_at).toBeDefined();
```

### Verify Submission Count

```typescript
const results = await queryDatabase(
  `SELECT COUNT(*) as count FROM contact_submissions`
);

expect(parseInt(results[0].count)).toBeGreaterThan(0);
```

### Verify Data Not Saved (Validation Error)

```typescript
const results = await queryDatabase(
  `SELECT * FROM contact_submissions
   WHERE email = 'invalid@email'`
);

expect(results.length).toBe(0); // Should NOT be saved
```

---

## Security Considerations

### API Endpoint Protection

The `/api/db-query` endpoint has security measures:

1. **Environment Check**
   - Only works in development/test
   - Blocked in production (`NODE_ENV === 'production'`)

2. **Whitelisted Tables**
   - Only allows queries on form submission tables
   - Prevents access to system tables

3. **Operation Restrictions**
   - SELECT queries only
   - No INSERT, UPDATE, DELETE, DROP, ALTER
   - Prevents data modification during tests

4. **Invalid Queries Blocked**
   ```typescript
   // ❌ BLOCKED: Arbitrary table
   SELECT * FROM pg_database;

   // ❌ BLOCKED: Modification attempt
   INSERT INTO contact_submissions VALUES (...);

   // ✅ ALLOWED: Verification query
   SELECT * FROM contact_submissions WHERE email = '...';
   ```

---

## Troubleshooting

### Test Fails: "Database query failed"

**Cause**: Test environment cannot reach database

**Solution**:
1. Verify DATABASE_URL is set in `.env.local`
2. Check PostgreSQL is running and accessible
3. Ensure tables are created: `npm run db:migrate`

### Test Fails: "Data not found in database"

**Cause**: API submission succeeded but database save failed

**Diagnosis**:
1. Check API endpoint logs
2. Verify database connection is working
3. Run manual test: `curl -X POST http://localhost:3000/api/contact`

### "Only SELECT queries are allowed"

**Cause**: Test tried to run INSERT/UPDATE/DELETE

**Solution**: Only use SELECT queries in database verification

---

## Extending the Tests

### Adding New Form Test

```typescript
test.describe('New Form - Database Verification', () => {
  test('should save new form to database', async ({ page }) => {
    const testData = {
      field1: 'value1',
      field2: 'value2',
    };

    // Submit API
    const apiResponse = await fetch(`${BASE_URL}/api/new-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    expect(apiResponse.status).toBe(201);

    // Verify database
    const dbResults = await queryDatabase(
      `SELECT * FROM new_form_submissions WHERE field1 = '${testData.field1}'`
    );

    expect(dbResults.length).toBe(1);
    expect(dbResults[0].field2).toBe(testData.field2);
  });
});
```

### Custom Query Helper

```typescript
async function verifySubmission(
  table: string,
  email: string,
  expectedData: Record<string, any>
) {
  const results = await queryDatabase(
    `SELECT * FROM ${table} WHERE email = '${email}' LIMIT 1`
  );

  expect(results.length).toBe(1);

  Object.entries(expectedData).forEach(([key, value]) => {
    expect(results[0][key]).toBe(value);
  });
}
```

---

## Performance Notes

### Test Execution Time

- Database verification adds ~100-200ms per test
- Queries run in parallel groups for efficiency
- Total suite: ~2-3 seconds

### Database Load

- Each test uses unique email (no conflicts)
- Auto-cleanup optional (data can persist for analysis)
- Pool connection: max 20 concurrent

---

## Integration with Testing Agent

The testing agent automatically:

1. **Plans tests** based on affected features
2. **Executes tests** in dependency order
3. **Waits for deployments** before testing
4. **Reports results** with database verification status
5. **Tracks metrics** (success rate, flaky tests)

Example testing agent output:

```
Testing Contact Form...
├─ ✅ API submission successful
├─ ✅ Data found in database
├─ ✅ Fields verified
└─ Duration: 245ms

Testing Demo Booking...
├─ ✅ API submission successful
├─ ✅ Data found in database
├─ ✅ Fields verified
└─ Duration: 198ms

Result: 9/9 tests passed ✅
Database Integrity: 100% ✅
```

---

## Next Steps

1. **Run tests locally** to verify setup
2. **Monitor test results** on production deployments
3. **Add more database verification tests** as new forms are added
4. **Set up notifications** when database persistence fails
5. **Create dashboard** to track form submission trends
