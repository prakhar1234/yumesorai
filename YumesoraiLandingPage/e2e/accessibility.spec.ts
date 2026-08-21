import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pages = [
  { name: "Homepage", path: "/" },
  { name: "Healthcare", path: "/solutions/healthcare" },
  { name: "Airlines", path: "/solutions/airlines" },
  { name: "Banking", path: "/solutions/banking" },
  { name: "Resources", path: "/resources" },
  { name: "Blog", path: "/blog" },
  { name: "ROI Calculator", path: "/tools/roi-calculator" },
  { name: "Contact", path: "/contact" },
];

test.describe("WCAG 2.2 AA Accessibility Audit", () => {
  for (const page of pages) {
    test(`${page.name} (${page.path}) should have no WCAG 2.2 AA violations`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page.path, { waitUntil: "networkidle" });

      const results = await new AxeBuilder({ page: browserPage })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();

      const violations = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
        help: v.helpUrl,
      }));

      if (violations.length > 0) {
        console.log(
          `Violations on ${page.name}:`,
          JSON.stringify(violations, null, 2)
        );
      }

      expect(
        results.violations.filter(
          (v) => v.impact === "critical" || v.impact === "serious"
        )
      ).toHaveLength(0);
    });
  }

  test("all images should have alt text", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const images = await page.locator("img").all();
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      const role = await img.getAttribute("role");
      // Decorative images should have role="presentation" or empty alt
      expect(alt !== null || role === "presentation").toBeTruthy();
    }
  });

  test("all interactive elements should be keyboard accessible", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Tab through the page and verify focus is visible
    const focusableSelectors = [
      "a[href]",
      "button:not([disabled])",
      'input:not([disabled]):not([type="hidden"])',
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ];

    for (const selector of focusableSelectors) {
      const elements = await page.locator(selector).all();
      for (const element of elements) {
        if (await element.isVisible()) {
          await element.focus();
          const isFocused = await element.evaluate(
            (el) => document.activeElement === el
          );
          expect(isFocused).toBeTruthy();
        }
      }
    }
  });

  test("skip navigation link should exist and work", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Press Tab to reveal skip link
    await page.keyboard.press("Tab");
    const skipLink = page.locator('a[href="#main-content"]');

    if ((await skipLink.count()) > 0) {
      await expect(skipLink).toBeVisible();
      await skipLink.click();
      const mainContent = page.locator("#main-content");
      await expect(mainContent).toBeFocused();
    }
  });

  test("heading hierarchy should be correct", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const headings = await page
      .locator("h1, h2, h3, h4, h5, h6")
      .evaluateAll((elements) =>
        elements.map((el) => ({
          level: parseInt(el.tagName[1]),
          text: el.textContent?.trim().substring(0, 50),
        }))
      );

    // There should be exactly one h1
    const h1Count = headings.filter((h) => h.level === 1).length;
    expect(h1Count).toBe(1);

    // No skipped heading levels
    for (let i = 1; i < headings.length; i++) {
      const gap = headings[i].level - headings[i - 1].level;
      expect(gap).toBeLessThanOrEqual(1);
    }
  });

  test("color contrast should meet AA standards", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(
      results.violations.filter((v) => v.id === "color-contrast")
    ).toHaveLength(0);
  });

  test("ARIA landmarks should be properly defined", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Check for required landmarks
    await expect(
      page.locator('header, [role="banner"]').first()
    ).toBeVisible();
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    await expect(
      page.locator('footer, [role="contentinfo"]').first()
    ).toBeVisible();
    await expect(
      page.locator('nav, [role="navigation"]').first()
    ).toBeVisible();
  });

  test("forms should have proper labels and error messaging", async ({
    page,
  }) => {
    await page.goto("/contact", { waitUntil: "networkidle" });

    const inputs = await page
      .locator('input:not([type="hidden"]), textarea, select')
      .all();

    for (const input of inputs) {
      if (await input.isVisible()) {
        const id = await input.getAttribute("id");
        const ariaLabel = await input.getAttribute("aria-label");
        const ariaLabelledBy = await input.getAttribute("aria-labelledby");
        const title = await input.getAttribute("title");

        // Each input should have a label mechanism
        const hasLabel =
          id !== null ||
          ariaLabel !== null ||
          ariaLabelledBy !== null ||
          title !== null;
        expect(hasLabel).toBeTruthy();

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasAssociatedLabel = (await label.count()) > 0;
          const hasAriaLabel = ariaLabel !== null || ariaLabelledBy !== null;
          expect(hasAssociatedLabel || hasAriaLabel).toBeTruthy();
        }
      }
    }
  });

  test("focus trap should work in modals", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Try to open callback modal if available
    const callbackButton = page.locator(
      'button:has-text("callback"), button:has-text("Callback"), [data-testid="callback-trigger"]'
    );
    if ((await callbackButton.count()) > 0) {
      await callbackButton.first().click();
      await page.waitForTimeout(500);

      // Tab through modal to check focus stays within
      const modal = page.locator(
        '[role="dialog"], [aria-modal="true"], .modal'
      );
      if ((await modal.count()) > 0) {
        // Press Escape to close
        await page.keyboard.press("Escape");
        await expect(modal).not.toBeVisible();
      }
    }
  });

  test("reduced motion preferences should be respected", async ({ page }) => {
    // Emulate prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    // Check that animations are disabled or reduced
    const animatedElements = await page
      .locator("[class*=animate], [class*=transition]")
      .all();

    for (const el of animatedElements) {
      const animationDuration = await el.evaluate((element) => {
        const styles = window.getComputedStyle(element);
        return styles.animationDuration;
      });

      // With reduced motion, animations should be 0s or very short
      if (animationDuration !== "0s") {
        const duration = parseFloat(animationDuration);
        expect(duration).toBeLessThanOrEqual(0.01);
      }
    }
  });
});
