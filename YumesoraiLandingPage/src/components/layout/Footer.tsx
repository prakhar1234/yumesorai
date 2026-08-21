import Link from "next/link";

const footerSections = [
  {
    title: "Solutions",
    links: [
      { label: "Healthcare", href: "/solutions/healthcare" },
      { label: "Airlines", href: "/solutions/airlines" },
      { label: "Banking", href: "/solutions/banking" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "How It Works", href: "/platform" },
      { label: "Security", href: "/security" },
      { label: "Integrations", href: "/integrations" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Case Studies", href: "/resources/case-studies" },
      { label: "Blog", href: "/resources/blog" },
      { label: "Whitepapers", href: "/resources/whitepapers" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-indigo-950/5 bg-indigo-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Yumesorai
            </Link>
            <p className="mt-3 text-sm text-white/60">
              AI-driven legacy modernization for the enterprises that move the
              world.
            </p>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">
                {section.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="text-center text-xs text-white/40">
            &copy; {new Date().getFullYear()} Yumesorai. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
