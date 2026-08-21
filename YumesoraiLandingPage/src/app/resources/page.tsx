"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const siteUrl = "https://www.yumesorai.com";

const resources = [
  {
    id: "case-studies",
    title: "Case Studies",
    description:
      "Real-world examples of successful legacy modernization across healthcare, airlines, and banking.",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.66V12a2.25 2.25 0 102.25 2.25M15 12H9.75m0 0V9.75M15 12v2.25M9.75 15h2.25m0-2.25V9.75"
        />
      </svg>
    ),
    href: "/resources/case-studies",
    cta: "View Case Studies",
  },
  {
    id: "whitepapers",
    title: "Whitepapers",
    description:
      "In-depth technical guides on modernization strategies, architecture patterns, and best practices.",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 21h9m0 0h3m-3 0v-6.75M3 6.75h18M3 6.75v9M3 6.75h2.25m0 0h1.5M5.25 6.75v9"
        />
      </svg>
    ),
    href: "#",
    cta: "Coming Soon",
    disabled: true,
  },
  {
    id: "webinars",
    title: "Webinars",
    description:
      "Live and recorded sessions with modernization experts, discussing strategies and lessons learned.",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.75 15l-2.25 2.25m0 0l-2.25-2.25m2.25 2.25v-6m6-4.5h2.25A2.25 2.25 0 0121 5.25v13.5A2.25 2.25 0 0118.75 21h-2.25m0-40.5H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21H7.5"
        />
      </svg>
    ),
    href: "#",
    cta: "Coming Soon",
    disabled: true,
  },
];

function ResourcesSchemaMarkup() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Resources & Tools",
    description:
      "Case studies, whitepapers, webinars, and ROI calculator for legacy modernization",
    url: `${siteUrl}/resources`,
    publisher: {
      "@type": "Organization",
      name: "Yumesorai",
      url: siteUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function ResourcesPage() {
  return (
    <>
      <ResourcesSchemaMarkup />

      {/* Hero Section */}
      <section className="border-b border-indigo-950/5 bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-5xl">
              Resources & Tools
            </h1>
            <p className="mt-6 text-base leading-7 text-indigo-950/60 sm:text-lg">
              Discover case studies, technical guides, and interactive tools to
              accelerate your legacy modernization journey. Learn from industry
              leaders and best practices.
            </p>
          </div>
        </div>
      </section>

      {/* Resource Cards Grid */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {resources.map((resource) => (
              <Card
                key={resource.id}
                variant="outlined"
                className={resource.disabled ? "opacity-60" : "hover:shadow-lg"}
              >
                <div className="space-y-4">
                  <div className="text-indigo-600">{resource.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-950">
                      {resource.title}
                    </h3>
                    <p className="mt-2 text-sm text-indigo-950/60">
                      {resource.description}
                    </p>
                  </div>
                  {!resource.disabled ? (
                    <Link
                      href={resource.href}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none bg-primary text-primary-foreground hover:bg-primary-700 active:bg-primary-800 h-12 px-6 text-base w-full"
                    >
                      {resource.cta}
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none bg-secondary text-secondary-foreground hover:bg-secondary-700 active:bg-secondary-800 h-12 px-6 text-base w-full"
                    >
                      {resource.cta}
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="border-t border-indigo-950/5 bg-indigo-50/30 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
              Interactive Tools
            </h2>
            <p className="mt-4 text-base text-indigo-950/60">
              Use our calculators and assessment tools to evaluate your
              modernization opportunity.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card variant="filled" className="hover:shadow-lg">
              <div className="space-y-4">
                <div className="text-blue-600">
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 3.071-.879 4.242 0M9.75 11.25a3 3 0 11-6 0 3 3 0 016 0zm7.5-30a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-indigo-950">
                    ROI Calculator
                  </h3>
                  <p className="mt-2 text-sm text-indigo-950/60">
                    Estimate the financial impact and timeline of your legacy
                    modernization initiative.
                  </p>
                </div>
                <Link
                  href="/tools/roi-calculator"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none bg-primary text-primary-foreground hover:bg-primary-700 active:bg-primary-800 h-12 px-6 text-base w-full"
                >
                  Calculate Your ROI
                </Link>
              </div>
            </Card>

            <Card variant="filled" className="hover:shadow-lg">
              <div className="space-y-4">
                <div className="text-green-600">
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-indigo-950">
                    Legacy Assessment
                  </h3>
                  <p className="mt-2 text-sm text-indigo-950/60">
                    Evaluate your current systems and identify modernization
                    priorities.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </Card>

            <Card variant="filled" className="hover:shadow-lg">
              <div className="space-y-4">
                <div className="text-purple-600">
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h0c0 .621.504 1.125 1.125 1.125m17.25-17.25h0c.621 0 1.125.504 1.125 1.125m0 0A1.125 1.125 0 0020.625 4.5m-17.25 0a1.125 1.125 0 00-1.125 1.125m0 0c0 .621.504 1.125 1.125 1.125m0-1.5h.375a.375.375 0 00-.375.375m0-.375a.375.375 0 100.75 0m0 0h-.75"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-indigo-950">
                    Technology Matcher
                  </h3>
                  <p className="mt-2 text-sm text-indigo-950/60">
                    Identify the best modernization path for your specific
                    technology stack.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-indigo-950/5 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to Start Your Modernization Journey?
            </h2>
            <p className="mt-4 text-base text-indigo-100">
              Schedule a personalized consultation with our modernization
              experts.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none bg-secondary text-secondary-foreground hover:bg-secondary-700 active:bg-secondary-800 h-12 px-6 text-base"
              >
                Contact Sales
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none text-white hover:bg-white/20 h-12 px-6 text-base"
              >
                Request a Demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
