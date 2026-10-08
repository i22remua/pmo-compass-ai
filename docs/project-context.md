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

The UX update deployed on 7 October 2026 adds the same review flow to diagnosis actions and the project brief. **View record / Ver registro** opens and focuses an already registered item. Closed items stay closed until the user explicitly reopens them. Proposal review blocks a duplicate subject of the same type within the same project's loaded records, ignoring case and repeated whitespace. Different wording, translations and concurrent sessions are not deduplicated; there is no semantic matcher or server-side uniqueness constraint. Cancelling a review saves nothing, and dates/severity start blank or unassessed. This proposal-registration change uses the existing tracking collection. The separate review-baseline feature below adds a collection.

The four dashboard buttons filter the corresponding records and link back to project tracking:

| Indicator | Calculation |
| --- | --- |
| Projects at risk | Projects whose user-maintained status is `at_risk` |
| Overdue actions | Open actions with a valid, confirmed date before today in the browser's local timezone |
| Pending decisions | Open decision records |
| High risks | Open risk records with confirmed `high` severity |

Closed records, missing/invalid deadlines, unknown/deleting parent projects and unregistered AI proposals do not inflate these counts. No completion percentage, invented deadline or model-confidence chart is used. A due date of today is not overdue. The date refreshes every minute while the dashboard is open.

## Diagnosis, contradictions and scenarios

Project → **AI Project Intelligence** combines the project record, reviewed excerpts and up to 50 confirmed tracking records. The analysis remains read-only: it does not change project status, close records or approve a decision.

**AI Project Diagnosis** groups its result into current situation, alerts requiring attention today, possible causes, potential impact, recommended actions and missing data. Every conclusion carries one of three labels: **Provided data**, **AI inference** or **Insufficient information**. Available supporting evidence can be expanded beside the conclusion.

The **Contradiction Detector** applies conservative, explainable checks to supported statements. Current checks include a dependency dated after the project target, approved/closed budget language alongside pending costs, an on-track statement alongside overdue actions or a confirmed high risk, conflicting project status statements, and completed projects with open tracking records. Each result shows **Evidence A** and **Evidence B** before explaining the conflict or suggesting a review. No result means that no supported contradiction matched these checks; it does not certify that the project is consistent.

The **AI Scenario Simulator** accepts a free-text hypothesis. External AI, when authorised and available, uses the same bounded provider router; otherwise the Offline PMO Engine covers common schedule, supplier and scope scenarios. The result is explicitly labelled **Scenario · not a prediction** and separates plausible consequences, affected areas, secondary risks, decisions and information needed for a more reliable assessment. It does not assign probabilities or mutate the project. Copying a scenario copies the generated result only; scenario chat history is not stored.

Tracking context sent to the API excludes owner IDs and timestamps. It is limited to 50 records and only includes the record ID, kind, title, open/closed status, relevant date or severity, and user-maintained evidence. In private mode it remains inside the PMO Compass backend and uses the Offline PMO Engine. When external AI is authorised for the project, scenario requests may send this bounded context to the configured provider.

## Saved document comparison

Open a saved document and choose **Compare deliveries / Comparar entregas**. Only earlier snapshots (including equal timestamps) belonging to the same owner, project, format and language are offered. Dates and actual providers identify the two documents. Different-language documents are not automatically translated. The comparison highlights stored text additions/removals; unchanged lines are collapsed. CRLF/CR line endings are normalised to LF; other text, including whitespace, is preserved. Large comparisons fall back to whole changed blocks instead of an unbounded alignment matrix.

Comparison runs in the browser on documents already loaded by the owner-scoped workspace. No external AI request or write is made. It is not a semantic project diagnosis, approval workflow or document lineage. If a selected baseline disappears after a workspace refresh, its comparison is removed and the user must choose another. No comparison session or derived changes are persisted.

## Deployment

The production update was deployed in this order: additive backend contract, Firestore rules/indexes, then frontend. The frontend reads `sources` and `records`; deploying it before their rules would deny cloud workspace loading. No Storage bucket, extraction API, new secret or paid service was added. Existing records remain compatible and were not migrated or overwritten.

## Project review baseline

Project → Summary → **Since the last review / Desde la última revisión** compares the current project with an explicitly saved baseline. Only one baseline is retained per project. Saving does not approve AI conclusions or close records; replacing an existing baseline requires confirmation. Records compare by ID: added, closed, reopened, changed or removed, plus decisions still pending. Risk wording compares only within the same language and retains provided/inferred attribution. A missing risk is never claimed to be resolved. Wording changes can appear as removal plus addition, not a semantic change assessment.

The baseline contains status, bounded risk titles and tracking fields (up to 200 records and 50 risks, JSON up to 180,000 characters), language, internal engine provenance, timestamps and a SHA-256 fingerprint of the saved context. Raw source files, full excerpts and full diagnosis responses are not copied. Risk/record titles can contain private content and receive the same owner protection as the project. Browser workspaces keep it in localStorage; cloud workspaces store it in `reviews/{projectId}` with immutable ownership and parent checks. It is included in export and retryable project/account deletion. A cloud transaction rejects a stale baseline update; local storage checks the loaded revision but is not a cross-tab transaction.

Deploy the additive `firebase/firestore.rules` and `firebase/firestore.indexes.json` before deploying this frontend. The new owner-scoped reviews query is part of workspace loading; old rules deny it. There is no silent cloud-to-browser fallback or omission from data exports. Existing projects require no backfill. The frontend was promoted on 7 October after the owner confirmed publishing the Firebase update. Review persistence, ownership and deletion tests passed in emulators. On 8 October the owner confirmed signed-in review saving and persistence after reload, as well as public case generation in their normal browser. App Check rejected the automated browser; extended live checks for review replacement, comparison, export and deletion remain pending. [Rollout evidence and manual checks](ux-priorities.md#rollout-status--8-october-2026).
