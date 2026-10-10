---
name: nd-audit
description: >
  Neurodivergence compatibility audit for workflows, UI designs, and system architectures.
  Evaluates plans against seven science-backed ADHD principles derived from Barkley, Arabaci & Parris,
  and ADHD self-employment research. Use when designing a personal app, planning a workflow step,
  or reviewing any process that a neurodivergent user will interact with.
argument-hint: "[description of workflow, UI, or plan to evaluate — or point to a file]"
---

# Neurodivergence Compatibility Audit

You are performing a neurodivergence compatibility analysis on a workflow, UI design, or system plan.

## Your Reference Material

Read the file `REFERENCE.md` in this skill's directory before proceeding. It contains the full research basis and audit criteria. Do not skip this step.

## Input

The user will provide one of:
- A description of a workflow or process step: `$ARGUMENTS`
- A reference to a file containing a plan, spec, or design
- Context from the current conversation or working session

If `$ARGUMENTS` is empty, ask the user what workflow, UI, or plan they want audited.

## Audit Procedure

### Step 1: Understand the Workflow

Before evaluating, restate the workflow in your own words as a numbered sequence of user actions. Identify:
- Who is the user and what context are they in (e.g., on a job site, at a desk, in a truck)?
- What is the trigger that starts this workflow?
- What are the discrete steps?
- What is the completion state?

### Step 2: Automation Level Assessment

**This is the most important step.** For each step in the workflow, classify where it falls on the automation hierarchy (see REFERENCE.md — "Governing Design Posture"):

1. Zero-touch automation (system handles end-to-end)
2. One-tap approval (system does work, user confirms)
3. Guided capture (user provides minimal raw input, system does rest)
4. Assisted entry (pre-populated form)
5. Manual entry (user types from scratch — **design failure** for derivable data)

Flag every step at level 4 or 5 and ask: *why can't this be higher?* If the user is acting as a human API — moving data from one place to another, copying values between screens, manually triggering a pipeline step — that is a system design failure.

The design posture is: **the user is the CEO, not the middle manager.** They should be viewing dashboards, making judgment calls, and signing off on outputs. They should not be entering, moving, transforming, or reconciling data. If the system can derive it, trigger it, or move it — the system must.

### Step 3: Evaluate Against the Seven Principles

For each principle, assign a verdict and provide specific reasoning:

- **PASS** — The design actively supports this principle
- **WARN** — The design doesn't violate the principle, but misses an opportunity to support it
- **FAIL** — The design actively works against this principle

The seven principles to evaluate (see REFERENCE.md for full detail):

1. **P1: Capture at Point of Action** — Does it capture data where/when the work happens?
2. **P2: Externalize Time Perception** — Does it make the invisible visible? Event-driven vs calendar-driven?
3. **P3: Minimize Task Switches** — How many context switches? How many fields per step? Auto-population?
4. **P4: Automate Emotional Triggers** — Which steps are aversive? Is there an escape valve?
5. **P5: Make Pipeline Visible** — Glanceable status? Color coding? Spatial state?
6. **P6: Build for Re-Entry** — Auto-save? Where-you-left-off? Interruption recovery?
7. **P7: Leverage Hyperfocus** — Clear completion signals? Bounded scope? Stopping points?

### Step 4: Check the Anti-Pattern Table

Scan the workflow against the quick-reference heuristics in REFERENCE.md. Flag any matches.

### Step 5: Output Format

Structure your response as:

```
## ND Audit: [Workflow Name]

### Workflow Summary
[Your restatement of the workflow as a numbered sequence]

### Automation Level Assessment

| Step | Current Level | Target Level | User's Role Should Be |
|------|--------------|-------------|----------------------|
| [step] | Manual Entry (5) | Guided Capture (3) | Snap a photo; system does the rest |
| [step] | Assisted Entry (4) | One-Tap Approval (2) | Review pre-populated draft, tap Send |
| [step] | One-Tap Approval (2) | Zero-Touch (1) | Never sees it unless exception |

**Fingerprint count:** [X of Y steps require user action] → Target: [reduced number]
**Human-as-API steps:** [List any steps where user is just moving data between systems]

### Principle Scorecard

| # | Principle | Verdict | Key Finding |
|---|-----------|---------|-------------|
| 1 | Capture at Point of Action | PASS/WARN/FAIL | [one line] |
| 2 | Externalize Time | PASS/WARN/FAIL | [one line] |
| 3 | Minimize Switches | PASS/WARN/FAIL | [one line] |
| 4 | Automate Aversion | PASS/WARN/FAIL | [one line] |
| 5 | Visible Pipeline | PASS/WARN/FAIL | [one line] |
| 6 | Re-Entry Ready | PASS/WARN/FAIL | [one line] |
| 7 | Hyperfocus Safe | PASS/WARN/FAIL | [one line] |

### Anti-Patterns Detected
[List any matches from the heuristics table, with the specific fix]

### Detailed Findings
[For each WARN or FAIL, expand with:]
- What specifically violates the principle
- The clinical mechanism that makes this dangerous
- A concrete fix, described in implementation terms

### Recommended Redesign
[If there are FAILs, propose a revised workflow that addresses them.
Keep it concrete — field names, screen layouts, trigger events, not abstract advice.]

### Overall ND Score: X/7
[Count of PASS verdicts. Below 5/7 = significant rework needed.]
```

## Tone and Approach

- Be specific and concrete, not generic. "Add a color indicator" is too vague. "Add a status dot: green = paid, orange = invoiced, red = overdue, visible on the project card without tapping into it" is right.
- Reference the clinical mechanisms by name (temporal myopia, task-switching cost, emotional avoidance) so the user understands *why*, not just *what*.
- Assume the user is a solo contractor who will interact with this system on a phone, often with dirty hands, often mid-task, often cognitively loaded.
- The goal is not to make the user feel bad about their design. The goal is to make the design work *with* their brain instead of against it.
- If the workflow is actually well-designed for ND, say so clearly and explain what makes it work.
