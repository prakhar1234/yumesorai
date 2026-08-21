import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { HolographicFrame } from "@/components/HolographicFrame";

const siteUrl = "https://www.yumesorai.com";

export const metadata: Metadata = {
  title: "How Yumesorai Works | Platform & Methodology",
  description:
    "Learn how Yumesorai uses AI-powered modernization to transform legacy systems through 5 proven steps: Analyze, Design, Transform, Test, and Deploy.",
  keywords: [
    "legacy modernization process",
    "AI code analysis",
    "system architecture transformation",
    "zero-downtime migration",
    "platform modernization",
  ],
  openGraph: {
    title: "How Yumesorai Works | Platform & Methodology",
    description:
      "Learn how Yumesorai uses AI-powered modernization to transform legacy systems through 5 proven steps: Analyze, Design, Transform, Test, and Deploy.",
    url: `${siteUrl}/platform`,
    type: "website",
    images: [
      {
        url: "/og-platform.png",
        width: 1200,
        height: 630,
        alt: "Yumesorai Platform - How It Works",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How Yumesorai Works | Platform & Methodology",
    description:
      "Discover the 5-step AI-powered process that transforms legacy systems safely and efficiently.",
  },
  alternates: {
    canonical: `${siteUrl}/platform`,
  },
};

function PlatformSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does Yumesorai analyze legacy systems?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Our AI performs semantic code analysis on COBOL, PL/I, Assembler, and other legacy languages, mapping business logic with 99.99% accuracy to understand your system architecture and data flows.",
        },
      },
      {
        "@type": "Question",
        name: "What happens during the Transform phase?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We automatically migrate your code to modern languages, transform your data schemas, and restructure your architecture for cloud-native deployment with comprehensive validation at every step.",
        },
      },
      {
        "@type": "Question",
        name: "Is there downtime during the migration?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Our zero-downtime migration strategy uses parallel-run architecture where the old and new systems run simultaneously. We validate every transaction before cutover, ensuring your business never stops.",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const products = [
  {
    name: "Demistifier",
    href: "#demistifier",
    tagline:
      "Knowledge graph explorer — map every call chain, copybook, JCL job and CICS screen before you change a line.",
    icon: "M9 20 3 17V4l6 3 6-3 6 3v13l-6-3-6 3z M9 7v13 M15 4v13",
  },
  {
    name: "Transformer",
    href: "#transformer",
    tagline:
      "COBOL → modern language, cloud-ready. Complexity scoring, reviewable AI plans, and generated unit tests.",
    icon: "M8 6 3 12l5 6 M16 6l5 6-5 6 M13 4l-2 16",
  },
  {
    name: "Code Flux",
    href: "#codeflux",
    tagline:
      "Change workflow — edit → impact → approval. Sandbox branches with blast-radius preview from the graph.",
    icon: "M21 12a9 9 0 1 1-3-6.7 M21 3v5h-5",
  },
];

const howSteps = [
  {
    num: "01",
    title: "Map",
    desc: "Demistifier scans your repositories and builds a full knowledge graph of every program, copybook, JCL job, data file and CICS screen.",
  },
  {
    num: "02",
    title: "Plan",
    desc: "Transformer scores each program by complexity and generates a reviewable, step-by-step conversion plan before any code is touched.",
  },
  {
    num: "03",
    title: "Transform",
    desc: "AI converts COBOL to your target language, generates unit tests, and the code reconciler validates logic coverage line by line.",
  },
  {
    num: "04",
    title: "Validate",
    desc: "Code Flux opens a sandbox branch for every change, previews blast-radius from the graph, and routes approvals before merge.",
  },
];

const deepDives = [
  {
    id: "demistifier",
    bg: "bg-[#FAF9F6]",
    reverse: false,
    kicker: "Demistifier",
    title: "See how every COBOL program connects",
    body: "Point Demistifier at a repository and it maps the call chains, copybooks, JCL jobs, data files and CICS screens into one navigable knowledge graph — so you can debug across the whole system, not one program at a time.",
    points: [
      "Full-system call graph — CALL, PERFORM and dynamic links",
      "Copybooks, JCL & data access fully mapped",
      "Impact & path analysis before you change a line",
      "Risk & dead-code heatmap",
    ],
    screenshot: "/images/platform/shot-demistifier.png",
    label: "Demistifier — knowledge graph explorer",
    tilt: "rotateY(-9deg) rotateX(3deg)",
  },
  {
    id: "graph",
    bg: "bg-white",
    reverse: true,
    kicker: "Demistifier · Graph view",
    title: "Every dependency, one navigable graph",
    body: "Drill into any program to see its calls, data access, and vendor black-boxes. Dashed edges flag code with no source — the risks that surprise migrations are visible on day one.",
    points: [
      "CALL / PERFORM edges with direction",
      "Data and DB access mapped per program",
      "Vendor black-boxes detected and isolated",
    ],
    screenshot: "/images/platform/shot-graph.png",
    label: "CLAIM055 — dependency graph",
    tilt: "rotateY(9deg) rotateX(3deg)",
  },
  {
    id: "transformer",
    bg: "bg-[#FAF9F6]",
    reverse: false,
    kicker: "Transformer",
    title: "COBOL → Java, with a reviewable plan",
    body: "Transformer scores every program by complexity — lines of code, call depth, embedded SQL, vendor black-boxes — then generates a step-by-step conversion plan you review before any code is written.",
    points: [
      "Complexity scoring: LOC, calls, embedded SQL, black-boxes",
      "Reviewable step-by-step transformation plans",
      "Code reconciler validates logic coverage after conversion",
    ],
    screenshot: "/images/platform/shot-transformer.png",
    label: "Transformer — migration workbench",
    tilt: "rotateY(-9deg) rotateX(3deg)",
  },
  {
    id: "codeflux",
    bg: "bg-white",
    reverse: true,
    kicker: "Code Flux",
    title: "Safe change management, before and after cutover",
    body: "Code Flux wraps every change in a sandbox branch, previews the blast radius from the knowledge graph, and routes approvals before merge — so post-cutover maintenance is as safe as pre-cutover migration.",
    points: [
      "Sandbox branches for every change",
      "Blast-radius preview from the knowledge graph",
      "Approval routing before merge",
    ],
    screenshot: "/images/platform/shot-codeflux.png",
    label: "Code Flux — change workflow",
    tilt: "rotateY(9deg) rotateX(3deg)",
  },
];

const securityCards = [
  {
    title: "On-prem & VPC deployment",
    body: "Your source code never leaves your network. Yumesorai runs inside your data centre or VPC — nothing is sent to external servers.",
  },
  {
    title: "Compliance preserved",
    body: "Regulatory mappings (HIPAA, PCI-DSS, SOX) are tracked through every transformation step so auditors see a clear chain of custody.",
  },
  {
    title: "Full audit trail",
    body: "Every AI decision, plan approval, and code change is logged with user, timestamp, and rationale — exportable for any audit framework.",
  },
];

const integrations = [
  "COBOL",
  "PL/I",
  "Assembler",
  "JCL",
  "CICS",
  "DB2",
  "IMS",
  "Java · Spring Boot",
  "PostgreSQL · RDS",
  "GitHub",
  "GitLab",
  "Jenkins",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PlatformPage() {
  return (
    <>
      <PlatformSchema />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-950/[0.03] to-transparent" />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8 lg:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-6 font-mono text-xs uppercase tracking-[2px] text-coral">
              The Platform
            </p>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-indigo-950 sm:text-5xl lg:text-6xl">
              One AI platform. Three products. Zero downtime.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-indigo-950/60 sm:text-xl">
              Demistifier maps your legacy estate, Transformer converts it, and
              Code Flux keeps it healthy after cutover — all driven by AI that
              understands COBOL at a semantic level.
            </p>
          </div>
        </div>
      </section>

      {/* ── Product Suite Index ── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3">
            {products.map((p) => (
              <Link
                key={p.name}
                href={p.href}
                className="group rounded-xl border border-indigo-950/10 bg-white p-8 transition-colors hover:border-coral/30 hover:bg-coral/5"
              >
                <div className="mb-4 flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={24}
                    height={24}
                    fill="none"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <path d={p.icon} stroke="#FF6B6B" />
                  </svg>
                  <span className="text-lg font-bold text-indigo-950">
                    {p.name}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-indigo-950/60">
                  {p.tagline}
                </p>
                <span className="mt-4 inline-block text-sm font-medium text-coral">
                  Jump to product&nbsp;&darr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t border-b border-indigo-950/10 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-16 text-center text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
            How It Works
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {howSteps.map((s) => (
              <div
                key={s.num}
                className="rounded-xl border border-indigo-950/10 bg-indigo-950/[0.02] p-8"
              >
                <p className="font-mono text-sm text-coral">{s.num}</p>
                <h3 className="mt-2 text-xl font-bold text-indigo-950">
                  {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-indigo-950/60">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product Deep Dives ── */}
      {deepDives.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className={`${section.bg} py-16 sm:py-24`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-16 ${
                section.reverse ? "" : ""
              }`}
            >
              {/* Text column */}
              <div className={section.reverse ? "lg:order-2" : ""}>
                <p className="mb-3 font-mono text-xs uppercase tracking-[2px] text-coral">
                  {section.kicker}
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
                  {section.title}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-indigo-950/60">
                  {section.body}
                </p>
                <ul className="mt-6 space-y-3">
                  {section.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={20}
                        height={20}
                        fill="none"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-0.5 shrink-0"
                      >
                        <path d="M5 10l3 3 7-7" stroke="#FF6B6B" />
                      </svg>
                      <span className="text-sm text-indigo-950/70">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Screenshot column */}
              <div className={section.reverse ? "lg:order-1" : ""}>
                <HolographicFrame
                  src={section.screenshot}
                  alt={section.label}
                  label={section.label}
                  heroStyle={false}
                  tilt={section.tilt}
                  hoverTilt="rotateY(0deg) rotateX(0deg) scale(1.12)"
                  glowBlur={26}
                />
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ── Security Strip ── */}
      <section className="bg-gradient-to-b from-indigo-950 to-[#2D2A6E] py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Security built into every step
            </h2>
            <p className="mt-4 text-lg text-white/60">
              Your source code never leaves your network. Yumesorai deploys
              on-prem or inside your VPC, with a full audit trail for every AI
              decision.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {securityCards.map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
              >
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
              Works with your stack
            </h2>
            <p className="mt-4 text-lg text-indigo-950/60">
              Yumesorai plugs into the languages, databases, CI/CD pipelines and
              source-control systems you already use.
            </p>
          </div>
          <div className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-3">
            {integrations.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-indigo-950/10 px-5 py-2.5 font-mono text-sm text-indigo-950"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
              See the platform on your own codebase
            </h2>
            <p className="mt-4 text-lg text-indigo-950/60">
              Book a 30-minute demo and we will run Demistifier on a sample of
              your COBOL estate — live, on your screen.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/about#contact"
                className="inline-flex items-center justify-center rounded-lg bg-coral px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark hover:shadow-xl hover:shadow-coral/30"
              >
                Request Demo
              </Link>
              <Link
                href="/solutions"
                className="inline-flex items-center justify-center rounded-lg border border-indigo-950/20 bg-white px-6 py-3.5 text-base font-semibold text-indigo-950 transition-all hover:border-indigo-950/40 hover:bg-indigo-950/5"
              >
                Explore Solutions
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
