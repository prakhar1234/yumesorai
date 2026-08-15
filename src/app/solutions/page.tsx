import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { HolographicFrame } from "@/components/HolographicFrame";

export const metadata: Metadata = {
  title: "Industry Solutions | Yumesorai",
  description:
    "Legacy modernization solutions tailored for healthcare, airlines, and banking. Transform your enterprise systems with AI-driven technology.",
  keywords: [
    "solutions",
    "healthcare modernization",
    "airline systems",
    "banking transformation",
    "industry solutions",
  ],
  openGraph: {
    title: "Industry Solutions | Yumesorai",
    description:
      "Tailored legacy modernization solutions for healthcare, airlines, and banking industries.",
    url: "https://www.yumesorai.com/solutions",
    type: "website",
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const industries = [
  {
    id: "healthcare",
    iconPath:
      "M12 21C7 17 3 13.5 3 9.5 3 6.5 5.5 4 8.5 4c1.5 0 2.7.7 3.5 1.7C12.8 4.7 14 4 15.5 4 18.5 4 21 6.5 21 9.5c0 4-4 7.5-9 11.5z M9 11h2l1-2 1.5 4 1-2h2",
    title: "Healthcare",
    body: "EHR backends, patient billing, and claims adjudication still run on COBOL and MUMPS. We modernize them while preserving HIPAA mappings end to end.",
    points: [
      "Claims and eligibility systems migrated with zero downtime",
      "HIPAA compliance mappings preserved and verified",
      "HL7/FHIR-ready modern services on the other side",
    ],
    stats: [
      { value: "99.99%", label: "Transaction parity at cutover" },
      { value: "9 mo", label: "Typical claims-system migration" },
    ],
    engagement:
      "A regional payer\u2019s claims adjudication core \u2014 800K lines of COBOL over DB2 \u2014 mapped, converted to Java Spring Boot, and parallel-run validated before cutover.",
    bg: "bg-white",
  },
  {
    id: "airlines",
    iconPath:
      "M10.5 20.5 14 14.5l5.5-5.5c.9-.9.9-2.1 0-3s-2.1-.9-3 0L11 11.5 4 8l-1.5 1.5L8 13l-2.5 3H3l-1 1.5 4 1 1 4L8.5 21l1-3.5z",
    title: "Airlines & Travel",
    body: "Reservation, loyalty, and operations systems built on TPF and mainframe COBOL. We map every CICS screen and batch job before a single change.",
    points: [
      "Reservation and ops systems mapped as one knowledge graph",
      "Batch JCL and CICS flows fully documented automatically",
      "Peak-season safe: parallel-run before any cutover",
    ],
    stats: [
      { value: "6-12", label: "Months, not the 3-5 years of rewrites" },
      { value: "40%", label: "Average run-cost reduction" },
    ],
    engagement:
      "A carrier\u2019s loyalty accrual engine \u2014 nightly batch JCL plus CICS front-ends \u2014 modernized to cloud-native services with the original accrual logic verified transaction by transaction.",
    bg: "bg-[#FAF9F6]",
  },
  {
    id: "banking",
    iconPath:
      "M3 21h18 M12 3 21 9H3l9-6z M5 9v9 M9.5 9v9 M14.5 9v9 M19 9v9",
    title: "Banking & Financial Services",
    body: "Core banking, payments, and risk systems where a single miscomputed cent is unacceptable. Our reconciler validates logic coverage line by line.",
    points: [
      "Core ledger and payments logic extracted and documented",
      "PCI-DSS and SOX mappings maintained through migration",
      "Vendor black-boxes detected, isolated, and wrapped as adapters",
    ],
    stats: [
      { value: "1M+", label: "Lines of BFSI COBOL migrated" },
      { value: "50%", label: "Cheaper than traditional firms" },
    ],
    engagement:
      "A billing core with 14 embedded DB2 cursors and two vendor black-boxes \u2014 scored, planned, converted, and reconciled with full logic coverage reporting for auditors.",
    bg: "bg-white",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SolutionsPage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-indigo-950/[0.03] to-transparent py-[88px]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-xs uppercase tracking-[2px] text-[#E85555]">
              Solutions
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-indigo-950 sm:text-5xl">
              Modernization built for your industry
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-indigo-950/60">
              The systems that run healthcare, airlines, and banking were
              written decades ago. We modernize them without stopping the
              business.
            </p>
          </div>
        </div>
      </section>

      {/* ── Industry Sections ─────────────────────────────────────── */}
      {industries.map((ind) => (
        <section key={ind.id} className={`${ind.bg} border-t border-indigo-950/5 py-[88px]`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr]">
              {/* Left column — content */}
              <div>
                {/* Icon */}
                <div className="flex h-14 w-14 items-center justify-center rounded-[15px] bg-[#E85555]">
                  <svg
                    width={26}
                    height={26}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={ind.iconPath} />
                  </svg>
                </div>

                <h2 className="mt-6 text-3xl font-bold tracking-tight text-indigo-950">
                  {ind.title}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-indigo-950/60">
                  {ind.body}
                </p>

                {/* Bullet points */}
                <ul className="mt-8 space-y-4">
                  {ind.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] text-indigo-950/70">
                      <svg
                        className="mt-0.5 shrink-0"
                        width={18}
                        height={18}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#FF6B6B"
                        strokeWidth={2.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 12l5 5L20 6" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right column — stats + engagement */}
              <div className="flex flex-col gap-6">
                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-4">
                  {ind.stats.map((stat, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-indigo-950/5 bg-white px-5 py-6 text-center"
                    >
                      <p className="text-3xl font-bold text-indigo-950">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-sm text-indigo-950/50">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Engagement card */}
                <div className="rounded-2xl border border-indigo-950/5 bg-white px-6 py-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-950/40">
                    Recent Engagement
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-indigo-950/60">
                    {ind.engagement}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ── Product Screenshot Band ───────────────────────────────── */}
      <section className="bg-indigo-950 py-[88px]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Every engagement starts with a map
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-indigo-200/70">
              Demistifier builds a dependency graph of your estate before
              anyone touches a line of code — so risk is visible up front.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-[920px]">
            <HolographicFrame
              src="/images/platform/shot-explorer.png"
              alt="Dependency knowledge graph"
              label=""
              heroStyle={false}
              tilt="rotateX(10deg) scale(0.98)"
              hoverTilt="rotateX(0deg) scale(1.08)"
            />
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="py-[88px]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
              Talk to us about your sector
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-indigo-950/60">
              Get a free assessment of your legacy estate — scoped to your
              industry&#39;s compliance requirements.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/about#contact"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-[#E85555] px-7 text-base font-medium text-white transition-colors hover:bg-[#d44a4a]"
              >
                Get Free Assessment
              </Link>
              <Link
                href="/platform"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-indigo-950/15 px-7 text-base font-medium text-indigo-950 transition-colors hover:bg-indigo-950/5"
              >
                See the Platform
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
