---
name: agentic-loop-diagram
description: Displays an agentic loop pipeline as a visual dash/ASCII diagram. Prompts the user to pick which loop to view from the agent-loops/ directory.
user-invocable: true
allowed-tools: Bash Read Glob Grep AskUserQuestion
---

# Agentic Loop Diagram Viewer

You render agentic loop pipeline designs as clear ASCII/box-drawing diagrams.

## Workflow

### Step 1: Discover Available Loops

Scan the `agent-loops/` directory at the project root for all `.md` files:

```bash
ls agent-loops/*.md
```

For each file found, read the first 5 lines to extract the title (first `# ` heading) and the summary line (usually the line after `**Summary:**`).

### Step 2: Ask the User Which Loop to View

Use the `AskUserQuestion` tool to present the discovered loops as options. Each option should show:
- **Label:** The pipeline title (from the `# ` heading)
- **Description:** The one-line summary

If only one loop exists, still ask for confirmation before rendering.

### Step 3: Read the Selected Loop File

Read the full contents of the selected `.md` file.

### Step 4: Render the Diagram

Extract and display the pipeline as a **dash diagram** using box-drawing characters. Follow these rules:

1. **Extract existing diagrams** — if the markdown already contains ASCII diagrams (inside ``` code blocks), extract and display them with clear section headers.

2. **Generate a summary flow diagram** — always produce a single top-to-bottom **condensed overview diagram** that shows the full pipeline at a glance. Use this format:

```
  ╔══════════════════════════════════════════════╗
  ║        PIPELINE NAME                         ║
  ╚══════════════════════════════════════════════╝

  ┌─────────────┐
  │  [1] Stage   │ ── brief description
  └──────┬──────┘
         │
         v
  ┌─────────────┐
  │  [2] Stage   │ ── brief description
  └──────┬──────┘
         │
         v
  ┌──────────────────┐
  │  [3] Decision    │
  └───┬─────────┬────┘
   YES│         │NO
      v         v
  ┌───────┐  ┌────────────┐
  │ Done  │  │ [4] Loop   │──┐
  └───────┘  └────────────┘  │
                  ^           │
                  └───────────┘
```

3. **Formatting rules:**
   - Use `┌ ┐ └ ┘ │ ─ ┬ ┴ ├ ┤ ╔ ╗ ╚ ╝ ║ ═` for box drawing
   - Use `v` and `>` for flow direction arrows
   - Decision points use diamond-like shapes or branching with YES/NO labels
   - Loop-back arrows clearly show iteration
   - Keep line width under 80 characters where possible
   - Add a legend at the bottom if the diagram uses special notation

4. **Stage details table** — after the diagram, print a compact table:

```
Stage | Agent Role     | Input           | Output          | Can Fail?
------|----------------|-----------------|-----------------|----------
1     | File Fetcher   | repo_url        | sources[]       | Yes (retry 3x)
...
```

5. **Mode comparison** — if the pipeline has multiple modes (e.g., static/auto/llm), render a side-by-side comparison showing which stages each mode executes.

### Output Format

Print everything directly as text output (no file creation). Structure:

1. Pipeline title + one-line summary
2. Condensed overview diagram
3. Detailed diagrams (extracted from the source file)
4. Stage details table
5. Mode comparison (if applicable)
6. Tool/API dependencies list
