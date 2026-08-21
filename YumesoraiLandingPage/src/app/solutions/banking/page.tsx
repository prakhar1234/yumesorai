import type { Metadata } from "next";
import { industryData } from "@/lib/industry-data";
import { IndustryHero } from "@/components/industry/IndustryHero";
import { LegacyStackShowcase } from "@/components/industry/LegacyStackShowcase";
import { ComplianceTimeline } from "@/components/industry/ComplianceTimeline";
import { CTABanner } from "@/components/industry/CTABanner";

const data = industryData.banking;
const siteUrl = "https://www.yumesorai.com";

export const metadata: Metadata = {
  title: data.seo.title,
  description: data.seo.description,
  keywords: data.seo.keywords,
  openGraph: {
    title: `${data.seo.title} | Yumesorai`,
    description: data.seo.description,
    url: `${siteUrl}/solutions/banking`,
    type: "website",
    images: [
      {
        url: "/og-banking.png",
        width: 1200,
        height: 630,
        alt: "Yumesorai Core Banking Modernization",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${data.seo.title} | Yumesorai`,
    description: data.seo.description,
  },
  alternates: {
    canonical: `${siteUrl}/solutions/banking`,
  },
};

function BankingFAQSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function BankingServiceSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Core Banking Modernization",
    provider: {
      "@type": "Organization",
      name: "Yumesorai",
      url: siteUrl,
    },
    description: data.seo.description,
    areaServed: "Worldwide",
    serviceType: "IT Modernization",
    audience: {
      "@type": "Audience",
      audienceType: "Banking CIOs and CTOs",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function BankingPage() {
  return (
    <>
      <BankingFAQSchema />
      <BankingServiceSchema />

      <IndustryHero
        industry={data.name}
        headline={data.headline}
        subheadline={data.subheadline}
        stats={data.heroStats}
      />

      <LegacyStackShowcase
        industry={data.name}
        systems={data.legacySystems}
        painPoints={data.painPoints}
      />

      <ComplianceTimeline milestones={data.complianceTimeline} />

      {/* FAQ Section */}
      <section className="border-t border-indigo-950/5 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-base text-indigo-950/60">
              Common questions from banking technology leaders evaluating core
              modernization.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-3xl divide-y divide-indigo-950/5">
            {data.faqItems.map((item) => (
              <details key={item.question} className="group py-6">
                <summary className="flex cursor-pointer items-center justify-between text-left text-base font-semibold text-indigo-950">
                  {item.question}
                  <svg
                    className="ml-4 h-5 w-5 shrink-0 text-indigo-950/40 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m19.5 8.25-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-indigo-950/60">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CTABanner
        industry={data.name}
        headline={data.ctaHeadline}
        description={data.ctaDescription}
      />
    </>
  );
}
