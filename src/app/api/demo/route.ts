import { NextRequest, NextResponse } from "next/server";
import { insertDemoBooking, getSubmissionStats } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createDemoConfirmationEmail, createTeamNotificationEmail } from "@/lib/email-templates";

interface DemoFormData {
  name: string;
  email: string;
  company: string;
  industry: string;
  jobTitle: string;
  phone: string;
  preferredDate: string;
  timezone: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: DemoFormData;
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
      !body.jobTitle ||
      !body.phone ||
      !body.preferredDate ||
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

    // Validate that the requested time is in the future
    const requestedDate = new Date(body.preferredDate);
    if (requestedDate < new Date()) {
      return NextResponse.json(
        { error: "Requested date must be in the future" },
        { status: 400 }
      );
    }

    // Save to database
    try {
      await insertDemoBooking({
        name: body.name,
        email: body.email,
        company: body.company,
        date: body.preferredDate.split('T')[0], // Extract date part
        message: body.message,
      });
      console.log(`[Demo API] Booking saved to database for ${body.email}`);
    } catch (dbError) {
      console.error("[Demo API] Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to save booking to database" },
        { status: 500 }
      );
    }

    const formattedDate = requestedDate.toLocaleString("en-US", {
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
        subject: "Demo Booking Confirmed - Yumesorai",
        html: confirmationEmailHtml,
        from: "noreply@yumesorai.com",
        replyTo: "team@yumesorai.com",
      });
      console.log(`[Demo API] Confirmation email sent to ${body.email}`);
    } catch (emailError) {
      console.error("[Demo API] Failed to send confirmation email:", emailError);
      // Don't fail the request if email fails
    }

    // Send team notification email
    try {
      const teamEmailHtml = createTeamNotificationEmail(
        body.name,
        body.email,
        body.company,
        `Demo Request for ${formattedDate}\nJob Title: ${body.jobTitle}\nPhone: ${body.phone}\nTimezone: ${body.timezone}\n${body.message ? `Message: ${body.message}` : ''}`,
        'Demo Booking'
      );
      await sendEmail({
        to: "team@yumesorai.com",
        subject: `New Demo Booking from ${body.name} - ${formattedDate}`,
        html: teamEmailHtml,
        from: "noreply@yumesorai.com",
      });
      console.log(`[Demo API] Team notification sent to team@yumesorai.com`);
    } catch (emailError) {
      console.error("[Demo API] Failed to send team notification:", emailError);
      // Don't fail the request if email fails
    }

    console.log(
      `[Demo API] Booking received from ${body.email} for ${formattedDate}`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Your demo has been booked successfully. Check your email for confirmation details.",
        demoDate: formattedDate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Demo API] Error:", error);

    return NextResponse.json(
      { error: "An error occurred while booking your demo. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/demo - Get submission statistics
 */
export async function GET() {
  try {
    const stats = await getSubmissionStats();
    return NextResponse.json({
      status: "ok",
      stats,
    });
  } catch (error) {
    console.error("[Demo API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get statistics" },
      { status: 500 }
    );
  }
}
