# Product roadmap

This roadmap separates implemented behavior from planned capabilities. Priorities should follow feedback from project managers; no release dates, integrations or productivity improvements are promised.

Local fixes awaiting review (9 October 2026): readable automatic titles, conservative insufficient-context diagnosis, duplicate checks in manual tracking and unsaved-note navigation guards. These changes are tested but not deployed; see the [eight-scenario audit and validation limits](error-state-audit.md).

## Phase 1 — MVP

**Status: implemented and publicly deployed on Vercel with Firebase.**

- [x] Compass editorial visual system: an asymmetric cover, task navigation, portfolio control desk, project dossiers, document assembly desk and archive. Optional explanations and the fictional case have their own destinations.
- [x] ES/EN workspace with light, dark and system appearance.
- [x] Project CRUD, saved notes, dashboard metrics and document history.
- [x] Eight PMO formats, formatted preview, explicit save, clipboard and Markdown export.
- [x] Optional Starter Projects with Technology, Construction, Event and Logistics examples, plus Healthcare and Financial services.
- [x] Reproducible bilingual fixtures and additive loading that preserves existing work.
- [x] Optional Firebase Auth and private Firestore data protected by rules.
- [x] Provider abstraction, Offline PMO Engine, optional Ollama and automatic fallback.
- [x] Gemini, Groq and OpenRouter adapters with free-only controls and bounded transport.
- [x] API, browser, accessibility and Firebase-emulator verification; CI configuration.
- [x] English technical documentation, screenshots and recording script.

**Acceptance:** a visitor can try fictional projects without an account or paid AI API, create a project, generate/review/save a document and reopen it. Emulator and real Firebase checks demonstrate account isolation. The public Vercel deployment and live Gemini generation are verified; real Ollama inference remains unverified.

- Public two-minute case: pre-generated offline evidence and optional real generation with fictional input, without creating or switching accounts.
- Personal contribution page links engineering decisions to source code and CI evidence.

## Phase 2 — Smarter PMO AI

**Status: partly implemented.**

Implemented: bilingual minimal-context inference, AI Project Intelligence, evidence-labelled Project Diagnosis, conservative contradiction detection, a clearly non-predictive What-if simulator, initial PMO Copilot, reviewed source excerpts with citations and private-mode controls, and confirmed action/decision/risk tracking with actionable dashboard filters. See [context and tracking](project-context.md) for limits. Further quality and lifecycle work follows.

The following UX improvements were deployed on 7 October 2026. Regression suites passed locally and in Firebase emulators. On 8 October the owner confirmed public case generation and signed-in review saving with persistence after reload in a normal browser. App Check rejected automated browsers; extended live review checks remain pending. [Rollout evidence](ux-priorities.md#rollout-status--8-october-2026).

- Deployed UX: project entry brief with assessment, up to three review items, one reviewable next action, and expandable reference data. Analysis is shared across tabs, refreshes on saved context changes, and preserves an explicitly stale result on refresh failure. It is held only in page memory, not historical storage.
- Deployed UX: portfolio attention list with explicit review order, exact-record navigation and a distinction between missing tracking and zero matching items. Open actions without valid dates and unassessed risks remain visible as data gaps.
- Deployed UX: task navigation separates diagnosis, risks/actions, scenarios and questions. Risk questions are prefilled for review, never sent automatically. Drafts/results survive section switches within the page; saved context and language changes cancel pending requests and remove obsolete responses. Keyboard navigation and direct task links are supported.
- Deployed UX: proposals in the brief, diagnosis and risk/action views share a review step. Matching records link to their exact tracking entry, including closed entries. The review form blocks same-type, same-project subject duplicates in loaded records, without inferring deadlines or severity. This does not provide semantic matching or concurrent-write uniqueness.
- Deployed UX: compare two saved document deliveries of the same owner, project, format and language. Added/removed text is visible, unchanged text is expandable, provider/date provenance is retained, and long documents use bounded, lossless block comparison. The comparison is read-only and does not call external AI.
- Deployed UX: a single explicitly saved project-review baseline, owner-scoped and included in export/deletion. Compares record status/fields and same-language risk wording; removed risks are not treated as resolved. Replacement requires confirmation and rejects an outdated baseline revision. This is not a full history or approval workflow.
- Deployed UX: three primary mobile project destinations with additional tools in a selector, compact headings, natural counts, optional Starter Projects inside New Project, evidence-linked follow-up for contradictions, and reduced-motion support. See [all 11 audit priorities](ux-priorities.md).
- Planned next: a full proposal inbox with persistent review decisions. Comparison sessions, document version lineage and approval history remain planned.
- Build a bilingual evaluation set across formats and sectors; track factual support, completeness, action specificity, language and latency.
- Add document-specific inputs: reporting period, meeting date and approved scope baseline.
- Improve ambiguous, negated and mixed-language source handling; preserve explicit evidence.
- Implemented: explicit open/closed risk, action and decision records. Planned: mitigated risk states and versioned review history.
- Implemented and deployed: text comparison between saved document snapshots. Planned: explicit document version lineage and review/approval states.
- Improve draft recovery, autosave feedback and concurrent-edit detection.
- Add optional streaming, model readiness checks and cancellation that reaches the inference process.
- Implemented: external adapters, server-only secrets, mocked tests and process-local usage budgets; live Gemini and Firebase account verification completed.

**Acceptance:** evaluated quality improves on a fixed test set; users can distinguish sourced claims from suggestions, track a risk across reports and recover a draft without silent overwrites or provider changes.

## Phase 3 — Integrations

**Status: planned.**

- Add optional, authorised imports from project-management tools such as Jira, Trello or Asana.
- Explore document export to PDF/DOCX and workspace integrations such as Notion.
- Preserve source references and preview imported changes before applying them.
- Add email verification and password recovery with tested expiry/failure states.
- Add teams, invitations, revocable roles and shared templates with tested tenancy rules.
- Introduce indexed pagination, durable generation/deletion jobs, retries and shared rate limits.
- Add operational metrics, request IDs and audit events without logging private project content.
- Extend Firefox/WebKit, keyboard and assistive-technology coverage.

**Acceptance:** integrations can be connected and revoked, imported data remains attributable, repeat operations do not duplicate work, and team/tenant access boundaries are demonstrated by tests. No connector may send communications or make external changes without a deliberate user action.

## Phase 4 — Advanced AI

**Status: planned.**

- Implemented: bounded user-selected document excerpts with source references and access checks. Planned: search/retrieval across larger authorised document collections.
- Cross-project synthesis of dependencies and recurring risk patterns.
- Grounded document Q&A with explicit uncertainty when evidence is missing.
- Evaluation of prompt injection, leakage across users/projects and stale evidence.
- Reviewable proposals for project actions and updates, with human approval before mutation.
- Model comparison and routing using measured quality, latency and user-controlled usage budgets.

**Acceptance:** every retrieved source is authorised, material claims have usable citations, cross-tenant tests show no leakage, and proposed actions remain reviewable. Quality and operating cost must be measured before enabling a broader rollout.

## Delivery priorities

Keep the Offline PMO Engine available in every phase. Ship small changes with contract tests and migration plans when needed. Treat cloud scale, collaboration and autonomous actions as new product/security boundaries rather than assuming the personal-workspace design already solves them.

[Architecture](architecture.md) · [AI strategy](ai-strategy.md) · [Validation](VALIDATION.md)
