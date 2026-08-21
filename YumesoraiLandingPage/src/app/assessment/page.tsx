import type { Metadata } from "next";
import AssessmentFormClient from "./assessment-form";

export const metadata: Metadata = {
  title: "Free Legacy Assessment | Yumesorai",
  description:
    "Take our free, no-obligation legacy system assessment. Discover the modernization opportunities and risks in your current infrastructure.",
  keywords: [
    "assessment",
    "free",
    "legacy",
    "evaluation",
    "discovery",
    "modernization",
  ],
  openGraph: {
    title: "Free Legacy Assessment | Yumesorai",
    description:
      "Take our free legacy system assessment and discover modernization opportunities.",
    url: "https://www.yumesorai.com/assessment",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Free Legacy Assessment | Yumesorai",
    description:
      "Take our free legacy system assessment and discover modernization opportunities.",
  },
  alternates: {
    canonical: "https://www.yumesorai.com/assessment",
  },
};

export default function AssessmentPage() {
  return <AssessmentFormClient />;
}
