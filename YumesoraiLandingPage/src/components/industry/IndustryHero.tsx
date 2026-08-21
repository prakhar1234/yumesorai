import Link from "next/link";

interface HeroStat {
  label: string;
  value: string;
}

interface IndustryHeroProps {
  industry: string;
  headline: string;
  subheadline: string;
  stats: HeroStat[];
}

export function IndustryHero({
  industry,
  headline,
  subheadline,
  stats,
}: IndustryHeroProps) {
  const industryParam = industry.toLowerCase();

  return (
    <section className="relative overflow-hidden bg-indigo-950 py-20 sm:py-28 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-coral">
            {industry} Solutions
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {headline}
          </h1>
          <p className="mt-6 text-lg leading-8 text-white/60">
            {subheadline}
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href={`/risk-briefing?industry=${industryParam}`}
              className="inline-flex items-center justify-center rounded-lg bg-coral px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark hover:shadow-xl hover:shadow-coral/30"
            >
              Request a Briefing
            </Link>
            <Link
              href={`/calculator?industry=${industryParam}`}
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-transparent px-6 py-3.5 text-base font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5"
            >
              Calculate Your Risk
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm"
            >
              <p className="text-3xl font-bold text-coral">{stat.value}</p>
              <p className="mt-2 text-sm text-white/50">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
