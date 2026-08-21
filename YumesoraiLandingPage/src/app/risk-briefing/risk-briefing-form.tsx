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
  phone?: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
}

interface FormErrors {
  [key: string]: string;
}

const upcomingDates = Array.from({ length: 14 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() + i + 1);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date;
});

const timeSlots = [
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
];

const industryOptions = [
  { value: "healthcare", label: "Healthcare" },
  { value: "airlines", label: "Airlines & Travel" },
  { value: "banking", label: "Banking & Financial Services" },
  { value: "insurance", label: "Insurance" },
  { value: "government", label: "Government" },
  { value: "other", label: "Other" },
];

export default function RiskBriefingForm() {
  const searchParams = useSearchParams();
  const industryParam = searchParams.get("industry") || "";

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    industry: industryParam,
    phone: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
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

    if (!formData.preferredDate) {
      newErrors.preferredDate = "Please select a date";
    }

    if (!formData.preferredTime) {
      newErrors.preferredTime = "Please select a time";
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
      // Combine date and time into ISO datetime
      const [hour, minute] = formData.preferredTime.split(":").map(Number);
      const datetime = new Date(formData.preferredDate);
      datetime.setHours(hour, minute, 0, 0);

      interface SubmitData {
        name: string;
        email: string;
        company: string;
        industry: string;
        preferredDate: string;
        timezone: string;
        type: string;
        phone?: string;
        message?: string;
      }

      const submitData: SubmitData = {
        name: formData.name,
        email: formData.email,
        company: formData.company,
        industry: formData.industry,
        preferredDate: datetime.toISOString(),
        timezone: "EST",
        type: "risk-briefing",
      };

      // Only include optional fields if they have a value
      if (formData.phone) submitData.phone = formData.phone;
      if (formData.message) submitData.message = formData.message;

      const response = await fetch("/api/demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error("Failed to schedule briefing");
      }

      setSubmitted(true);
      setFormData({
        name: "",
        email: "",
        company: "",
        industry: industryParam,
        phone: "",
        preferredDate: "",
        preferredTime: "",
        message: "",
      });

      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (error) {
      console.error("Error scheduling briefing:", error);
      setErrors({
        submit: "Failed to schedule briefing. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const dateOptions = upcomingDates.map((date) => ({
    value: date.toISOString().split("T")[0],
    label: date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="min-h-screen bg-offwhite py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
            Industry-Specific Risk Briefing
          </h1>
          <p className="mt-4 text-lg text-indigo-950/60">
            Join us for a comprehensive assessment of your legacy system risks and modernization opportunities specific to your industry.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-indigo-950/5 p-8 sm:p-10">
              {submitted && (
                <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
                  <p className="text-sm font-medium text-green-800">
                    Thank you! We&apos;ve received your request. You&apos;ll receive a calendar invite shortly.
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

                {/* Phone */}
                <Input
                  label="Phone Number (Optional)"
                  name="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone || ""}
                  onChange={handleChange}
                  error={errors.phone}
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

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-indigo-950 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    name="message"
                    placeholder="What are your primary concerns regarding legacy system modernization?"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-indigo-950/10 bg-white text-indigo-950 placeholder:text-indigo-950/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>

                {/* Preferred Date */}
                <Select
                  label="Preferred Date"
                  options={dateOptions}
                  value={formData.preferredDate}
                  onValueChange={(value) =>
                    handleSelectChange(value, "preferredDate")
                  }
                  error={errors.preferredDate}
                  placeholder="Select a date..."
                  required
                />

                {/* Preferred Time */}
                <Select
                  label="Preferred Time (EST)"
                  options={timeSlots}
                  value={formData.preferredTime}
                  onValueChange={(value) =>
                    handleSelectChange(value, "preferredTime")
                  }
                  error={errors.preferredTime}
                  placeholder="Select a time..."
                  required
                />

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    isLoading={isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Scheduling..." : "Schedule Briefing"}
                  </Button>
                </div>

                <p className="text-center text-xs text-indigo-950/50">
                  Briefings typically last 45-60 minutes. We&apos;ll send a calendar invite to confirm your selected time.
                </p>
              </form>
            </div>
          </div>

          {/* Information Section */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* What's Covered */}
              <div className="bg-white rounded-xl border border-indigo-950/5 p-6">
                <h3 className="text-lg font-semibold text-indigo-950 mb-4">
                  What We&apos;ll Cover
                </h3>
                <ul className="space-y-3">
                  {[
                    "Industry-specific risk assessment",
                    "Current system vulnerability analysis",
                    "Modernization roadmap & timeline",
                    "Cost-benefit analysis",
                    "Compliance & regulatory considerations",
                    "Q&A with industry experts",
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

              {/* Duration Card */}
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
                  <h4 className="font-semibold text-indigo-950">Duration</h4>
                </div>
                <p className="text-sm text-indigo-950/70">45-60 minutes</p>
              </div>

              {/* Other Options */}
              <div className="bg-white rounded-xl border border-indigo-950/5 p-6">
                <h3 className="text-sm font-semibold text-indigo-950 mb-3">
                  Other Options
                </h3>
                <Link
                  href="/assessment"
                  className="inline-block w-full text-center text-sm font-medium text-primary hover:text-primary-700 mb-3"
                >
                  Free Legacy Assessment
                </Link>
                <Link
                  href="/contact"
                  className="inline-block w-full text-center text-sm font-medium text-primary hover:text-primary-700"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
