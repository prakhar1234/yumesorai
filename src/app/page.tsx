import Link from "next/link";

const industryCards = [
  {
    title: "Healthcare",
    href: "/solutions/healthcare",
    description:
      "Modernize EHR systems, claims processing, and patient data platforms while maintaining HIPAA compliance.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    ),
  },
  {
    title: "Airlines",
    href: "/solutions/airlines",
    description:
      "Transform reservation systems, flight operations, and loyalty platforms from mainframe to cloud-native.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
      </svg>
    ),
  },
  {
    title: "Banking",
    href: "/solutions/banking",
    description:
      "Modernize core banking, payment processing, and risk management systems without disrupting operations.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
      </svg>
    ),
  },
];

const proofMetrics = [
  { value: "40%", label: "Average cost reduction" },
  { value: "10x", label: "Faster deployments" },
  { value: "99.99%", label: "Migration accuracy" },
  { value: "200+", label: "Enterprise systems modernized" },
];

const trustedBy = [
  "Fortune 500 Healthcare",
  "Global Airlines",
  "Top 10 Banks",
  "Federal Agencies",
];

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-950/[0.03] to-transparent" />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8 lg:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            {/* Trust signal */}
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-950/10 bg-white px-4 py-1.5 text-xs font-medium text-indigo-950/60 shadow-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              Team of engineers who have migrated big systems in Fortune 500 companies
            </p>

            {/* Headline */}
            <h1 className="text-balance text-4xl font-bold tracking-tight text-indigo-950 sm:text-5xl lg:text-6xl">
              Your legacy systems are holding back your next{" "}
              <span className="text-coral">breakthrough</span>
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-indigo-950/60 sm:text-xl">
              Yumesorai uses AI to modernize your critical enterprise systems --
              reducing risk by 60%, cutting costs by 40%, and delivering in
              months, not years.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/demo"
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
          </div>
        </div>
      </section>

      {/* Proof Bar */}
      <section className="border-y border-indigo-950/5 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {proofMetrics.map((metric) => (
              <div key={metric.label} className="text-center">
                <p className="text-3xl font-bold text-indigo-950 sm:text-4xl">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm text-indigo-950/50">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>

          {/* Trusted by logos placeholder */}
          <div className="mt-10 border-t border-indigo-950/5 pt-8">
            <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-indigo-950/30">
              Trusted by industry leaders
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
              {trustedBy.map((name) => (
                <span
                  key={name}
                  className="text-sm font-medium text-indigo-950/20"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SME & Medium Companies Focus */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
              Perfect for SMEs and Medium-Sized Companies
            </h2>
            <p className="mt-4 text-lg text-indigo-950/60">
              You don&apos;t need to be a Fortune 500 company to modernize your legacy systems. We work with growing businesses that need enterprise-grade solutions.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Budget-Friendly Solutions",
                description:
                  "Flexible engagement models designed for companies of all sizes. Only pay for what you need, when you need it.",
                icon: "💰",
              },
              {
                title: "Faster Time to Value",
                description:
                  "Our proven methodology gets your systems modernized in months, not years. Competitive advantage when you need it most.",
                icon: "⚡",
              },
              {
                title: "Dedicated Support",
                description:
                  "Your team gets direct access to engineers and architects. We succeed when your business succeeds.",
                icon: "🤝",
              },
              {
                title: "Scalable Approach",
                description:
                  "Start small with one system, scale to your entire legacy portfolio as you grow. No lock-in, total flexibility.",
                icon: "📈",
              },
              {
                title: "Reduced Risk",
                description:
                  "AI-driven testing and zero-downtime migration mean less operational disruption to your business.",
                icon: "✅",
              },
              {
                title: "Knowledge Transfer",
                description:
                  "We don't just modernize—we upskill your team so you own the outcome and can maintain it independently.",
                icon: "📚",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-indigo-950/10 bg-white p-6 hover:border-coral/30 hover:shadow-lg transition-all"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-semibold text-indigo-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-indigo-950/60">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-base text-indigo-950/60 mb-6">
              Whether you&apos;re a 50-person startup or a 5,000-person growth company, we have solutions that fit your scale and budget.
            </p>
            <Link
              href="/assessment"
              className="inline-flex rounded-lg bg-coral px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark hover:shadow-xl"
            >
              Start Your Free Assessment
            </Link>
          </div>
        </div>
      </section>

      {/* Industry Solutions */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
              Purpose-built for regulated industries
            </h2>
            <p className="mt-4 text-lg text-indigo-950/60">
              We specialize in the industries where legacy systems are most
              deeply entrenched and the stakes for modernization are highest.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {industryCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group relative rounded-2xl border border-indigo-950/5 bg-white p-8 shadow-sm transition-all hover:border-coral/20 hover:shadow-lg"
              >
                <div className="mb-4 inline-flex rounded-xl bg-indigo-950/5 p-3 text-indigo-950 transition-colors group-hover:bg-coral/10 group-hover:text-coral">
                  {card.icon}
                </div>
                <h3 className="text-xl font-semibold text-indigo-950">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-indigo-950/60">
                  {card.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-coral opacity-0 transition-opacity group-hover:opacity-100">
                  Learn more
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition */}
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
            {[
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
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 p-6"
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

      {/* Final CTA */}
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
                href="/assessment"
                className="w-full rounded-lg bg-coral px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark hover:shadow-xl sm:w-auto"
              >
                Get Free Assessment
              </Link>
              <Link
                href="/resources/case-studies"
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
