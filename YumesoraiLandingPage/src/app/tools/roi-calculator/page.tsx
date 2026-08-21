"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { calculateROI, formatCurrency } from "@/lib/calculator-engine";
import type { FullCalculatorData } from "@/lib/form-validation";
import type { ROIResults } from "@/lib/calculator-engine";

interface FormData {
  companyName: string;
  companySize: string;
  industry: string;
  currentStack: string;
  annualITBudget: string;
  teamSize: string;
  painPoints: string[];
  timeline: string;
}

const PAIN_POINT_OPTIONS = [
  { value: "compliance", label: "Compliance & Regulatory" },
  { value: "maintenance", label: "High Maintenance Costs" },
  { value: "downtime", label: "System Downtime & Outages" },
  { value: "scalability", label: "Scalability Limitations" },
  { value: "security", label: "Security Vulnerabilities" },
  { value: "talent", label: "Talent Retention Challenges" },
  { value: "speed", label: "Slow Feature Delivery" },
  { value: "cost", label: "Rising Infrastructure Costs" },
];

export default function ROICalculatorPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    companySize: "",
    industry: "",
    currentStack: "",
    annualITBudget: "",
    teamSize: "",
    painPoints: [],
    timeline: "",
  });
  const [results, setResults] = useState<ROIResults | null>(null);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePainPointToggle = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      painPoints: prev.painPoints.includes(value)
        ? prev.painPoints.filter((p) => p !== value)
        : [...prev.painPoints, value],
    }));
  };

  const handleCalculate = () => {
    if (formData.companySize && formData.industry && formData.currentStack &&
        formData.annualITBudget && formData.teamSize && formData.painPoints.length > 0) {
      const calculationData: FullCalculatorData = {
        companyName: formData.companyName,
        companySize: formData.companySize as "1-50" | "51-200" | "201-1000" | "1001-5000" | "5000+",
        industry: formData.industry as "healthcare" | "airlines" | "banking" | "insurance" | "government" | "other",
        currentStack: formData.currentStack as "legacy-mainframe" | "on-prem-servers" | "hybrid-cloud" | "full-cloud" | "other",
        annualITBudget: formData.annualITBudget as "under-500k" | "500k-2m" | "2m-10m" | "10m-50m" | "50m+",
        teamSize: parseInt(formData.teamSize),
        painPoints: formData.painPoints as string[],
        timeline: formData.timeline as "immediate" | "3-months" | "6-months" | "12-months" | "exploratory",
        contactEmail: "",
        contactName: "",
      };

      const roi = calculateROI(calculationData);
      setResults(roi);
      setStep(3);
    }
  };

  const canProceedStep1 =
    formData.companyName && formData.companySize && formData.industry;
  const canProceedStep2 =
    formData.currentStack && formData.annualITBudget && formData.teamSize;

  return (
    <>
      {/* Hero Section */}
      <section className="border-b border-indigo-950/5 bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-5xl">
              ROI Calculator
            </h1>
            <p className="mt-6 text-base leading-7 text-indigo-950/60 sm:text-lg">
              Estimate the financial impact and timeline of your legacy
              modernization initiative. See how much you could save.
            </p>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          {!results ? (
            <div className="space-y-8">
              {/* Step 1 */}
              {step >= 1 && (
                <Card variant="outlined">
                  <CardHeader>
                    <div>
                      <h2 className="text-xl font-semibold text-indigo-950">
                        Step 1: Organization Overview
                      </h2>
                      <p className="mt-1 text-sm text-indigo-950/60">
                        Tell us about your organization
                      </p>
                    </div>
                    <Badge variant="primary">1 of 2</Badge>
                  </CardHeader>
                  <CardBody className="space-y-6">
                    <Input
                      label="Company Name"
                      placeholder="Acme Corp"
                      value={formData.companyName}
                      onChange={(e) =>
                        handleInputChange("companyName", e.target.value)
                      }
                    />

                    <Select
                      label="Company Size"
                      placeholder="Select company size"
                      options={[
                        { value: "1-50", label: "1-50 employees" },
                        { value: "51-200", label: "51-200 employees" },
                        { value: "201-1000", label: "201-1,000 employees" },
                        { value: "1001-5000", label: "1,001-5,000 employees" },
                        { value: "5000+", label: "5,000+ employees" },
                      ]}
                      value={formData.companySize}
                      onValueChange={(v) => handleInputChange("companySize", v)}
                    />

                    <Select
                      label="Industry"
                      placeholder="Select your industry"
                      options={[
                        { value: "healthcare", label: "Healthcare" },
                        { value: "airlines", label: "Airlines & Travel" },
                        { value: "banking", label: "Banking & Finance" },
                        { value: "insurance", label: "Insurance" },
                        { value: "government", label: "Government" },
                        { value: "other", label: "Other" },
                      ]}
                      value={formData.industry}
                      onValueChange={(v) => handleInputChange("industry", v)}
                    />

                    <Button
                      className="w-full"
                      disabled={!canProceedStep1}
                      onClick={() => setStep(2)}
                    >
                      Continue to Step 2
                    </Button>
                  </CardBody>
                </Card>
              )}

              {/* Step 2 */}
              {step >= 2 && (
                <Card variant="outlined">
                  <CardHeader>
                    <div>
                      <h2 className="text-xl font-semibold text-indigo-950">
                        Step 2: Technical & Budget Profile
                      </h2>
                      <p className="mt-1 text-sm text-indigo-950/60">
                        Details about your current systems and budget
                      </p>
                    </div>
                    <Badge variant="secondary">2 of 2</Badge>
                  </CardHeader>
                  <CardBody className="space-y-6">
                    <Select
                      label="Current Technology Stack"
                      placeholder="Select your current stack"
                      options={[
                        { value: "legacy-mainframe", label: "Legacy Mainframe (COBOL, etc.)" },
                        { value: "on-prem-servers", label: "On-Premise Servers" },
                        { value: "hybrid-cloud", label: "Hybrid Cloud" },
                        { value: "full-cloud", label: "Full Cloud" },
                        { value: "other", label: "Other" },
                      ]}
                      value={formData.currentStack}
                      onValueChange={(v) => handleInputChange("currentStack", v)}
                    />

                    <Select
                      label="Annual IT Budget"
                      placeholder="Select annual IT budget"
                      options={[
                        { value: "under-500k", label: "Under $500K" },
                        { value: "500k-2m", label: "$500K - $2M" },
                        { value: "2m-10m", label: "$2M - $10M" },
                        { value: "10m-50m", label: "$10M - $50M" },
                        { value: "50m+", label: "$50M+" },
                      ]}
                      value={formData.annualITBudget}
                      onValueChange={(v) => handleInputChange("annualITBudget", v)}
                    />

                    <Input
                      label="Team Size"
                      type="number"
                      placeholder="Number of IT staff"
                      value={formData.teamSize}
                      onChange={(e) => handleInputChange("teamSize", e.target.value)}
                      helperText="How many people in your IT/engineering team?"
                    />

                    <div>
                      <h3 className="text-sm font-medium text-indigo-950 mb-4">
                        Primary Pain Points
                      </h3>
                      <div className="space-y-2">
                        {PAIN_POINT_OPTIONS.map((option) => (
                          <Checkbox
                            key={option.value}
                            label={option.label}
                            checked={formData.painPoints.includes(option.value)}
                            onCheckedChange={() =>
                              handlePainPointToggle(option.value)
                            }
                          />
                        ))}
                      </div>
                      {formData.painPoints.length === 0 && (
                        <p className="mt-2 text-sm text-red-600">
                          Please select at least one pain point
                        </p>
                      )}
                    </div>

                    <Select
                      label="Modernization Timeline"
                      placeholder="When would you like to modernize?"
                      options={[
                        { value: "immediate", label: "Immediate (Next 3 months)" },
                        { value: "3-months", label: "3-6 months" },
                        { value: "6-months", label: "6-12 months" },
                        { value: "12-months", label: "12+ months" },
                        { value: "exploratory", label: "Still exploring" },
                      ]}
                      value={formData.timeline}
                      onValueChange={(v) => handleInputChange("timeline", v)}
                    />

                    <div className="flex gap-4">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setStep(1)}
                      >
                        Back
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={!canProceedStep2 || formData.painPoints.length === 0}
                        onClick={handleCalculate}
                      >
                        Calculate ROI
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          ) : (
            /* Results */
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-indigo-950">
                  Your Modernization ROI
                </h2>
                <p className="mt-2 text-indigo-950/60">
                  Based on {formData.companyName}&apos;s profile
                </p>
              </div>

              {/* Key Metrics */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card variant="filled">
                  <CardBody className="text-center">
                    <p className="text-sm text-indigo-950/60">Annual Savings</p>
                    <p className="mt-2 text-3xl font-bold text-indigo-600">
                      {formatCurrency(results.annualSavings)}
                    </p>
                    <p className="mt-1 text-xs text-indigo-950/50">
                      vs. current spending
                    </p>
                  </CardBody>
                </Card>

                <Card variant="filled">
                  <CardBody className="text-center">
                    <p className="text-sm text-indigo-950/60">3-Year Savings</p>
                    <p className="mt-2 text-3xl font-bold text-green-600">
                      {formatCurrency(results.threeYearSavings)}
                    </p>
                    <p className="mt-1 text-xs text-indigo-950/50">
                      after implementation costs
                    </p>
                  </CardBody>
                </Card>

                <Card variant="filled">
                  <CardBody className="text-center">
                    <p className="text-sm text-indigo-950/60">ROI</p>
                    <p className="mt-2 text-3xl font-bold text-purple-600">
                      {results.roiPercentage}%
                    </p>
                    <p className="mt-1 text-xs text-indigo-950/50">
                      3-year return on investment
                    </p>
                  </CardBody>
                </Card>

                <Card variant="filled">
                  <CardBody className="text-center">
                    <p className="text-sm text-indigo-950/60">Payback Period</p>
                    <p className="mt-2 text-3xl font-bold text-blue-600">
                      {results.paybackMonths}
                    </p>
                    <p className="mt-1 text-xs text-indigo-950/50">months</p>
                  </CardBody>
                </Card>
              </div>

              {/* Additional Benefits */}
              <Card variant="outlined">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-indigo-950">
                    Additional Benefits
                  </h3>
                </CardHeader>
                <CardBody className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-indigo-950/60">
                      Compliance Risk Reduction
                    </p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {results.complianceRiskReduction}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-indigo-950/60">
                      Downtime Reduction
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {results.downtimeReduction}%
                    </p>
                  </div>
                </CardBody>
              </Card>

              {/* Cost Breakdown */}
              <Card variant="outlined">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-indigo-950">
                    Cost Breakdown
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {Object.entries(results.breakdown).map(
                      ([category, costs]: [string, Record<string, number>]) => (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-indigo-950 capitalize">
                              {category}
                            </p>
                            <p className="text-xs text-indigo-950/60">
                              Current vs. Projected
                            </p>
                          </div>
                          <div className="flex gap-4">
                            <div className="flex-1 rounded-lg bg-red-50 p-3">
                              <p className="text-xs text-red-600">Current</p>
                              <p className="mt-1 font-semibold text-red-900">
                                {formatCurrency(costs.current)}
                              </p>
                            </div>
                            <div className="flex-1 rounded-lg bg-green-50 p-3">
                              <p className="text-xs text-green-600">Projected</p>
                              <p className="mt-1 font-semibold text-green-900">
                                {formatCurrency(costs.projected)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* CTA */}
              <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-center">
                <h3 className="text-xl font-bold text-white">
                  Ready to Start Your Modernization Journey?
                </h3>
                <p className="mt-3 text-indigo-100">
                  Schedule a consultation with our experts to develop a
                  customized implementation plan.
                </p>
                <Button variant="secondary" className="mt-6" asChild>
                  <a href="/contact">Schedule Consultation</a>
                </Button>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setStep(1);
                  setResults(null);
                  setFormData({
                    companyName: "",
                    companySize: "",
                    industry: "",
                    currentStack: "",
                    annualITBudget: "",
                    teamSize: "",
                    painPoints: [],
                    timeline: "",
                  });
                }}
              >
                Calculate Again
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
