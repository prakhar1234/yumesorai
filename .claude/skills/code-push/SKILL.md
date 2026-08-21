---
name: code-push
description: After pushing code to GitHub, verifies the Railway deployment is healthy by testing all public pages. Reverts and diagnoses if anything fails.
disable-model-invocation: true
context: fork
agent: yumesorai-code-push
allowed-tools: Bash Read Grep Glob
effort: high
---

Verify the latest push deployed successfully on Railway. Run the full health check workflow: wait for the deployment to go live, test all 17 public landing page routes, and report results. If any route fails, revert the commit, fetch Railway logs, and help diagnose the issue.
