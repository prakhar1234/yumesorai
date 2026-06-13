"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const navLinks = [
  {
    label: "Solutions",
    href: "/solutions",
    children: [
      { label: "Healthcare", href: "/solutions/healthcare" },
      { label: "Airlines", href: "/solutions/airlines" },
      { label: "Banking", href: "/solutions/banking" },
    ],
  },
  { label: "Platform", href: "/platform" },
  { label: "Resources", href: "/resources" },
  { label: "About", href: "/about" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-indigo-950/5 bg-offwhite/80 backdrop-blur-lg">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Primary navigation"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" onClick={() => setIsOpen(false)}>
          <div className="rounded-xl bg-gradient-to-br from-white to-indigo-50/50 p-2 shadow-lg shadow-coral/20 border-2 border-coral/20 hover:shadow-xl hover:shadow-coral/30 transition-all">
            <Image
              src="/images/logos/yumesorai-logo-main.jpeg"
              alt="Yumesorai"
              width={180}
              height={60}
              className="h-16 w-auto drop-shadow-sm"
              priority
            />
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-base font-medium text-indigo-950/70 transition-colors hover:text-indigo-950"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="hidden text-sm font-medium text-indigo-950/70 transition-colors hover:text-indigo-950 sm:block"
            onClick={() => setIsOpen(false)}
          >
            Contact
          </Link>
          <Link
            href="/demo"
            className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-coral-dark hover:shadow-md"
            onClick={() => setIsOpen(false)}
          >
            Request Demo
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="ml-3 inline-flex items-center justify-center rounded-md p-2 text-indigo-950/70 hover:text-indigo-950 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {isOpen && (
        <div className="border-t border-indigo-950/5 bg-offwhite md:hidden">
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => (
              <div key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-md px-3 py-2 text-base font-medium text-indigo-950/70 transition-colors hover:bg-indigo-950/5 hover:text-indigo-950"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
                {link.children && (
                  <div className="pl-4 space-y-1">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block rounded-md px-3 py-2 text-sm font-medium text-indigo-950/60 transition-colors hover:bg-indigo-950/5 hover:text-indigo-950"
                        onClick={() => setIsOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link
              href="/contact"
              className="block rounded-md px-3 py-2 text-base font-medium text-indigo-950/70 transition-colors hover:bg-indigo-950/5 hover:text-indigo-950"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
