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
