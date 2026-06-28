import { NextRequest, NextResponse } from "next/server";

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

    // TODO: Send confirmation email to user
    // TODO: Send notification to assessment team
    // TODO: Trigger automated assessment report generation

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
