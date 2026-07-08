import { NextRequest, NextResponse } from "next/server";
import { insertAssessmentSubmission, getSubmissionStats } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createAssessmentConfirmationEmail, createTeamNotificationEmail } from "@/lib/email-templates";

interface AssessmentFormData {
  name: string;
  email: string;
  company: string;
  industry: string;
  systemType: string;
  cobolLines?: number;
  challenges?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: AssessmentFormData;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || !body.email || !body.company || !body.industry || !body.systemType) {
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
    console.log(`[Assessment API] Submission received from ${body.email}`);

    // Save to database
    try {
      await insertAssessmentSubmission({
        name: body.name,
        email: body.email,
        company: body.company,
        industry: body.industry,
        company_size: body.systemType,
        pain_points: body.challenges,
      });
      console.log(`[Assessment API] Submission saved to database for ${body.email}`);
    } catch (dbError) {
      console.error("[Assessment API] Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to save submission to database" },
        { status: 500 }
      );
    }

    // Send confirmation email to user
    try {
      const confirmationEmailHtml = createAssessmentConfirmationEmail(body.name);
      await sendEmail({
        to: body.email,
        subject: "Assessment Received - Yumesorai",
        html: confirmationEmailHtml,
        from: "noreply@yumesorai.com",
        replyTo: "team@yumesorai.com",
      });
      console.log(`[Assessment API] Confirmation email sent to ${body.email}`);
    } catch (emailError) {
      console.error("[Assessment API] Failed to send confirmation email:", emailError);
      // Don't fail the request if email fails
    }

    // Send team notification email
    try {
      const teamEmailHtml = createTeamNotificationEmail(
        body.name,
        body.email,
        body.company,
        `Industry: ${body.industry}\nSystem Type: ${body.systemType}\nCOBOL Lines: ${body.cobolLines || 'Not specified'}\nChallenges: ${body.challenges || 'Not provided'}`,
        'Assessment Submission'
      );
      await sendEmail({
        to: "team@yumesorai.com",
        subject: `New Assessment Submission from ${body.name}`,
        html: teamEmailHtml,
        from: "noreply@yumesorai.com",
      });
      console.log(`[Assessment API] Team notification sent to team@yumesorai.com`);
    } catch (emailError) {
      console.error("[Assessment API] Failed to send team notification:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your assessment has been submitted successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Assessment API] Error:", error);

    return NextResponse.json(
      { error: "An error occurred while processing your assessment. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/assessment - Get submission statistics
 */
export async function GET() {
  try {
    const stats = await getSubmissionStats();
    return NextResponse.json({
      status: "ok",
      stats,
    });
  } catch (error) {
    console.error("[Assessment API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get statistics" },
      { status: 500 }
    );
  }
}
