import { NextRequest, NextResponse } from "next/server";
import { insertRiskBriefingBooking, getSubmissionStats } from "@/lib/db";

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

    // TODO: Send confirmation email to user
    // TODO: Send notification to briefing team
    // TODO: Integrate with calendar scheduling system

    const formattedDate = datetime.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

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
export async function GET(request: NextRequest) {
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
