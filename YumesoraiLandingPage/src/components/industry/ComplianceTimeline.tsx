import type { ComplianceMilestone } from "@/lib/industry-data";

interface ComplianceTimelineProps {
  milestones: ComplianceMilestone[];
}

const statusStyles: Record<
  ComplianceMilestone["status"],
  { dot: string; badge: string; label: string }
> = {
  completed: {
    dot: "bg-success-500",
    badge: "bg-success-100 text-success-700",
    label: "Completed",
  },
  "in-progress": {
    dot: "bg-coral animate-pulse",
    badge: "bg-coral/10 text-coral-dark",
    label: "In Progress",
  },
  upcoming: {
    dot: "bg-neutral-300",
    badge: "bg-neutral-100 text-neutral-600",
    label: "Upcoming",
  },
};

export function ComplianceTimeline({ milestones }: ComplianceTimelineProps) {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
            Your Compliance-First Modernization Roadmap
          </h2>
          <p className="mt-4 text-base text-indigo-950/60">
            A phased approach that keeps you compliant at every step while
            systematically retiring legacy risk.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-3xl">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 h-full w-0.5 bg-indigo-950/10 sm:left-8" />

            <div className="space-y-12">
              {milestones.map((milestone) => {
                const style = statusStyles[milestone.status];
                return (
                  <div key={milestone.title} className="relative flex gap-6 sm:gap-8">
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-indigo-950/10 bg-offwhite sm:h-16 sm:w-16">
                      <div className={`h-3 w-3 rounded-full ${style.dot}`} />
                    </div>

                    <div className="flex-1 rounded-xl border border-indigo-950/5 bg-white p-5 shadow-sm sm:p-6">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <span className="text-xs font-medium uppercase tracking-wider text-indigo-950/40">
                            {milestone.year}
                          </span>
                          <h3 className="mt-1 text-lg font-semibold text-indigo-950">
                            {milestone.title}
                          </h3>
                        </div>
                        <span
                          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${style.badge}`}
                        >
                          {style.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-indigo-950/60">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
