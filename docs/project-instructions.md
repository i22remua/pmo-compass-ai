# Project updates from instructions

## First increment — cost lists

Open **Project → Tracking → Update with instructions**. This increment recognises bounded cost lists in the browser; it is not a language model or a general-purpose autonomous agent. English and Spanish are supported.

1. Paste `Add these costs: parts 1000 EUR, labour 1200 EUR` or `Añádeme estos costes: piezas 1000 EUR, mano de obra 1200 EUR`.
2. Prepare the review. Check each item and the total. Nothing is saved yet.
3. Name the review and explicitly select actual cost, forecast or approved budget, plus an as-of date.
4. Confirm once. One cost snapshot is saved with the complete original instruction as evidence and an initial immutable version. It can subsequently be edited through the existing control form and history.

The total represents **only the submitted list**. It is not added to other cost snapshots, does not update the project budget field and does not overwrite a prior snapshot. The PMO must check that the list represents the scope of the review. Other cost fields remain unknown (`null`), not zero. The label “approved” is the user's declaration, not an independent approval.

## Input boundaries

- EUR or € must accompany every amount. No currency conversion: `$`, USD and other currencies are unsupported. Do not relabel a foreign-currency amount as EUR.
- Separate items with a newline, semicolon or comma followed by a space. Each item contains a label and one nonnegative amount; decimals use one or two digits. `1200.50`, `1200,50`, `1,200.50` and `1.200,50` are accepted. Ambiguous `1,000` / `1.000` are rejected.
- Maximum 20 items, 2000 source characters and EUR 1 trillion in total. Repeated item labels are rejected. Arithmetic uses integer cents.
- If any line is unsupported, the entire proposal is rejected. No partial import, guessed date, extra charge, automatic approval or execution of embedded instructions.
- Edit the instruction to correct the breakdown; re-prepare before saving. Missing required metadata blocks confirmation. Closing an unsaved draft requires confirmation. Drafts are not persisted across reloads.

## Persistence and security

The existing repository validates the draft and keeps local and authenticated cloud storage separate. No API request, external provider, new secret, permission or Firestore collection is introduced. Existing owner/project rules, version history, account export and project/account cleanup apply.

A deterministic creation ID incorporates project, date, selected cost field and the normalised breakdown. Repeating the same list, including reordered lines, targets the same document rather than generating another record. Local writes reject an existing ID; Firestore rules reject revision-1 overwrites. The UI identifies duplicates in the loaded workspace. A concurrent cloud collision can surface as a permission error; refresh and inspect the existing record. This is exact input deduplication, not semantic invoice matching or a universal import ledger. Changing date/type/breakdown creates a different review. The ID is not a confidentiality mechanism; owner rules protect access.

## Next increments

Not implemented in this increment: free-form model interpretation; action/milestone changes; updating an existing snapshot through instructions; multi-currency; CSV/XLSX import; ERP integrations; analysis of control data by the diagnosis; background autonomous execution. Add these as explicit operations with separate review and validation contracts. Preserve this deterministic path for supported lists and private operation.

## Validation

The control suite covers extraction, cents, currency/format rejection, date requirements, identity, ES/EN review, no write before confirmation, evidence/history, duplicate prevention, draft cancellation, responsive widths and accessibility. Firebase emulator integration exercises instruction-created snapshots, subsequent versioned edits, concurrency, owner isolation and deletion. See the delivery report for executed results; emulator verification is not live account verification.

### Executed on 13 October 2026

- TypeScript, ESLint, production build and 229 backend tests passed (one existing Python dependency deprecation warning).
- The 11-test control suite passed. The three instruction tests were then extended and rerun for a simulated storage failure/retry, light/dark screenshots, ES/EN, five viewport widths (375/390/768/1024/1440) and axe checks. No external generation request was made by this flow.
- All 27 Firestore rules tests passed. The authenticated emulator test for instruction-created cost records, immutable versions, stale edits, two-account isolation and child cleanup passed. The other four Firebase integration tests passed in the preceding run; the new test was rerun after fixing the instruction field's accessible name.
- Formatting, release/document checks and the tracked-file secret scan passed. Validation used an equivalent source copy under `/private/tmp/pmo-ci-fix` with Node 22 and an isolated Python environment because the older temporary environment no longer contained uvicorn.
- Real cloud verification of the new instruction flow and Safari/Firefox testing remain pending. The model-driven interpreter and other operation types remain subsequent increments.

### Release prerequisites

The active Firestore rules were read back and matched the repository on 13 October 2026. The `controls` and `controlVersions` indexes were confirmed `READY`; this increment needs no additional Firebase rules, indexes, backend deployment or environment variables. Production browser validation uses fictional Starter Workspace data; it does not prove signed-in cloud persistence.

Release validation on 13 October: all **72** main Playwright tests passed, including the existing dashboard, diagnosis, navigation, public case and instruction flow. npm production dependency audit and pip-audit reported no known vulnerabilities. All four release-guard tests passed; staged files were checked for private configuration and secret patterns.
