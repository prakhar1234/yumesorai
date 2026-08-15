import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Yumesorai",
  description:
    "Learn about Yumesorai's mission to transform legacy systems into modern platforms using AI-driven technology and proven methodologies.",
  keywords: [
    "about",
    "company",
    "mission",
    "legacy modernization",
    "AI transformation",
  ],
  openGraph: {
    title: "About Us | Yumesorai",
    description:
      "Transforming enterprise legacy systems into modern, cloud-native platforms.",
    url: "https://www.yumesorai.com/about",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-indigo-950/[0.03] to-transparent py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-xs uppercase tracking-[2px] text-coral">
              About Yumesorai
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-indigo-950 sm:text-5xl">
              The systems that move the world deserve to keep moving
            </h1>
            <p className="mt-6 text-base leading-7 text-indigo-950/60 sm:text-lg">
              Yumesorai was founded by engineers from Fortune 100 companies who
              spent decades inside the mainframes that run healthcare, airlines,
              and banking&nbsp;&mdash; and built the AI platform they wished
              they&apos;d had.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Stats Bar */}
      <section className="border-y border-indigo-950/10 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            <div>
              <p className="text-3xl font-bold text-indigo-950">100+</p>
              <p className="mt-1 text-sm text-indigo-950/60">
                Years of combined mainframe experience
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-indigo-950">1M+</p>
              <p className="mt-1 text-sm text-indigo-950/60">
                Lines of COBOL migrated
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-indigo-950">3</p>
              <p className="mt-1 text-sm text-indigo-950/60">
                Products in the platform
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-indigo-950">0</p>
              <p className="mt-1 text-sm text-indigo-950/60">
                Failed cutovers
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-[#FAF9F6] py-[88px]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-indigo-950">
            What we believe
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-xl border-2 border-indigo-950/30 bg-gradient-to-b from-white to-indigo-100/30 p-[30px] transition-all hover:border-coral hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/[0.12]">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#E85555"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 20 3 17V4l6 3 6-3 6 3v13l-6-3-6 3z" />
                  <path d="M9 7v13" />
                  <path d="M15 4v13" />
                </svg>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-indigo-950">
                Map before you move
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-indigo-950/60">
                No migration starts until the knowledge graph shows every call
                chain, data flow, and black-box. Surprises belong on the map,
                not in production.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-xl border-2 border-indigo-950/30 bg-gradient-to-b from-white to-indigo-100/30 p-[30px] transition-all hover:border-coral hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/[0.12]">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#E85555"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-indigo-950">
                Verify everything
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-indigo-950/60">
                AI writes the code; parallel-run reconciliation proves it. Every
                transaction is compared against the legacy system before cutover.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-xl border-2 border-indigo-950/30 bg-gradient-to-b from-white to-indigo-100/30 p-[30px] transition-all hover:border-coral hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/[0.12]">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#E85555"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v18" />
                  <path d="M17 6.5C17 5 15 4 12.5 4S8 5 8 7s2 2.5 4.5 3 4.5 1.5 4.5 3.5-2 3-4.5 3S8 15.5 8 14" />
                </svg>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-indigo-950">
                Fair prices, all sizes
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-indigo-950/60">
                Enterprise-grade modernization shouldn&apos;t be reserved for
                enterprises. Our engagement models fit SME and MSME budgets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Note (Dark Section) */}
      <section className="bg-gradient-to-br from-indigo-950 to-[#2D2A6E] py-[88px] text-white">
        <div className="mx-auto max-w-[820px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight">
            Built by the people who ran these systems
          </h2>
          <p className="mt-6 text-base leading-7 text-indigo-200">
            Our team has shipped and operated mainframe systems at Fortune 100
            healthcare, airline, and banking companies. We have carried the pager
            for nightly batch runs, debugged CICS abends at 3&nbsp;am, and
            watched institutional knowledge walk out the door with every
            retirement. That is why Yumesorai captures the knowledge
            first&nbsp;&mdash; and modernizes second.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-[2px] text-coral">
            Get started
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-indigo-950">
            Ready to modernize?
          </h2>
          <p className="mt-4 text-base leading-7 text-indigo-950/60">
            Whether you&apos;re exploring options or ready to start, our team
            will walk you through the platform and answer any questions about
            your migration path.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-lg bg-coral px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
            >
              Request a Demo
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-indigo-950/20 px-7 py-3 text-sm font-semibold text-indigo-950 transition-colors hover:border-coral hover:text-coral"
            >
              Free Assessment
            </Link>
          </div>
          <p className="mt-6 text-sm text-indigo-950/50">
            team@yumesorai.com &middot; Remote-first &middot; engineers across
            US, EU &amp; APAC
          </p>
        </div>
      </section>
    </>
  );
}
