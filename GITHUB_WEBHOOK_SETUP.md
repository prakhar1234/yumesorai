# GitHub Webhook Setup Guide

This guide walks you through setting up GitHub webhooks to automatically trigger testing when code is pushed.

## Prerequisites

- Admin access to the GitHub repository
- Access to your deployed website (Railway or other hosting)
- A webhook secret (randomly generated string)

## Step 1: Generate Webhook Secret

Generate a strong random secret (minimum 32 characters):

```bash
# macOS/Linux
openssl rand -hex 32

# Or use this online:
# https://generate-random.org/encryption-key-generator?count=1&bytes=32&cipher=aes-256-cbc&string=&password=
```

Save this secret - you'll need it for both GitHub and your `.env.local` file.

## Step 2: Update Environment Configuration

1. Copy the environment template:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and update:
   ```bash
   # Replace with your generated secret
   GITHUB_WEBHOOK_SECRET="your_webhook_secret_here"

   # Your deployed website URL
   TEST_BASE_URL="https://yourdomain.com"

   # Optional: GitHub personal access token (for future CI/CD)
   GITHUB_TOKEN="ghp_..."

   # Optional: Railway credentials (for deployment monitoring)
   RAILWAY_PROJECT_ID="your_id"
   RAILWAY_ENVIRONMENT_ID="your_env_id"
   RAILWAY_API_TOKEN="your_token"
   ```

3. Deploy the updated `.env.local` to Railway:
   ```bash
   git add .env.local  # If tracking locally
   # Or set environment variables in Railway dashboard
   ```

## Step 3: Configure Webhook in GitHub

### Option A: Via GitHub Web UI (Recommended for Setup)

1. **Open Repository Settings**
   - Go to: `https://github.com/YOUR_ORG/yumesorai/settings`
   - Or: Repository → Settings (gear icon)

2. **Navigate to Webhooks**
   - Left sidebar: "Code and automation" → "Webhooks"
   - Or direct link: `/settings/hooks`

3. **Click "Add webhook"**

4. **Configure the Webhook**
   - **Payload URL**: `https://yourdomain.com/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Paste your webhook secret
   - **Which events?**: Select "Send me everything"
   - **Active**: Check the box to enable

5. **Click "Add webhook"**

### Option B: Via GitHub CLI (Command Line)

```bash
# First, install GitHub CLI: https://cli.github.com

gh repo webhook create \
  --url "https://yourdomain.com/api/webhooks/github" \
  --secret "your_webhook_secret_here" \
  --events push,pull_request
```

## Step 4: Verify Webhook Configuration

### In GitHub UI

1. Go to repository settings → Webhooks
2. Click on your webhook
3. Scroll to "Recent Deliveries" section
4. You should see delivery attempts
5. Click on a delivery to see details

### Test the Webhook

Make a test push to trigger the webhook:

```bash
# Make a small change
echo "# Test" >> README.md

# Commit and push
git add README.md
git commit -m "Test webhook trigger"
git push origin main
```

Then check the webhook delivery in GitHub settings.

## Step 5: Verify Webhook Endpoint

Test your webhook endpoint directly:

```bash
# Test the webhook endpoint
curl -X GET "https://yourdomain.com/api/webhooks/github"

# Should return:
# {
#   "status": "webhook_configured",
#   "endpoint": "/api/webhooks/github",
#   "events": ["push", "ping"],
#   "totalTestRuns": 0,
#   "recentTestRuns": []
# }
```

## Step 6: Monitor Webhook Activity

### View Recent Deliveries

1. Go to Repository Settings → Webhooks
2. Click your webhook
3. View "Recent Deliveries" section
4. Click on each delivery to see request/response

### Check Test Run Status

```bash
# Get webhook status and recent test runs
curl "https://yourdomain.com/api/webhooks/github"

# Get specific test run details
curl "https://yourdomain.com/api/webhooks/github?testRunId=YOUR_TEST_RUN_ID"
```

### View Application Logs

Check your deployment logs on Railway:
1. Go to Railway dashboard
2. Select your project
3. Go to "Deployments" tab
4. Click on the deployment
5. View logs in the right panel

## Webhook Events

### Supported Events

The webhook currently handles:

- **push**: Code is pushed to the repository
  - Triggers feature detection and test planning
  - Only processes main, develop, and staging branches

- **ping**: Webhook is verified by GitHub
  - Used to test webhook configuration
  - No testing triggered

### Future Events (To Implement)

- **pull_request**: PRs are opened/updated
- **release**: Release tags are created

## Troubleshooting

### Webhook Not Triggering

1. **Check webhook is enabled**
   - Go to Settings → Webhooks
   - Verify "Active" checkbox is checked

2. **Verify secret matches**
   - GitHub webhook secret must match `GITHUB_WEBHOOK_SECRET` env var
   - If they don't match, signature verification fails

3. **Check URL is accessible**
   ```bash
   # Your webhook URL should respond
   curl "https://yourdomain.com/api/webhooks/github"
   ```

4. **Review recent deliveries**
   - Go to webhook settings
   - Click on failed delivery
   - Check request and response details

5. **Check application logs**
   - Review Railway deployment logs
   - Look for errors in the webhook endpoint

### Signature Verification Fails

1. Verify `GITHUB_WEBHOOK_SECRET` is set in `.env.local`
2. Confirm it matches the secret in GitHub webhook settings
3. Redeploy to Railway with new environment variable

### Tests Not Running

1. Verify webhook endpoint is reachable:
   ```bash
   curl -v https://yourdomain.com/api/webhooks/github
   ```

2. Check that changed files match feature patterns
3. Verify Railway API credentials if deployment monitoring is enabled
4. Check application logs for errors

## Security Considerations

### Webhook Secret

- ✅ Use a strong random string (minimum 32 characters)
- ✅ Store in `.env.local` (never commit to git)
- ✅ Set as environment variable on Railway
- ✅ Rotate periodically (quarterly recommended)

### URL Verification

- ✅ Webhook verifies incoming requests with HMAC signature
- ✅ Only processes requests with valid signatures
- ✅ GitHub signature format: `sha256={hash}`

### Branch Filtering

- ✅ Only processes: main, master, develop, staging
- ✅ Ignores feature branches by default
- ✅ Prevents unnecessary test runs

## Configuration Files

### `.env.local` (Local Machine)
```bash
GITHUB_WEBHOOK_SECRET="your_secret_here"
TEST_BASE_URL="https://yourdomain.com"
RAILWAY_PROJECT_ID="project_id"
# ... other variables
```

### Railway Environment Variables
Set in Railway dashboard:
- Go to your project
- Settings → Variables
- Add each environment variable

## Testing Flow

When code is pushed to main branch:

1. GitHub sends webhook event to `/api/webhooks/github`
2. Webhook endpoint verifies signature
3. Analyzes changed files for affected features
4. Queues test run for affected features
5. Test run ID is returned in response
6. (Future) Tests are automatically executed
7. (Future) Results sent to Slack/Email

## Related Documentation

- [Testing Agent System](TESTING_AGENT_SUMMARY.md)
- [Implementation Guide](agent-systems/testing-agent/IMPLEMENTATION_GUIDE.md)
- [API Webhook Handler](src/app/api/webhooks/github/route.ts)
- [GitHub Webhooks Documentation](https://docs.github.com/en/developers/webhooks-and-events/webhooks)

## Support

For issues or questions:

1. Check [GitHub Webhooks Documentation](https://docs.github.com/en/developers/webhooks-and-events/webhooks)
2. Review webhook delivery logs in GitHub settings
3. Check application logs on Railway
4. Review [troubleshooting section](#troubleshooting) above

## Quick Setup Checklist

- [ ] Generate webhook secret: `openssl rand -hex 32`
- [ ] Copy `.env.local.example` to `.env.local`
- [ ] Update `GITHUB_WEBHOOK_SECRET` in `.env.local`
- [ ] Update `TEST_BASE_URL` in `.env.local`
- [ ] Deploy `.env.local` to Railway
- [ ] Add webhook in GitHub repository settings
- [ ] Test webhook with a push
- [ ] Verify webhook in "Recent Deliveries"
- [ ] Monitor logs on Railway

---

**Setup Date**: July 1, 2026
**Status**: Ready for configuration
**Next Step**: Add webhook secret and update `.env.local`
