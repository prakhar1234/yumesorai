export async function GET() {
  const swaggerDoc = {
    openapi: '3.0.0',
    info: {
      title: 'Yumesorai Internal API',
      description: 'Internal employee API for bulk operations and administration',
      version: '1.0.0',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://yumesorai-production.up.railway.app'
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      securitySchemes: {
        basicAuth: {
          type: 'http',
          scheme: 'basic',
          description: 'Basic authentication with username and password',
        },
      },
    },
    security: [
      {
        basicAuth: [],
      },
    ],
    paths: {
      '/api/internal/send-bulk-email': {
        post: {
          summary: 'Send bulk emails to clients',
          description:
            'Send personalized emails to a list of clients from a CSV file. Requires basic authentication.',
          tags: ['Internal', 'Email'],
          security: [
            {
              basicAuth: [],
            },
          ],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['csv'],
                  properties: {
                    csv: {
                      type: 'string',
                      format: 'binary',
                      description:
                        'CSV file with columns: email (required), name (optional). First row must be headers.',
                      example: 'email,name\njohn@company.com,John Doe\njane@company.com,Jane Smith',
                    },
                    subject: {
                      type: 'string',
                      description: 'Email subject line (optional)',
                      default: 'Transform Your Legacy Systems with Yumesorai',
                      example: 'Special Offer for Enterprise Customers',
                    },
                    content: {
                      type: 'string',
                      description: 'Email body content in plain text (optional)',
                      default: 'Default promotional content',
                      example: 'We have a special offer for you...',
                    },
                    fromEmail: {
                      type: 'string',
                      description: 'From email address (optional)',
                      default: 'noreply@yumesorai.com',
                      example: 'sales@yumesorai.com',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Emails processed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'completed',
                      },
                      summary: {
                        type: 'object',
                        properties: {
                          total: {
                            type: 'integer',
                            example: 100,
                          },
                          successful: {
                            type: 'integer',
                            example: 98,
                          },
                          failed: {
                            type: 'integer',
                            example: 2,
                          },
                        },
                      },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            email: {
                              type: 'string',
                              example: 'john@company.com',
                            },
                            status: {
                              type: 'string',
                              enum: ['success', 'failed'],
                            },
                            messageId: {
                              type: 'string',
                              description: 'Resend message ID (if successful)',
                            },
                            error: {
                              type: 'string',
                              description: 'Error message (if failed)',
                            },
                          },
                        },
                      },
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request - missing or malformed CSV',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized - invalid or missing basic auth credentials',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        options: {
          summary: 'Get endpoint documentation',
          description: 'Returns endpoint details and expected format',
          tags: ['Internal', 'Documentation'],
          responses: {
            '200': {
              description: 'Endpoint documentation',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  return Response.json(swaggerDoc, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
