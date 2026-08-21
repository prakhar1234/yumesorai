import type { Metadata } from "next";
import ContactFormClient from "./contact-form";

export const metadata: Metadata = {
  title: "Contact Sales | Yumesorai",
  description:
    "Get in touch with our legacy modernization experts. Request a briefing, ask questions, or schedule a consultation about AI-driven transformation for your enterprise.",
  keywords: [
    "contact",
    "sales",
    "briefing",
    "consultation",
    "legacy modernization",
  ],
  openGraph: {
    title: "Contact Sales | Yumesorai",
    description:
      "Get in touch with our legacy modernization experts to transform your enterprise systems.",
    url: "https://www.yumesorai.com/contact",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Contact Sales | Yumesorai",
    description:
      "Get in touch with our legacy modernization experts to transform your enterprise systems.",
  },
  alternates: {
    canonical: "https://www.yumesorai.com/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <ContactFormClient />
    </>
  );
}
