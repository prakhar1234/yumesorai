import { NextRequest, NextResponse } from "next/server";
import { insertContactSubmission, getSubmissionStats } from "@/lib/db";

interface ContactFormData {
  name: string;
  email: string;
  company: string;
  industry: string;
  phone?: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: ContactFormData;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || !body.email || !body.company || !body.industry || !body.message) {
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

    // Log submission
    console.log(`[Contact API] Submission received from ${body.email}`);

    // Save to database
    try {
      const result = await insertContactSubmission({
        name: body.name,
        email: body.email,
        company: body.company,
        industry: body.industry,
        phone: body.phone,
        message: body.message,
      });

      console.log(`[Contact API] Saved to database: ${result.lastInsertRowid}`);
    } catch (dbError) {
      console.error("[Contact API] Database error:", dbError);
      // Return error but don't crash
      return NextResponse.json(
        { error: "Failed to save submission to database" },
        { status: 500 }
      );
    }

    // TODO: Send email notification to admin and user
    // TODO: Integrate with CRM/email service (SendGrid, Mailchimp, etc.)

    return NextResponse.json(
      {
        success: true,
        message: "Your message has been sent successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Contact API] Error:", error);

    return NextResponse.json(
      { error: "An error occurred while processing your request. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contact - Get submission statistics
 */
export async function GET() {
  try {
    const stats = await getSubmissionStats();
    return NextResponse.json({
      status: "ok",
      stats,
    });
  } catch (error) {
    console.error("[Contact API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get statistics" },
      { status: 500 }
    );
  }
}
