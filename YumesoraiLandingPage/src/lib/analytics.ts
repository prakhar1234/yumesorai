/**
 * Plausible Analytics custom event helpers.
 *
 * Plausible exposes a global `plausible()` function after the script loads.
 * These helpers provide type-safe wrappers for the custom events tracked
 * across the Yumesorai site.
 */

type PlausibleArgs = [string, { callback?: () => void; props?: Record<string, string | number | boolean> }?];

declare global {
  interface Window {
    plausible?: (...args: PlausibleArgs) => void;
  }
}

function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  if (typeof window !== "undefined" && window.plausible) {
    window.plausible(name, { props });
  }
}

// ---- Custom events ----

export function trackBriefingRequested(source?: string) {
  trackEvent("briefing_requested", source ? { source } : undefined);
}

export function trackCalculatorSubmitted(calculator: string) {
  trackEvent("calculator_submitted", { calculator });
}

export function trackPdfDownloaded(document: string) {
  trackEvent("pdf_downloaded", { document });
}

export function trackFormSubmitted(form: string) {
  trackEvent("form_submitted", { form });
}

export function trackCTAClicked(cta: string, page: string) {
  trackEvent("cta_clicked", { cta, page });
}

export function trackIndustryPageViewed(industry: string) {
  trackEvent("industry_page_viewed", { industry });
}

export function trackResourceViewed(resource: string, type: string) {
  trackEvent("resource_viewed", { resource, type });
}
