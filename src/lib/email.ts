import { Resend } from "resend";
import nodemailer from "nodemailer";

let resendClient: Resend | null = null;
let smtpTransporter: nodemailer.Transporter | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Resend] RESEND_API_KEY not configured. Running in development mode without email service."
        );
        // Return a mock client that won't be used
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return null as any;
      }
      throw new Error("RESEND_API_KEY environment variable is not configured");
    }

    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

function getSMTPTransporter(): nodemailer.Transporter | null {
  // Check if SMTP is configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  // Debug logging
  console.log("[SMTP Debug] Host:", smtpHost ? "set" : "NOT SET");
  console.log("[SMTP Debug] Port:", smtpPort ? "set" : "NOT SET");
  console.log("[SMTP Debug] User:", smtpUser ? "set" : "NOT SET");
  console.log("[SMTP Debug] Password:", smtpPassword ? "set" : "NOT SET");

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
    return null;
  }

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
  }

  return smtpTransporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ id: string }> {
  try {
    // Try SMTP first if configured
    const smtpTransporter = getSMTPTransporter();
    if (smtpTransporter) {
      console.log("[SMTP] Sending email via SMTP to", options.to);
      const result = await smtpTransporter.sendMail({
        from: options.from || "noreply@yumesorai.com",
        to: options.to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
      });
      console.log("[SMTP] Email sent successfully:", result.messageId);
      return { id: result.messageId || `smtp_${Date.now()}` };
    }

    // Fall back to Resend if SMTP not configured
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Resend Dev Mode] Would send email to ${options.to} with subject "${options.subject}"`);
        return { id: `dev_email_${Date.now()}` };
      }
      throw new Error("Neither SMTP nor RESEND_API_KEY is configured");
    }

    console.log("[Resend] Sending email via Resend to", options.to);
    const resend = getResendClient();

    const response = await resend.emails.send({
      from: options.from || "noreply@yumesorai.com",
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.replyTo && { reply_to: options.replyTo }),
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    console.log("[Resend] Email sent successfully:", response.data?.id);
    return { id: response.data?.id || "" };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
