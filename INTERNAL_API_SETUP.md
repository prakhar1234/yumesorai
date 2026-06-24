# Internal API Setup Guide

The Internal API provides secure endpoints for employees to perform bulk operations like sending emails to clients.

## Prerequisites

- Node.js 20+
- Resend API key (free tier available at https://resend.com)
- Basic auth credentials

## Environment Variables

Add these to your `.env.local` or Railway Variables:

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
INTERNAL_AUTH_USERNAME=admin
INTERNAL_AUTH_PASSWORD=your_secure_password
```

**Important:** Change the default credentials before deploying to production!

## Endpoints

### 1. API Documentation (OpenAPI/Swagger)

**GET** `/api/internal/docs`

Returns full API documentation in OpenAPI 3.0 format.

```bash
curl https://your-domain/api/internal/docs
```

### 2. Send Bulk Emails

**POST** `/api/internal/send-bulk-email`

Send personalized emails to multiple clients from a CSV file.

**Authentication:** Basic Auth (username:password)

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `csv` (required): File - CSV with columns `email` and `name`
  - `subject` (optional): Email subject
  - `content` (optional): Email body content
  - `fromEmail` (optional): From address

**CSV Format:**

```csv
email,name
john@company.com,John Doe
jane@company.com,Jane Smith
bob@company.com,Bob Johnson
```

**Example Usage:**

```bash
# Using curl with basic auth
curl -X POST https://your-domain/api/internal/send-bulk-email \
  -H "Authorization: Basic $(echo -n 'admin:your_password' | base64)" \
  -F "csv=@clients.csv" \
  -F "subject=Exclusive Offer for You" \
  -F "content=We have a special deal for enterprise customers..."

# Using curl with environment variables
USERNAME=admin
PASSWORD=your_password
AUTH=$(echo -n "$USERNAME:$PASSWORD" | base64)

curl -X POST https://your-domain/api/internal/send-bulk-email \
  -H "Authorization: Basic $AUTH" \
  -F "csv=@clients.csv"
```

**Response:**

```json
{
  "status": "completed",
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0
  },
  "results": [
    {
      "email": "john@company.com",
      "status": "success",
      "messageId": "abc123..."
    },
    {
      "email": "jane@company.com",
      "status": "success",
      "messageId": "def456..."
    },
    {
      "email": "bob@company.com",
      "status": "success",
      "messageId": "ghi789..."
    }
  ],
  "timestamp": "2026-06-24T10:30:00.000Z"
}
```

## Authentication

The API uses HTTP Basic Authentication.

### Encoding Credentials

To create a Basic Auth header:

```bash
echo -n "admin:your_password" | base64
# Output: YWRtaW46eW91cl9wYXNzd29yZA==

# Use as Authorization header:
Authorization: Basic YWRtaW46eW91cl9wYXNzd29yZA==
```

### Using in Different Languages

**JavaScript/Node.js:**

```javascript
const credentials = Buffer.from('admin:your_password').toString('base64');
const headers = {
  'Authorization': `Basic ${credentials}`
};

const formData = new FormData();
formData.append('csv', csvFile);
formData.append('subject', 'Custom Subject');

fetch('/api/internal/send-bulk-email', {
  method: 'POST',
  headers,
  body: formData
});
```

**Python:**

```python
import base64
import requests

credentials = base64.b64encode(b'admin:your_password').decode('utf-8')
headers = {
    'Authorization': f'Basic {credentials}'
}

with open('clients.csv', 'rb') as f:
    files = {'csv': f}
    response = requests.post(
        'https://your-domain/api/internal/send-bulk-email',
        headers=headers,
        files=files
    )
    print(response.json())
```

**cURL:**

```bash
curl -X POST https://your-domain/api/internal/send-bulk-email \
  -u admin:your_password \
  -F "csv=@clients.csv"

# Or manually with base64:
AUTH=$(echo -n 'admin:your_password' | base64)
curl -X POST https://your-domain/api/internal/send-bulk-email \
  -H "Authorization: Basic $AUTH" \
  -F "csv=@clients.csv"
```

## Email Templates

### Default Template

By default, emails use this template:

**Subject:** "Transform Your Legacy Systems with Yumesorai"

**Content:**
```
We're excited to share how Yumesorai can modernize your legacy enterprise systems.

With our AI-driven platform, you can:
- Reduce security risks by 60%
- Cut modernization costs by 40%
- Accelerate deployment to 6-12 months

Schedule a free executive briefing with our team to learn how we're helping enterprises like yours.
```

### Custom Template

To use custom email content:

```bash
curl -X POST https://your-domain/api/internal/send-bulk-email \
  -u admin:your_password \
  -F "csv=@clients.csv" \
  -F "subject=Your Custom Subject" \
  -F "content=Your custom email content here..."
```

## Error Handling

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing basic authentication credentials"
}
```

**Solution:** Check your username and password. Make sure you're Base64-encoding them correctly.

### 400 Bad Request - No CSV

```json
{
  "error": "CSV file is required",
  "message": "Please upload a CSV file with email addresses"
}
```

**Solution:** Include a CSV file in the request.

### 400 Bad Request - Invalid CSV Format

```json
{
  "error": "Invalid CSV format",
  "message": "CSV must contain an \"email\" column"
}
```

**Solution:** Your CSV must have an `email` column in the header row.

### 400 Bad Request - No Valid Emails

```json
{
  "error": "No valid emails found",
  "message": "CSV must contain at least one valid email address"
}
```

**Solution:** Ensure your CSV has at least one valid email address (must contain @).

## Resend Configuration

### Getting a Free Resend API Key

1. Go to https://resend.com
2. Sign up (free account)
3. Go to API Keys section
4. Create a new API key
5. Add to environment variables as `RESEND_API_KEY`

**Free Tier Limits:**
- 100 emails per day
- Full featured (no limitations)
- Perfect for development and small-scale operations

### Verified Sender Domains

To use a custom from email:

1. Go to Resend dashboard
2. Add and verify your domain
3. Pass it as `fromEmail` parameter

Until verified, use the default `noreply@yumesorai.com`

## Security Best Practices

1. **Change Default Credentials**
   ```
   INTERNAL_AUTH_USERNAME=your_username
   INTERNAL_AUTH_PASSWORD=strong_random_password
   ```

2. **Rotate API Keys Regularly**
   - Resend API keys should be rotated quarterly
   - Keep API keys in environment variables, never in code

3. **HTTPS Only**
   - Always use HTTPS in production
   - Never send Basic Auth over plain HTTP

4. **CSV Data**
   - Validate CSV data before uploading
   - Don't include sensitive information in CSV

5. **Logs**
   - Email logs don't include message content
   - Check Resend dashboard for delivery status

## Testing

### Test with Sample CSV

Create `test_clients.csv`:

```csv
email,name
test1@example.com,Test User 1
test2@example.com,Test User 2
test3@example.com,Test User 3
```

Run the request:

```bash
curl -X POST http://localhost:3000/api/internal/send-bulk-email \
  -u admin:changeme \
  -F "csv=@test_clients.csv"
```

## Rate Limiting

Currently, no rate limiting is enforced. For production:

1. Implement rate limiting per IP/user
2. Set daily email limits
3. Monitor Resend usage

## Support

- **Resend Docs:** https://resend.com/docs
- **API Errors:** Check Railway logs or Resend dashboard
- **Email Delivery:** Track emails in Resend dashboard

## Future Enhancements

Potential features to add:

1. Email templates management UI
2. Scheduled email campaigns
3. A/B testing
4. Delivery tracking and analytics
5. Bounce/unsubscribe handling
6. Rate limiting and quotas
7. Audit logging
8. Multiple user roles and permissions
