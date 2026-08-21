import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Yumesorai",
  description:
    "Learn how Yumesorai collects, uses, and protects your personal data. GDPR, CCPA, and DPDP compliant.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">
        Last updated: 20 May 2026
      </p>

      <section className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
        {/* ---- Introduction ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            1. Introduction
          </h2>
          <p>
            Yumesorai (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects
            your privacy and is committed to protecting your personal data. This
            Privacy Policy explains how we collect, use, disclose, and safeguard
            your information when you visit our website and use our services.
          </p>
          <p className="mt-2">
            This policy applies to visitors worldwide and addresses obligations
            under the EU General Data Protection Regulation (GDPR), the
            California Consumer Privacy Act (CCPA), and India&rsquo;s Digital
            Personal Data Protection Act (DPDP).
          </p>
        </div>

        {/* ---- Data We Collect ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            2. Data We Collect
          </h2>
          <h3 className="font-medium mt-3 mb-1">
            2.1 Information You Provide
          </h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Contact details submitted through forms (name, email, phone, company).</li>
            <li>Messages or inquiries sent via our contact or briefing request forms.</li>
            <li>Information provided when using our interactive calculators or tools.</li>
          </ul>

          <h3 className="font-medium mt-3 mb-1">
            2.2 Automatically Collected Data
          </h3>
          <p>
            We use <strong>Plausible Analytics</strong>, a privacy-first
            analytics platform that does not use cookies and does not collect
            personal data. Plausible collects:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Page URL and referrer</li>
            <li>Browser and operating system (aggregated, non-identifying)</li>
            <li>Country of origin (derived from IP, which is discarded)</li>
            <li>Custom events (e.g., form submissions, downloads) without personal identifiers</li>
          </ul>
          <p className="mt-2">
            No IP addresses are stored. No cross-site or cross-device tracking
            occurs. For details, see{" "}
            <a
              href="https://plausible.io/data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              Plausible&rsquo;s Data Policy
            </a>
            .
          </p>
        </div>

        {/* ---- How We Use Data ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            3. How We Use Your Data
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To respond to your inquiries and provide requested services.</li>
            <li>To improve our website, content, and user experience.</li>
            <li>To send communications you have opted into (newsletters, updates).</li>
            <li>To comply with legal obligations.</li>
          </ul>
        </div>

        {/* ---- Legal Basis (GDPR) ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            4. Legal Basis for Processing (GDPR)
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Consent</strong> &ndash; where you have given explicit
              consent (e.g., subscribing to communications).
            </li>
            <li>
              <strong>Legitimate interest</strong> &ndash; to improve our
              services and respond to inquiries.
            </li>
            <li>
              <strong>Contractual necessity</strong> &ndash; to fulfill services
              you have requested.
            </li>
            <li>
              <strong>Legal obligation</strong> &ndash; where required by
              applicable law.
            </li>
          </ul>
        </div>

        {/* ---- Cookies ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            5. Cookies &amp; Tracking
          </h2>
          <p>
            Our website does <strong>not</strong> use tracking cookies. Plausible
            Analytics operates without cookies and is fully compliant with GDPR,
            CCPA, and PECR without requiring cookie consent for analytics.
          </p>
          <p className="mt-2">
            We may use essential cookies strictly necessary for the functioning
            of the website (e.g., session management). These do not require
            consent under applicable privacy laws.
          </p>
        </div>

        {/* ---- Data Sharing ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            6. Data Sharing &amp; Third Parties
          </h2>
          <p>
            We do not sell, rent, or trade your personal information. We may
            share data with:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Service providers who assist in operating our website and services (under data processing agreements).</li>
            <li>Legal authorities when required by law or to protect our rights.</li>
          </ul>
        </div>

        {/* ---- Data Retention ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            7. Data Retention
          </h2>
          <p>
            We retain personal data only as long as necessary to fulfill the
            purposes described in this policy, or as required by law. Contact
            form submissions are retained for up to 24 months unless you request
            earlier deletion.
          </p>
        </div>

        {/* ---- GDPR Rights ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            8. Your Rights Under GDPR (EEA Residents)
          </h2>
          <p>If you are in the European Economic Area, you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Access</strong> your personal data.</li>
            <li><strong>Rectify</strong> inaccurate or incomplete data.</li>
            <li><strong>Erase</strong> your personal data (&quot;right to be forgotten&quot;).</li>
            <li><strong>Restrict</strong> processing of your data.</li>
            <li><strong>Data portability</strong> &ndash; receive your data in a structured, machine-readable format.</li>
            <li><strong>Object</strong> to processing based on legitimate interest.</li>
            <li><strong>Withdraw consent</strong> at any time.</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us at{" "}
            <a href="mailto:privacy@yumesorai.com" className="underline hover:text-blue-600">
              privacy@yumesorai.com
            </a>
            . We will respond within 30 days.
          </p>
        </div>

        {/* ---- CCPA Rights ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            9. Your Rights Under CCPA (California Residents)
          </h2>
          <p>California residents have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Know</strong> what personal information is collected and how it is used.</li>
            <li><strong>Delete</strong> personal information held by us.</li>
            <li><strong>Opt-out</strong> of the sale of personal information. We do not sell personal data.</li>
            <li><strong>Non-discrimination</strong> for exercising your privacy rights.</li>
          </ul>
          <p className="mt-2">
            To submit a request, email{" "}
            <a href="mailto:privacy@yumesorai.com" className="underline hover:text-blue-600">
              privacy@yumesorai.com
            </a>
            .
          </p>
        </div>

        {/* ---- DPDP Rights ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            10. Your Rights Under DPDP (Indian Residents)
          </h2>
          <p>
            Under India&rsquo;s Digital Personal Data Protection Act, 2023, you
            have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Access</strong> a summary of your personal data and processing activities.</li>
            <li><strong>Correction and erasure</strong> of inaccurate or unnecessary data.</li>
            <li><strong>Grievance redressal</strong> &ndash; file a complaint with our grievance officer.</li>
            <li><strong>Nominate</strong> another person to exercise your rights on your behalf.</li>
          </ul>
          <p className="mt-2">
            Our Grievance Officer can be reached at{" "}
            <a href="mailto:privacy@yumesorai.com" className="underline hover:text-blue-600">
              privacy@yumesorai.com
            </a>
            .
          </p>
        </div>

        {/* ---- International Transfers ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            11. International Data Transfers
          </h2>
          <p>
            Your data may be transferred to and processed in countries outside
            your jurisdiction. We ensure appropriate safeguards are in place,
            including Standard Contractual Clauses (SCCs) or equivalent
            mechanisms, to protect your data in accordance with applicable law.
          </p>
        </div>

        {/* ---- Security ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            12. Data Security
          </h2>
          <p>
            We implement appropriate technical and organizational measures to
            protect your personal data, including encryption in transit (TLS),
            access controls, and regular security assessments.
          </p>
        </div>

        {/* ---- Children ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            13. Children&rsquo;s Privacy
          </h2>
          <p>
            Our services are not directed at individuals under the age of 16. We
            do not knowingly collect personal data from children.
          </p>
        </div>

        {/* ---- Changes ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            14. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be
            posted on this page with an updated &quot;Last updated&quot; date. We
            encourage you to review this policy periodically.
          </p>
        </div>

        {/* ---- Contact ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            15. Contact Us
          </h2>
          <p>
            For privacy-related inquiries or to exercise your data rights,
            contact us at:
          </p>
          <address className="not-italic mt-2">
            <strong>Yumesorai</strong>
            <br />
            Email:{" "}
            <a href="mailto:privacy@yumesorai.com" className="underline hover:text-blue-600">
              privacy@yumesorai.com
            </a>
          </address>
        </div>
      </section>
    </main>
  );
}
