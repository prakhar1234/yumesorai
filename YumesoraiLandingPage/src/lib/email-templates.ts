export function getClientEmailTemplate(clientName: string, subject: string, content: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 20px;
            background: #f9f9f9;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #e0e0e0;
          }
          .cta-button {
            display: inline-block;
            padding: 12px 24px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Yumesorai</h1>
          </div>
          <div class="content">
            <p>Hi ${clientName},</p>
            <p>${content}</p>
            <a href="https://yumesorai.com" class="cta-button">Visit Our Platform</a>
          </div>
          <div class="footer">
            <p>© 2026 Yumesorai. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export const DEFAULT_EMAIL_CONTENT = `
We're excited to share how Yumesorai can modernize your legacy enterprise systems.

With our AI-driven platform, you can:
- Reduce security risks by 60%
- Cut modernization costs by 40%
- Accelerate deployment to 6-12 months

Schedule a free executive briefing with our team to learn how we're helping enterprises like yours.
`;

export const DEFAULT_EMAIL_SUBJECT = 'Transform Your Legacy Systems with Yumesorai';

export function createContactConfirmationEmail(name: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 40px 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You!</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Thank you for reaching out to Yumesorai. We've received your message and appreciate your interest in our AI-driven legacy modernization platform.</p>
            <p>Our team will review your information and get back to you shortly to discuss how we can help transform your legacy systems.</p>
            <p><strong>What happens next?</strong></p>
            <ul>
              <li>Our team will reach out within 24-48 business hours</li>
              <li>We'll discuss your specific needs and challenges</li>
              <li>We'll explore how Yumesorai can accelerate your digital transformation</li>
            </ul>
            <p>In the meantime, feel free to explore more about our platform and solutions on our website.</p>
            <p>Best regards,<br><strong>The Yumesorai Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Yumesorai. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function createAssessmentConfirmationEmail(name: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 40px 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Assessment Received!</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Thank you for completing the Yumesorai Assessment. We're excited to help you understand your legacy modernization opportunities.</p>
            <p>Your assessment has been recorded, and our experts will analyze your responses to provide personalized insights and recommendations tailored to your organization.</p>
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Our team will prepare a detailed assessment report</li>
              <li>We'll schedule a call to review the findings and recommendations</li>
              <li>Together, we'll explore a roadmap for your transformation</li>
            </ul>
            <p>If you have any questions in the meantime, don't hesitate to reach out.</p>
            <p>Best regards,<br><strong>The Yumesorai Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Yumesorai. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function createDemoConfirmationEmail(
  name: string,
  demoDate?: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 40px 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Demo Booking Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Thank you for booking a demo with Yumesorai! We're looking forward to showing you how our AI-driven platform can transform your legacy systems.</p>
            ${demoDate ? `<p><strong>Your Demo:</strong> ${demoDate}</p>` : ""}
            <p><strong>What to Expect:</strong></p>
            <ul>
              <li>A 30-minute interactive walkthrough of the Yumesorai platform</li>
              <li>Live demonstration of key features relevant to your industry</li>
              <li>Q&A session with our product specialists</li>
              <li>Discussion of next steps and how we can support your transformation</li>
            </ul>
            <p>Our team will send you calendar details shortly. Please check your email for the meeting invite.</p>
            <p>If you need to reschedule or have any questions, please reply to this email.</p>
            <p>Best regards,<br><strong>The Yumesorai Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Yumesorai. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Team Notification Email - Sent to team@yumesorai.com when someone submits a form
 */
export function createTeamNotificationEmail(
  name: string,
  email: string,
  company: string,
  message: string,
  type: string = 'Contact Form'
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-block { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 4px; }
          .label { font-weight: bold; color: #667eea; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 New ${type} Submission</h1>
          </div>
          <div class="content">
            <p>A new submission has been received from your website:</p>

            <div class="info-block">
              <p><span class="label">Name:</span> ${name}</p>
              <p><span class="label">Email:</span> ${email}</p>
              <p><span class="label">Company:</span> ${company}</p>
            </div>

            <div class="info-block">
              <p><span class="label">Message:</span></p>
              <p>${message.replace(/\n/g, '<br>')}</p>
            </div>

            <p style="margin-top: 20px; color: #666; font-size: 14px;">
              <strong>Action Required:</strong> Please reach out to this prospect to discuss their needs and schedule a demo or briefing call.
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Yumesorai. All rights reserved.</p>
            <p>This is an automated notification from your website form submission system.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
