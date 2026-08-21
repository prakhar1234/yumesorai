"use client";

import { useState, useEffect } from "react";

const CONSENT_KEY = "yumesorai_analytics_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "granted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "denied");
    setVisible(false);
    // Plausible is cookieless and privacy-first, so no cleanup needed.
    // If other trackers are added in the future, disable them here.
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-sm">
        <p className="flex-1 text-gray-700 dark:text-gray-300">
          We use privacy-friendly analytics (Plausible) to understand how our
          site is used. No personal data or cookies are stored.{" "}
          <a href="/privacy" className="underline hover:text-blue-600">
            Privacy Policy
          </a>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
