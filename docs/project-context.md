# Project sources, privacy and PMO tracking

Implemented and publicly deployed on 28 September 2026. Deployment and verification evidence is recorded in [VALIDATION.md](VALIDATION.md).

## Add project context

Open a project → **Sources & privacy / Fuentes y privacidad**. Drop one PDF, DOCX or TXT, or paste a meeting transcript. Extraction happens in this browser; original files are not uploaded or stored. Review the fragments, optionally filter possible PMO information, redact sensitive text and select only what the project needs. Nothing is selected automatically. Save the selection explicitly.

The relevance filter is a bilingual keyword aid, not an AI classification or automatic anonymisation. PDF locators identify the page and extracted paragraph; TXT/DOCX/transcript locators identify extracted paragraphs, not Word layout pages. DOCX extraction reads the main document body (including table paragraphs), not comments, headers, attachments or tracked-change history. PDFs require extractable text; there is no OCR. Password-protected, malformed or unsupported files fail visibly.

Limits: 5 MB per file, 100 PDF pages, 120,000 extracted characters and 500 candidate fragments. Selected context is limited to 20 excerpts and 20,000 characters per generation, with at most 2,000 characters per excerpt. Concurrent cloud additions can exceed the combined UI limit; generation rejects excess context rather than silently dropping sources. Remove unnecessary fragments to continue.

## Sources in generated output

The generator, Copilot and Intelligence use the saved selection. External model prompts require `[S1]` references for excerpt-based claims. Unknown or absent references and ungrounded structured risk quotations reject the provider response and trigger fallback. This validation checks reference IDs and quoted evidence, **not semantic entailment of every narrative claim**. Human review remains necessary; inferred risks and assessments retain their labels.

Output keeps a snapshot appendix with the source name, locator and reviewed excerpt. References link into that snapshot. Edited text is marked as reviewed; it is not represented as a verbatim original file. Saved/copied/exported documents keep their source text even if the project source is later deleted. Delete affected documents separately when removing retained information. Source numbering belongs to each generation, not a permanent file identifier.

## Privacy boundaries

- New projects start with **Private · internal engine**. The backend receives selected context for generation, but does not call Gemini, Groq, OpenRouter or Ollama in this mode. This does not mean disconnected browser-only generation.
- Explicit per-project authorisation enables the configured external provider. Adding sources revokes that choice atomically. The generator re-reads the saved policy just before sending; editing project details cannot overwrite it. Revocation cannot retract a request already sent.
- Existing projects without the new field retain their previous provider behaviour. Change it under Sources & privacy before entering confidential information, or create a new private project.
- Without login, excerpts and tracking records use this browser's localStorage. It is not an encrypted vault and other people using the same browser profile can access it. Signed-in data uses owner-scoped Firebase collections and rules, without silent fallback to browser storage.
- Firestore sources require an active owned parent; source snapshots are immutable. Tracking updates cannot change owner, parent or creation time. Project deletion removes documents, sources and records in retryable batches.
- Original files are never sent to an external extraction service. PDF fonts/character maps and workers are served from the app origin. DOCX decompression is bounded and runs in a terminable worker; only `word/document.xml` is interpreted, with entity declarations rejected. File text is treated as untrusted data and rendered without raw HTML or images.
- Backend credentials remain server-only. Generation logs use fixed codes, not prompts or upstream bodies. This personal workspace is not end-to-end encrypted, a compliance certification, a corporate DLP system or shared team tenancy. Obtain your organisation's approval before uploading restricted data, especially before authorising external AI.

PDF.js is pinned to 6.3.289, above the patched version in the [Mozilla security advisory](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j). Node **22.13+** is required. `predev` and `prebuild` copy its licensed font/CMap assets to an ignored generated public directory; both development and production serve those resources locally.

## Actionable PMO dashboard

Project → **PMO tracking / Seguimiento PMO** stores actions, decisions and risks. Register manually or use **Review and register** on an Intelligence proposal. Confirm its wording and optional action deadline or risk severity; AI proposals are never counted automatically. Close/reopen, edit and delete records explicitly.

The four dashboard buttons filter the corresponding records and link back to project tracking:

| Indicator | Calculation |
| --- | --- |
| Projects at risk | Projects whose user-maintained status is `at_risk` |
| Overdue actions | Open actions with a valid, confirmed date before today in the browser's local timezone |
| Pending decisions | Open decision records |
| High risks | Open risk records with confirmed `high` severity |

Closed records, missing/invalid deadlines, unknown/deleting parent projects and unregistered AI proposals do not inflate these counts. No completion percentage, invented deadline or model-confidence chart is used. A due date of today is not overdue. The date refreshes every minute while the dashboard is open.

## Deployment

The production update was deployed in this order: additive backend contract, Firestore rules/indexes, then frontend. The frontend reads `sources` and `records`; deploying it before their rules would deny cloud workspace loading. No Storage bucket, extraction API, new secret or paid service was added. Existing records remain compatible and were not migrated or overwritten.
