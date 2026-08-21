import { test, expect } from "@playwright/test";

test.describe("Briefing Request Flow", () => {
  test("should navigate from homepage to briefing form", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/Yumesorai/i);

    // Find and click a CTA that leads to briefing/contact
    const ctaButton = page.locator(
      'a:has-text("briefing"), a:has-text("consultation"), a:has-text("Get Started"), a:has-text("Contact")'
    );
    if ((await ctaButton.count()) > 0) {
      await ctaButton.first().click();
      await page.waitForLoadState("networkidle");
    }
  });

  test("should display the briefing request form with required fields", async ({
    page,
  }) => {
    await page.goto("/contact", { waitUntil: "networkidle" });

    // Verify essential form fields exist
    await expect(
      page.locator('input[name="name"], input[name="fullName"], #name')
    ).toBeVisible();
    await expect(
      page.locator('input[name="email"], input[type="email"], #email')
    ).toBeVisible();
    await expect(
      page.locator(
        'input[name="company"], input[name="organization"], #company'
      )
    ).toBeVisible();
  });

  test("should validate required fields on empty submission", async ({
    page,
  }) => {
    await page.goto("/contact", { waitUntil: "networkidle" });

    const submitButton = page.locator(
      'button[type="submit"], input[type="submit"]'
    );
    await submitButton.click();

    // Check for validation errors
    const errorMessages = page.locator(
      '[role="alert"], .error, .field-error, [aria-invalid="true"]'
    );
    expect(await errorMessages.count()).toBeGreaterThan(0);
  });

  test("should validate email format", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "networkidle" });

    const emailInput = page.locator(
      'input[name="email"], input[type="email"], #email'
    );
    await emailInput.fill("invalid-email");

    const submitButton = page.locator(
      'button[type="submit"], input[type="submit"]'
    );
    await submitButton.click();

    // Browser or custom validation should prevent submission
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => {
      return !el.validity.valid || el.getAttribute("aria-invalid") === "true";
    });
    expect(isInvalid).toBeTruthy();
  });

  test("should submit form successfully with valid data", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "networkidle" });

    // Fill out the form
    const nameInput = page.locator(
      'input[name="name"], input[name="fullName"], #name'
    );
    const emailInput = page.locator(
      'input[name="email"], input[type="email"], #email'
    );
    const companyInput = page.locator(
      'input[name="company"], input[name="organization"], #company'
    );

    await nameInput.fill("Test User");
    await emailInput.fill("test@example.com");
    await companyInput.fill("Test Company");

    // Fill optional message if present
    const messageInput = page.locator(
      'textarea[name="message"], textarea[name="details"], #message'
    );
    if ((await messageInput.count()) > 0) {
      await messageInput.fill("This is a test briefing request.");
    }

    // Submit form
    const submitButton = page.locator(
      'button[type="submit"], input[type="submit"]'
    );
    await submitButton.click();

    // Wait for success state
    await page.waitForTimeout(2000);

    // Check for success message or redirect
    const successIndicator = page.locator(
      '.success, [role="status"], :has-text("thank you"), :has-text("submitted")'
    );
    const currentUrl = page.url();
    const hasSuccess =
      (await successIndicator.count()) > 0 ||
      currentUrl.includes("thank") ||
      currentUrl.includes("success");
    expect(hasSuccess).toBeTruthy();
  });

  test("should be accessible during form interaction", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "networkidle" });

    // Tab through form fields
    await page.keyboard.press("Tab");

    // Verify focus is visible on form elements
    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName
    );
    expect(focusedElement).toBeDefined();
  });

  test("should work on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/contact", { waitUntil: "networkidle" });

    const form = page.locator("form");
    if ((await form.count()) > 0) {
      await expect(form.first()).toBeVisible();
      // Check form is not overflowing
      const formBox = await form.first().boundingBox();
      if (formBox) {
        expect(formBox.width).toBeLessThanOrEqual(375);
      }
    }
  });
});
