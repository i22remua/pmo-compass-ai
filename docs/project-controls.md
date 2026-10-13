# PMO governance, delivery and benefits

Deployed on 12 October 2026; public verification completed on 13 October 2026. The additive Firestore rules and indexes were published first, then the frontend. This page records the feature scope and distinguishes public browser checks from authenticated cloud persistence.

## Where to find it

Open a project → **Tracking / Seguimiento**. Four compact destinations retain the original actions, risks and decisions, then add **Changes and decisions**, **Milestones and costs**, and **Benefits**. Details, evidence and version history expand on demand. The existing cream/terracotta palette, ES/EN, light/dark themes and four primary project sections are retained.

1. **Changes and decisions:** record the reason, alternatives, baseline and scope/time/cost impacts. Save a proposal, review it, then record acceptance or rejection with rationale, evidence, decision date and declared role. Each save creates a historical snapshot. An optional link opens an existing tracking record; governance entries do not duplicate dashboard counts automatically.
2. **Milestones:** preserve the original baseline date; enter a current forecast, actual completion and dependency separately. Variance is whole calendar days from baseline. Actual completion takes precedence over forecast; a positive value means later. Missing dates stay unknown. Correct a mistaken baseline by archiving the entry and creating a replacement with an explanation.
3. **Costs:** record approved budget, actual spending, forecast at completion and review date. Actual spending requires evidence, including when it is zero. Amounts use the application's EUR convention. Differences compare actual or forecast to the approved amount; unspent budget is not claimed as savings. Entries are snapshots, never summed as transactions. Edit the same entry to preserve successive reviews in its history.
4. **Benefits:** define objective, unit, baseline, target and whether improvement means increasing or decreasing. An observed value requires evidence and a measurement date. Only that measurement is compared with the target; a target alone never proves achievement. The observed change from baseline appears in details. Achievement at one measurement is not proof of lasting benefit or causation.

The public `/case-study` also offers an optional five-step continuation: signal, alternatives, decision, action and review. All narrative and dates are authored fictional data, clearly separate from live generation. Its five-day completion variance uses the same calculation as project milestones. No workspace data is created, replaced or transmitted by this walkthrough; the existing document selector and export remain available.

## Persistence and trust boundaries

- `controls` stores the latest record; `controlVersions` stores an immutable full snapshot per revision. The cloud transaction writes both atomically, uses Firestore timestamps and rejects stale revisions. Failed saves leave the draft available. Refresh and reconcile before retrying a conflict.
- Rules enforce authenticated ownership, active parent ownership, same-project tracking links, exact fields, bounded values, real calendar dates, required evidence and decision transitions. A head cannot be saved without its matching version. Existing history cannot be edited.
- The Starter Workspace stores both arrays in localStorage, with browser timestamps. Web Locks coordinate control writes across participating tabs when available. Browser storage is user-editable; this is not a tamper-proof audit log. Other local workspace operations do not share this lock, so it is not a general multi-tab database transaction.
- Declared decision roles and evidence are user-supplied, not verified identities, signatures or independent approvals. This remains a personal workspace, not a team authorisation system.
- Archive hides an entry without erasing history. Project/account deletion removes heads and versions through the existing retryable cleanup. Workspace JSON export includes both. Historical data is deleted with the project; no regulatory retention guarantee is made.
- These new fields are **not automatically included in AI requests**, diagnosis or dashboard calculations. Existing AI permissions and provider routing remain unchanged. Copying information into notes or generator input brings it under the existing request privacy controls.
- All owned heads and versions currently load with the workspace. Pagination and storage quotas are future scale work; growing histories increase reads and local export size.

## Rollout

1. Review the local change and run `npm run test:rules` and `npm run test:firebase` with Java 21 and Node 22.13+.
2. Publish `firebase/firestore.rules` and `firebase/firestore.indexes.json` to the intended Firebase project. CLI: `npx firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID`. Do not change ownership restrictions or disable App Check.
3. Wait for indexes to be ready, then deploy the frontend. The new owner queries will fail against the old deny-by-default rules, even for accounts without control entries. No backend or environment-variable change is required.
4. With a real account, create a cost review, reload, edit it, inspect two versions, try a stale edit from another tab and check export/deletion. Confirm isolation with a separate account. Emulator success is not live Firebase verification.
5. Keep the additive rules if rolling the frontend back; older frontend versions cannot manage the new records and their deletion code does not know the new collections. Avoid project/account deletion from an older deployment until forward-fixing or arranging owner-scoped cleanup.

## Validation

See the final local test results below. Browser suites use fictional data and isolated local servers; Firebase suites use emulators. Authenticated control persistence was tested in Firebase emulators; external AI was not called for this feature. Production deployment verification is recorded below.

Local results (12 October 2026):

- `npm run check`: ESLint, TypeScript, 229 API tests and production build passed. The API suite retains one existing library deprecation warning.
- Main Playwright suite: 68 passed. After final form refinements, all 8 control tests passed, including the additional draft/cross-tab test (69 distinct main-suite tests covered across the runs).
- `npm run test:firebase`: 5 passed with Auth/Firestore emulators, including real repository transactions, immutable version reload, stale-session rejection, cross-account isolation and deletion cleanup.
- `npm run test:rules`: 27 passed, covering ownership, atomic head/history pairing, immutable snapshots, revisions, evidence, dates, decision transitions, baseline retention and deletion. Rules were unchanged during the final UI refinements.
- `npm run test:providers`: 2 passed with an intentionally unavailable local provider and automatic offline fallback. No live model verification.
- `npm run check:release`, `npm run test:release` (4 tests), `npm run format:check`, `npm run security:secrets` and `git diff --check`: passed.
- Browser checks cover ES/EN, light/dark, 375/390/768/1024/1440px and axe WCAG A/AA checks. New control screenshots were visually reviewed at desktop/mobile widths; a dark mobile form was also checked. Existing dashboard, diagnosis, deep links, unsaved notes and all eight public case formats remain covered.

Build/browser checks ran against a source-matched temporary copy on the same machine to avoid Desktop filesystem stalls, using isolated ports and fictional data. No production accounts were changed. The standalone `npm run test:a11y` command was not run; targeted axe checks ran inside Playwright. Safari/Firefox, authenticated production control persistence and external AI were not verified by these local tests. The later deployment is recorded below; no commit or push was made.

## Production deployment and verification — 13 October 2026

Deployment completed on 12 October; verification finished on 13 October after resuming the task.

- Firebase project: `pmo-compass-ai-2026`. The CLI published the rules and indexes successfully. A read-back of the active Firestore rules matched the validated source exactly. Both new owner/project composite indexes (`controls`, `controlVersions`) reported `READY` before the frontend deployment. The four data/evidence index exemptions are present. App Check settings were not changed.
- Frontend: [public application](https://pmo-compass-ai.vercel.app), deployment `dpl_GXkXFv8t2KnD354x8TEFpq8e7xAC`, [Vercel deployment](https://vercel.com/alvaroredondo/pmo-compass-ai/GXkXFv8t2KnD354x8TEFpq8e7xAC). Vercel reports production `READY` and the public alias points to this deployment. The deployed frontend source matches the reviewed working tree; no environment or credential files were uploaded. The backend was unchanged.
- Public controls suite: 8 passed (5 live-browser scenarios and 3 pure calculation/validation tests). Browser scenarios exercised bilingual versioned records, milestone/cost/benefit forms, persistence in the Starter Workspace, export/deletion, responsive themes, fictional case traversal and conflicting edits across tabs.
- An initial case assertion failed because production reCAPTCHA wrote its own localStorage entry asynchronously. The test now compares all application-owned `pmo.*` entries, preserving its check that the walkthrough creates or changes no workspace data. No production security setting was relaxed.
- `npm run smoke:public` passed for landing/start/case/about, API documentation, social preview, health, CORS, offline inference, diagnosis, contradictions, scenarios and private-access denial. The private request was rejected by App Check; this is not an independent live authentication test.
- Limit: new control save/reload/version history with a real signed-in Firebase account remains a manual live check. The 5 authenticated integration tests and 27 rules tests ran against emulators, not production users. External AI and Safari/Firefox were not verified during this rollout.
- No commit or push was performed. Production was deployed from the prepared working-tree snapshot with the user's authorisation; GitHub still needs the corresponding reviewed commit.
