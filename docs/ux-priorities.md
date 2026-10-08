# UX priority delivery

Scope: the original 11-row P1/P2/P3 design audit, recovered from the PMO Compass conversation. This is not a commitment to every future integration in the product roadmap. All 11 changes are implemented and the frontend was promoted to the public app on 7 October 2026. The owner confirmed signed-in review saving and persistence after reload on 8 October; extended live checks remain pending. See the rollout status below.

| Priority | Original change | Implementation / acceptance |
| --- | --- | --- |
| P1 | Diagnosis and priorities on entry | Project brief, three review items, next action and expandable evidence. |
| P1 | Distinguish absent tracking from no problems | Dashboard coverage labels; unknown dates and unassessed risks remain explicit. |
| P1 | Ordered attention queue | Confirmed overdue actions, high risks, pending decisions, flagged projects; criteria visible. |
| P1 | Connect alerts, evidence and action | Review actions from diagnosis alerts and recommendations, two-sided contradiction evidence with reviewable follow-up. |
| P1 | Analysis freshness | Shared analysis, update timestamp, retained stale result with disabled registration until refreshed. |
| P1 | Simpler mobile navigation | Summary, tracking and context; additional tools in a labelled selector. Desktop retains keyboard tabs. |
| P1 | Compact headers and legibility | Interior title scale, operational labels and responsive spacing; five-second comprehension still needs real-user testing. |
| P2 | Review/register proposals in context | Explicit confirmation, no inferred dates/severity; existing/closed records link to their tracking entry. |
| P2 | Consistent names and less decoration | Bilingual task labels, natural counts, no decorative navigation codes, optional starter access. |
| P2 | Compare with previous review | Explicitly saved project review, recorded changes and same-language analysis-risk changes; absent risks never imply resolution. |
| P3 | Transitions and feedback | Short functional transitions, reduced-motion support, initial reserved brief area, focused record navigation and confirmation messages. |

All 11 implementation items are deployed. Automated regression results from 2 October 2026 are below. The owner reported publishing the additive `reviews` Firestore rules/indexes before promotion; this is a manual confirmation, not independent verification of the live configuration. The owner authorised publishing this iteration to GitHub on 8 October.

Additional roadmap ideas (persistent proposal dismissal inbox, full version lineage, integrations and multi-user approvals) remain separately planned. A saved review is a comparison baseline, not approval of model conclusions.

## Integrated verification — 2 October 2026

| Check | Result |
| --- | --- |
| `npm run check` | PASS: lint, TypeScript, 213 backend tests and production build |
| Final `npm run build`, `npm run lint`, `npm run typecheck` | PASS after the final navigation/layout correction |
| `npm run test:e2e` | 38 passed: browser workflows and frontend comparison/metric logic |
| Final layout/keyboard subset | 4 passed after the landing grid and mobile selector correction |
| `npm run test:rules` | 22 passed in Firestore emulator, including review ownership, parent checks, bounds, immutable fields and retryable deletion |
| `npm run test:firebase` | 4 passed in Auth/Firestore emulators, including review persistence, account isolation and cascade cleanup |
| `npm run test:providers` | 2 passed: bilingual unavailable-provider fallback and saved provenance |
| `npm run test:a11y` | 36 route/theme scans, zero axe violations; new comparison/review tests also exercise mobile and both themes |
| `npm run format:check`, `npm run check:release`, `npm run security:secrets` | PASS |
| `npm run test:release` | 4 passed |

Review regression coverage includes explicit saving, baseline replacement/cancellation, stale-reference rejection, closed versus removed records, pending decisions, language boundaries, malformed/oversized payloads, export and project deletion. Visual inspection found and corrected the empty landing-grid column left by removing decorative numbering. No dependencies, credentials or API keys were added.

This run used the local development server and a successful production build. Cloud verification used emulators, not live Firebase. The shell runtime was Node 20.19.5; deployment/CI still requires Node 22.13+. Two existing Python deprecation warnings remain. No GitHub push, Vercel deployment or production rules update was made. Five-second comprehension is a usability objective, not a measured claim; validate it with a project manager.

## Try the changes

1. Open [the public workspace](https://pmo-compass-ai.vercel.app/start) and create a project, or add optional examples through New Project. These steps also work locally.
2. Open a project: read its brief, expand evidence and review a proposed action before saving it.
3. Register a confirmed overdue action, high risk or pending decision. Open the dashboard and follow its attention item back to the exact record.
4. In Summary, expand **Since the last review** and save a baseline. Close a record or change its fields; return to Summary to compare. Updating the baseline requires confirmation.
5. In saved documents, compare two deliveries of the same project, format and language.
6. At mobile width, use Summary, Tracking, Context and More. Switch ES/EN and light/dark themes.

For cloud rollout, deploy additive Firestore rules/indexes first, then the frontend, then verify owner-scoped review loading, saving, export and project/account deletion in production. Do not deploy the frontend against the old rules.

## Rollout status — 8 October 2026

- Release checks passed; the Vercel upload manifest contained no environment files, service-account files, private keys or dependency directories.
- Vercel built the production candidate with Node 22. After the owner confirmed “firebase actualizado”, deployment `dpl_F5A4zph3zWKM5MGoko3NS8JwwfGy` was promoted on 7 October. It is **Ready** at `https://pmo-compass-hnwin1g7g-alvaroredondo.vercel.app`.
- Vercel inspection on 8 October confirms that [the public app](https://pmo-compass-ai.vercel.app) resolves to this deployment. The backend was not changed and its HTTPS health endpoint returns `200`, status `ok`, provider `auto`, auth mode `firebase`.
- The owner confirmed that **Generate now with AI** on `/case-study` generates successfully in their normal browser. This validates that manual public flow; it does not establish the provider used or cloud-review persistence.
- Automated public smoke checks on 7 and 8 October **failed at Firebase App Check attestation**, including a visible Chrome attempt. The live cloud feature suite could not proceed. App Check enforcement remains enabled; no debug bypass was used. Later on 8 October the owner authorised a bounded public fallback. That backend change restored automated public generation and smoke checks; private/cloud automation remains blocked. [Current evidence](VALIDATION.md#public-review-access--8-october-2026).
- **Manual live check confirmed by the owner on 8 October:** sign in, open a project → Summary → Since the last review → Save review; reload and confirm **Update reference** appears. This is owner-reported verification, not an automated result.
- **Extended live checks still pending:** change a tracking record and compare against the baseline; cancel a replacement and verify the original remains; export and delete a disposable test project. Account isolation and cascade deletion for reviews passed in emulators, not in production.
- The temporary live-test Auth account was deleted. No project, document, record or review was created by that failed attempt; possible profile cleanup could not be independently verified. Temporary recovery credentials were removed.
- The Vercel CLI created a temporary protected-deployment automation token during diagnosis. That exact token was revoked on 8 October; the project has no remaining protection-bypass entries. Firebase App Check was not bypassed.
- The initial frontend promotion did not include a GitHub push; the owner authorised GitHub publication on 8 October. Previous frontend deployment for rollback: `dpl_GWkrmF9VfeAQovkLAEYwNb8hvQuT` (`https://pmo-compass-mqgwqyokx-alvaroredondo.vercel.app`).

Deployed frontend source fingerprint (SHA-256, sorted files from `frontend/src`, frontend package/config and root package/lockfile): `1aedef1755ed3e65869ef08fc909238cc37c5409b7c2e3b738340b5c6e6a6f67`. Documentation-only rollout notes do not change this fingerprint.

## Manual Firebase console alternative

Signing in to Firebase Console does not authenticate the local CLI. Rules and index changes can be published entirely through the console. The owner reported completing this procedure before promotion; it is retained here for reproducibility.

1. Open Firebase project `pmo-compass-ai-2026`, Firestore Database, database `(default)`.
2. In **Rules**, replace the editor with the complete current contents of [firestore.rules](../firebase/firestore.rules), then **Publish**. Do not paste only the reviews block.
3. In **Indexes → Composite**, create the new `reviews` index if it does not already exist: `ownerId` ascending, then `projectId` ascending, query scope **Collection**. Wait until enabled. Existing `documents`, `sources` and `records` indexes remain unchanged.
4. In **Indexes → Single field → Add exemption**, select collection ID `reviews`, field path `payload`, scope **Collection**, and disable all indexing modes for that field. Save. This matches the `reviews.payload` field override in [firestore.indexes.json](../firebase/firestore.indexes.json).
5. Keep App Check enforcement and the other existing configuration unchanged. A reviews collection or sample document does not need to be created manually.
6. Confirm that the rules are published, the composite index is enabled and the payload exemption is saved. For future rollouts, complete this before promoting a frontend that depends on the new collection.

References: [publish rules from Firebase Console](https://firebase.google.com/docs/rules/manage-deploy#use_the_firebase_console), [manage Firestore indexes](https://firebase.google.com/docs/firestore/query-data/indexing).
