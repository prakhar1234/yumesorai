import { NextRequest, NextResponse } from "next/server";
import { insertROICalculatorSubmission, getSubmissionStats } from "@/lib/db";

interface ROICalculatorData {
  email?: string;
  company?: string;
  currentCost: number;
  migrationMethod: string;
  timelineMonths: number;
  estimatedSavings: number;
  roiPercentage: number;
  breakEvenMonths: number;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: ROICalculatorData;
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
      body.currentCost === undefined ||
      !body.migrationMethod ||
      body.timelineMonths === undefined ||
      body.estimatedSavings === undefined ||
      body.roiPercentage === undefined ||
      body.breakEvenMonths === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
    }

    // Log calculation
    console.log(`[ROI Calculator API] Calculation received${body.email ? ` from ${body.email}` : ""}`);

    // Save to database if email is provided
    if (body.email) {
      try {
        insertROICalculatorSubmission({
          email: body.email,
          annual_spend: body.currentCost,
          expected_savings_percent: body.roiPercentage,
        });
        console.log(`[ROI Calculator API] Calculation saved to database for ${body.email}`);
      } catch (dbError) {
        console.error("[ROI Calculator API] Database error:", dbError);
        return NextResponse.json(
          { error: "Failed to save calculation to database" },
          { status: 500 }
        );
      }
    }

    // TODO: Send ROI calculation summary to email if provided
    // TODO: Store for analytics and reporting

    return NextResponse.json(
      {
        success: true,
        message: "Your ROI calculation has been saved successfully.",
        calculation: {
          estimatedSavings: body.estimatedSavings,
          roiPercentage: body.roiPercentage,
          breakEvenMonths: body.breakEvenMonths,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[ROI Calculator API] Error:", error);

    return NextResponse.json(
      { error: "An error occurred while processing your calculation. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/roi-calculator - Get submission statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getSubmissionStats();
    return NextResponse.json({
      status: "ok",
      stats,
    });
  } catch (error) {
    console.error("[ROI Calculator API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get statistics" },
      { status: 500 }
    );
  }
}
