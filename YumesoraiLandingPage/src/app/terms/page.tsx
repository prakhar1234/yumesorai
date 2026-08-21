import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Yumesorai",
  description:
    "Terms and conditions for using Yumesorai's website and services.",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-10">
        Last updated: 20 May 2026
      </p>

      <section className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
        {/* ---- Acceptance ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using the Yumesorai website and services
            (&quot;Services&quot;), you agree to be bound by these Terms of
            Service (&quot;Terms&quot;). If you do not agree, please do not use
            our Services.
          </p>
        </div>

        {/* ---- Services ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            2. Description of Services
          </h2>
          <p>
            Yumesorai provides AI consulting and implementation services,
            including strategic briefings, interactive tools, calculators,
            resources, and related content through our website.
          </p>
        </div>

        {/* ---- Use ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            3. Acceptable Use
          </h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use the Services for any unlawful or unauthorized purpose.</li>
            <li>Attempt to gain unauthorized access to our systems or networks.</li>
            <li>Interfere with or disrupt the integrity or performance of the Services.</li>
            <li>Scrape, crawl, or use automated means to access the Services without our written consent.</li>
            <li>Transmit any viruses, malware, or harmful code.</li>
            <li>Impersonate any person or entity.</li>
          </ul>
        </div>

        {/* ---- IP ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            4. Intellectual Property
          </h2>
          <p>
            All content, materials, trademarks, and intellectual property on this
            website are owned by or licensed to Yumesorai. You may not
            reproduce, distribute, modify, or create derivative works without
            our prior written consent, except as permitted by law.
          </p>
        </div>

        {/* ---- User Content ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            5. User-Submitted Content
          </h2>
          <p>
            By submitting information through our forms, calculators, or other
            tools, you grant Yumesorai a non-exclusive, worldwide,
            royalty-free license to use that information solely for the purpose
            of providing the requested Services. We will handle your data in
            accordance with our{" "}
            <a href="/privacy" className="underline hover:text-blue-600">
              Privacy Policy
            </a>
            .
          </p>
        </div>

        {/* ---- Disclaimers ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            6. Disclaimers
          </h2>
          <p>
            The Services are provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, whether express or
            implied, including but not limited to warranties of merchantability,
            fitness for a particular purpose, and non-infringement.
          </p>
          <p className="mt-2">
            Content provided through our tools and calculators is for
            informational purposes only and does not constitute professional
            advice. Results from calculators are estimates and should not be
            relied upon as the sole basis for business decisions.
          </p>
        </div>

        {/* ---- Limitation of Liability ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            7. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by applicable law, Yumesorai shall
            not be liable for any indirect, incidental, special, consequential,
            or punitive damages, or any loss of profits or revenues, whether
            incurred directly or indirectly, arising from your use of the
            Services.
          </p>
        </div>

        {/* ---- Indemnification ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            8. Indemnification
          </h2>
          <p>
            You agree to indemnify, defend, and hold harmless Yumesorai, its
            officers, directors, employees, and agents from any claims,
            liabilities, damages, losses, or expenses arising from your use of
            the Services or violation of these Terms.
          </p>
        </div>

        {/* ---- Third-Party Links ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            9. Third-Party Links
          </h2>
          <p>
            Our website may contain links to third-party websites or services
            that are not owned or controlled by Yumesorai. We are not
            responsible for the content, privacy policies, or practices of any
            third-party sites.
          </p>
        </div>

        {/* ---- Governing Law ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            10. Governing Law
          </h2>
          <p>
            These Terms shall be governed by and construed in accordance with
            applicable law, without regard to conflict of law principles. Any
            disputes arising from these Terms shall be resolved in the
            competent courts of the applicable jurisdiction.
          </p>
        </div>

        {/* ---- Termination ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            11. Termination
          </h2>
          <p>
            We reserve the right to suspend or terminate your access to the
            Services at any time, without notice, for conduct that we determine
            violates these Terms or is harmful to other users, us, or third
            parties, or for any other reason.
          </p>
        </div>

        {/* ---- Changes ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            12. Changes to Terms
          </h2>
          <p>
            We may modify these Terms at any time. Changes will be effective
            upon posting to this page. Your continued use of the Services after
            changes are posted constitutes acceptance of the updated Terms.
          </p>
        </div>

        {/* ---- Contact ---- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            13. Contact Us
          </h2>
          <p>
            For questions about these Terms, contact us at:
          </p>
          <address className="not-italic mt-2">
            <strong>Yumesorai</strong>
            <br />
            Email:{" "}
            <a href="mailto:legal@yumesorai.com" className="underline hover:text-blue-600">
              legal@yumesorai.com
            </a>
          </address>
        </div>
      </section>
    </main>
  );
}
