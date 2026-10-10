---
name: voltx-backprocess-receipts
description: Re-queue receipts in the VoltX Airtable Operations base for OCR reprocessing by flipping rows to Status=Pending so the local Python pipeline picks them up on the next run. Use this skill whenever the user mentions back-processing receipts, reprocessing receipts, re-running the receipt parser, re-running OCR on receipts, queueing receipts for re-parsing, rerunning failed receipts, re-parsing receipts, or wants to process a specific row range or set of record IDs from the Receipts table. Handles row selection, batched Airtable writes, attachment warnings, and post-run status summary.
---

# VoltX Receipt Back-Processor

Re-queue receipts in the VoltX Airtable Operations base for OCR reprocessing. Flips `Status` to `Pending` in batches so the local Python pipeline picks them up on the next `--process` run.

## Environment & boundaries

- **Airtable writes:** Through the Airtable MCP only. The sandbox proxy blocks `api.airtable.com` (403 Forbidden).
- **The actual parser (`main.py`):** Runs on the user's Windows machine at `C:\Users\class\voltx-ops\backend`. Do NOT attempt to run it from the sandbox.
- **Airtable PATCH limit:** 10 records per call. Always batch.
- **Base-wide rule:** Never pass `pageSize` on the Projects table (119+ records, will truncate). Not relevant here but honor it.

## Base & field IDs

- **Base:** `appfa63VIz7mjwNHe` (VoltX Operations)
- **Receipts table:** `tblt9r8iBTD4GApPB`
- **Vendors table:** `tbla1wFXBBdke8Gd6` (for vendor name resolution)

| Field | ID | Notes |
|---|---|---|
| Status | `fld6AjnzQ6gEPteZT` | singleSelect: Pending, Processing, Processed, Needs Assignment, Needs Review, Error |
| Date | `fldbNMQRyohE6Xdzi` | sort key |
| Attachments | `fldETchsWVpdcW9h3` | warn if empty before flipping |
| Vendor | `fldklptsP8nPiwIHo` | linked → Vendors (returns record IDs, needs second lookup) |
| Error Message | `fldjRXNVedRvnYfmZ` | text — used for error-set filter |
| Multi-Project | `fldH9cuZnhOdt3rMz` | checkbox — if true, terminal status is Needs Assignment, not Processed |

## Workflow

### 1. Capture selection criteria

Use `AskUserQuestion` to offer these paths:

- **Newest N receipts** — sort by Date desc, take top N
- **Row range** (e.g., "rows 4–20") — sort by Date desc, take that slice. Row numbers are view-dependent in Airtable, so confirm the ordering before trusting the slice.
- **Specific record IDs** — user pastes `recXXXXXX` IDs
- **Failed set** — filter `OR({Status}='Error', FIND("No line items found", {Error Message}&""))`
- **Already-Pending shortcut** — skip selection; fetch current Pending set and go straight to step 5

### 2. Fetch records

Call `Airtable:list_records_for_table` with fields: Status, Date, Vendor, Attachments, Error Message, Multi-Project.

### 3. Resolve vendor names

The Vendor field returns `["recXXX"]` arrays. Fetch matching records from the Vendors table to map IDs → names for the preview.

### 4. Preview and confirm

Show a table:

| # | Date | Vendor | Current Status | Attachment? | Error notes |
|---|---|---|---|---|---|

Flag attachment-missing rows explicitly — they'll re-error on "No attachment found" if flipped. Ask whether to skip, delete, or flip anyway.

**Capture each record's prior Status in memory** before writing — used for the post-run summary.

Get explicit confirmation before moving on.

### 5. Flip to Pending

Call `Airtable:update_records_for_table` with `{Status: "Pending"}` on each record. **Batch in groups of 10.**

### 6. Print the run command

```
cd C:\Users\class\voltx-ops\backend
python main.py --process
```

Mention `--dry-run` exists for previewing parse output without Airtable writes. Don't recommend it as default — the step-4 confirmation is the real dry run for the queueing stage.

### 7. Wait for the user to run it

Ask them to say when it's done.

### 8. Post-run summary

Re-query the same record IDs. Report transitions against the captured prior statuses:

- N went Error → Processed
- N went Error → Needs Assignment (expected for Multi-Project rows — label this as expected, not a failure)
- N still Error — show their new Error Message values

## Edge cases

- **No attachment:** Will re-error on "No attachment found." Warn in step 4.
- **Multi-Project = true:** Terminal status is `Needs Assignment`. Expected, not a failure.
- **Airtable PATCH > 10:** Will fail. Always batch.
- **Row numbers:** View-dependent. Default to Date desc and confirm before trusting a "rows 4–20" selection.
- **Empty Error Message on Error records:** The filter uses `&""` to coerce blanks.

## Example session

> **User:** "back-process the last 5 receipts"
>
> **Claude:** [AskUserQuestion: "Newest 5 by Date desc?"] → user confirms
> → fetches records, resolves vendor names, presents preview table
> → warns rec#3 has no attachment → user says skip
> → captures prior statuses
> → batches 4 records into one PATCH, flips Status=Pending
> → prints run command
>
> **User:** [runs locally] "done"
>
> **Claude:** → re-queries the 4 records
> "3 Processed, 1 Needs Assignment (Multi-Project flag on rec#2 — expected)."
