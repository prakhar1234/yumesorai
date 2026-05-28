"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface FormData {
  name: string;
  email: string;
  company: string;
  industry: string;
  companySize: string;
  legacySystems: string;
}

interface FormErrors {
  [key: string]: string;
}

const industryOptions = [
  { value: "healthcare", label: "Healthcare" },
  { value: "airlines", label: "Airlines & Travel" },
  { value: "banking", label: "Banking & Financial Services" },
  { value: "insurance", label: "Insurance" },
  { value: "government", label: "Government" },
  { value: "other", label: "Other" },
];

const companySizeOptions = [
  { value: "1-100", label: "1-100 employees" },
  { value: "101-500", label: "101-500 employees" },
  { value: "501-2000", label: "501-2,000 employees" },
  { value: "2001-10000", label: "2,001-10,000 employees" },
  { value: "10000+", label: "10,000+ employees" },
];

export default function RiskCalculatorForm() {
  const searchParams = useSearchParams();
  const industryParam = searchParams.get("industry") || "";

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    industry: industryParam,
    companySize: "",
    legacySystems: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.company.trim()) {
      newErrors.company = "Company name is required";
    }

    if (!formData.industry) {
      newErrors.industry = "Industry is required";
    }

    if (!formData.companySize) {
      newErrors.companySize = "Company size is required";
    }

    if (!formData.legacySystems.trim()) {
      newErrors.legacySystems = "Please describe your legacy systems";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSelectChange = (value: string, field: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const submitData = {
        name: formData.name,
        email: formData.email,
        company: formData.company,
        industry: formData.industry,
        companySize: formData.companySize,
        legacySystems: formData.legacySystems,
        type: "risk-calculator",
      };

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit assessment");
      }

      setSubmitted(true);
      setFormData({
        name: "",
        email: "",
        company: "",
        industry: industryParam,
        companySize: "",
        legacySystems: "",
      });

      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      setErrors({
        submit: "Failed to submit assessment. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-offwhite py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
            Calculate Your Modernization Risk
          </h1>
          <p className="mt-4 text-lg text-indigo-950/60">
            Get an instant assessment of your legacy system modernization needs and potential risks.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-indigo-950/5 p-8 sm:p-10">
              {submitted && (
                <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
                  <p className="text-sm font-medium text-green-800">
                    Thank you! We&apos;ve received your assessment request. You&apos;ll get your risk analysis soon.
                  </p>
                </div>
              )}

              {errors.submit && (
                <div className="mb-6 rounded-lg bg-error/10 border border-error/20 p-4">
                  <p className="text-sm font-medium text-error">
                    {errors.submit}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <Input
                  label="Full Name"
                  name="name"
                  type="text"
                  placeholder="Jane Smith"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  required
                />

                {/* Email */}
                <Input
                  label="Business Email"
                  name="email"
                  type="email"
                  placeholder="jane@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                />

                {/* Company */}
                <Input
                  label="Company Name"
                  name="company"
                  type="text"
                  placeholder="Acme Corp"
                  value={formData.company}
                  onChange={handleChange}
                  error={errors.company}
                  required
                />

                {/* Industry */}
                <Select
                  label="Industry"
                  options={industryOptions}
                  value={formData.industry}
                  onValueChange={(value) =>
                    handleSelectChange(value, "industry")
                  }
                  error={errors.industry}
                  placeholder="Select your industry..."
                  required
                />

                {/* Company Size */}
                <Select
                  label="Company Size"
                  options={companySizeOptions}
                  value={formData.companySize}
                  onValueChange={(value) =>
                    handleSelectChange(value, "companySize")
                  }
                  error={errors.companySize}
                  placeholder="Select company size..."
                  required
                />

                {/* Legacy Systems */}
                <div>
                  <label className="block text-sm font-medium text-indigo-950 mb-2">
                    Describe Your Legacy Systems
                  </label>
                  <textarea
                    name="legacySystems"
                    placeholder="E.g., COBOL mainframes, legacy databases, on-premise servers, etc."
                    value={formData.legacySystems}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-indigo-950/10 bg-white text-indigo-950 placeholder:text-indigo-950/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  {errors.legacySystems && (
                    <p className="text-sm text-error mt-1">{errors.legacySystems}</p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    isLoading={isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Analyzing..." : "Get Risk Assessment"}
                  </Button>
                </div>

                <p className="text-center text-xs text-indigo-950/50">
                  Your information is secure and confidential. We&apos;ll provide a detailed risk analysis within 24 hours.
                </p>
              </form>
            </div>
          </div>

          {/* Information Section */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* What You'll Get */}
              <div className="bg-white rounded-xl border border-indigo-950/5 p-6">
                <h3 className="text-lg font-semibold text-indigo-950 mb-4">
                  Your Risk Assessment Includes
                </h3>
                <ul className="space-y-3">
                  {[
                    "Compliance & regulatory risks",
                    "Security vulnerability analysis",
                    "Estimated modernization timeline",
                    "Cost-benefit projections",
                    "Industry-specific recommendations",
                    "Prioritized action items",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg
                        className="h-5 w-5 text-primary mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-indigo-950/70">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Time Card */}
              <div className="bg-primary/5 rounded-xl border border-primary/10 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <svg
                    className="h-5 w-5 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h4 className="font-semibold text-indigo-950">Instant Results</h4>
                </div>
                <p className="text-sm text-indigo-950/70">Get initial assessment immediately, detailed analysis within 24 hours</p>
              </div>

              {/* Other Options */}
              <div className="bg-white rounded-xl border border-indigo-950/5 p-6">
                <h3 className="text-sm font-semibold text-indigo-950 mb-3">
                  Next Steps
                </h3>
                <Link
                  href="/assessment"
                  className="inline-block w-full text-center text-sm font-medium text-primary hover:text-primary-700 mb-3"
                >
                  Free Legacy Assessment
                </Link>
                <Link
                  href="/demo"
                  className="inline-block w-full text-center text-sm font-medium text-primary hover:text-primary-700"
                >
                  Schedule Briefing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
