# Product roadmap

This roadmap separates implemented behavior from planned capabilities. Priorities should follow feedback from project managers; no release dates, integrations or productivity improvements are promised.

## Phase 1 — MVP

**Status: implemented as a local portfolio application.**

- [x] Responsive SaaS landing, illustrative source/report preview and portfolio section.
- [x] ES/EN workspace with light, dark and system appearance.
- [x] Project CRUD, saved notes, dashboard metrics and document history.
- [x] Eight PMO formats, formatted preview, explicit save, clipboard and Markdown export.
- [x] Visible demo with Technology, Construction, Event and Logistics examples, plus Healthcare and Financial services.
- [x] Reproducible bilingual fixtures and additive loading that preserves existing work.
- [x] Optional Firebase Auth and private Firestore data protected by rules.
- [x] Provider abstraction, deterministic demo, optional Ollama adapter and explicit fallback.
- [x] External-provider extension point without a paid transport implementation.
- [x] API, browser, accessibility and Firebase-emulator verification; CI configuration.
- [x] English technical documentation, screenshots and recording script.

**Acceptance:** a visitor can try fictional projects without an account or paid AI API, create a project, generate/review/save a document and reopen it. Emulator tests demonstrate account isolation. A live deployment and real Ollama inference require separate environment-specific validation.

## Phase 2 — Smarter PMO AI

**Status: planned.**

- Build a bilingual evaluation set across formats and sectors; track factual support, completeness, action specificity, language and latency.
- Add document-specific inputs: reporting period, meeting date and approved scope baseline.
- Improve ambiguous, negated and mixed-language source handling; preserve explicit evidence.
- Introduce risk IDs and a lifecycle: open, mitigated and closed, with deliberate status changes.
- Add document version history, comparison and review/approval states.
- Improve draft recovery, autosave feedback and concurrent-edit detection.
- Add optional streaming, model readiness checks and cancellation that reaches the inference process.
- Implement an external provider only as an explicit opt-in, with server-only secrets, mocked tests and usage budgets.

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

- Retrieval over authorised project documents with citations and access checks at query time.
- Cross-project synthesis of dependencies and recurring risk patterns.
- Grounded document Q&A with explicit uncertainty when evidence is missing.
- Evaluation of prompt injection, leakage across users/projects and stale evidence.
- Reviewable proposals for project actions and updates, with human approval before mutation.
- Model comparison and routing using measured quality, latency and user-controlled usage budgets.

**Acceptance:** every retrieved source is authorised, material claims have usable citations, cross-tenant tests show no leakage, and proposed actions remain reviewable. Quality and operating cost must be measured before enabling a broader rollout.

## Delivery priorities

Keep the default template demo available in every phase. Ship small changes with contract tests and migration plans when needed. Treat cloud scale, collaboration and autonomous actions as new product/security boundaries rather than assuming the personal-workspace design already solves them.

[Architecture](architecture.md) · [AI strategy](ai-strategy.md) · [Validation](VALIDATION.md)
