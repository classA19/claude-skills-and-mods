---
name: rtfm
description: >
  When troubleshooting errors, connectivity failures, install problems, dependency issues,
  configuration bugs, or any situation where something isn't working as expected — STOP
  guessing and go read the official documentation first. This skill triggers whenever Claude
  encounters or is told about an error message, stack trace, failed command, timeout,
  connection refused, module not found, authentication failure, permission denied, or any
  unexpected behavior from a tool, service, library, or platform. It also triggers when
  Claude finds itself proposing multiple speculative fixes in a row without resolving the
  issue, or when the user says things like "did you check the docs", "read the docs",
  "look it up", or "what does the documentation say". This skill applies to ANY technology —
  not just a predefined list. If Claude is troubleshooting and hasn't consulted the relevant
  official documentation yet, this skill should fire.
---

# RTFM — Read The Docs Before You Fix

## Why this skill exists

When troubleshooting, Claude's default instinct is to reason from training data and propose
fixes from memory. This works sometimes, but frequently leads to a cycle of speculative
guessing — especially with tools that have detailed, evolving documentation. The fix is
almost always in the docs. Reading them first saves significant time and produces more
accurate solutions.

This skill changes the default behavior: **documentation-first, speculation-second.**

## Core behavior

When you encounter a problem — an error, a failed install, a broken connection, unexpected
output, or anything that isn't working — follow this sequence before proposing fixes:

### 1. Identify the service or tool involved

Read the error message or the user's description carefully. Determine which specific
service, library, framework, or platform is involved. Often there are multiple layers
(e.g., Docker + the app running inside it + the cloud provider hosting it). Identify the
most likely source of the problem — start there, but keep the other layers in mind.

### 2. Search for the official documentation

Use web search to find the **official** troubleshooting or setup docs for that specific
tool. Prioritize in this order:

1. Official docs site (e.g., `docs.docker.com`, `cloud.google.com/docs`, `docs.digitalocean.com`)
2. Official GitHub repo README, issues, or wiki
3. Official community forums or Discord
4. High-quality third-party guides (Stack Overflow answers with high votes, well-known tech blogs)

Search queries should be specific. Include the error message or symptom alongside the tool name.

**Good queries:**
- `OpenClaw "gateway start blocked" troubleshooting`
- `docker "connection refused" container networking`
- `DigitalOcean UFW blocking port 3000`
- `pyairtable 403 authentication error`

**Bad queries:**
- `how to fix error` (too vague)
- `OpenClaw not working` (too broad)
- `troubleshooting guide` (no specifics)

### 3. Read the relevant doc page

Use `web_fetch` to pull the actual documentation page content — don't rely on search
snippets alone. Skim for:

- The specific error message or symptom
- Diagnostic commands the docs recommend running
- Prerequisites or configuration steps that may have been missed
- Known issues or caveats mentioned in the docs

### 4. Run diagnostic commands from the docs

Many tools have built-in diagnostic commands. Run them before proposing fixes. Examples of
the kind of thing to look for (these are illustrative, not a fixed list):

- Status/health check commands (e.g., `docker ps -a`, `openclaw doctor`, `systemctl status`)
- Log inspection commands (e.g., `docker logs`, `journalctl`, `openclaw logs --follow`)
- Network diagnostic commands (e.g., `ping`, `curl`, `netstat`, `ss`, `ufw status`)
- Configuration inspection commands (e.g., `docker inspect`, `cat /etc/resolv.conf`)

### 5. Map the docs to your specific scenario

This is the critical thinking step. The docs describe general requirements, configurations,
and troubleshooting paths. Compare those against the specific thing you're building or
fixing. For each recommendation the docs make, ask:

- Does this apply to our setup? (e.g., "the docs assume a fresh install, but we're
  upgrading" or "the docs describe the CLI install, but we're running in Docker")
- Have we already done this step, or is it missing?
- Are there prerequisites the docs mention that we haven't verified?
- Does the docs' expected environment match ours? (OS, network config, auth method, etc.)

Where there are gaps — things the docs reference that you don't have context on, or places
where the setup diverges from the docs' assumptions — **ask the user before proceeding.**
Don't silently assume. For example:

- "The docs say the gateway needs to bind to a specific port. Do you know if anything else
  is using port 3000 on this Droplet?"
- "The docs recommend running the install with `--non-interactive` on headless VPS setups.
  Did you use that flag, or the default TUI installer?"
- "The troubleshooting guide mentions checking IAM permissions. Which service account are
  we using for this?"

This step turns a generic doc page into a specific diagnostic for the situation at hand.

### 6. Now propose a fix — grounded in what you found

Only after reading the docs, running diagnostics, and mapping the recommendations to the
specific scenario should you propose a solution. When you do, reference what you found:
"The docs say X, our setup shows Y, so the fix is Z." This is more accurate and builds
trust.

## When to escalate the doc search

If the first search doesn't surface relevant docs, try:

- Searching for the exact error message in quotes
- Searching the tool's GitHub issues for the error
- Broadening to the tool's general troubleshooting/FAQ page
- Checking if there's a `--help` or `man` page for the command that failed

If after 2-3 searches you still can't find relevant docs, say so honestly and then fall
back to reasoning from what you know — but make clear you're working without doc
confirmation.

## Recognizing when you're in a guessing loop

If you've proposed 2+ fixes and none have worked, that is a strong signal to stop and go
read the docs. The user shouldn't have to ask you to do this. Catch yourself:

- "I've tried two things and neither worked → time to read the docs"
- "I'm not sure which of several possible causes this is → time to read the docs"
- "This tool has been updated recently and I might be wrong → time to read the docs"

## What NOT to do

- Don't skip the doc search because you think you already know the answer. Training data
  goes stale. Docs don't.
- Don't propose a long list of "try this, try that" without checking which one the docs
  actually recommend.
- Don't read only the search snippet — fetch the full page. The answer is often in the
  details.
- Don't forget to actually run the diagnostic commands. Reading about them isn't the same
  as running them.
