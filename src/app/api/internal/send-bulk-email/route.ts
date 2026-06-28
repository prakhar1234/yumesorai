import { validateBasicAuth, getBasicAuthErrorResponse } from '@/lib/auth';
import { getClientEmailTemplate, DEFAULT_EMAIL_CONTENT, DEFAULT_EMAIL_SUBJECT } from '@/lib/email-templates';
import { Resend } from 'resend';

export async function POST(request: Request) {
  // Check basic auth
  const authHeader = request.headers.get('authorization') ?? undefined;
  if (!validateBasicAuth(authHeader)) {
    return getBasicAuthErrorResponse();
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY || '');

    const formData = await request.formData();
    const csvFile = formData.get('csv') as File;
    const subject = (formData.get('subject') as string) || DEFAULT_EMAIL_SUBJECT;
    const content = (formData.get('content') as string) || DEFAULT_EMAIL_CONTENT;
    const fromEmail = (formData.get('fromEmail') as string) || 'noreply@yumesorai.com';

    if (!csvFile) {
      return Response.json(
        {
          error: 'CSV file is required',
          message: 'Please upload a CSV file with email addresses',
        },
        { status: 400 }
      );
    }

    // Parse CSV
    const csvText = await csvFile.text();
    const lines = csvText.trim().split('\n');
    const emails: Array<{ email: string; name: string }> = [];

    // Parse CSV: expect columns like "email" and "name" (or just email if single column)
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const emailIndex = headers.indexOf('email');
    const nameIndex = headers.indexOf('name');

    if (emailIndex === -1) {
      return Response.json(
        {
          error: 'Invalid CSV format',
          message: 'CSV must contain an "email" column',
        },
        { status: 400 }
      );
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(',').map(c => c.trim());
      const email = columns[emailIndex]?.toLowerCase();
      const name = nameIndex !== -1 ? columns[nameIndex] : 'Valued Client';

      if (email && email.includes('@')) {
        emails.push({ email, name });
      }
    }

    if (emails.length === 0) {
      return Response.json(
        {
          error: 'No valid emails found',
          message: 'CSV must contain at least one valid email address',
        },
        { status: 400 }
      );
    }

    // Send emails
    const results: Array<{
      email: string;
      status: 'success' | 'failed';
      messageId?: string;
      error?: string;
    }> = [];

    for (const { email, name } of emails) {
      try {
        const htmlContent = getClientEmailTemplate(name, subject, content);

        const response = await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: subject,
          html: htmlContent,
        });

        if (response.error) {
          results.push({
            email,
            status: 'failed',
            error: response.error.message,
          });
        } else {
          results.push({
            email,
            status: 'success',
            messageId: response.data?.id,
          });
        }
      } catch (error) {
        results.push({
          email,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return Response.json({
      status: 'completed',
      summary: {
        total: emails.length,
        successful: successCount,
        failed: failedCount,
      },
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Bulk Email API] Error:', error);
    return Response.json(
      {
        error: 'An error occurred while processing your request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return Response.json(
    {
      method: 'POST',
      description: 'Send bulk emails to clients',
      authentication: 'Basic auth (username:password in base64)',
      requestBody: {
        type: 'multipart/form-data',
        fields: {
          csv: 'File - CSV with columns: email, name (required)',
          subject: 'String - Email subject (optional, uses default)',
          content: 'String - Email body content (optional, uses default)',
          fromEmail: 'String - From email address (optional, defaults to noreply@yumesorai.com)',
        },
      },
      response: {
        status: 'completed',
        summary: {
          total: 'number',
          successful: 'number',
          failed: 'number',
        },
        results: [
          {
            email: 'string',
            status: 'success | failed',
            messageId: 'string (if successful)',
            error: 'string (if failed)',
          },
        ],
      },
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
