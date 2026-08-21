---
name: code-push
description: Commits changes, runs a local build to verify, pushes to GitHub only if the build passes, then verifies the Railway deployment is healthy. Reverts and diagnoses if anything fails.
disable-model-invocation: true
allowed-tools: Bash Read Grep Glob
---

# Yumesorai Code Push — Commit, Build, Push & Deploy Verify

You are a deployment agent. Your job is to commit pending changes, run a local build to catch errors early, push to GitHub only after the build passes (which triggers a Railway auto-deploy), then verify the live deployment. If anything fails, revert and diagnose.

## Workflow

### Step 0: Commit Changes Locally

1. **Check for uncommitted changes:**
   ```bash
   git status
   git diff --staged
   git diff
   ```

2. **Stage all changes** (if there are unstaged changes):
   ```bash
   git add -A
   ```

3. **Commit** with a concise message summarizing the changes. Analyze the diff to write an accurate commit message. Do NOT ask the user for confirmation — just commit:
   ```bash
   git commit -m "<message>"
   ```

If there are no changes to commit, skip straight to Step 2 (push existing unpushed commits).

### Step 1: Local Build Check

Before pushing, run a production build locally to catch errors early:

```bash
cd YumesoraiLandingPage && npm run build
```

- If the build **succeeds**, proceed to Step 2.
- If the build **fails**, do NOT push. Report the build errors to the user and help fix them locally. After fixing, re-stage, commit the fix, and re-run the build.

### Step 2: Push to GitHub

Only after the local build passes, push to the remote without asking the user:

```bash
git push
```

This triggers Railway's auto-deploy.

### Step 3: Wait for Railway Deployment to Complete

Railway deploys take a few minutes after a push. You must confirm the **new** deployment finished on Railway's side before testing routes.

#### 3a. Check Railway deployment status

Use the Railway CLI to monitor deployment status:

```bash
railway status
```

Poll this every 30 seconds, up to 15 retries. Look for the deployment status to show as **"Online"** (indicating the build completed and the service is live).

- If the status shows a **build failure** or **crash**, skip directly to the failure workflow (Step 7) — fetch the Railway build/deploy logs immediately.
- If the deployment is still in progress (building, deploying), keep waiting.

If `railway status` is not available or errors out, fall back to checking logs:

```bash
railway logs --lines 50
```

Look for log lines indicating the deployment completed, such as:
- `Listening on port` or `Ready on`
- Build success messages
- Any crash or error messages that indicate the deploy failed

#### 3b. Verify the new deployment is live

After Railway reports success, confirm the site is actually responding:

```bash
curl -s -o /dev/null -w "%{http_code}" https://www.yumesorai.com
```

- Retry up to 5 times with 15-second intervals.
- If the homepage never returns 200 after all retries, report the deployment as failed and proceed to the failure workflow (Step 7).

### Step 4: Curl-Test All Public Pages

Once the homepage is up, test every public route returns HTTP 200. Test all of these routes:

| # | Route |
|---|-------|
| 1 | `/` |
| 2 | `/about` |
| 3 | `/solutions` |
| 4 | `/solutions/healthcare` |
| 5 | `/solutions/airlines` |
| 6 | `/solutions/banking` |
| 7 | `/platform` |
| 8 | `/contact` |
| 9 | `/demo` |
| 10 | `/assessment` |
| 11 | `/risk-briefing` |
| 12 | `/blog` |
| 13 | `/resources` |
| 14 | `/resources/case-studies` |
| 15 | `/tools/roi-calculator` |
| 16 | `/privacy` |
| 17 | `/terms` |

For each route, run:

```bash
curl -s -o /dev/null -w "%{http_code}" https://www.yumesorai.com<route>
```

Collect all results into a summary table.

### Step 5: Fetch Railway Logs

Regardless of route test results, fetch the latest Railway runtime and build logs:

```bash
railway logs --lines 50
```

```bash
railway logs --build --lines 50
```

Include relevant excerpts in the report so the user can see what happened during the deploy.

### Step 6: If All Pass — Report Success

If every route returns HTTP 200, report a success summary:

- Print a table with all 17 routes and their status codes.
- Show relevant Railway log excerpts (startup confirmation, any warnings).
- Confirm the deployment is healthy.

### Step 7: If Any Fail — Revert and Diagnose

If any route returns a non-200 status code:

1. **Revert the last commit and push:**
   ```bash
   git revert HEAD --no-edit && git push
   ```

2. **Present findings to the user:**
   - List which routes failed and their HTTP status codes.
   - Show relevant Railway log excerpts (already fetched in Step 5).
   - Suggest likely causes based on the logs and failed routes.

3. **Help fix the issue locally** — read the relevant source files, identify the problem, and propose a fix.
