import { NextRequest, NextResponse } from "next/server";
import { insertRiskBriefingBooking, getSubmissionStats } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createDemoConfirmationEmail, createTeamNotificationEmail } from "@/lib/email-templates";

interface RiskBriefingFormData {
  name: string;
  email: string;
  company: string;
  industry: string;
  phone?: string;
  preferredDate: string;
  preferredTime: string;
  timezone: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: RiskBriefingFormData;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (
      !body.name ||
      !body.email ||
      !body.company ||
      !body.industry ||
      !body.preferredDate ||
      !body.preferredTime ||
      !body.timezone
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Combine date and time into ISO datetime
    const [hour, minute] = body.preferredTime.split(":").map(Number);
    const datetime = new Date(body.preferredDate);
    datetime.setHours(hour, minute, 0, 0);

    // Validate that the requested time is in the future
    if (datetime < new Date()) {
      return NextResponse.json(
        { error: "Requested date must be in the future" },
        { status: 400 }
      );
    }

    // Save to database
    try {
      await insertRiskBriefingBooking({
        name: body.name,
        email: body.email,
        company: body.company,
        date: body.preferredDate,
        time: body.preferredTime,
        phone: body.phone,
      });
      console.log(`[Risk Briefing API] Booking saved to database for ${body.email}`);
    } catch (dbError) {
      console.error("[Risk Briefing API] Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to save booking to database" },
        { status: 500 }
      );
    }

    const formattedDate = datetime.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Send confirmation email to user
    try {
      const confirmationEmailHtml = createDemoConfirmationEmail(body.name, formattedDate);
      await sendEmail({
        to: body.email,
        subject: "Risk Briefing Scheduled - Yumesorai",
        html: confirmationEmailHtml,
        from: "noreply@yumesorai.com",
        replyTo: "team@yumesorai.com",
      });
      console.log(`[Risk Briefing API] Confirmation email sent to ${body.email}`);
    } catch (emailError) {
      console.error("[Risk Briefing API] Failed to send confirmation email:", emailError);
      // Don't fail the request if email fails
    }

    // Send team notification email
    try {
      const teamEmailHtml = createTeamNotificationEmail(
        body.name,
        body.email,
        body.company,
        `Risk Briefing Scheduled for ${formattedDate}\nIndustry: ${body.industry}\nTimezone: ${body.timezone}\nPhone: ${body.phone || 'Not provided'}\n${body.message ? `Message: ${body.message}` : ''}`,
        'Risk Briefing Booking'
      );
      await sendEmail({
        to: "team@yumesorai.com",
        subject: `New Risk Briefing Booking from ${body.name} - ${formattedDate}`,
        html: teamEmailHtml,
        from: "noreply@yumesorai.com",
      });
      console.log(`[Risk Briefing API] Team notification sent to team@yumesorai.com`);
    } catch (emailError) {
      console.error("[Risk Briefing API] Failed to send team notification:", emailError);
      // Don't fail the request if email fails
    }

    console.log(
      `[Risk Briefing API] Briefing scheduled from ${body.email} for ${formattedDate}`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Your risk briefing has been scheduled successfully. Check your email for confirmation details.",
        briefingDate: formattedDate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Risk Briefing API] Error:", error);

    return NextResponse.json(
      { error: "An error occurred while scheduling your briefing. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/risk-briefing - Get submission statistics
 */
export async function GET() {
  try {
    const stats = await getSubmissionStats();
    return NextResponse.json({
      status: "ok",
      stats,
    });
  } catch (error) {
    console.error("[Risk Briefing API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get statistics" },
      { status: 500 }
    );
  }
}
