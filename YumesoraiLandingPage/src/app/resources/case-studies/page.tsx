"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const siteUrl = "https://www.yumesorai.com";

interface CaseStudy {
  id: string;
  industry: "Healthcare" | "Airlines" | "Banking";
  company: string;
  title: string;
  description: string;
  metrics: {
    label: string;
    value: string;
  }[];
  year: number;
  challenge: string;
  solution: string;
  result: string;
}

const caseStudies: CaseStudy[] = [
  {
    id: "healthcare-1",
    industry: "Healthcare",
    company: "Metro Health Systems",
    title: "EHR Modernization & Interoperability",
    description:
      "Leading healthcare network transforms legacy MUMPS-based EHR into FHIR-compliant cloud platform.",
    metrics: [
      { label: "Cost Savings", value: "42%" },
      { label: "Data Integration Time", value: "73% faster" },
      { label: "System Uptime", value: "99.99%" },
    ],
    year: 2023,
    challenge:
      "Metro Health operated on a 30+ year old MUMPS-based EHR that couldn't interoperate with modern health systems, resulting in siloed patient data and compliance risks.",
    solution:
      "Implemented a FHIR-native integration layer and migrated core EHR functions to a cloud-native microservices architecture with zero downtime cutover.",
    result:
      "Reduced annual maintenance costs by 42%, enabled real-time data exchange with partner networks, and achieved 99.99% uptime SLA.",
  },
  {
    id: "airlines-1",
    industry: "Airlines",
    company: "Global Airways Co.",
    title: "PSS & Reservation System Modernization",
    description:
      "Major airline transforms 40-year-old TPF mainframe reservation system to modern NDC-capable platform.",
    metrics: [
      { label: "Booking Capacity", value: "+120%" },
      { label: "Time to Market (new offers)", value: "10x faster" },
      { label: "Maintenance Cost Reduction", value: "58%" },
    ],
    year: 2023,
    challenge:
      "Global Airways relied on a 40+ year old TPF-based reservation system unable to support modern retailing capabilities like NDC and ONE Order standards, limiting revenue optimization.",
    solution:
      "Deployed a strangler fig pattern with modern API layer running alongside legacy PSS, gradually migrating booking logic to cloud-native services.",
    result:
      "Increased daily booking capacity by 120%, reduced new feature time-to-market from months to weeks, and cut annual PSS maintenance costs by 58%.",
  },
  {
    id: "banking-1",
    industry: "Banking",
    company: "Continental Bank Corporation",
    title: "Core Banking Migration & Real-Time Payments",
    description:
      "Major bank modernizes COBOL mainframe core to support real-time payments and open banking APIs.",
    metrics: [
      { label: "Transaction Latency", value: "-85%" },
      { label: "Annual IT Spend", value: "-35%" },
      { label: "API Delivery Time", value: "10x faster" },
    ],
    year: 2023,
    challenge:
      "Continental Bank operated on a 35+ year old COBOL mainframe unable to support real-time payment mandates or open banking API requirements, creating competitive disadvantage.",
    solution:
      "Implemented progressive decomposition extracting core functions into cloud-native microservices while maintaining mainframe for settlement, achieving parallel processing.",
    result:
      "Reduced transaction latency by 85%, cut annual IT spending by 35%, and launched open banking APIs within 4 months instead of 18+ months.",
  },
  {
    id: "healthcare-2",
    industry: "Healthcare",
    company: "Regional Medical Partners",
    title: "Legacy Billing System Cloud Migration",
    description:
      "Healthcare network modernizes 20-year-old billing platform for value-based care models.",
    metrics: [
      { label: "Billing Processing Time", value: "-60%" },
      { label: "Revenue Recognition", value: "+8%" },
      { label: "Operational Efficiency", value: "+45%" },
    ],
    year: 2023,
    challenge:
      "Regional Medical's custom billing system was designed for fee-for-service models and couldn't adapt to value-based care requirements, causing revenue leakage.",
    solution:
      "Migrated billing engine to cloud with new value-based care logic, integrated with modern analytics for real-time revenue cycle visibility.",
    result:
      "Reduced billing processing time by 60%, increased captured revenue by 8%, and enabled real-time financial dashboards for CFO visibility.",
  },
  {
    id: "airlines-2",
    industry: "Airlines",
    company: "Pacific Air Group",
    title: "Crew Management System Modernization",
    description:
      "Regional airline transforms legacy crew scheduling with AI-powered optimization platform.",
    metrics: [
      { label: "Schedule Optimization", value: "+28%" },
      { label: "Crew Satisfaction", value: "+35%" },
      { label: "Annual Savings", value: "$12.5M" },
    ],
    year: 2023,
    challenge:
      "Pacific Air's crew management system was based on 20-year-old manual processes, unable to optimize complex scheduling constraints with modern ML techniques.",
    solution:
      "Replaced with AI-powered crew optimization platform supporting real-time schedule adjustments and predictive staffing models.",
    result:
      "Improved schedule optimization by 28%, increased crew satisfaction by 35%, and generated $12.5M in annual operational savings.",
  },
  {
    id: "banking-2",
    industry: "Banking",
    company: "European Financial Services",
    title: "Open Banking API Platform Deployment",
    description:
      "Bank accelerates PSD2 compliance with modern API layer and third-party developer ecosystem.",
    metrics: [
      { label: "PSD2 Compliance", value: "Achieved" },
      { label: "Partner APIs Live", value: "15+" },
      { label: "Time to Launch API", value: "3 months" },
    ],
    year: 2023,
    challenge:
      "European Financial's monolithic middleware architecture couldn't support PSD2 open banking requirements, limiting competitive positioning.",
    solution:
      "Built modern API banking layer with developer portal and ecosystem, enabling third-party integrations while maintaining legacy core.",
    result:
      "Achieved PSD2 compliance within 3 months, onboarded 15+ fintech partners, and launched new API-based revenue streams.",
  },
];

const industryColors: Record<string, string> = {
  Healthcare: "primary",
  Airlines: "accent",
  Banking: "secondary",
};

function CaseStudiesSchemaMarkup() {
  const schemas = caseStudies.map((study) => ({
    "@context": "https://schema.org",
    "@type": "Case",
    name: study.title,
    description: study.description,
    about: {
      "@type": "Organization",
      name: study.company,
    },
    author: {
      "@type": "Organization",
      name: "Yumesorai",
      url: siteUrl,
    },
  }));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: schemas.map((schema, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            item: schema,
          })),
        }),
      }}
    />
  );
}

export default function CaseStudiesPage() {
  return (
    <>
      <CaseStudiesSchemaMarkup />

      {/* Hero Section */}
      <section className="border-b border-indigo-950/5 bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-5xl">
              Case Studies
            </h1>
            <p className="mt-6 text-base leading-7 text-indigo-950/60 sm:text-lg">
              Real-world success stories of enterprises transforming legacy
              systems into modern, cloud-native platforms. See how our clients
              achieved measurable business outcomes.
            </p>
          </div>
        </div>
      </section>

      {/* Case Studies Grid */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {caseStudies.map((study) => (
              <Card key={study.id} variant="outlined" className="flex flex-col hover:shadow-lg">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge
                        variant={industryColors[study.industry] as "primary" | "secondary" | "neutral" | "success" | "error"}
                        size="md"
                      >
                        {study.industry}
                      </Badge>
                      <h3 className="mt-3 text-lg font-semibold text-indigo-950">
                        {study.company}
                      </h3>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-indigo-950">{study.title}</p>
                    <p className="mt-2 text-sm text-indigo-950/60">
                      {study.description}
                    </p>
                  </div>

                  <div className="space-y-2 rounded-lg bg-indigo-50/40 p-3">
                    {study.metrics.map((metric, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-indigo-950/60">{metric.label}</span>
                        <span className="font-semibold text-indigo-600">
                          {metric.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex-grow">
                    <p className="text-xs font-medium text-indigo-950/50">
                      Implementation
                    </p>
                    <p className="mt-1 text-sm text-indigo-950/60">
                      {study.year}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled
                  >
                    View Full Case Study (Coming Soon)
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Results Summary Section */}
      <section className="border-t border-indigo-950/5 bg-indigo-50/30 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
              Industry Impact
            </h2>
            <p className="mt-4 text-base text-indigo-950/60">
              Across our customer portfolio, modernization delivers consistent,
              measurable business value.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 text-center shadow-sm">
              <p className="text-3xl font-bold text-indigo-600">$180M+</p>
              <p className="mt-2 text-sm text-indigo-950/60">
                Annual cost savings across customers
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 text-center shadow-sm">
              <p className="text-3xl font-bold text-blue-600">45%</p>
              <p className="mt-2 text-sm text-indigo-950/60">
                Average operational efficiency gain
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 text-center shadow-sm">
              <p className="text-3xl font-bold text-purple-600">99.9%</p>
              <p className="mt-2 text-sm text-indigo-950/60">
                Average system uptime improvement
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 text-center shadow-sm">
              <p className="text-3xl font-bold text-green-600">6 months</p>
              <p className="mt-2 text-sm text-indigo-950/60">
                Median time to ROI realization
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-indigo-950/5 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to Achieve Similar Results?
            </h2>
            <p className="mt-4 text-base text-indigo-100">
              Let our experts help you plan your modernization journey with a
              personalized assessment.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none bg-secondary text-secondary-foreground hover:bg-secondary-700 active:bg-secondary-800 h-12 px-6 text-base"
              >
                Schedule Assessment
              </Link>
              <Link
                href="/tools/roi-calculator"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none text-white hover:bg-white/20 h-12 px-6 text-base"
              >
                Calculate Your ROI
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
