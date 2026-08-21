import type { FullCalculatorData } from "./form-validation";

// ── ROI Calculation Engine ─────────────────────────────────────────────

export interface ROIResults {
  currentAnnualCost: number;
  projectedAnnualCost: number;
  annualSavings: number;
  threeYearSavings: number;
  roiPercentage: number;
  paybackMonths: number;
  complianceRiskReduction: number;
  downtimeReduction: number;
  breakdown: CostBreakdown;
}

interface CostBreakdown {
  infrastructure: { current: number; projected: number };
  maintenance: { current: number; projected: number };
  compliance: { current: number; projected: number };
  staffing: { current: number; projected: number };
  downtime: { current: number; projected: number };
}

const BUDGET_MIDPOINTS: Record<string, number> = {
  "under-500k": 300_000,
  "500k-2m": 1_200_000,
  "2m-10m": 5_000_000,
  "10m-50m": 25_000_000,
  "50m+": 75_000_000,
};

const COMPANY_SIZE_MULTIPLIERS: Record<string, number> = {
  "1-50": 0.6,
  "51-200": 0.8,
  "201-1000": 1.0,
  "1001-5000": 1.2,
  "5000+": 1.4,
};

const STACK_INEFFICIENCY: Record<string, number> = {
  "legacy-mainframe": 0.45,
  "on-prem-servers": 0.35,
  "hybrid-cloud": 0.2,
  "full-cloud": 0.1,
  other: 0.25,
};

const INDUSTRY_COMPLIANCE_WEIGHT: Record<string, number> = {
  healthcare: 1.4,
  banking: 1.35,
  insurance: 1.3,
  airlines: 1.2,
  government: 1.25,
  other: 1.0,
};

const PAIN_POINT_SAVINGS: Record<string, number> = {
  compliance: 0.08,
  maintenance: 0.12,
  downtime: 0.1,
  scalability: 0.07,
  security: 0.09,
  talent: 0.06,
  speed: 0.08,
  cost: 0.1,
};

export function calculateROI(data: FullCalculatorData): ROIResults {
  const budget = BUDGET_MIDPOINTS[data.annualITBudget] ?? 1_200_000;
  const sizeMultiplier = COMPANY_SIZE_MULTIPLIERS[data.companySize] ?? 1.0;
  const inefficiency = STACK_INEFFICIENCY[data.currentStack] ?? 0.25;
  const complianceWeight = INDUSTRY_COMPLIANCE_WEIGHT[data.industry] ?? 1.0;

  // Calculate current cost distribution
  const baseCost = budget * sizeMultiplier;
  const infraCurrent = baseCost * 0.3;
  const maintenanceCurrent = baseCost * 0.25 * (1 + inefficiency);
  const complianceCurrent = baseCost * 0.15 * complianceWeight;
  const staffingCurrent = data.teamSize * 95_000; // avg IT salary
  const downtimeCurrent = baseCost * 0.05 * (1 + inefficiency);

  const currentAnnualCost =
    infraCurrent + maintenanceCurrent + complianceCurrent + staffingCurrent + downtimeCurrent;

  // Calculate pain-point-driven savings
  let painPointReduction = 0;
  for (const pain of data.painPoints) {
    painPointReduction += PAIN_POINT_SAVINGS[pain] ?? 0.05;
  }
  painPointReduction = Math.min(painPointReduction, 0.45); // cap at 45%

  // Projected costs with modernization
  const savingsRate = 0.15 + painPointReduction * 0.6; // base 15% + pain-point gains
  const infraProjected = infraCurrent * (1 - savingsRate * 0.8);
  const maintenanceProjected = maintenanceCurrent * (1 - savingsRate * 1.2);
  const complianceProjected = complianceCurrent * (1 - savingsRate * 0.5);
  const staffingProjected = staffingCurrent * (1 - savingsRate * 0.3);
  const downtimeProjected = downtimeCurrent * (1 - savingsRate * 1.5);

  const projectedAnnualCost =
    infraProjected +
    maintenanceProjected +
    complianceProjected +
    staffingProjected +
    Math.max(downtimeProjected, 0);

  const annualSavings = currentAnnualCost - projectedAnnualCost;
  const implementationCost = annualSavings * 1.2; // rough implementation cost
  const threeYearSavings = annualSavings * 3 - implementationCost;
  const roiPercentage = (threeYearSavings / implementationCost) * 100;
  const paybackMonths = Math.ceil((implementationCost / annualSavings) * 12);

  const complianceRiskReduction = Math.round(
    (1 - complianceProjected / complianceCurrent) * 100
  );
  const downtimeReduction = Math.round(
    (1 - Math.max(downtimeProjected, 0) / downtimeCurrent) * 100
  );

  return {
    currentAnnualCost: Math.round(currentAnnualCost),
    projectedAnnualCost: Math.round(projectedAnnualCost),
    annualSavings: Math.round(annualSavings),
    threeYearSavings: Math.round(threeYearSavings),
    roiPercentage: Math.round(roiPercentage),
    paybackMonths,
    complianceRiskReduction,
    downtimeReduction,
    breakdown: {
      infrastructure: { current: Math.round(infraCurrent), projected: Math.round(infraProjected) },
      maintenance: { current: Math.round(maintenanceCurrent), projected: Math.round(maintenanceProjected) },
      compliance: { current: Math.round(complianceCurrent), projected: Math.round(complianceProjected) },
      staffing: { current: Math.round(staffingCurrent), projected: Math.round(staffingProjected) },
      downtime: { current: Math.round(downtimeCurrent), projected: Math.round(Math.max(downtimeProjected, 0)) },
    },
  };
}

// ── Risk Score Engine ──────────────────────────────────────────────────

export interface RiskScoreResults {
  overallScore: number; // 0-100, higher = more risk
  riskLevel: "low" | "moderate" | "high" | "critical";
  categories: RiskCategory[];
  recommendations: Recommendation[];
}

interface RiskCategory {
  name: string;
  score: number;
  maxScore: number;
  findings: string[];
}

interface Recommendation {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
}

export function calculateRiskScore(data: {
  hasSecurityTeam: string;
  complianceFrameworks: string[];
  lastAuditDate: string;
  incidentResponsePlan: string;
  dataClassification: string;
  thirdPartyRiskMgmt: string;
  topConcerns: string[];
  budgetChange: string;
  employeeCount: string;
}): RiskScoreResults {
  const categories: RiskCategory[] = [];
  const recommendations: Recommendation[] = [];

  // Governance & Team (0-25)
  let govScore = 0;
  const govFindings: string[] = [];
  if (data.hasSecurityTeam === "no") {
    govScore += 20;
    govFindings.push("No dedicated security team in place");
    recommendations.push({
      priority: "high",
      title: "Establish a Security Function",
      description:
        "Organizations without dedicated security personnel face significantly higher breach risk. Consider hiring a security lead or engaging a managed security provider.",
    });
  } else if (data.hasSecurityTeam === "outsourced") {
    govScore += 8;
    govFindings.push("Security is outsourced -- ensure SLAs cover incident response");
  }
  if (data.budgetChange === "decreasing") {
    govScore += 5;
    govFindings.push("Decreasing security budget may create coverage gaps");
    recommendations.push({
      priority: "medium",
      title: "Justify Security Investment",
      description:
        "Prepare a business case linking security spending to risk reduction. Quantify potential breach costs vs. prevention investment.",
    });
  }
  categories.push({ name: "Security Governance", score: govScore, maxScore: 25, findings: govFindings });

  // Compliance Posture (0-25)
  let compScore = 0;
  const compFindings: string[] = [];
  if (data.complianceFrameworks.length <= 1) {
    compScore += 10;
    compFindings.push("Limited compliance framework coverage");
  }
  if (data.lastAuditDate === "over-12-months" || data.lastAuditDate === "never") {
    compScore += 15;
    compFindings.push(
      data.lastAuditDate === "never"
        ? "No security audit has been performed"
        : "Last audit was over 12 months ago"
    );
    recommendations.push({
      priority: "high",
      title: "Schedule a Security Audit",
      description:
        "Regular audits are essential for identifying vulnerabilities and maintaining compliance. Schedule a comprehensive audit within the next quarter.",
    });
  } else if (data.lastAuditDate === "6-12-months") {
    compScore += 5;
    compFindings.push("Audit cycle could be tightened to semi-annual");
  }
  categories.push({ name: "Compliance Posture", score: compScore, maxScore: 25, findings: compFindings });

  // Incident Readiness (0-25)
  let irScore = 0;
  const irFindings: string[] = [];
  if (data.incidentResponsePlan === "no") {
    irScore += 20;
    irFindings.push("No incident response plan exists");
    recommendations.push({
      priority: "high",
      title: "Develop an Incident Response Plan",
      description:
        "Without a documented and tested IR plan, your organization will face extended downtime and regulatory exposure during a breach.",
    });
  } else if (data.incidentResponsePlan === "in-progress") {
    irScore += 12;
    irFindings.push("Incident response plan is still in development");
  } else if (data.incidentResponsePlan === "yes-untested") {
    irScore += 7;
    irFindings.push("Incident response plan has not been tested via tabletop exercises");
    recommendations.push({
      priority: "medium",
      title: "Test Your IR Plan",
      description:
        "Conduct tabletop exercises quarterly to validate your incident response procedures and identify gaps.",
    });
  }
  if (data.dataClassification === "not-classified") {
    irScore += 5;
    irFindings.push("Data is not classified, making breach impact assessment difficult");
  }
  categories.push({ name: "Incident Readiness", score: irScore, maxScore: 25, findings: irFindings });

  // Third-Party & Data Risk (0-25)
  let tpScore = 0;
  const tpFindings: string[] = [];
  if (data.thirdPartyRiskMgmt === "none") {
    tpScore += 18;
    tpFindings.push("No third-party risk management program");
    recommendations.push({
      priority: "high",
      title: "Implement Vendor Risk Management",
      description:
        "Third-party breaches account for a significant portion of security incidents. Establish a formal vendor assessment and monitoring program.",
    });
  } else if (data.thirdPartyRiskMgmt === "informal") {
    tpScore += 8;
    tpFindings.push("Third-party risk management is informal and may have blind spots");
  }
  if (data.dataClassification === "not-classified") {
    tpScore += 5;
    tpFindings.push("Without data classification, third-party data sharing risks are amplified");
  } else if (data.dataClassification === "partially") {
    tpScore += 2;
    tpFindings.push("Partial data classification leaves some data exposure unquantified");
  }

  // Scale risk based on org size
  const sizeBoost =
    data.employeeCount === "10000+" ? 2 : data.employeeCount === "2001-10000" ? 1 : 0;
  tpScore = Math.min(tpScore + sizeBoost, 25);

  categories.push({ name: "Third-Party & Data Risk", score: tpScore, maxScore: 25, findings: tpFindings });

  // Overall
  const overallScore = categories.reduce((sum, c) => sum + c.score, 0);
  let riskLevel: RiskScoreResults["riskLevel"];
  if (overallScore >= 70) riskLevel = "critical";
  else if (overallScore >= 45) riskLevel = "high";
  else if (overallScore >= 25) riskLevel = "moderate";
  else riskLevel = "low";

  // Add general recommendations based on concerns
  if (data.topConcerns.includes("ransomware")) {
    recommendations.push({
      priority: "medium",
      title: "Ransomware Resilience Assessment",
      description:
        "Evaluate backup strategies, network segmentation, and endpoint detection capabilities against ransomware attack vectors.",
    });
  }
  if (data.topConcerns.includes("insider-threats")) {
    recommendations.push({
      priority: "medium",
      title: "Insider Threat Program",
      description:
        "Implement user behavior analytics and access controls to detect and prevent insider threats.",
    });
  }

  return { overallScore, riskLevel, categories, recommendations };
}

// ── Formatting Helpers ─────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function formatPercent(value: number): string {
  return `${value}%`;
}
