export interface LegacySystem {
  name: string;
  age: string;
  risk: "high" | "medium" | "low";
  description: string;
}

export interface ComplianceMilestone {
  year: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "upcoming";
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface IndustryData {
  slug: string;
  name: string;
  headline: string;
  subheadline: string;
  heroStats: { label: string; value: string }[];
  painPoints: string[];
  legacySystems: LegacySystem[];
  complianceTimeline: ComplianceMilestone[];
  ctaHeadline: string;
  ctaDescription: string;
  faqItems: FAQItem[];
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
}

export const industryData: Record<string, IndustryData> = {
  healthcare: {
    slug: "healthcare",
    name: "Healthcare",
    headline: "Modernize Healthcare IT Without Disrupting Patient Care",
    subheadline:
      "Navigate HIPAA compliance, EHR interoperability, and legacy system migration with a partner who understands clinical workflows.",
    heroStats: [
      { label: "Average EHR downtime cost per hour", value: "$1.5M" },
      { label: "Of healthcare breaches involve legacy systems", value: "73%" },
      { label: "Years average age of hospital core systems", value: "22" },
    ],
    painPoints: [
      "HIPAA compliance gaps in aging infrastructure",
      "EHR system interoperability failures",
      "Patient data siloed across incompatible platforms",
      "Rising cybersecurity threats to medical devices",
    ],
    legacySystems: [
      {
        name: "MUMPS/Cache-based EHR",
        age: "30+ years",
        risk: "high",
        description:
          "Legacy electronic health record systems built on decades-old database technology with limited API support.",
      },
      {
        name: "HL7v2 Integration Engine",
        age: "25+ years",
        risk: "high",
        description:
          "Point-to-point interfaces that create brittle connections between clinical systems.",
      },
      {
        name: "On-premise PACS",
        age: "15+ years",
        risk: "medium",
        description:
          "Picture archiving and communication systems requiring costly hardware refresh cycles.",
      },
      {
        name: "Custom Billing Systems",
        age: "20+ years",
        risk: "medium",
        description:
          "Revenue cycle management platforms struggling with value-based care models.",
      },
    ],
    complianceTimeline: [
      {
        year: "Phase 1",
        title: "Assessment & Gap Analysis",
        description:
          "Full HIPAA security risk assessment and legacy system inventory with PHI data flow mapping.",
        status: "completed",
      },
      {
        year: "Phase 2",
        title: "FHIR API Layer",
        description:
          "Deploy interoperability layer supporting FHIR R4 standards for seamless data exchange.",
        status: "in-progress",
      },
      {
        year: "Phase 3",
        title: "Cloud Migration",
        description:
          "HITRUST-certified cloud migration with zero-downtime cutover for critical clinical systems.",
        status: "upcoming",
      },
      {
        year: "Phase 4",
        title: "Continuous Compliance",
        description:
          "Automated compliance monitoring, audit trails, and ongoing security posture management.",
        status: "upcoming",
      },
    ],
    ctaHeadline: "Ready to Secure Your Healthcare IT Future?",
    ctaDescription:
      "Schedule a confidential briefing to assess your legacy risk exposure and build a HIPAA-compliant modernization roadmap.",
    faqItems: [
      {
        question:
          "How do you ensure zero downtime during EHR migration?",
        answer:
          "We use a strangler fig pattern with parallel-run validation, ensuring the legacy system remains fully operational until the new platform is verified across all clinical workflows.",
      },
      {
        question: "What HIPAA safeguards are built into the migration process?",
        answer:
          "Every phase includes encryption in transit and at rest, access controls, audit logging, and BAA-covered cloud infrastructure. We conduct continuous risk assessments throughout.",
      },
      {
        question: "Can you integrate with our existing Epic or Cerner system?",
        answer:
          "Yes. We build FHIR-native integration layers that connect with major EHR platforms, enabling data exchange without replacing your core clinical system until you are ready.",
      },
    ],
    seo: {
      title: "Healthcare Legacy Modernization",
      description:
        "Modernize healthcare IT systems with HIPAA-compliant migration. Transform EHR, billing, and clinical platforms with AI-powered legacy modernization from Yumesorai.",
      keywords: [
        "healthcare IT modernization",
        "HIPAA compliant migration",
        "EHR modernization",
        "healthcare legacy systems",
        "clinical system migration",
        "FHIR interoperability",
      ],
    },
  },
  airlines: {
    slug: "airlines",
    name: "Airlines",
    headline: "Transform Airline Operations from Legacy Constraints",
    subheadline:
      "Modernize GDS connections, reservation systems, and crew management platforms without grounding your operations.",
    heroStats: [
      { label: "Cost of a 1-hour reservation system outage", value: "$5.2M" },
      { label: "Of airline IT runs on systems over 20 years old", value: "68%" },
      { label: "Annual legacy maintenance spend industry-wide", value: "$35B" },
    ],
    painPoints: [
      "GDS dependencies creating vendor lock-in",
      "PSS systems unable to support modern retailing (NDC/ONE Order)",
      "Crew management on inflexible legacy platforms",
      "Revenue management models outdated for dynamic pricing",
    ],
    legacySystems: [
      {
        name: "TPF-based Reservation System",
        age: "40+ years",
        risk: "high",
        description:
          "Transaction Processing Facility mainframes handling millions of bookings on 1970s-era architecture.",
      },
      {
        name: "Legacy GDS Connections",
        age: "35+ years",
        risk: "high",
        description:
          "Global Distribution System interfaces with rigid message formats limiting modern offer management.",
      },
      {
        name: "Crew Management System",
        age: "20+ years",
        risk: "medium",
        description:
          "Scheduling and rostering platforms unable to optimize with modern AI/ML techniques.",
      },
      {
        name: "Departure Control System",
        age: "25+ years",
        risk: "medium",
        description:
          "Check-in and boarding systems with limited mobile and self-service capabilities.",
      },
    ],
    complianceTimeline: [
      {
        year: "Phase 1",
        title: "System Audit & NDC Readiness",
        description:
          "Comprehensive assessment of PSS, GDS dependencies, and readiness for IATA NDC and ONE Order standards.",
        status: "completed",
      },
      {
        year: "Phase 2",
        title: "API Gateway & Offer Management",
        description:
          "Deploy modern API layer enabling NDC-compliant offer and order management alongside legacy systems.",
        status: "in-progress",
      },
      {
        year: "Phase 3",
        title: "Core PSS Modernization",
        description:
          "Incremental migration from TPF to cloud-native reservation platform with real-time failover.",
        status: "upcoming",
      },
      {
        year: "Phase 4",
        title: "AI-Powered Operations",
        description:
          "Deploy ML-driven crew optimization, dynamic pricing, and predictive maintenance integration.",
        status: "upcoming",
      },
    ],
    ctaHeadline: "Ground Your Legacy Risk, Not Your Fleet",
    ctaDescription:
      "Request a confidential operations briefing to map your legacy exposure and build a modernization flight plan.",
    faqItems: [
      {
        question: "How do you handle GDS migration without disrupting bookings?",
        answer:
          "We implement a dual-stack approach where the new NDC-capable offer management system runs in parallel with existing GDS connections, with traffic gradually shifted as validation confirms parity.",
      },
      {
        question: "Can you modernize our PSS without a full replacement?",
        answer:
          "Yes. Our strangler fig approach wraps legacy PSS functions behind modern APIs, allowing incremental migration of capabilities while the core system continues operating.",
      },
      {
        question: "What about regulatory compliance during the transition?",
        answer:
          "We maintain full compliance with IATA, FAA, and regional aviation authority requirements throughout, with dedicated compliance checkpoints at each migration phase.",
      },
    ],
    seo: {
      title: "Airline Legacy System Modernization",
      description:
        "Transform airline reservation systems, GDS connections, and crew management platforms. AI-powered legacy modernization for aviation from Yumesorai.",
      keywords: [
        "airline IT modernization",
        "GDS migration",
        "PSS modernization",
        "airline reservation system",
        "TPF migration",
        "NDC compliance",
      ],
    },
  },
  banking: {
    slug: "banking",
    name: "Banking",
    headline: "Core Banking Modernization Without Regulatory Risk",
    subheadline:
      "Transform legacy mainframe systems and meet evolving regulatory demands while maintaining uninterrupted financial services.",
    heroStats: [
      { label: "Annual cost of legacy core banking maintenance", value: "$8.2B" },
      { label: "Of banks run core systems older than 25 years", value: "43%" },
      { label: "Average regulatory fines from system failures", value: "$180M" },
    ],
    painPoints: [
      "COBOL mainframes with shrinking talent pool",
      "Batch processing unable to support real-time payments",
      "Regulatory reporting consuming excessive manual effort",
      "Open banking API mandates straining legacy architecture",
    ],
    legacySystems: [
      {
        name: "COBOL Core Banking Platform",
        age: "35+ years",
        risk: "high",
        description:
          "Mainframe-based core banking systems processing millions of daily transactions on decades-old code.",
      },
      {
        name: "Batch Processing Engine",
        age: "30+ years",
        risk: "high",
        description:
          "End-of-day batch cycles creating settlement delays incompatible with instant payment mandates.",
      },
      {
        name: "Legacy Data Warehouse",
        age: "20+ years",
        risk: "medium",
        description:
          "On-premise reporting infrastructure unable to meet real-time regulatory reporting requirements.",
      },
      {
        name: "Monolithic Middleware",
        age: "15+ years",
        risk: "medium",
        description:
          "Enterprise service bus architecture creating bottlenecks for open banking API delivery.",
      },
    ],
    complianceTimeline: [
      {
        year: "Phase 1",
        title: "Regulatory Impact Assessment",
        description:
          "Map regulatory obligations (Basel III/IV, PSD2, SOX) against current system capabilities and identify gaps.",
        status: "completed",
      },
      {
        year: "Phase 2",
        title: "API Banking Layer",
        description:
          "Deploy PSD2/open banking compliant API gateway with real-time transaction capabilities.",
        status: "in-progress",
      },
      {
        year: "Phase 3",
        title: "Core Decomposition",
        description:
          "Incrementally extract core banking functions into cloud-native microservices with mainframe co-existence.",
        status: "upcoming",
      },
      {
        year: "Phase 4",
        title: "Real-time Regulatory Platform",
        description:
          "Automated regulatory reporting, real-time risk monitoring, and continuous compliance validation.",
        status: "upcoming",
      },
    ],
    ctaHeadline: "De-Risk Your Core Banking Transformation",
    ctaDescription:
      "Schedule an executive briefing to evaluate your legacy exposure and regulatory modernization pathway.",
    faqItems: [
      {
        question: "How do you de-risk core banking migration?",
        answer:
          "We use progressive decomposition: extracting discrete banking functions into microservices while the mainframe continues processing. Each function is validated in production before the next extraction begins.",
      },
      {
        question: "What about regulatory compliance during modernization?",
        answer:
          "Every phase includes regulatory impact analysis with sign-off gates. We maintain parallel audit trails and ensure all reporting obligations are met continuously throughout the transformation.",
      },
      {
        question: "Can you support real-time payments on our legacy core?",
        answer:
          "Yes. We deploy a real-time payment processing layer that interfaces with your existing core, enabling instant payment capabilities without requiring a full core replacement upfront.",
      },
    ],
    seo: {
      title: "Core Banking Modernization",
      description:
        "Modernize core banking systems, COBOL mainframes, and payment platforms. Regulatory-compliant legacy transformation with AI from Yumesorai.",
      keywords: [
        "core banking modernization",
        "COBOL migration",
        "mainframe modernization",
        "banking legacy systems",
        "PSD2 compliance",
        "real-time payments",
      ],
    },
  },
};
