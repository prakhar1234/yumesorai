import Link from "next/link";
import { Card3DEffect } from "@/components/3DCardEffect";

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
    title: "BFSI",
    href: "/solutions/banking",
    description:
      "Modernize core banking, payment processing, insurance platforms, and risk management systems without disrupting operations.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
      </svg>
    ),
  },
];

const proofMetrics = [
  { value: "1M+", label: "Lines of COBOL code migrated by our team" },
  { value: "50%", label: "Cheaper than competitors" },
  { value: "40%", label: "Average cost reduction" },
  { value: "99.99%", label: "Migration accuracy" },
];

export default function Home() {
  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            animation-timing-function: ease-in;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
            animation-timing-function: ease-out;
          }
        }
        .card-fade-in {
          animation: fadeIn 0.4s ease-in forwards;
        }
        .card-fade-out {
          animation: fadeOut 0.4s ease-out forwards;
        }
        .card-interactive {
          transition: opacity 0.3s ease-in-out;
        }
        .card-interactive:hover {
          animation: none;
        }
      `}</style>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-950/[0.03] to-transparent" />
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-12 lg:px-8 lg:pt-16">
          <div className="mx-auto max-w-5xl text-center">
            {/* Trust signal */}
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-950/10 bg-white px-5 py-2.5 text-sm font-medium text-indigo-950/70 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              Team of engineers from Fortune 100 companies with decades of legacy code migration expertise
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

            {/* Sectors We Serve */}
            <style>{`
              @keyframes fadeInUp {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              @keyframes float {
                0%, 100% {
                  transform: translateY(0px);
                }
                50% {
                  transform: translateY(-8px);
                }
              }
              @keyframes pulse-glow {
                0%, 100% {
                  box-shadow: 0 0 0 0 rgba(255, 89, 64, 0.7);
                }
                50% {
                  box-shadow: 0 0 0 10px rgba(255, 89, 64, 0);
                }
              }
              .sector-card {
                animation: fadeInUp 0.6s ease-out backwards;
              }
              .sector-card:nth-child(1) {
                animation-delay: 0.1s;
              }
              .sector-card:nth-child(2) {
                animation-delay: 0.3s;
              }
              .sector-card:nth-child(3) {
                animation-delay: 0.5s;
              }
              .sector-icon {
                animation: float 3s ease-in-out infinite;
              }
              .sector-icon:hover {
                animation: pulse-glow 1.5s infinite;
              }
            `}</style>
            <div className="mt-4 pt-4 border-t border-indigo-950/10">
              <p className="text-center text-sm font-semibold text-indigo-950/60 mb-4 animate-pulse">
                SERVING MAJOR SECTORS
              </p>
              <div className="grid grid-cols-3 gap-8 sm:gap-12 max-w-2xl mx-auto">
                {[
                  {
                    icon: "🏥",
                    name: "Healthcare",
                    description: "EHR & Patient Systems",
                  },
                  {
                    icon: "✈️",
                    name: "Airlines",
                    description: "Reservation & Operations",
                  },
                  {
                    icon: "🏦",
                    name: "BFSI",
                    description: "Banking & Financial",
                  },
                ].map((sector) => (
                  <div
                    key={sector.name}
                    className="sector-card text-center group hover:scale-110 transition-transform"
                  >
                    <div className="sector-icon inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-coral/20 to-coral/10 group-hover:from-coral/40 group-hover:to-coral/30 transition-all mb-3">
                      <span className="text-3xl">{sector.icon}</span>
                    </div>
                    <h4 className="text-base font-bold text-indigo-950">
                      {sector.name}
                    </h4>
                    <p className="text-xs text-indigo-950/60 mt-1">
                      {sector.description}
                    </p>
                  </div>
                ))}
              </div>
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
                <p className="mt-3 text-base font-medium text-indigo-950/70">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Why Modernize Now Section */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight text-indigo-950 sm:text-5xl mb-6">
              Why Modernize Now
            </h2>
            <p className="text-xl font-semibold text-indigo-950">
              New age AI models can now attack your infrastructure with precision you have never seen before.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            <div className="rounded-xl border border-red-200/40 bg-red-50/60 p-8 hover:shadow-lg transition-all">
              <div className="text-5xl font-bold text-red-600 mb-2">60%</div>
              <p className="text-sm text-indigo-950/60 mb-4">of data breaches involve legacy systems</p>
              <h3 className="text-lg font-bold text-indigo-950 mb-3">
                Cybersecurity Risk
              </h3>
              <p className="text-sm text-indigo-950/70">
                Legacy systems cannot patch vulnerabilities fast enough for modern threats.
              </p>
            </div>

            <div className="rounded-xl border border-orange-200/40 bg-orange-50/60 p-8 hover:shadow-lg transition-all">
              <div className="text-5xl font-bold text-orange-600 mb-2">45%</div>
              <p className="text-sm text-indigo-950/60 mb-4">of COBOL developers retiring by 2030</p>
              <h3 className="text-lg font-bold text-indigo-950 mb-3">
                Skills Gap
              </h3>
              <p className="text-sm text-indigo-950/70">
                Critical expertise is leaving your organization permanently.
              </p>
            </div>

            <div className="rounded-xl border border-yellow-200/40 bg-yellow-50/60 p-8 hover:shadow-lg transition-all">
              <div className="text-5xl font-bold text-yellow-600 mb-2">30%</div>
              <p className="text-sm text-indigo-950/60 mb-4">annual increase in legacy system costs</p>
              <h3 className="text-lg font-bold text-indigo-950 mb-3">
                Rising Costs
              </h3>
              <p className="text-sm text-indigo-950/70">
                Maintenance budgets grow every year while ROI shrinks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Products & Services Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-indigo-950 mb-4">
              Our Products & Services
            </h2>
            <p className="text-lg text-indigo-950/60">
              Comprehensive solutions designed to transform your legacy systems completely
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "🤖",
                title: "Code Conversion Engine",
                description:
                  "Automatically convert COBOL code to Java with enterprise-grade precision. Our intelligent engine analyzes, transforms, and validates your legacy systems, accelerating migration while maintaining business logic integrity.",
              },
              {
                icon: "🛡️",
                title: "Vulnerability Detection & Remediation",
                description:
                  "Identify and fix security vulnerabilities in quick time. Our advanced scanning detects dormant risks and automatically remediates them before they become exploitable threats.",
              },
              {
                icon: "🤖",
                title: "Post-Migration Code Management Agent",
                description:
                  "After migration, our intelligent agent takes over to manage, optimize, and maintain your modernized code. Continuous monitoring, performance tuning, and automated updates ensure your systems stay efficient and secure.",
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className="card-fade-in card-interactive rounded-xl border-2 border-indigo-950/30 bg-gradient-to-br from-white to-indigo-50/30 p-8 hover:border-coral hover:shadow-lg transition-all"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-indigo-950 mb-3">
                  {item.title}
                </h3>
                <p className="text-base text-indigo-950/70 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SME & MSME Focus Banner */}
      <section className="py-16 sm:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-indigo-950 mb-6">
              Focused on SME & MSME Legacy Code Migration
            </h2>
            <p className="text-indigo-950/85 text-lg sm:text-xl font-bold max-w-3xl mx-auto leading-relaxed">
              Enterprise-grade legacy modernization designed for SMEs and MSMEs at prices that fit their budgets.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Budget-Friendly Solutions",
                description:
                  "Flexible engagement models designed for companies of all sizes. Only pay for what you need, when you need it.",
                stat: "60-70%",
                label: "Cost Reduction",
              },
              {
                title: "Faster Time to Value",
                description:
                  "Our proven methodology gets your systems modernized in months, not years. Competitive advantage when you need it most.",
                stat: "6-12",
                label: "Months to Deploy",
              },
              {
                title: "Dedicated Support",
                description:
                  "Your team gets direct access to engineers and architects. We succeed when your business succeeds.",
                stat: "24/7",
                label: "Available Support",
              },
            ].map((item, index) => (
              <Card3DEffect key={item.title}>
                <div
                  className={`group card-fade-in card-interactive rounded-xl border-2 border-indigo-950/40 bg-white p-6 hover:border-coral hover:shadow-lg transition-all cursor-pointer`}
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-coral/10 to-coral/5 group-hover:from-coral/20 group-hover:to-coral/10 transition-all">
                    <div className="text-3xl font-bold text-coral mb-1">
                      {item.stat}
                    </div>
                    <p className="text-xs font-semibold text-indigo-950/60 group-hover:text-indigo-950 transition-all">
                      {item.label}
                    </p>
                  </div>
                  <h3 className="text-lg font-semibold text-indigo-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-indigo-950/60 group-hover:text-indigo-950/75 transition-all">
                    {item.description}
                  </p>
                </div>
              </Card3DEffect>
            ))}
          </div>
        </div>
      </section>

      {/* The Reality Check Section */}
      <section className="py-16 sm:py-24 bg-red-50/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-indigo-950 mb-6">
              The Hard Truth
            </h2>
            <p className="text-lg sm:text-xl text-indigo-950/85">
              Most vendors ignore SMEs and MSMEs. Traditional modernization costs <span className="font-semibold">$5-15M and takes 3-5 years</span>. That is why Yumesorai exists — to make enterprise-grade modernization <span className="font-semibold text-coral">affordable and fast</span> for companies of all sizes.
            </p>
          </div>
        </div>
      </section>

      {/* Cost Advantage Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-indigo-950 mb-4">
              50% Cheaper Than Traditional Solutions
            </h2>
            <p className="text-lg text-indigo-950/70">
              Do not pay legacy prices for legacy problems. Yumesorai delivers enterprise-grade modernization at half the cost of traditional consulting firms.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="mx-auto w-full max-w-2xl">
              <thead>
                <tr className="border-b-2 border-indigo-950/20">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-950"></th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-950">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 border-2 border-coral">
                      <span>Yumesorai</span>
                      <span className="text-xs font-bold text-coral">✓</span>
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-950/60">
                    Traditional Firms
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-950/10">
                <tr>
                  <td className="px-4 py-4 text-sm font-medium text-indigo-950">Total Migration Cost</td>
                  <td className="px-4 py-4 text-center text-lg font-bold text-coral">$2-5M</td>
                  <td className="px-4 py-4 text-center text-lg font-semibold text-indigo-950/60">$5-15M</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 text-sm font-medium text-indigo-950">Timeline</td>
                  <td className="px-4 py-4 text-center font-semibold text-emerald-700">6-12 months</td>
                  <td className="px-4 py-4 text-center font-semibold text-indigo-950/60">3-5 years</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 text-sm font-medium text-indigo-950">AI-Powered Automation</td>
                  <td className="px-4 py-4 text-center text-lg text-emerald-600">✓</td>
                  <td className="px-4 py-4 text-center text-lg text-indigo-950/30">✗</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 text-sm font-medium text-indigo-950">Migration Accuracy</td>
                  <td className="px-4 py-4 text-center font-semibold text-emerald-700">99.99%</td>
                  <td className="px-4 py-4 text-center font-semibold text-indigo-950/60">95-98%</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 text-sm font-medium text-indigo-950">Post-Migration Support</td>
                  <td className="px-4 py-4 text-center text-lg text-emerald-600">✓ Included</td>
                  <td className="px-4 py-4 text-center text-lg text-indigo-950/30">Extra Cost</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-12 text-center">
            <p className="text-base text-indigo-950/70 mb-6">
              <span className="font-semibold">The math is simple:</span> Get the same or better results for half the price with Yumesorai AI-driven approach.
            </p>
          </div>
        </div>
      </section>

      {/* Industry Solutions */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-white to-indigo-50/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
              Serving All Industries & Business Sizes
            </h2>
            <p className="mt-4 text-lg text-indigo-950/60">
              From regulated industries to retail shops and small businesses, we transform legacy systems across all sectors. Our solutions scale to any business size—whether you are a Fortune 100 enterprise or a growing small business.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {industryCards.map((card, index) => (
              <Card3DEffect key={card.title}>
                <Link
                  href={card.href}
                  className="card-fade-in card-interactive group relative rounded-2xl border border-indigo-950/10 bg-gradient-to-br from-white to-indigo-50/40 p-8 shadow-md transition-all hover:border-coral/30 hover:shadow-xl"
                  style={{ animationDelay: `${index * 0.15}s` }}
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
              </Card3DEffect>
            ))}
          </div>

          {/* Additional Industries Note */}
          <div className="mt-12 rounded-xl border border-indigo-950/15 bg-gradient-to-r from-indigo-50/60 to-blue-50/60 p-8 shadow-sm">
            <p className="text-center text-indigo-950/80">
              <span className="font-semibold">Not limited to these sectors:</span> Our solutions extend to retail shops, e-commerce platforms, manufacturing, logistics, education, hospitality, and countless other industries. Whether you are a small retail business with legacy POS systems or a mid-sized company with aging software, Yumesorai can modernize your legacy systems affordably and efficiently.
            </p>
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
              <Card3DEffect key={item.title}>
                <div
                  className="rounded-xl border border-white/10 p-6"
                >
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {item.description}
                  </p>
                </div>
              </Card3DEffect>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Vulnerability Risk Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-indigo-950 to-indigo-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              Reduce Vulnerability Risk in the Age of Cyberattacks
            </h2>
            <p className="text-lg text-white/70">
              Legacy systems are a liability. The Yumesorai AI-driven modernization eliminates security vulnerabilities while keeping your business operational.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🛡️</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Eliminate Legacy Vulnerabilities
                  </h3>
                  <p className="text-white/70">
                    Legacy systems cannot be patched fast enough. Our AI modernization removes the old code entirely, eliminating entire classes of vulnerabilities that attackers exploit.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🤖</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    AI-Powered Security Scanning
                  </h3>
                  <p className="text-white/70">
                    Our AI analyzes every line of code during modernization, identifying and fixing security flaws that traditional tools miss. Modern frameworks include security by default.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🔐</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Modern Compliance & Encryption
                  </h3>
                  <p className="text-white/70">
                    Modernized systems include current encryption standards, automated compliance frameworks, and threat detection. No more fighting to meet NIST, PCI-DSS, or HIPAA requirements.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⚡</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Faster Security Patching
                  </h3>
                  <p className="text-white/70">
                    Modern cloud-native systems can be patched in minutes, not months. Security updates deploy automatically without business interruption.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🎯</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Mythos AI Vulnerability Detection
                  </h3>
                  <p className="text-white/70">
                    Our Mythos AI model identifies vulnerabilities that have remained dormant for decades but are now exposed to modern threats. Detect and remediate hidden risks before attackers do.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 rounded-xl border border-white/20 bg-white/10 p-8 backdrop-blur-sm">
            <p className="text-center text-white mb-4">
              <span className="font-semibold">The Reality:</span> Every day your legacy systems stay in production is a day they are exposed to new threats. Modernization is not just about velocity—it is about survival.
            </p>
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
