"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";

interface FormData {
  name: string;
  email: string;
  company: string;
  companySize: string;
  industry: string;
  currentSystems: string[];
  primaryPainPoints: string[];
  modernizationTimeline: string;
  budget: string;
  additionalInfo: string;
}

interface FormErrors {
  [key: string]: string;
}

const systemOptions = [
  { id: "cobol", label: "COBOL Mainframes" },
  { id: "fortran", label: "FORTRAN Systems" },
  { id: "legacy-db", label: "Legacy Databases (DB2, Oracle 7+)" },
  { id: "on-prem", label: "On-Premise Servers" },
  { id: "client-server", label: "Client-Server Architecture" },
  { id: "custom-apps", label: "Custom Built Applications" },
  { id: "monolithic", label: "Monolithic Architecture" },
];

const painPointOptions = [
  { id: "scalability", label: "Scalability Limitations" },
  { id: "security", label: "Security & Compliance Risks" },
  { id: "talent", label: "Hard to Find Skilled Talent" },
  { id: "maintenance", label: "High Maintenance Costs" },
  { id: "integration", label: "Difficult System Integration" },
  { id: "performance", label: "Performance Issues" },
  { id: "innovation", label: "Slowing Business Innovation" },
  { id: "cloud", label: "Cloud Migration Challenges" },
];

export default function AssessmentFormClient() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    companySize: "",
    industry: "",
    currentSystems: [],
    primaryPainPoints: [],
    modernizationTimeline: "",
    budget: "",
    additionalInfo: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    if (step === 1) {
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
      if (!formData.companySize) {
        newErrors.companySize = "Company size is required";
      }
      if (!formData.industry) {
        newErrors.industry = "Industry is required";
      }
    } else if (step === 2) {
      if (formData.currentSystems.length === 0) {
        newErrors.currentSystems = "Please select at least one system";
      }
      if (formData.primaryPainPoints.length === 0) {
        newErrors.primaryPainPoints = "Please select at least one pain point";
      }
    } else if (step === 3) {
      if (!formData.modernizationTimeline) {
        newErrors.modernizationTimeline = "Please select a timeline";
      }
      if (!formData.budget) {
        newErrors.budget = "Please select your budget range";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
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

  const handleCheckboxChange = (id: string, fieldName: string) => {
    setFormData((prev) => {
      const currentArray = prev[fieldName as keyof FormData] as string[];
      const isChecked = currentArray.includes(id);
      return {
        ...prev,
        [fieldName]: isChecked
          ? currentArray.filter((item) => item !== id)
          : [...currentArray, id],
      };
    });
    if (errors[fieldName]) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "",
      }));
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateStep(3)) {
      return;
    }

    setIsLoading(true);
    try {
      // Transform form data to match API schema
      const submitData = {
        name: formData.name,
        email: formData.email,
        company: formData.company,
        industry: formData.industry,
        currentStack: formData.currentSystems[0] || "legacy-mainframe", // Take first selected system
        painPoints: formData.primaryPainPoints,
        timeline: formData.modernizationTimeline,
      };

      const response = await fetch("/api/assessment", {
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
      setTimeout(() => {
        setSubmitted(false);
        // Optionally reset the form or redirect
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
    <>
      <div className="min-h-screen bg-offwhite py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
              Free Legacy System Assessment
            </h1>
            <p className="mt-4 text-lg text-indigo-950/60">
              Answer a few questions about your current systems and we&apos;ll provide
              insights on modernization opportunities tailored to your needs.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-indigo-950">
                Step {currentStep} of 3
              </h2>
              <span className="text-sm text-indigo-950/60">
                {Math.round((currentStep / 3) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl shadow-sm border border-indigo-950/5 p-8 sm:p-10">
            {submitted && (
              <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-sm font-medium text-green-800">
                  Thank you! Your assessment has been submitted. We&apos;ll provide
                  detailed recommendations within 24 hours.
                </p>
              </div>
            )}

            {errors.submit && (
              <div className="mb-6 rounded-lg bg-error/10 border border-error/20 p-4">
                <p className="text-sm font-medium text-error">{errors.submit}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Company Info */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-950 mb-4">
                      Company Information
                    </h3>
                    <div className="space-y-4">
                      <Input
                        label="Full Name"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleInputChange}
                        error={errors.name}
                        required
                      />

                      <Input
                        label="Business Email"
                        name="email"
                        type="email"
                        placeholder="john@company.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        error={errors.email}
                        required
                      />

                      <Input
                        label="Company Name"
                        name="company"
                        type="text"
                        placeholder="Acme Corp"
                        value={formData.company}
                        onChange={handleInputChange}
                        error={errors.company}
                        required
                      />

                      <Select
                        label="Company Size"
                        options={[
                          { value: "1-100", label: "1-100 employees" },
                          { value: "101-500", label: "101-500 employees" },
                          { value: "501-2000", label: "501-2,000 employees" },
                          { value: "2001-10000", label: "2,001-10,000 employees" },
                          { value: "10000+", label: "10,000+ employees" },
                        ]}
                        value={formData.companySize}
                        onValueChange={(value) =>
                          handleSelectChange(value, "companySize")
                        }
                        error={errors.companySize}
                        placeholder="Select company size..."
                        required
                      />

                      <Select
                        label="Industry"
                        options={[
                          { value: "healthcare", label: "Healthcare" },
                          { value: "airlines", label: "Airlines & Travel" },
                          { value: "banking", label: "Banking & Financial Services" },
                          { value: "insurance", label: "Insurance" },
                          { value: "government", label: "Government" },
                          { value: "other", label: "Other" },
                        ]}
                        value={formData.industry}
                        onValueChange={(value) =>
                          handleSelectChange(value, "industry")
                        }
                        error={errors.industry}
                        placeholder="Select your industry..."
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Systems & Pain Points */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-950 mb-4">
                      Current Systems & Pain Points
                    </h3>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-neutral-700 mb-3">
                        Which legacy systems are you currently using?
                      </label>
                      {errors.currentSystems && (
                        <p className="text-sm text-error mb-3">
                          {errors.currentSystems}
                        </p>
                      )}
                      <div className="space-y-3 bg-neutral-50 p-4 rounded-lg">
                        {systemOptions.map((option) => (
                          <div key={option.id} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`system-${option.id}`}
                              checked={formData.currentSystems.includes(
                                option.id
                              )}
                              onChange={() =>
                                handleCheckboxChange(option.id, "currentSystems")
                              }
                              className="w-5 h-5 rounded border border-neutral-300 checked:bg-primary checked:border-primary cursor-pointer"
                            />
                            <label htmlFor={`system-${option.id}`} className="text-sm text-neutral-700 cursor-pointer">
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-3">
                        What are your primary pain points?
                      </label>
                      {errors.primaryPainPoints && (
                        <p className="text-sm text-error mb-3">
                          {errors.primaryPainPoints}
                        </p>
                      )}
                      <div className="space-y-3 bg-neutral-50 p-4 rounded-lg">
                        {painPointOptions.map((option) => (
                          <div key={option.id} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`pain-${option.id}`}
                              checked={formData.primaryPainPoints.includes(
                                option.id
                              )}
                              onChange={() =>
                                handleCheckboxChange(
                                  option.id,
                                  "primaryPainPoints"
                                )
                              }
                              className="w-5 h-5 rounded border border-neutral-300 checked:bg-primary checked:border-primary cursor-pointer"
                            />
                            <label htmlFor={`pain-${option.id}`} className="text-sm text-neutral-700 cursor-pointer">
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Timeline & Budget */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-950 mb-4">
                      Timeline & Budget
                    </h3>
                    <div className="space-y-4">
                      <Select
                        label="Modernization Timeline"
                        options={[
                          { value: "immediate", label: "Immediate (0-3 months)" },
                          { value: "3-6-months", label: "3-6 months" },
                          { value: "6-12-months", label: "6-12 months" },
                          { value: "12-18-months", label: "12-18 months" },
                          { value: "exploring", label: "Just exploring options" },
                        ]}
                        value={formData.modernizationTimeline}
                        onValueChange={(value) =>
                          handleSelectChange(value, "modernizationTimeline")
                        }
                        error={errors.modernizationTimeline}
                        placeholder="Select timeline..."
                        required
                      />

                      <Select
                        label="Annual IT Modernization Budget"
                        options={[
                          { value: "under-500k", label: "Under $500K" },
                          { value: "500k-2m", label: "$500K - $2M" },
                          { value: "2m-10m", label: "$2M - $10M" },
                          { value: "10m-50m", label: "$10M - $50M" },
                          { value: "50m+", label: "$50M+" },
                          { value: "tbd", label: "TBD" },
                        ]}
                        value={formData.budget}
                        onValueChange={(value) => handleSelectChange(value, "budget")}
                        error={errors.budget}
                        placeholder="Select budget range..."
                        required
                      />

                      <Textarea
                        label="Additional Information (Optional)"
                        name="additionalInfo"
                        placeholder="Tell us more about your modernization goals, constraints, or any other relevant information..."
                        value={formData.additionalInfo}
                        onChange={handleInputChange}
                        resize="vertical"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 pt-6 border-t border-neutral-200">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={handlePrevious}
                  >
                    Previous
                  </Button>
                )}

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleNext}
                    className="ml-auto"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    className="ml-auto"
                  >
                    {isLoading ? "Submitting..." : "Submit Assessment"}
                  </Button>
                )}
              </div>
            </form>

            <p className="text-center text-xs text-indigo-950/50 mt-4">
              This assessment typically takes 5-10 minutes. Your responses are
              confidential and will be used to provide personalized recommendations.
            </p>
          </div>

          {/* Additional CTA */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-indigo-950/5 p-6">
              <h3 className="font-semibold text-indigo-950 mb-2">
                Want to talk to an expert?
              </h3>
              <p className="text-sm text-indigo-950/60 mb-4">
                Schedule a personalized briefing with our modernization specialists.
              </p>
              <Link
                href="/demo"
                className="inline-block text-sm font-medium text-primary hover:text-primary-700"
              >
                Schedule Briefing →
              </Link>
            </div>

            <div className="bg-white rounded-lg border border-indigo-950/5 p-6">
              <h3 className="font-semibold text-indigo-950 mb-2">
                Have specific questions?
              </h3>
              <p className="text-sm text-indigo-950/60 mb-4">
                Contact our sales team directly for immediate assistance.
              </p>
              <Link
                href="/contact"
                className="inline-block text-sm font-medium text-primary hover:text-primary-700"
              >
                Contact Us →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
