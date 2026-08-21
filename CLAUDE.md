# Yumesorai

AI-driven legacy modernization platform. Transforms COBOL/mainframe systems into modern cloud-native platforms for healthcare, airlines, and banking enterprises.

## Architecture — Two Independent Apps

The codebase is split into two standalone Next.js applications:

| App | Directory | Port | Purpose |
|-----|-----------|------|---------|
| **Landing Page** | `YumesoraiLandingPage/` | 3000 | Marketing website, contact forms, assessments, ROI calculator |
| **Products** | `YumesoraiProducts/` | 3001 (Next.js) + 5050 (Flask) | Demystifier product suite (knowledge graph, CodeFlux, Transformer) |

The original `src/` directory is retained as a reference but is not actively developed.

## Tech Stack

### Landing Page (`YumesoraiLandingPage/`)
- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, Radix UI
- **Database:** PostgreSQL
- **CRM:** HubSpot
- **Email:** Resend + Nodemailer + React Email
- **Analytics:** Plausible
- **Deploy:** Railway, Docker

### Products (`YumesoraiProducts/`)
- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, Radix UI
- **Backend API:** Flask (Python 3) on port 5050
- **LLM:** Anthropic Claude API + OpenAI API
- **Deploy:** Railway, Docker

## Project Structure

```
YumesoraiLandingPage/           # Marketing website — port 3000
  src/
    app/                        # Marketing pages + form API routes
      api/                      # contact, demo, assessment, risk-briefing, roi-calculator
      about/, blog/, contact/, solutions/, platform/, resources/
      assessment/, demo/, calculator/, risk-briefing/, tools/
    components/
      layout/                   # Header.tsx, Footer.tsx
      ui/                       # Shared UI components
      industry/                 # Industry-specific components
      analytics/                # PlausibleProvider, CookieConsent
    lib/                        # db.ts, email.ts, hubspot.ts, calculator-engine.ts, etc.
    types/

YumesoraiProducts/              # Product apps — port 3001
  src/
    app/
      demystifier/              # Demystifier, CodeFlux, Transformer pages
      api/demystifier/          # Proxy routes to Flask
    components/
      demystifier/              # ~19 dedicated product components
      ui/                       # Shared UI components
    lib/                        # api-utils.ts, utils.ts
    types/
  flask-api/                    # Python Flask backend
    routes/                     # demystify.py, analyses.py
    services/                   # cobol_graph_builder.py, edge_validation.py, LLM providers
  agent-systems/                # Testing agent
  Yumesorai-Agents/             # Agent implementations

agent-loops/                    # Brainstormed agentic loop pipeline designs
```

## Commands

```sh
# Landing Page
cd YumesoraiLandingPage
npm run dev              # Start marketing site (port 3000)
npm run build            # Production build

# Products
cd YumesoraiProducts
npm run dev              # Start product app (port 3001)
npm run dev:flask        # Start Flask API (port 5050)
npm run build            # Production build
```

## Key Architecture Notes

- Each app is fully independent — starts and runs without the other.
- The Landing Page renders Header/Footer on all pages (no SiteChrome conditional logic).
- The Products app uses a dark theme (bg `#0a0e14`, IBM Plex Sans) with no Header/Footer.
- The Demystifier uses both LLM-based and static regex-based COBOL analysis (`flask-api/services/cobol_graph_builder.py`).
- Edge validation (`flask-api/services/edge_validation.py`) verifies graph edges against source syntax.
- The Maestro admin panel has been removed entirely — no admin auth, no ops routes.
- Security headers (CSP, HSTS, X-Frame-Options) are configured in each app's `next.config.mjs`.

## Environment

- Each app has its own `.env.example` template
- Landing Page env: `DATABASE_URL`, `HUBSPOT_ACCESS_TOKEN`, `RESEND_API_KEY`, `PLAUSIBLE_DOMAIN`
- Products env: `FLASK_API_URL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN`
- Never commit secrets

## Rules

### Agentic Loop Pipelines

When brainstorming, designing, or discussing an agentic loop pipeline, save the design to the `agent-loops/` directory:

- **File format:** Markdown (`.md`)
- **Naming:** Use a descriptive kebab-case name, e.g. `agent-loops/cobol-migration-pipeline.md`
- **Content structure:** Each file should include:
  - Title and one-line summary
  - The loop stages/steps with agent roles
  - Input/output for each stage
  - Decision points and branching logic
  - Error handling / retry strategy
  - Any tool or API dependencies
- **When to save:** Any time the user brainstorms, iterates on, or finalizes an agentic loop design during conversation, persist the current state to this directory. Update the existing file if iterating on the same pipeline; create a new file for a distinct pipeline.
- **Do not delete** previous pipeline files unless the user explicitly asks.
