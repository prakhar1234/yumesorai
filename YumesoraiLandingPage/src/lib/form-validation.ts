import { z } from "zod";

// ── ROI Calculator Schema ──────────────────────────────────────────────

export const calculatorStep1Schema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companySize: z.enum(["1-50", "51-200", "201-1000", "1001-5000", "5000+"])
    .catch(() => { throw new Error("Please select your company size"); }),
  industry: z.enum(
    ["healthcare", "airlines", "banking", "insurance", "government", "other"]
  ).catch(() => { throw new Error("Please select your industry"); }),
});

export const calculatorStep2Schema = z.object({
  currentStack: z.enum(
    ["legacy-mainframe", "on-prem-servers", "hybrid-cloud", "full-cloud", "other"]
  ).catch(() => { throw new Error("Please select your current tech stack"); }),
  annualITBudget: z.enum(
    ["under-500k", "500k-2m", "2m-10m", "10m-50m", "50m+"]
  ).catch(() => { throw new Error("Please select your annual IT budget"); }),
  teamSize: z.coerce
    .number()
    .min(1, "Must have at least 1 team member")
    .max(100000, "Please enter a valid team size"),
});

export const calculatorStep3Schema = z.object({
  painPoints: z
    .array(z.string())
    .min(1, "Please select at least one pain point"),
  timeline: z.enum(["immediate", "3-months", "6-months", "12-months", "exploratory"])
    .catch(() => { throw new Error("Please select a timeline"); }),
  contactEmail: z.string().email("Please enter a valid email address"),
  contactName: z.string().min(1, "Your name is required"),
});

export const fullCalculatorSchema = calculatorStep1Schema
  .merge(calculatorStep2Schema)
  .merge(calculatorStep3Schema);

export type CalculatorStep1Data = z.infer<typeof calculatorStep1Schema>;
export type CalculatorStep2Data = z.infer<typeof calculatorStep2Schema>;
export type CalculatorStep3Data = z.infer<typeof calculatorStep3Schema>;
export type FullCalculatorData = z.infer<typeof fullCalculatorSchema>;

// ── CISO Risk Briefing Schema ──────────────────────────────────────────

export const riskStep1Schema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  respondentRole: z.enum(
    ["ciso", "cto", "vp-engineering", "security-lead", "it-director", "other"]
  ).catch(() => { throw new Error("Please select your role"); }),
  employeeCount: z.enum(["1-100", "101-500", "501-2000", "2001-10000", "10000+"])
    .catch(() => { throw new Error("Please select employee count"); }),
});

export const riskStep2Schema = z.object({
  hasSecurityTeam: z.enum(["yes", "no", "outsourced"])
    .catch(() => { throw new Error("Please select an option"); }),
  complianceFrameworks: z
    .array(z.string())
    .min(1, "Please select at least one framework"),
  lastAuditDate: z.enum(
    ["within-6-months", "6-12-months", "over-12-months", "never"]
  ).catch(() => { throw new Error("Please select when your last audit was"); }),
});

export const riskStep3Schema = z.object({
  incidentResponsePlan: z.enum(["yes-tested", "yes-untested", "in-progress", "no"])
    .catch(() => { throw new Error("Please select an option"); }),
  dataClassification: z.enum(["fully-classified", "partially", "not-classified"])
    .catch(() => { throw new Error("Please select an option"); }),
  thirdPartyRiskMgmt: z.enum(["formal-program", "informal", "none"])
    .catch(() => { throw new Error("Please select an option"); }),
});

export const riskStep4Schema = z.object({
  topConcerns: z
    .array(z.string())
    .min(1, "Please select at least one concern"),
  budgetChange: z.enum(["increasing", "stable", "decreasing", "unknown"])
    .catch(() => { throw new Error("Please select an option"); }),
});

export const riskContactSchema = z.object({
  contactName: z.string().min(1, "Your name is required"),
  contactEmail: z.string().email("Please enter a valid email address"),
  contactPhone: z.string().optional(),
});

export type RiskStep1Data = z.infer<typeof riskStep1Schema>;
export type RiskStep2Data = z.infer<typeof riskStep2Schema>;
export type RiskStep3Data = z.infer<typeof riskStep3Schema>;
export type RiskStep4Data = z.infer<typeof riskStep4Schema>;
export type RiskContactData = z.infer<typeof riskContactSchema>;

// ── Callback Modal Schema ──────────────────────────────────────────────

export const callbackSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().min(1, "Company is required"),
  phone: z.string().optional(),
  bestTime: z.enum(["morning", "afternoon", "evening"])
    .catch(() => { throw new Error("Please select a preferred time"); }),
  message: z.string().optional(),
  turnstileToken: z.string().min(1, "Please complete the verification"),
});

export type CallbackData = z.infer<typeof callbackSchema>;

// ── API Contact/Briefing Schema ────────────────────────────────────────

export const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  company: z.string().min(1, "Company is required").max(255, "Company is too long"),
  industry: z.enum(
    ["healthcare", "airlines", "banking", "insurance", "government", "other"]
  ).catch(() => { throw new Error("Please select your industry"); }),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message is too long"),
  phone: z.string().optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// ── API Assessment Form Schema ────────────────────────────────────────

export const assessmentFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  company: z.string().min(1, "Company is required").max(255, "Company is too long"),
  industry: z.enum(
    ["healthcare", "airlines", "banking", "insurance", "government", "other"]
  ).catch(() => { throw new Error("Please select your industry"); }),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  currentStack: z.enum(
    ["legacy-mainframe", "on-prem-servers", "hybrid-cloud", "full-cloud", "other"]
  ).catch(() => { throw new Error("Please select your current tech stack"); }),
  painPoints: z
    .array(z.string())
    .min(1, "Please select at least one pain point"),
  timeline: z.enum(["immediate", "3-months", "6-months", "12-months", "exploratory"])
    .catch(() => { throw new Error("Please select a timeline"); }),
});

export type AssessmentFormData = z.infer<typeof assessmentFormSchema>;

// ── API Demo Booking Schema ────────────────────────────────────────────

export const demoBookingSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  company: z.string().min(1, "Company is required").max(255, "Company is too long"),
  industry: z.enum(
    ["healthcare", "airlines", "banking", "insurance", "government", "other"]
  ).catch(() => { throw new Error("Please select your industry"); }),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  preferredDate: z.string().datetime("Please provide a valid date and time"),
  timezone: z.string().default("UTC"),
  message: z.string().optional(),
});

export type DemoBookingData = z.infer<typeof demoBookingSchema>;
