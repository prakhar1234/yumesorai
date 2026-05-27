"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";

interface FormData {
  name: string;
  email: string;
  company: string;
  industry: string;
  phone?: string;
  message: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function ContactFormClient() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    industry: "",
    phone: "",
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

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
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

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      industry: value,
    }));
    if (errors.industry) {
      setErrors((prev) => ({
        ...prev,
        industry: "",
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
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit form");
      }

      setSubmitted(true);
      setFormData({
        name: "",
        email: "",
        company: "",
        industry: "",
        phone: "",
        message: "",
      });

      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (error) {
      console.error("Error submitting form:", error);
      setErrors({
        submit: "Failed to submit form. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-offwhite py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
            Get in Touch
          </h1>
          <p className="mt-4 text-lg text-indigo-950/60">
            Request a briefing from our legacy modernization experts. We&apos;ll
            discuss how Yumesorai can accelerate your digital transformation.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-indigo-950/5 p-8 sm:p-10">
          {submitted && (
            <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm font-medium text-green-800">
                Thank you for your interest! We&apos;ll be in touch within 24 hours.
              </p>
            </div>
          )}

          {errors.submit && (
            <div className="mb-6 rounded-lg bg-error/10 border border-error/20 p-4">
              <p className="text-sm font-medium text-error">{errors.submit}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <Input
              label="Full Name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />

            {/* Email Field */}
            <Input
              label="Business Email"
              name="email"
              type="email"
              placeholder="john@company.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />

            {/* Company Field */}
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

            {/* Phone Field */}
            <Input
              label="Phone Number (Optional)"
              name="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.phone || ""}
              onChange={handleChange}
              error={errors.phone}
            />

            {/* Industry Field */}
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
              onValueChange={handleSelectChange}
              error={errors.industry}
              placeholder="Select your industry..."
              required
            />

            {/* Message Field */}
            <Textarea
              label="Message"
              name="message"
              placeholder="Tell us about your legacy systems and transformation goals..."
              value={formData.message}
              onChange={handleChange}
              error={errors.message}
              helperText="Minimum 10 characters"
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
                {isLoading ? "Sending..." : "Request Briefing"}
              </Button>
            </div>

            <p className="text-center text-xs text-indigo-950/50">
              We respect your privacy. Your information will only be used to
              contact you about your inquiry.
            </p>
          </form>
        </div>

        {/* Additional Information */}
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-6 border border-indigo-950/5">
            <div className="flex items-center mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="ml-3 text-base font-semibold text-indigo-950">
                Email Us
              </h3>
            </div>
            <p className="text-sm text-indigo-950/60">
              contact@yumesorai.com
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 border border-indigo-950/5">
            <div className="flex items-center mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <svg
                  className="h-6 w-6 text-white"
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
              </div>
              <h3 className="ml-3 text-base font-semibold text-indigo-950">
                Response Time
              </h3>
            </div>
            <p className="text-sm text-indigo-950/60">
              We&apos;ll respond within 24 business hours
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
