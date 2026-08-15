import Link from "next/link";
import Image from "next/image";
import { HolographicFrame } from "@/components/HolographicFrame";

const proofMetrics = [
  { value: "1M+", label: "Lines of COBOL code migrated by our team" },
  { value: "50%", label: "Cheaper than competitors" },
  { value: "40%", label: "Average cost reduction" },
  { value: "99.99%", label: "Migration accuracy" },
];

const products = [
  {
    name: "Demistifier",
    href: "/platform#demistifier",
    title: "Knowledge Graph Explorer",
    body: "See how every COBOL program connects. Call chains, copybooks, JCL jobs and CICS screens mapped into one navigable graph.",
    shot: "/images/platform/shot-explorer.png",
    iconPath: "M9 20 3 17V4l6 3 6-3 6 3v13l-6-3-6 3z M9 7v13 M15 4v13",
  },
  {
    name: "Transformer",
    href: "/platform#transformer",
    title: "Code Conversion Engine",
    body: "Automatically convert COBOL to Java with precision. Analyze, transform, and validate your legacy systems instantly.",
    shot: "/images/platform/shot-transformer.png",
    iconPath: "M8 6 3 12l5 6 M16 6l5 6-5 6 M13 4l-2 16",
  },
  {
    name: "Code Flux",
    href: "/platform#codeflux",
    title: "Change & Post-Migration Management",
    body: "Edit safely in sandbox branches, preview blast radius, route approvals — and keep code healthy after migration.",
    shot: "/images/platform/shot-codeflux.png",
    iconPath: "M21 12a9 9 0 1 1-3-6.7 M21 3v5h-5",
  },
];

const industries = [
  {
    name: "Healthcare",
    iconPath:
      "M12 21C7 17 3 13.5 3 9.5 3 6.5 5.5 4 8.5 4c1.5 0 2.7.7 3.5 1.7C12.8 4.7 14 4 15.5 4 18.5 4 21 6.5 21 9.5c0 4-4 7.5-9 11.5z",
  },
  {
    name: "Banking & Finance",
    iconPath: "M3 21h18 M12 3 21 9H3l9-6z M5 9v9 M9.5 9v9 M14.5 9v9 M19 9v9",
  },
  {
    name: "Airlines & Travel",
    iconPath:
      "M10.5 20.5 14 14.5l5.5-5.5c.9-.9.9-2.1 0-3s-2.1-.9-3 0L11 11.5 4 8l-1.5 1.5L8 13l-2.5 3H3l-1 1.5 4 1 1 4L8.5 21l1-3.5z",
  },
  {
    name: "Retail & E-commerce",
    iconPath:
      "M4 5h2l2.4 11h9.8L21 8H7 M10 20a1 1 0 1 0 0.01 0 M17 20a1 1 0 1 0 0.01 0",
  },
  {
    name: "Manufacturing",
    iconPath: "M3 21V11l6 4v-4l6 4V7l6-2v16H3z M7 17h1 M11 17h1 M15 17h1",
  },
  {
    name: "Insurance",
    iconPath:
      "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z M9 12l2 2 4-4",
  },
  {
    name: "Government",
    iconPath: "M3 21h18 M4 9h16 M12 3l8 6H4l8-6z M6 9v12 M12 9v12 M18 9v12",
  },
  {
    name: "Telecommunications",
    iconPath: "M6 3h8v18H6z M10 18h.01 M14 8c2 0 4 2 4 4 M14 4c4 0 8 4 8 8",
  },
  {
    name: "Logistics",
    iconPath: "M21 8 12 3 3 8v8l9 5 9-5V8z M12 13 3 8 M12 13l9-5 M12 13v8",
  },
  {
    name: "Energy & Utilities",
    iconPath: "M13 2 4 14h6l-1 8 9-12h-6l1-8z",
  },
  {
    name: "Education",
    iconPath:
      "M12 4 2 9l10 5 10-5-10-5z M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5 M22 9v5",
  },
  {
    name: "Media & Publishing",
    iconPath: "M4 4h13v16H4z M17 8h3v12H6 M7 8h7 M7 12h7 M7 16h4",
  },
];

const securityCards = [
  {
    title: "Eliminate Legacy Vulnerabilities",
    description:
      "Legacy systems cannot be patched fast enough. Our AI modernization removes the old code entirely, eliminating entire classes of vulnerabilities that attackers exploit.",
    iconPath:
      "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z",
  },
  {
    title: "AI-Powered Security Scanning",
    description:
      "Our AI analyzes every line of code during modernization, identifying and fixing security flaws that traditional tools miss. Modern frameworks include security by default.",
    iconPath:
      "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M21 21l-5-5",
  },
  {
    title: "Modern Compliance & Encryption",
    description:
      "Modernized systems include current encryption standards, automated compliance frameworks, and threat detection. No more fighting to meet NIST, PCI-DSS, or HIPAA requirements.",
    iconPath: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4 M12 15v3",
  },
  {
    title: "Faster Security Patching",
    description:
      "Modern cloud-native systems can be patched in minutes, not months. Security updates deploy automatically without business interruption.",
    iconPath: "M13 2 4 14h6l-1 8 9-12h-6l1-8z",
  },
  {
    title: "Mythos AI Vulnerability Detection",
    description:
      "Our Mythos AI model identifies vulnerabilities that have remained dormant for decades but are now exposed to modern threats. Detect and remediate hidden risks before attackers do.",
    iconPath:
      "M12 3a5 5 0 0 1 5 5c0 2-1 3-1 5h-8c0-2-1-3-1-5a5 5 0 0 1 5-5z M9.5 17h5 M10.5 20h3",
  },
];

const valueProps = [
  {
    title: "AI-Powered Code Analysis",
    description:
      "Our AI understands COBOL, PL/I, and Assembler at a semantic level, mapping business logic automatically with 99.99% accuracy.",
  },
  {
    title: "Zero-Downtime Migration",
    description:
      "Parallel-run architecture ensures your business never stops. We validate every transaction before cutover.",
  },
  {
    title: "Compliance Preserved",
    description:
      "Regulatory mappings are maintained throughout modernization. HIPAA, PCI-DSS, SOX -- all handled automatically.",
  },
  {
    title: "60% Less Risk",
    description:
      "AI-driven testing generates comprehensive test suites from production data patterns, catching edge cases humans miss.",
  },
  {
    title: "Months, Not Years",
    description:
      "What traditionally takes 3-5 years, we deliver in 6-12 months through automated code transformation.",
  },
  {
    title: "Knowledge Capture",
    description:
      "We extract and document decades of embedded business logic before your retiring workforce takes it with them.",
  },
];

export default function Home() {
  return (
    <>
      {/* ── 1. Hero Section ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-950/[0.03] to-transparent" />
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-12 lg:px-8 lg:pt-16">
          <div className="mx-auto max-w-5xl text-center">
            {/* Trust badge */}
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-950/10 bg-white px-5 py-2.5 text-sm font-medium text-indigo-950/70 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              Team of engineers from Fortune 100 companies with decades of
              legacy code migration expertise
            </p>

            {/* Headline */}
            <h1 className="text-balance text-4xl font-bold tracking-tight text-indigo-950 sm:text-5xl lg:text-6xl">
              Your legacy systems are holding back your next{" "}
              <span className="text-coral">breakthrough</span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-indigo-950/60 sm:text-xl">
              Yumesorai uses AI to modernize your critical enterprise systems
              — reducing risk by 60%, cutting costs by 40%, and delivering in
              months, not years.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/about#contact"
                className="w-full rounded-lg bg-coral px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark hover:shadow-xl hover:shadow-coral/30 sm:w-auto"
              >
                Schedule Executive Briefing
              </Link>
              <Link
                href="/platform"
                className="w-full rounded-lg border border-indigo-950/15 bg-white px-8 py-3.5 text-base font-semibold text-indigo-950 transition-all hover:border-indigo-950/25 hover:shadow-md sm:w-auto"
              >
                See How It Works
              </Link>
            </div>

            {/* Sectors strip */}
            <div className="mt-4 border-t border-indigo-950/10 pt-4">
              <p className="mb-4 text-center text-sm font-semibold text-indigo-950/60">
                SERVING MAJOR SECTORS
              </p>
              <div className="mx-auto grid max-w-2xl grid-cols-3 gap-8 sm:gap-12">
                {/* Healthcare */}
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-gradient-to-br from-coral/20 to-coral/10">
                    <svg
                      width={26}
                      height={26}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#E85555"
                      strokeWidth={1.8}
                    >
                      <path d="M12 21C7 17 3 13.5 3 9.5 3 6.5 5.5 4 8.5 4c1.5 0 2.7.7 3.5 1.7C12.8 4.7 14 4 15.5 4 18.5 4 21 6.5 21 9.5c0 4-4 7.5-9 11.5z M9 11h2l1-2 1.5 4 1-2h2" />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-indigo-950">
                    Healthcare
                  </h4>
                  <p className="mt-1 text-xs text-indigo-950/60">
                    EHR &amp; Patient Systems
                  </p>
                </div>

                {/* Airlines */}
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-gradient-to-br from-coral/20 to-coral/10">
                    <svg
                      width={26}
                      height={26}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#E85555"
                      strokeWidth={1.8}
                    >
                      <path d="M10.5 20.5 14 14.5l5.5-5.5c.9-.9.9-2.1 0-3s-2.1-.9-3 0L11 11.5 4 8l-1.5 1.5L8 13l-2.5 3H3l-1 1.5 4 1 1 4L8.5 21l1-3.5z" />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-indigo-950">
                    Airlines
                  </h4>
                  <p className="mt-1 text-xs text-indigo-950/60">
                    Reservation &amp; Operations
                  </p>
                </div>

                {/* BFSI */}
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-gradient-to-br from-coral/20 to-coral/10">
                    <svg
                      width={26}
                      height={26}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#E85555"
                      strokeWidth={1.8}
                    >
                      <path d="M3 21h18 M12 3 21 9H3l9-6z M5 9v9 M9.5 9v9 M14.5 9v9 M19 9v9" />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-indigo-950">BFSI</h4>
                  <p className="mt-1 text-xs text-indigo-950/60">
                    Banking &amp; Financial
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Product Hero Shot ── */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <HolographicFrame
          src="/images/platform/shot-transformer.png"
          alt="Yumesorai platform"
          label="Yumesorai Transformer — AI migration workbench"
          heroStyle={true}
        />
      </section>

      {/* ── 3. Proof Bar ── */}
      <section className="border-y border-indigo-950/5 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {proofMetrics.map((metric) => (
              <div key={metric.label} className="text-center">
                <p className="text-3xl font-bold text-indigo-950 sm:text-4xl">
                  {metric.value}
                </p>
                <p className="mt-3 text-base font-medium text-indigo-950/70">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Products & Services ── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <p className="font-mono text-xs uppercase tracking-[2px] text-coral">
              The Product Suite
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
              Our Products &amp; Services
            </h2>
            <p className="mt-4 text-lg text-indigo-950/60">
              Comprehensive solutions designed to transform your legacy systems
              completely
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link
                key={product.name}
                href={product.href}
                className="group rounded-xl border border-indigo-950/10 bg-white transition-all hover:shadow-lg"
              >
                {/* Screenshot thumbnail */}
                <div className="relative overflow-hidden rounded-t-xl" style={{ perspective: "1200px" }}>
                  <div
                    className="relative overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(#0B0E1A, #0B0E1A) padding-box, conic-gradient(from 210deg, rgba(255,107,107,0.9), rgba(167,139,250,0.9), rgba(34,211,238,0.9), rgba(99,102,241,0.9), rgba(255,107,107,0.9)) border-box",
                      border: "1.5px solid transparent",
                      borderRadius: "12px 12px 0 0",
                    }}
                  >
                    {/* Sheen overlay */}
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-[38%]"
                      style={{
                        background:
                          "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.08) 45%, rgba(167,139,250,0.1) 55%, transparent 100%)",
                      }}
                    />
                    <Image
                      src={product.shot}
                      alt={product.title}
                      width={600}
                      height={400}
                      className="block h-auto w-full transition-transform duration-500 group-hover:scale-105"
                      style={{
                        transform: "rotateX(4deg) scale(0.99)",
                        transformOrigin: "bottom center",
                      }}
                    />
                  </div>
                </div>

                {/* Card body */}
                <div className="p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <svg
                      width={18}
                      height={18}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3730A3"
                      strokeWidth={1.8}
                    >
                      <path d={product.iconPath} />
                    </svg>
                    <span className="font-mono text-xs uppercase tracking-widest text-indigo-950/50">
                      {product.name}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-indigo-950 mb-2">
                    {product.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-indigo-950/60 mb-4">
                    {product.body}
                  </p>
                  <span className="text-sm font-semibold text-coral">
                    Explore {product.name} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Why Modernize Now ── */}
      <section className="py-20 sm:py-28" style={{ backgroundColor: "#FAF9F6" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-indigo-950 sm:text-5xl">
              Why Modernize Now
            </h2>
            <p className="text-xl font-semibold text-indigo-950">
              New age AI models can now attack your infrastructure with
              precision you have never seen before.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            <div className="rounded-xl border border-red-300/50 bg-red-50/70 p-8 transition-all hover:shadow-lg">
              <div className="mb-2 text-5xl font-bold text-red-600">60%</div>
              <p className="mb-4 text-sm text-indigo-950/60">
                of data breaches involve legacy systems
              </p>
              <h3 className="mb-3 text-lg font-bold text-indigo-950">
                Cybersecurity Risk
              </h3>
              <p className="text-sm text-indigo-950/70">
                Legacy systems cannot patch vulnerabilities fast enough for
                modern threats.
              </p>
            </div>

            <div className="rounded-xl border border-orange-300/50 bg-orange-50/70 p-8 transition-all hover:shadow-lg">
              <div className="mb-2 text-5xl font-bold text-orange-600">45%</div>
              <p className="mb-4 text-sm text-indigo-950/60">
                of COBOL developers retiring by 2030
              </p>
              <h3 className="mb-3 text-lg font-bold text-indigo-950">
                Skills Gap
              </h3>
              <p className="text-sm text-indigo-950/70">
                Critical expertise is leaving your organization permanently.
              </p>
            </div>

            <div className="rounded-xl border border-yellow-300/50 bg-yellow-50/70 p-8 transition-all hover:shadow-lg">
              <div className="mb-2 text-5xl font-bold text-yellow-600">30%</div>
              <p className="mb-4 text-sm text-indigo-950/60">
                annual increase in legacy system costs
              </p>
              <h3 className="mb-3 text-lg font-bold text-indigo-950">
                Rising Costs
              </h3>
              <p className="text-sm text-indigo-950/70">
                Maintenance budgets grow every year while ROI shrinks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Industries ── */}
      <section className="overflow-hidden bg-gradient-to-b from-indigo-50/50 to-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-indigo-950 sm:text-5xl">
              Broad Spectrum of Industries We Serve
            </h2>
            <p className="text-xl text-indigo-950/70">
              From Fortune 500 enterprises to growing SMEs, we modernize legacy
              systems across every sector
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {industries.map((industry) => (
              <div
                key={industry.name}
                className="group cursor-pointer rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-white via-indigo-50/40 to-indigo-100/30 p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl"
              >
                <div className="relative z-10">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center">
                    <svg
                      width={24}
                      height={24}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3730A3"
                      strokeWidth={1.8}
                    >
                      <path d={industry.iconPath} />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-indigo-950 transition-colors duration-300 group-hover:text-coral">
                    {industry.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>

          {/* Business Sizes */}
          <div className="mt-16 border-t border-indigo-950/10 pt-16">
            <h3 className="mb-12 text-center text-2xl font-bold tracking-tight text-indigo-950">
              All Business Sizes
            </h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Startups", range: "10-50 employees" },
                { label: "SMEs", range: "50-500 employees" },
                { label: "Mid-Market", range: "500-2,500 employees" },
                { label: "Enterprise", range: "2,500+ employees" },
              ].map((size) => (
                <div
                  key={size.label}
                  className="group relative overflow-hidden rounded-xl border border-indigo-200/50 bg-gradient-to-br from-white to-indigo-50/40 px-6 py-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                >
                  <div className="absolute left-0 right-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-coral via-orange-400 to-coral transition-transform duration-500 group-hover:scale-x-100" />
                  <p className="mb-3 text-sm font-bold uppercase tracking-widest text-coral transition-transform duration-300 group-hover:scale-110">
                    {size.label}
                  </p>
                  <p className="text-lg font-semibold text-indigo-950">
                    {size.range}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. SME & MSME ── */}
      <section className="py-16 sm:py-28" style={{ backgroundColor: "#FAF9F6" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-6 text-4xl font-bold text-indigo-950 sm:text-5xl">
              Focused on SME &amp; MSME Legacy Code Migration
            </h2>
            <p className="mx-auto max-w-3xl text-lg font-bold leading-relaxed text-indigo-950/85 sm:text-xl">
              Enterprise-grade legacy modernization designed for SMEs and MSMEs
              at prices that fit their budgets.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                stat: "60-70%",
                label: "Cost Reduction",
                title: "Budget-Friendly Solutions",
                description:
                  "Flexible engagement models designed for companies of all sizes. Only pay for what you need, when you need it.",
              },
              {
                stat: "6-12",
                label: "Months to Deploy",
                title: "Faster Time to Value",
                description:
                  "Our proven methodology gets your systems modernized in months, not years. Competitive advantage when you need it most.",
              },
              {
                stat: "24/7",
                label: "Available Support",
                title: "Dedicated Support",
                description:
                  "Your team gets direct access to engineers and architects. We succeed when your business succeeds.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border-2 border-indigo-950/40 bg-white p-6 transition-all hover:border-coral hover:shadow-lg"
              >
                <div className="mb-4 rounded-lg bg-gradient-to-r from-coral/10 to-coral/5 p-4">
                  <div className="mb-1 text-3xl font-bold text-coral">
                    {item.stat}
                  </div>
                  <p className="text-xs font-semibold text-indigo-950/60">
                    {item.label}
                  </p>
                </div>
                <h3 className="text-lg font-semibold text-indigo-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-indigo-950/60">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Cost Advantage ── */}
      <section className="bg-gradient-to-r from-emerald-50 to-teal-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
              50% Cheaper Than Traditional Solutions
            </h2>
            <p className="text-lg text-indigo-950/70">
              Do not pay legacy prices for legacy problems. Yumesorai delivers
              enterprise-grade modernization at half the cost of traditional
              consulting firms.
            </p>
          </div>

          {/* Comparison grid */}
          <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-indigo-950/10 bg-white">
            {/* Header */}
            <div className="grid grid-cols-3 border-b-2 border-indigo-950/20">
              <div className="px-4 py-3" />
              <div className="px-4 py-3 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border-2 border-coral bg-white px-3 py-1 text-sm font-semibold text-indigo-950">
                  Yumesorai <span className="text-xs font-bold text-coral">✓</span>
                </span>
              </div>
              <div className="px-4 py-3 text-center text-sm font-semibold text-indigo-950/60">
                Traditional Firms
              </div>
            </div>

            {/* Rows */}
            {[
              {
                label: "Total Migration Cost",
                ours: "$2-5M",
                oursColor: "text-coral",
                theirs: "$5-15M",
              },
              {
                label: "Timeline",
                ours: "6-12 months",
                oursColor: "text-emerald-700",
                theirs: "3-5 years",
              },
              {
                label: "AI-Powered Automation",
                ours: "✓",
                oursColor: "text-emerald-600 text-lg",
                theirs: "✗",
              },
              {
                label: "Migration Accuracy",
                ours: "99.99%",
                oursColor: "text-emerald-700",
                theirs: "95-98%",
              },
              {
                label: "Post-Migration Support",
                ours: "✓ Included",
                oursColor: "text-emerald-600 text-lg",
                theirs: "Extra Cost",
              },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className={`grid grid-cols-3 ${i < arr.length - 1 ? "border-b border-indigo-950/10" : ""}`}
              >
                <div className="px-4 py-4 text-sm font-medium text-indigo-950">
                  {row.label}
                </div>
                <div
                  className={`px-4 py-4 text-center font-bold ${row.oursColor}`}
                >
                  {row.ours}
                </div>
                <div className="px-4 py-4 text-center font-semibold text-indigo-950/60">
                  {row.theirs}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-base text-indigo-950/70">
              <span className="font-semibold">The math is simple:</span> Get the
              same or better results for half the price with Yumesorai
              AI-driven approach.
            </p>
          </div>
        </div>
      </section>

      {/* ── 9. Value Proposition (Dark) ── */}
      <section className="bg-indigo-950 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Why CIOs and CTOs choose Yumesorai
            </h2>
            <p className="mt-4 text-lg text-white/60">
              We combine deep enterprise expertise with cutting-edge AI to
              deliver modernization outcomes that were previously impossible.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {valueProps.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-6"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Security (Dark Gradient) ── */}
      <section className="bg-gradient-to-br from-indigo-950 to-[#2D2A6E] py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Reduce Vulnerability Risk in the Age of Cyberattacks
            </h2>
            <p className="text-lg text-white/70">
              Legacy systems are a liability. The Yumesorai AI-driven
              modernization eliminates security vulnerabilities while keeping
              your business operational.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            {securityCards.map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <svg
                      width={28}
                      height={28}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#FF8A8A"
                      strokeWidth={1.8}
                    >
                      <path d={card.iconPath} />
                    </svg>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      {card.title}
                    </h3>
                    <p className="text-white/70">{card.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Callout banner */}
          <div className="mt-12 rounded-xl border border-white/20 bg-white/10 p-8 backdrop-blur-sm">
            <p className="text-center text-white">
              <span className="font-semibold">The Reality:</span> Every day
              your legacy systems stay in production is a day they are exposed
              to new threats. Modernization is not just about velocity—it is
              about survival.
            </p>
          </div>
        </div>
      </section>

      {/* ── 11. Final CTA ── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
              Ready to modernize with confidence?
            </h2>
            <p className="mt-4 text-lg text-indigo-950/60">
              Join the enterprises that have already transformed their legacy
              systems with Yumesorai. Start with a free assessment.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/about#contact"
                className="w-full rounded-lg bg-coral px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark hover:shadow-xl sm:w-auto"
              >
                Get Free Assessment
              </Link>
              <Link
                href="/solutions"
                className="w-full rounded-lg border border-indigo-950/15 bg-white px-8 py-3.5 text-base font-semibold text-indigo-950 transition-all hover:border-indigo-950/25 hover:shadow-md sm:w-auto"
              >
                Read Case Studies
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
