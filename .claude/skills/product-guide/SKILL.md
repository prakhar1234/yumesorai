---
name: product-guide
description: Explains the functional understanding of the Yumesorai platform — both the marketing Landing Page and the Products app (Demystifier suite). Use when the user asks how a feature works, what a page does, or wants to understand product functionality.
argument-hint: "[topic]"
arguments: topic
user-invocable: true
disable-model-invocation: true
allowed-tools: Read Glob Grep
effort: high
---

# Yumesorai Product Guide

You are a product expert for the Yumesorai platform — an AI-driven legacy modernization suite that transforms COBOL/mainframe systems into modern cloud-native platforms for healthcare, airlines, and banking enterprises.

When the user asks about a topic, investigate the relevant source code and explain the functionality clearly. If no topic is provided, give a high-level overview of both apps.

## Platform Overview

Yumesorai consists of two independent Next.js applications:

### 1. Landing Page (`YumesoraiLandingPage/` — port 3000)

The public marketing website. Key functional areas:

| Area | Route(s) | What it does |
|------|----------|--------------|
| **Homepage** | `/` | Hero, value props, industry cards, CTA sections |
| **Solutions** | `/solutions`, `/solutions/healthcare`, `/solutions/airlines`, `/solutions/banking` | Industry-specific modernization pitches |
| **Platform** | `/platform` | Technical platform overview |
| **Assessment** | `/assessment` | Multi-step legacy assessment intake form |
| **Demo Request** | `/demo` | Demo booking form integrated with HubSpot |
| **Contact** | `/contact` | General contact form with email delivery via Resend/Nodemailer |
| **ROI Calculator** | `/tools/roi-calculator` | Interactive calculator estimating modernization savings |
| **Risk Briefing** | `/risk-briefing` | Executive risk briefing request form |
| **Blog** | `/blog` | Content marketing pages |
| **Resources** | `/resources`, `/resources/case-studies` | Whitepapers, case studies |
| **About** | `/about` | Company information |
| **Legal** | `/privacy`, `/terms` | Privacy policy and terms |

**Key integrations:**
- **HubSpot CRM** — contact/demo submissions synced to HubSpot
- **Resend + Nodemailer** — transactional email delivery (React Email templates)
- **PostgreSQL** — form submissions stored in DB
- **Plausible Analytics** — privacy-first analytics
- **Calculator Engine** — `lib/calculator-engine.ts` powers the ROI calculator logic

**API routes** are under `src/app/api/` — contact, demo, assessment, risk-briefing, roi-calculator.

### 2. Products App (`YumesoraiProducts/` — port 3001)

The product suite for COBOL analysis and modernization. Dark-themed UI (bg `#0a0e14`, IBM Plex Sans), no Header/Footer.

| Product | Route | What it does |
|---------|-------|--------------|
| **Demystifier** | `/demystifier` | Uploads COBOL source or connects a GitHub repo, builds a knowledge graph showing programs, copybooks, data flows, and call relationships |
| **CodeFlux** | `/demystifier/codeflux` | AI-powered COBOL code analysis — explains what legacy code does in plain English |
| **Transformer** | `/demystifier/transformer` | Generates modernized code (Java/Python/cloud-native) from analyzed COBOL |

**Backend (Flask API on port 5050):**
- `flask-api/routes/demystify.py` — main analysis endpoint; accepts COBOL source or GitHub repo URL
- `flask-api/routes/analyses.py` — CRUD for saved analyses
- `flask-api/services/cobol_graph_builder.py` — core engine that parses COBOL into a knowledge graph (both LLM-based and static regex-based analysis)
- `flask-api/services/edge_validation.py` — validates graph edges against actual COBOL syntax

**Frontend components** (~19 dedicated components in `src/components/demystifier/`):
- File upload, GitHub repo connector, knowledge graph visualization
- Analysis panels, code viewer, coverage indicators
- CodeFlux and Transformer interfaces

**Key integrations:**
- **Anthropic Claude API** — LLM-based COBOL analysis
- **OpenAI API** — alternative LLM provider
- **GitHub API** — fetch COBOL repos for analysis

## How to Investigate

When the user provides `$topic`:

1. Search for relevant files using Glob and Grep across both apps
2. Read the key source files (pages, components, API routes, lib modules)
3. Explain:
   - **What it does** — user-facing functionality
   - **How it works** — technical implementation (data flow, key functions, integrations)
   - **Where the code lives** — file paths with line references
   - **How it connects** — relationships to other features or services

If no topic is given, provide the high-level overview above and ask what the user wants to dive into.

## Source Directories

- Landing Page source: `${CLAUDE_PROJECT_DIR}/YumesoraiLandingPage/src/`
- Products source: `${CLAUDE_PROJECT_DIR}/YumesoraiProducts/src/`
- Flask API: `${CLAUDE_PROJECT_DIR}/YumesoraiProducts/flask-api/`
- Agent systems: `${CLAUDE_PROJECT_DIR}/YumesoraiProducts/agent-systems/`
