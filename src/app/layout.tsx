import type { Metadata } from "next";
import localFont from "next/font/local";
import PlausibleProvider from "@/components/analytics/PlausibleProvider";
import CookieConsent from "@/components/analytics/CookieConsent";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const siteUrl = "https://www.yumesorai.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: {
    icon: "/images/logos/yumesorai-logo-main.jpeg",
  },
  title: {
    default: "Yumesorai | AI-Driven Legacy Modernization",
    template: "%s | Yumesorai",
  },
  description:
    "Yumesorai transforms legacy systems into modern, cloud-native platforms using AI. Reduce risk, cut costs, and accelerate digital transformation for healthcare, airlines, and banking.",
  keywords: [
    "legacy modernization",
    "AI transformation",
    "cloud migration",
    "digital transformation",
    "healthcare IT",
    "airline technology",
    "banking modernization",
    "COBOL migration",
    "mainframe modernization",
  ],
  authors: [{ name: "Yumesorai" }],
  creator: "Yumesorai",
  publisher: "Yumesorai",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Yumesorai",
    title: "Yumesorai | AI-Driven Legacy Modernization",
    description:
      "Transform legacy systems into modern, cloud-native platforms using AI. Reduce risk, cut costs, and accelerate digital transformation.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Yumesorai - AI-Driven Legacy Modernization",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yumesorai | AI-Driven Legacy Modernization",
    description:
      "Transform legacy systems into modern, cloud-native platforms using AI.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: siteUrl,
  },
};

function JsonLdSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Yumesorai",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description:
      "AI-driven legacy modernization platform transforming enterprise systems for healthcare, airlines, and banking.",
    sameAs: [
      "https://www.linkedin.com/company/yumesorai",
      "https://twitter.com/yumesorai",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "contact@yumesorai.com",
    },
    areaServed: "Worldwide",
    knowsAbout: [
      "Legacy Modernization",
      "AI Transformation",
      "Cloud Migration",
      "Digital Transformation",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <JsonLdSchema />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-offwhite text-indigo-950`}
      >
        <Header />
        <main>{children}</main>
        <Footer />
        <PlausibleProvider />
        <CookieConsent />
      </body>
    </html>
  );
}
