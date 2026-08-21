import Link from "next/link";

interface CTABannerProps {
  industry: string;
  headline: string;
  description: string;
}

export function CTABanner({ industry, headline, description }: CTABannerProps) {
  const industryParam = industry.toLowerCase();

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-indigo-950 px-6 py-16 shadow-2xl sm:px-16 sm:py-20">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 to-transparent" />
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {headline}
            </h2>
            <p className="mt-4 text-base leading-7 text-white/60">
              {description}
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href={`/risk-briefing?industry=${industryParam}`}
                className="inline-flex items-center justify-center rounded-lg bg-coral px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark hover:shadow-xl"
              >
                Request Executive Briefing
              </Link>
              <Link
                href={`/calculator?industry=${industryParam}`}
                className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-transparent px-6 py-3.5 text-base font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5"
              >
                Legacy Risk Calculator
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
