# Project review and committee preparation

**Published on 28 October 2026.** Frontend, backend, Firestore rules and all 15 indexes are deployed. [Checks and remaining limits](VALIDATION.md#committee-review-workflow--28-october-2026).

Check whether a project's reported status is supported by recorded facts before the committee. This is a review workflow, not a forecasting system or a certified audit.

## Use the workflow

1. Update the project's information, selected source excerpts and tracking records. In **Tracking**, maintain milestone forecasts, comparable costs and decisions. A decision can explicitly link to a milestone; free text never creates a confirmed dependency.
2. Open **Overview → Committee review / Resumen → Revisión para comité** and choose the cutoff. Current records updated after that date produce a clarification, not a reconstruction of historical facts.
3. Inspect the findings and their evidence. Confirm, dismiss or leave pending with a rationale. Review a proposed action through the existing tracking form; no action is created automatically.
4. **Save review** creates an identified snapshot. Select another saved review to compare dates, amounts, statuses and commitments. The same save is idempotent; a stale writer receives a conflict.
5. Select committee issues and download the Markdown agenda, or save the report in the existing documents area. The output uses the selected saved review, baseline and selection; later project edits do not rewrite it.

English and Spanish use the same rule/reference identities. Saved review prose stays in the language in which it was captured. Changing the interface language does not translate or mutate historical evidence.

## Try the three-review case

In the browser Starter Workspace, open **New project → Starter Projects → Committee case · 3 fictional reviews**. The same optional case is available with the starter controls on the dashboard. It adds a separate project once and never overwrites an existing case or imports fictional records into a Firebase account.

Compare **1 March**, **8 March** and **15 March 2026**:

- Milestone forecast: 10 → 12 → 14 March, with a retained 10 March baseline.
- Cost forecast: €1,000 → €1,200 → €1,300 against €1,000 approved for the same migration scope/period. Final variance: **€300**.
- A checklist commitment is overdue on the second review and declared closed without completion evidence on the third.
- Sponsor approval is explicitly linked to the outstanding delivery.

Choose **Current information**, set 15 March and dismiss a finding with a rationale. Edit its relevant evidence and return to the review: the previous rationale remains in history and the new evidence needs review. Selecting the old saved review still exports its original amounts and dates. Future/current cutoffs on this dated case can correctly add stale-information findings.

The fixture is generated with the deterministic backend rules by `backend/.venv/bin/python scripts/build-committee-case.py`. It is labelled fictional throughout; it is not the user's past activity.

## Evidence and calculations

The shared bounded context includes project fields, selected excerpts, tracking records, controls, two earlier distinct cutoffs, a cutoff and coverage. It is used by diagnosis, documents, Copilot and scenarios. Control, record, source and cutoff changes invalidate live analysis. Generator outputs are cleared on changed project context; saved documents remain immutable.

Deterministic checks cover overdue milestones, forecast/baseline variance, two consecutive forecast slips, comparable cost overruns, overdue or reopened commitments, pending decisions linked to deliveries within 14 days (including overdue deliveries), declared closures without evidence, completed projects with open items and no recorded update within 30 days. Possible dependency-date inconsistencies retain both statements and ask about scope and currency. No automatic budget-approved/pending-cost contradiction is raised. A high risk alone does not prove delay.

`active` remains a lifecycle state, not a green/on-time claim. Existing qualitative diagnosis health stays separate. Findings distinguish recorded deviation, possible contradiction, insufficient information and a hypothesis needing validation. Ordering uses deadline, deviation, confirmed dependency, record age and stable rule identity, not a hidden risk score.

A cost comparison requires an explicit scope on the same EUR control. Unknown amounts remain `null`; zero is valid. This version does not aggregate unrelated cost lines or infer their periods. Source capture dates are not proof that a statement is still current. Declared completion with supplied evidence is not independent verification of that evidence.

## Storage and compatibility

- `reviews/{projectId}` remains the compatibility head. `reviewHistory/{projectId}--{contextKey}` stores immutable snapshots containing supplied context, local reference mapping, findings and matching resolution metadata.
- On the next explicit save, an old single reference is copied to history with its real timestamps and limited original payload. No missing weeks or controls are invented. Legacy references remain selectable before migration.
- Records gain optional `ownerRole`, `closureCriteria`, `completionEvidence`, `revision` and `versionId`. The next save of a legacy record starts versioning at revision 1. Existing values and older clients' unversioned records remain readable. Reopening clears the current completion evidence; the old closure remains in its version.
- `recordVersions` and `findingVersions` are append-only during the active project lifecycle. `findingStates` is an optimistic-concurrency head. A finding's rule/version and pseudonymous entity reference identify it; a relevant evidence fingerprint determines whether a previous resolution still applies.
- A linked governance `decision` is authoritative for status, required decision role and deadline; its explicitly linked legacy decision is excluded from tracking lists and metrics. Unlinked legacy decisions remain valid. Archived governance decisions do not resurrect the old legacy decision. Unrelated records are never merged by title.
- Versions/history can only be deleted in Firestore once the project is marked for deletion or the parent is absent. Project/account deletion includes the new collections and remains retryable. Explicit account export includes all histories; ordinary workspace refresh does not load all account versions.

The production dependency audits pass with Next.js 16.4.3; see [validation](VALIDATION.md). Deploy `firebase/firestore.rules` and `firebase/firestore.indexes.json` first and wait for indexes to be ready, then deploy the backend and frontend together. No private credentials or environment variables are added. The new cloud workflow requires these rules; do not publish only the frontend against the previous rules. Existing archived release instructions describe their own versions.

## Coverage and limits

The live context selects stable IDs with at most **50 records, 20 active controls, 20 excerpts (20,000 excerpt characters), two prior cutoffs and 100 KB of selected context**. Whole entries are excluded when necessary, with actual/total counts and a partial-analysis indication. Oversized source/project-only context or an entire request above 240 KB is rejected explicitly. Excluded entries are not treated as resolved. Reviewing projects larger than this scope requires checking the coverage and tracking data; this version has no bulk batching of AI context.

Historical views page 100 project entries at a time. Live analysis reads the latest 100 saved reviews to choose two earlier distinct cutoffs. If that page is full, coverage explicitly reports a lower-bound history count and partial context; this version does not search unbounded history for a backdated cutoff. Review history and control/commitment versions have load-more controls.

The essential diagnosis and report do not call an external language model. Diagnosis still requires the FastAPI service; “Offline PMO Engine” is not a promise of an entirely disconnected app. External requests retain project consent and send pseudonymous references, not account IDs or Firestore path IDs. The reverse mapping stays in owner-scoped/browser storage. User-entered free text can still contain personal data; pseudonymous identifiers do not anonymise project content.

Historical absence is described as removed/outside context, never as proven completion. The snapshot comparison cannot distinguish an intentional deletion from every possible upstream omission. Record deletion retains earlier versions but does not create a separate certified deletion event. Snapshot timestamps are client supplied; owners can delete their projects/account. These are product traceability records, not tamper-proof legal audit evidence.

## Verification

See [current validation](VALIDATION.md) for commands and results, including emulators versus production. New checks cover the fictional case, scope/zero/missing values, language-stable identities, context limits, evidence changes, idempotent saves, concurrent edits, ownership, immutable histories, migration and deletion. No new live Firebase or external-provider verification is claimed for this iteration.

## Implementation map

| Area | Main files |
| --- | --- |
| Validated shared context | `backend/app/models/review.py`, `models/generation.py`; `frontend/src/lib/review-context.ts`, `project-context.ts`, `api.ts`; analysis hook and generator |
| Findings and diagnosis | `backend/app/services/review_findings.py`, `inference.py`, `diagnosis.py`; provider context/output assembly |
| Review and report | `frontend/src/components/project-review.tsx`, `lib/project-review.ts`, shared types, ES/EN dictionaries and workspace styles |
| Commitments and canonical decisions | `project-tracking.tsx`, `project-controls.tsx`, `lib/project-controls.ts`, `pmo-metrics.ts`, dashboard and project cards |
| Persistence and isolation | `frontend/src/lib/repository.ts`, workspace provider and account export; `firebase/firestore.rules`, `firestore.indexes.json` |
| Fictional case | `frontend/src/lib/committee-case.json`, starter controls in `demo-guide.tsx`, `scripts/build-committee-case.py` |
| Regression coverage | `backend/tests/test_review.py`, `test_context.py`; `e2e/review.spec.ts`, `context.spec.ts`, `metrics.spec.ts`, `firebase.spec.ts`; `firebase/tests/rules.test.mjs` |

README, documentation index, data schema, security notes, context guide, roadmap and validation were updated. Next.js and its ESLint configuration are patched to 16.4.3, with compatible lockfile security updates. No credentials, provider keys or new environment variables are added.
