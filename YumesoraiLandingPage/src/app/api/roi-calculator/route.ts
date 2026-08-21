import { NextRequest, NextResponse } from "next/server";
import { insertROICalculatorSubmission, getSubmissionStats } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createTeamNotificationEmail } from "@/lib/email-templates";

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
        await insertROICalculatorSubmission({
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

    // Send ROI calculation summary and team notification if email provided
    if (body.email) {
      // Send ROI summary to user
      try {
        const roiEmailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 40px 20px; border-radius: 0 0 8px 8px; }
                .metrics { background: white; padding: 20px; margin: 20px 0; border-radius: 4px; border-left: 4px solid #667eea; }
                .metric-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                .metric-row:last-child { border-bottom: none; }
                .metric-label { font-weight: bold; color: #667eea; }
                .metric-value { font-size: 18px; color: #333; }
                .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Your ROI Analysis</h1>
                </div>
                <div class="content">
                  <p>Hello,</p>
                  <p>Thank you for using the Yumesorai ROI Calculator! Based on your inputs, here's your analysis:</p>

                  <div class="metrics">
                    <div class="metric-row">
                      <span class="metric-label">Current Annual Cost:</span>
                      <span class="metric-value">$${body.currentCost.toLocaleString()}</span>
                    </div>
                    <div class="metric-row">
                      <span class="metric-label">Estimated Savings:</span>
                      <span class="metric-value">$${body.estimatedSavings.toLocaleString()}</span>
                    </div>
                    <div class="metric-row">
                      <span class="metric-label">ROI Percentage:</span>
                      <span class="metric-value">${body.roiPercentage}%</span>
                    </div>
                    <div class="metric-row">
                      <span class="metric-label">Break-Even Timeline:</span>
                      <span class="metric-value">${body.breakEvenMonths} months</span>
                    </div>
                    <div class="metric-row">
                      <span class="metric-label">Migration Timeline:</span>
                      <span class="metric-value">${body.timelineMonths} months</span>
                    </div>
                    <div class="metric-row">
                      <span class="metric-label">Migration Method:</span>
                      <span class="metric-value">${body.migrationMethod}</span>
                    </div>
                  </div>

                  <p>Our team is ready to discuss how Yumesorai can help you achieve these savings. We'll reach out to explore your legacy modernization needs in detail.</p>
                  <p>Best regards,<br><strong>The Yumesorai Team</strong></p>
                </div>
                <div class="footer">
                  <p>&copy; 2024 Yumesorai. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `;
        await sendEmail({
          to: body.email,
          subject: "Your ROI Analysis - Yumesorai",
          html: roiEmailHtml,
          from: "noreply@yumesorai.com",
          replyTo: "team@yumesorai.com",
        });
        console.log(`[ROI Calculator API] ROI summary email sent to ${body.email}`);
      } catch (emailError) {
        console.error("[ROI Calculator API] Failed to send ROI summary email:", emailError);
        // Don't fail the request if email fails
      }

      // Send team notification
      try {
        const teamEmailHtml = createTeamNotificationEmail(
          "ROI Calculation User",
          body.email,
          body.company || "Not provided",
          `ROI Calculation Results:\nCurrent Cost: $${body.currentCost}\nEstimated Savings: $${body.estimatedSavings}\nROI: ${body.roiPercentage}%\nBreak-Even: ${body.breakEvenMonths} months\nMigration Timeline: ${body.timelineMonths} months\nMethod: ${body.migrationMethod}`,
          'ROI Calculation'
        );
        await sendEmail({
          to: "team@yumesorai.com",
          subject: `New ROI Calculation - Potential Prospect`,
          html: teamEmailHtml,
          from: "noreply@yumesorai.com",
        });
        console.log(`[ROI Calculator API] Team notification sent to team@yumesorai.com`);
      } catch (emailError) {
        console.error("[ROI Calculator API] Failed to send team notification:", emailError);
        // Don't fail the request if email fails
      }
    }

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
export async function GET() {
  try {
    const stats = await getSubmissionStats();
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
