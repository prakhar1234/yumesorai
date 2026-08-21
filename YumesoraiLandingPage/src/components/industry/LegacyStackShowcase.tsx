import type { LegacySystem } from "@/lib/industry-data";

interface LegacyStackShowcaseProps {
  industry: string;
  systems: LegacySystem[];
  painPoints: string[];
}

const riskColors: Record<LegacySystem["risk"], string> = {
  high: "border-error-300/40 bg-error-50",
  medium: "border-warning-300/40 bg-warning-50",
  low: "border-success-300/40 bg-success-50",
};

const riskBadgeColors: Record<LegacySystem["risk"], string> = {
  high: "bg-error-100 text-error-700",
  medium: "bg-warning-100 text-warning-700",
  low: "bg-success-100 text-success-700",
};

export function LegacyStackShowcase({
  industry,
  systems,
  painPoints,
}: LegacyStackShowcaseProps) {
  return (
    <section className="border-y border-indigo-950/5 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
            The Typical {industry} Legacy Stack
          </h2>
          <p className="mt-4 text-base text-indigo-950/60">
            These are the systems holding your organization back. We have
            modernized each of them.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {systems.map((system) => (
            <div
              key={system.name}
              className={`rounded-xl border p-6 ${riskColors[system.risk]}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-indigo-950">
                    {system.name}
                  </h3>
                  <p className="mt-1 text-sm text-indigo-950/50">{system.age}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${riskBadgeColors[system.risk]}`}
                >
                  {system.risk} risk
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-indigo-950/70">
                {system.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <h3 className="text-center text-xl font-semibold text-indigo-950">
            Key Pain Points
          </h3>
          <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            {painPoints.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 rounded-lg border border-indigo-950/5 bg-offwhite p-4"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral/10 text-xs font-bold text-coral">
                  !
                </span>
                <span className="text-sm text-indigo-950/70">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
