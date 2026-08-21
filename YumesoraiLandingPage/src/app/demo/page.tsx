import type { Metadata } from "next";
import DemoFormClient from "./demo-form";

export const metadata: Metadata = {
  title: "Schedule Executive Briefing | Yumesorai",
  description:
    "Schedule a personalized executive briefing with our legacy modernization experts. Learn how AI-driven transformation can accelerate your digital initiatives.",
  keywords: [
    "executive briefing",
    "demo",
    "schedule",
    "consultation",
    "legacy modernization",
  ],
  openGraph: {
    title: "Schedule Executive Briefing | Yumesorai",
    description:
      "Schedule a personalized briefing with our legacy modernization experts.",
    url: "https://www.yumesorai.com/demo",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Schedule Executive Briefing | Yumesorai",
    description:
      "Schedule a personalized briefing with our legacy modernization experts.",
  },
  alternates: {
    canonical: "https://www.yumesorai.com/demo",
  },
};

export default function DemoPage() {
  return <DemoFormClient />;
}
