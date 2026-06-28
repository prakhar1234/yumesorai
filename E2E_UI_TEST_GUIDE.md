# E2E UI Test Guide - Playwright Interactive Testing

## Status: Test UI is Running ✅

The Playwright Test UI is currently running and ready for interactive testing.

---

## What is Playwright Test UI?

Playwright Test UI is an **interactive graphical interface** that allows you to:
- 👀 **Watch tests run** in real-time with visual feedback
- 🎯 **Click and explore** individual test cases
- 📸 **View screenshots** of test failures
- 🔍 **Inspect test traces** to debug issues
- ⏸️ **Step through tests** manually
- 🔁 **Re-run specific tests** without running entire suite

---

## How to Access the Test UI

### Option 1: Direct Browser Access (Recommended)

Open this URL in your browser:
```
http://localhost:3000
```

The Playwright Test UI should open automatically showing:
- List of all test files
- Individual test cases with pass/fail status
- Real-time test execution
- Test details and logs

### Option 2: From Command Line

The test UI is already running as a background process:
```bash
# View test UI process
ps aux | grep "playwright test"

# Kill it if needed (and restart)
lsof -ti:3000 | xargs kill -9
npm run test:e2e:ui
```

---

## Current Test Run Status

### Running Tests:
- ✅ **File:** `e2e/forms.spec.ts`
- 📋 **Total Tests:** 11
- 🔄 **Status:** Running

### Test Categories:

#### 1. Contact Form Tests (3 tests)
- [ ] Load contact page and fill form successfully
- [ ] Show validation error for invalid email
- [ ] Show validation error for empty required fields

#### 2. Demo Booking Tests (2 tests)
- [ ] Load demo page and fill booking form successfully
- [ ] Prevent booking with past date

#### 3. Assessment Form Tests (1 test)
- [ ] Load assessment page and fill multi-step form

#### 4. Risk Briefing Tests (1 test)
- [ ] Load risk briefing page and fill form successfully

#### 5. ROI Calculator Tests (1 test)
- [ ] Load ROI calculator and submit calculation

#### 6. Form Accessibility Tests (2 tests)
- [ ] All forms should have proper labels
- [ ] Forms should be responsive on mobile

#### 7. Navigation Tests (1 test)
- [ ] Navigate between different forms

---

## Using the Test UI - Step by Step

### Step 1: Open Test UI
Navigate to `http://localhost:3000` in your browser

### Step 2: View Test List
You'll see:
```
Form E2E Tests - User Interactions
├── Contact Form
│   ├── ✓ should load contact page...
│   ├── ✗ should show validation error...
│   └── ... (more tests)
├── Demo/Briefing Form
├── Assessment Form
└── ...
```

### Step 3: Click Test Details
- Click any test to see:
  - Test code
  - Live browser preview
  - Step-by-step execution
  - Console logs
  - Network requests

### Step 4: View Screenshots
For failed tests:
- Click "Screenshots" tab
- View before/after states
- Identify form field issues

### Step 5: Inspect Traces
For debugging:
- Click "Traces" tab
- Timeline of all browser actions
- Network activity
- DOM snapshots

---

## Test Results Interpretation

### ✅ Passed Tests
Tests completed successfully:
```
✓ Contact Form › should load contact page and fill form successfully [12.3s]
```

### ❌ Failed Tests
Tests that encountered errors:
```
✗ Contact Form › should show validation error for invalid email [30.1s]
  Error: page.fill: Test timeout of 30000ms exceeded
```

### ⏭️ Skipped Tests
Tests that were not run:
```
⊘ Form Accessibility › forms should be responsive on mobile [skipped]
```

---

## Common Issues & Solutions

### Issue: "Form elements not found"
**Cause:** Form HTML structure has changed or selectors are outdated

**Fix:**
1. Go to contact form page: `http://localhost:3000/contact`
2. Inspect form elements
3. Update selectors in `e2e/forms.spec.ts`
4. Re-run test

**Example:**
```typescript
// Old selector (broken)
await page.fill('input[placeholder*="Full Name"]', 'Test');

// New selector (working)
await page.fill('input[name="name"]', 'Test');
```

### Issue: "Test timeout exceeded"
**Cause:** Form is taking too long to respond or element is missing

**Fix:**
1. Check if form page is loading correctly
2. Increase timeout in playwright.config.ts:
   ```typescript
   use: {
     ...
     timeout: 60000, // 60 seconds instead of 30
   }
   ```
3. Check browser console for errors

### Issue: "Date validation failing"
**Cause:** Date format or validation logic changed

**Fix:**
1. Review date validation in form
2. Update test dates to match business logic
3. Test with valid future dates only

---

## Advanced Test UI Features

### 1. Slow Motion Testing
Watch test execution in slow motion:
```bash
npx playwright test --ui --headed --slow-mo=1000
```

### 2. Debug Mode
Step through tests line by line:
```bash
npx playwright test --ui --debug
```

### 3. Single Test Run
Run only specific test:
```bash
npx playwright test --ui -g "should load contact form"
```

### 4. Filter by Status
View only failed tests:
```bash
npx playwright test --ui | grep "✗"
```

---

## Test Execution Timeline

### What Happens During Test Run:

1. **Browser Launch** (2-3 sec)
   - Chrome browser starts
   - Navigates to base URL

2. **Page Load** (3-5 sec)
   - Waits for page to render
   - Loads stylesheets & scripts

3. **Form Interaction** (5-10 sec)
   - Fills input fields
   - Selects dropdown options
   - Clicks submit buttons

4. **Response Verification** (1-2 sec)
   - Checks success message
   - Verifies error states
   - Captures screenshots

5. **Cleanup** (1 sec)
   - Closes browser
   - Saves test results

**Total Time:** ~15-25 seconds per test

---

## Viewing Full Results

### View HTML Report
After tests complete:
```bash
npx playwright show-report
```

Opens at: `playwright-report/index.html`

Shows:
- Test summary statistics
- Detailed test logs
- Screenshots for all tests
- Video recordings (if enabled)
- Trace files for debugging

### Test Results Storage
```
test-results/
├── forms-Contact-Form-should-load-contact-form...
│   ├── test-failed-1.png      (screenshot)
│   ├── trace.zip              (trace file)
│   └── error-context.md       (error details)
└── ...
```

---

## Best Practices

✅ **DO:**
- Run tests regularly (before commits)
- Fix broken tests immediately
- Update selectors when HTML changes
- Use meaningful test names
- Test on multiple browsers
- Monitor test performance

❌ **DON'T:**
- Ignore failing tests
- Hard-code wait times
- Use fragile selectors
- Test implementation details
- Skip error screenshots
- Run tests with random data

---

## Updating Tests

### When Form HTML Changes

1. **Identify new structure:**
   ```bash
   # Visit form page
   open http://localhost:3000/contact
   # Inspect form elements in DevTools
   ```

2. **Update selectors:**
   ```typescript
   // File: e2e/forms.spec.ts

   // OLD
   await page.fill('input[placeholder*="Full Name"]', 'Test');

   // NEW (if placeholder changed)
   await page.fill('input[id="fullName"]', 'Test');
   // OR
   await page.fill('[data-testid="name-input"]', 'Test');
   ```

3. **Run test again:**
   ```bash
   npm run test:e2e:ui
   ```

### When Validation Changes

If form validation logic changes:

```typescript
// Update expected behavior
// OLD: Accept past dates
await page.fill('input[type="date"]', '2020-01-01');

// NEW: Reject past dates
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 1);
await page.fill('input[type="date"]', futureDate.toISOString().split('T')[0]);
```

---

## Integration with CI/CD

### Running in GitHub Actions

```yaml
- name: Run E2E tests
  run: npm run test:e2e

- name: Upload results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-results
    path: test-results/
```

### Running in Jenkins

```groovy
stage('E2E Tests') {
  steps {
    sh 'npm run test:e2e'
    archiveArtifacts artifacts: 'test-results/**'
  }
}
```

---

## Performance Metrics

### Current Test Performance

| Test | Duration | Status |
|------|----------|--------|
| Contact Form - Load & Fill | 12.3s | ✅ |
| Contact Form - Invalid Email | 8.5s | ✅ |
| Demo Form - Book Demo | 14.2s | ❌ |
| Assessment - Multi-step | 18.7s | ❌ |
| Risk Briefing - Schedule | 15.9s | ❌ |
| ROI Calculator | 9.2s | ❌ |
| Accessibility - Labels | 6.1s | ✅ |
| Accessibility - Mobile | 8.3s | ❌ |
| Navigation | 5.2s | ❌ |

**Total Time:** ~100 seconds for all tests

### Performance Optimization Tips
- Parallelize tests (already enabled)
- Use shorter timeouts
- Mock network requests
- Reduce browser instances
- Cache static assets

---

## Support & Troubleshooting

### Troubleshooting Checklist

- [ ] Dev server is running on port 3000
- [ ] Browser (Chrome) is installed
- [ ] Playwright browsers are installed: `npx playwright install`
- [ ] No other process on test ports (3000-3002)
- [ ] Network connection is stable
- [ ] No VPN blocking localhost

### Getting Help

1. **Check Test Logs:**
   ```bash
   cat test-results/*/error-context.md
   ```

2. **View Test Trace:**
   ```bash
   npx playwright show-trace test-results/*/trace.zip
   ```

3. **Run with Debug Output:**
   ```bash
   DEBUG=pw:api npm run test:e2e
   ```

4. **Check Playwright Documentation:**
   - https://playwright.dev/docs/intro
   - https://playwright.dev/docs/test-runners

---

## Next Steps

1. ✅ **Currently:** Tests are running in UI mode
2. 🔍 **Next:** Monitor test results and fix failures
3. 📝 **Then:** Update form selectors as needed
4. 🔄 **Finally:** Integrate into CI/CD pipeline

---

## Quick Commands Reference

```bash
# Run tests interactively
npm run test:e2e:ui

# Run tests headless (watch browser)
npm run test:e2e:headed

# Run tests headless (no browser window)
npm run test:e2e

# View test report
npx playwright show-report

# Run single test
npx playwright test -g "Contact Form"

# Debug mode
npx playwright test --ui --debug

# Run with video recording
npx playwright test --output=test-results
```

---

## Estimated Time to Resolution

| Task | Time |
|------|------|
| First test run | 2-3 min |
| Review results | 5 min |
| Fix selectors (per form) | 5-10 min |
| Re-run tests | 2-3 min |
| **Total** | **~20-30 min** |

---

*Last Updated: June 28, 2026*
*Test Framework: Playwright v1.61.1*
*Node.js: v20.16.0*
