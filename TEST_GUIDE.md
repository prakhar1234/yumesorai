# Form Automation Testing Guide

This guide covers automated testing for all forms in the Yumesorai website.

## Overview

The test suite includes:
- **API Integration Tests** - Test form submission endpoints with various inputs
- **E2E Tests** - Test actual user interactions with forms in the browser

### Forms Covered

1. **Contact Form** (`/contact`) - General inquiry form
2. **Demo Booking Form** (`/demo`) - Schedule platform walkthrough
3. **Assessment Form** (`/assessment`) - Multi-step legacy system assessment
4. **Risk Briefing Form** (`/risk-briefing`) - Schedule risk assessment briefing
5. **ROI Calculator** (`/tools/roi-calculator`) - Calculate modernization ROI

---

## API Integration Tests

### Location
`__tests__/api/forms.test.ts`

### Test Framework
**Vitest** - Fast unit test framework

### Running API Tests

```bash
# Run all API tests
npm run test:api

# Run all tests with UI
npm run test:ui

# Run tests in watch mode
npm run test -- --watch
```

### What's Tested

#### Contact Form API (`POST /api/contact`)
- ✅ Valid submission with all fields
- ✅ Missing required fields validation
- ✅ Invalid email format rejection
- ✅ Optional phone field acceptance
- ✅ Invalid JSON rejection

#### Demo Booking API (`POST /api/demo`)
- ✅ Valid submission with future date
- ✅ Missing required fields validation
- ✅ Past date rejection
- ✅ Invalid email format rejection
- ✅ Optional message field acceptance

#### Assessment API (`POST /api/assessment`)
- ✅ Valid submission
- ✅ Missing required fields validation
- ✅ Invalid email rejection
- ✅ Optional fields (cobolLines, challenges)

#### Risk Briefing API (`POST /api/risk-briefing`)
- ✅ Valid submission with future date/time
- ✅ Missing required fields validation
- ✅ Past date rejection
- ✅ Invalid email rejection
- ✅ Optional message field acceptance

#### ROI Calculator API (`POST /api/roi-calculator`)
- ✅ Valid numeric calculation
- ✅ Missing required numeric fields
- ✅ Invalid email format
- ✅ Optional email field acceptance

---

## E2E (End-to-End) Tests

### Location
`e2e/forms.spec.ts`

### Test Framework
**Playwright** - Modern browser automation

### Running E2E Tests

```bash
# Run all E2E tests in headless mode
npm run test:e2e

# Run E2E tests with UI (interactive)
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/forms.spec.ts

# Run tests in debug mode
npx playwright test --debug
```

### Test Coverage

#### Contact Form E2E
- ✅ Load page and fill form
- ✅ Validate email format
- ✅ Validate required fields
- ✅ Successful submission with success message

#### Demo Booking Form E2E
- ✅ Load page and fill booking form
- ✅ Prevent past date selection
- ✅ Successful submission

#### Assessment Form E2E
- ✅ Load page and navigate multi-step form
- ✅ Fill all steps with valid data
- ✅ Successful completion

#### Risk Briefing Form E2E
- ✅ Load page and fill form
- ✅ Select date and time
- ✅ Successful submission

#### ROI Calculator E2E
- ✅ Load calculator page
- ✅ Fill in calculation fields
- ✅ Submit and view results

#### Accessibility Tests
- ✅ All forms have proper labels
- ✅ Forms are responsive on mobile (375x667)
- ✅ Submit buttons are visible and clickable

#### Navigation Tests
- ✅ Navigate between different forms
- ✅ Form links work correctly

### Browser Coverage

Tests run on:
- **Desktop**
  - Chrome
  - Firefox
  - Safari
- **Mobile**
  - Chrome (Pixel 5)
  - Safari (iPhone 12)

---

## Running All Tests

### Combined Test Run
```bash
# Run API tests + E2E tests
npm run test:all
```

### Continuous Integration (CI)

For CI/CD pipelines:

```bash
# Run with CI environment variable
CI=true npm run test:all

# This will:
# - Run tests in non-parallel mode
# - Retry failed tests up to 2 times
# - Use existing server if available
```

---

## Test Configuration

### Vitest Config (`vitest.config.ts`)
- Environment: Node.js
- Globals: Enabled for `describe`, `it`, `expect`
- Coverage: V8 reporter with HTML output

### Playwright Config (`playwright.config.ts`)
- Base URL: `http://localhost:3000` (configurable)
- Test directory: `./e2e`
- Reporter: HTML with traces and screenshots on failure
- Automatic server startup: `npm run dev`
- Reuse existing server in development

---

## Environment Variables

```bash
# Override base URL for tests
TEST_BASE_URL=https://your-staging-url.com npm run test:e2e
```

---

## Viewing Test Results

### API Test Results
```bash
npm run test:api

# Output shows:
# ✓ Test name
# ✗ Failed test with error
# Coverage report in console
```

### E2E Test Results
```bash
npm run test:e2e

# HTML report automatically generated at:
# playwright-report/index.html

# Open it with:
npx playwright show-report
```

### Screenshots & Traces
- **Screenshots**: Captured only on test failure
- **Traces**: Recorded for debugging (`.zip` format)
- Location: `test-results/` directory

---

## Debugging Tests

### Debug API Tests
```bash
# Add console.logs and run
npm run test:api -- --reporter=verbose
```

### Debug E2E Tests
```bash
# Interactive debugger
npx playwright test --debug

# With step-by-step execution in Inspector
```

### View Live Test Execution
```bash
npm run test:e2e:headed

# Browser will stay open showing form interactions
```

---

## Test Data

### Sample Valid Email Addresses
- `user@example.com`
- `john.doe@example.com`
- `test@company.com`

### Sample Valid Companies
- Acme Corporation
- Enterprise Solutions
- Tech Corp
- Legacy Systems Inc

### Sample Valid Industries
- Healthcare
- Airlines & Travel
- Banking & Financial Services
- Insurance
- Government

### Sample Valid Job Titles
- CTO
- CIO
- VP Engineering
- VP Operations
- IT Director

---

## Troubleshooting

### Tests Not Finding Elements
1. Update selectors in test file to match current HTML
2. Use `playwright codegen` to generate selectors:
   ```bash
   npx playwright codegen http://localhost:3000/contact
   ```

### Server Connection Issues
```bash
# Make sure dev server is running
npm run dev

# In another terminal
npm run test:e2e
```

### Port Already in Use
```bash
# Kill existing process on port 3000
lsof -ti:3000 | xargs kill -9

# Then run tests
npm run test:e2e
```

### Form Selectors Changed
1. Open your form page in browser
2. Inspect the form elements
3. Update selectors in E2E test file
4. Re-run tests

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci --legacy-peer-deps
      - run: npm run test:api
      - run: npm run test:e2e
```

---

## Best Practices

1. **API Tests First** - Test endpoints before E2E
2. **Use Descriptive Names** - Test names should explain what's tested
3. **Keep Tests Independent** - Each test should work standalone
4. **Test Edge Cases** - Invalid emails, past dates, missing fields
5. **Regular Maintenance** - Update selectors when form HTML changes
6. **Run Before Deploy** - Always run full test suite before production push

---

## Adding New Tests

### Add API Test
1. Open `__tests__/api/forms.test.ts`
2. Add new `describe` block for your endpoint
3. Add test cases with valid/invalid data
4. Run: `npm run test:api`

### Add E2E Test
1. Open `e2e/forms.spec.ts`
2. Add new `test` block
3. Use Playwright selectors to interact with form
4. Assert success/error states
5. Run: `npm run test:e2e`

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/)
- [Playwright Code Generation](https://playwright.dev/docs/codegen)

---

## Contact

For issues or questions about tests, check:
1. Test file comments
2. API route implementation
3. Form HTML structure
4. Console output and traces
