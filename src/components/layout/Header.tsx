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
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Primary navigation"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
          <div className="w-10 h-10">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <defs>
                <linearGradient id="yGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#FF6B35',stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#0066FF',stopOpacity:1}} />
                </linearGradient>
                <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#FFA500',stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#00D4FF',stopOpacity:1}} />
                </linearGradient>
              </defs>
              <g id="y-shape">
                <path d="M 70 60 Q 60 85 100 110" stroke="url(#yGradient)" strokeWidth="16" fill="none" strokeLinecap="round"/>
                <path d="M 130 60 Q 140 85 100 110" stroke="url(#yGradient)" strokeWidth="16" fill="none" strokeLinecap="round"/>
                <path d="M 100 110 L 100 160" stroke="url(#yGradient)" strokeWidth="16" fill="none" strokeLinecap="round"/>
              </g>
              <path d="M 50 100 Q 100 60 150 100" stroke="url(#arcGradient)" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.8"/>
              <g id="arrow">
                <path d="M 140 40 L 160 35 L 155 55" fill="url(#arcGradient)" stroke="none"/>
              </g>
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-indigo-950">
            Yumesorai
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-indigo-950/70 transition-colors hover:text-indigo-950"
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
