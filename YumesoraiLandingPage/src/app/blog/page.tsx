"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const siteUrl = "https://www.yumesorai.com";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  category: "Strategy" | "Technical" | "Case Study" | "Industry" | "Best Practices";
  industry?: "Healthcare" | "Airlines" | "Banking" | "Multi-Industry";
  readingTime: number;
}

const blogPosts: BlogPost[] = [
  {
    id: "strangler-pattern",
    title: "The Strangler Fig Pattern: Modernizing Legacy Systems Without Big Bang Migration",
    excerpt:
      "Discover how the strangler fig pattern enables incremental modernization while maintaining system stability and reducing risk.",
    content: `The strangler fig pattern is one of the most effective approaches for modernizing legacy systems. Instead of attempting a "big bang" replacement that brings enormous risk and requires months of planning, this pattern allows you to gradually replace components of the old system with new, modern implementations.

The pattern works by creating a new system that gradually assumes the responsibilities of the old system. Traffic is slowly shifted from the legacy system to the new system as new functionality is verified and validated. The old system remains operational throughout, providing a safety net if anything goes wrong.

Key benefits include:
- Reduced risk through incremental validation
- Maintained system availability during transformation
- Flexibility to adjust approach based on learnings
- Easier rollback of changes if needed
- Better team learning and capability building`,
    author: "Sarah Chen",
    date: "2024-05-15",
    category: "Strategy",
    industry: "Multi-Industry",
    readingTime: 8,
  },
  {
    id: "cobol-future",
    title: "The Future of COBOL: Modernization vs. Maintenance in Banking",
    excerpt:
      "Understanding the economics of COBOL mainframe systems and when modernization makes strategic sense for banking institutions.",
    content: `COBOL has been pronounced dead many times, yet it still powers an estimated 80% of the world's financial transactions. The question facing many banks isn't whether to keep COBOL, but how to evolve their systems to meet modern business requirements while managing the substantial technical debt.

The real cost of legacy COBOL systems extends far beyond licensing fees. Consider:
- Talent scarcity and increasing salary premiums
- Inability to support real-time business requirements
- Regulatory compliance challenges
- Integration difficulties with modern ecosystems
- Opportunity costs in competitive feature development

This article explores the decision framework banks should use when evaluating modernization, including:
- Total cost of ownership calculations
- Risk assessment frameworks
- Phased migration strategies
- Hybrid approaches that leverage existing investments`,
    author: "Michael Rodriguez",
    date: "2024-05-08",
    category: "Best Practices",
    industry: "Banking",
    readingTime: 12,
  },
  {
    id: "hipaa-migration",
    title: "Achieving Zero-Downtime Healthcare System Migration While Maintaining HIPAA Compliance",
    excerpt:
      "Technical strategies for migrating patient data systems without disrupting care while maintaining strict HIPAA safeguards.",
    content: `Healthcare IT modernization presents unique challenges. Unlike other industries where downtime might cost money, in healthcare it can directly impact patient safety and care quality. Additionally, HIPAA compliance requirements add layers of complexity to any migration project.

This technical deep dive explores proven approaches:

1. Parallel Processing Architecture
Run legacy and modern systems side-by-side with synchronized data, allowing validation before cutover.

2. Encryption in Transit and at Rest
Implement end-to-end encryption protocols that satisfy HIPAA requirements while enabling data migration.

3. Audit Trail Doubling
Maintain dual audit systems during transition to ensure regulatory compliance and traceability.

4. FHIR-First Integration
Use FHIR standards to bridge legacy and modern systems, enabling incremental migration.

5. Staged Deployment by Service Line
Migrate one clinical department at a time, learning from each migration before moving to the next.

Case study results show healthcare systems can achieve migration windows measured in hours rather than days or weeks, with zero patient impact.`,
    author: "Dr. Jennifer Liu",
    date: "2024-04-30",
    category: "Technical",
    industry: "Healthcare",
    readingTime: 15,
  },
  {
    id: "api-first-banking",
    title: "API-First Architecture: The Gateway to Open Banking and PSD2 Compliance",
    excerpt:
      "How banks are using modern API-first architectures to achieve regulatory compliance while enabling new revenue streams.",
    content: `The shift toward open banking represents one of the most significant transformations in financial services since digital banking itself. PSD2 in Europe, Open Banking regulations in other markets, and competitive pressure from fintech are forcing traditional banks to reconsider their technology architecture.

An API-first approach provides the foundation for this transformation:

Benefits of API-First Architecture:
- Decouples frontend from backend, enabling independent evolution
- Supports multiple channels (web, mobile, third-party)
- Facilitates microservices migration
- Enables fintech partnerships and ecosystems
- Improves time-to-market for new features

Implementation Strategy:
1. Start with API gateway that abstracts legacy systems
2. Gradually migrate functionality behind the gateway
3. Build developer portal to enable partnerships
4. Implement robust API security and rate limiting
5. Monitor and optimize based on partner feedback

Banks implementing API-first strategies report:
- 50-70% reduction in feature time-to-market
- New revenue streams from partner ecosystems
- Improved regulatory compliance
- Better customer experience across channels`,
    author: "David Khan",
    date: "2024-04-22",
    category: "Strategy",
    industry: "Banking",
    readingTime: 10,
  },
  {
    id: "airline-ndc",
    title: "NDC Technology: How Airlines Are Modernizing Revenue Management Systems",
    excerpt:
      "The shift to NDC (New Distribution Capability) is forcing airlines to modernize reservation systems and retailing platforms.",
    content: `The airline industry faces a fundamental shift from traditional Global Distribution Systems (GDS) to New Distribution Capability (NDC) standards. This change represents an opportunity for airlines to modernize aging systems that have constrained revenue optimization for decades.

Key Drivers of NDC Adoption:
- Direct distribution control (reducing GDS dependency)
- Personalized offers based on passenger data
- Dynamic pricing optimization
- Better inventory management
- Real-time offer updates

Legacy System Challenges:
- TPF mainframes designed for simple transaction processing
- Inability to support complex offer logic
- Limited personalization capabilities
- Batch-based pricing models

Modernization Approach:
Airlines implementing NDC successfully typically:
1. Deploy modern API layer for offer management
2. Maintain legacy PSS for core reservations
3. Implement real-time pricing engine
4. Build passenger experience platform
5. Enable integration with ancillary systems

Results from early adopters show:
- 40-60% increase in personalized offers
- 15-25% improvement in ancillary revenue
- Reduced dependency on traditional GDS
- Better competitive positioning`,
    author: "Robert Martinez",
    date: "2024-04-15",
    category: "Industry",
    industry: "Airlines",
    readingTime: 11,
  },
  {
    id: "ai-modernization",
    title: "Leveraging AI to Accelerate Legacy System Modernization",
    excerpt:
      "How AI-powered tools are reducing the time and cost of legacy modernization, from code generation to testing.",
    content: `Artificial intelligence is fundamentally changing how enterprises approach legacy modernization. Rather than treating legacy systems as obstacles to be overcome, forward-thinking organizations are using AI to:

- Automatically document undocumented systems
- Generate modern code from legacy implementations
- Identify unused functionality for elimination
- Optimize data migration strategies
- Accelerate testing and validation

AI-Powered Modernization Benefits:
- 40-60% reduction in documentation effort
- 50-70% faster code generation for conversions
- Better identification of business-critical functionality
- Improved test coverage
- Reduced manual effort in data migration

Key Applications:
1. Code Generation: AI can automatically translate COBOL to Java/Python
2. Data Migration: ML algorithms optimize partitioning and sequencing
3. Architecture Analysis: AI identifies patterns and bottlenecks
4. Regression Testing: Automated test generation reduces testing burden
5. Documentation: Auto-generation from code and system behavior

Implementation Considerations:
- Start with well-contained, non-critical systems
- Use AI as augmentation, not replacement, for human expertise
- Invest in training teams on AI tooling
- Establish validation processes for AI-generated code
- Monitor quality metrics throughout

The future of modernization will be increasingly AI-driven, with teams focusing on strategic decisions while AI handles routine transformation tasks.`,
    author: "Alex Thompson",
    date: "2024-04-08",
    category: "Technical",
    industry: "Multi-Industry",
    readingTime: 13,
  },
];

const categoryColors: Record<string, string> = {
  Strategy: "primary",
  Technical: "secondary",
  "Case Study": "accent",
  Industry: "neutral",
  "Best Practices": "success",
};

function BlogSchemaMarkup() {
  const blogs = blogPosts.map((post) => ({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: `${siteUrl}/og-blog.png`,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Yumesorai",
      url: siteUrl,
    },
  }));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Yumesorai Blog",
          url: `${siteUrl}/blog`,
          posts: blogs,
        }),
      }}
    />
  );
}

export default function BlogPage() {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <BlogSchemaMarkup />

      {/* Hero Section */}
      <section className="border-b border-indigo-950/5 bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-5xl">
              Blog
            </h1>
            <p className="mt-6 text-base leading-7 text-indigo-950/60 sm:text-lg">
              Expert insights, industry trends, and practical guidance on legacy
              modernization. Learn from our experience transforming enterprise
              systems.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts List */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {blogPosts.map((post) => (
              <article key={post.id} className="border-b border-indigo-950/5 pb-8 last:border-0">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={categoryColors[post.category] as "primary" | "secondary" | "neutral" | "success" | "error"}
                      size="sm"
                    >
                      {post.category}
                    </Badge>
                    {post.industry && post.industry !== "Multi-Industry" && (
                      <Badge variant="neutral" size="sm">
                        {post.industry}
                      </Badge>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold tracking-tight text-indigo-950">
                    {post.title}
                  </h2>

                  <p className="text-base text-indigo-950/60">
                    {post.excerpt}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-indigo-950/50">
                    <span>By {post.author}</span>
                    <span>•</span>
                    <span>{formatDate(post.date)}</span>
                    <span>•</span>
                    <span>{post.readingTime} min read</span>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    disabled
                  >
                    Read Article (Coming Soon)
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-indigo-950/5 bg-indigo-50/30 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to Modernize?
            </h2>
            <p className="mt-4 text-base text-indigo-100">
              Get personalized insights and recommendations from our modernization experts.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none bg-secondary text-secondary-foreground hover:bg-secondary-700 active:bg-secondary-800 h-12 px-6 text-base"
              >
                Contact Us
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none text-white hover:bg-white/20 h-12 px-6 text-base"
              >
                Schedule Demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
