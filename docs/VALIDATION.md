# PMO Compass AI validation

Public release verified locally on **20–21 September 2026**, macOS, Node 20.19.5, Python 3.13.1, Java 21 and Chromium. Node 22 remains the recommended deployment/CI runtime. This table records local/live verification before the authorised GitHub release; remote Actions results belong to their exact revision. The working tree was deployed directly to two Vercel Hobby projects on 21 September 2026.

## Diagnosis, contradictions and scenarios — 28 September 2026

Implemented and deployed to the production frontend and backend. The release adds an evidence-labelled project diagnosis, conservative contradiction checks that retain both evidence sides, and a scenario simulator whose contract explicitly prohibits predictions and probability claims. The API accepts at most 50 stripped PMO tracking records; owner IDs and timestamps are not sent. Private projects continue to force the Offline PMO Engine.

| Check | Result |
| --- | --- |
| `npm run check` | PASS: lint, TypeScript, 200 API tests and optimised production build |
| `npm run test:e2e` | 18 passed; the new browser flow covers diagnosis classifications, three supported contradictions, both evidence sides, scenario request context, required sections, mobile fit and axe |
| `npm run test:providers` | 2 passed: bilingual fallback and saved provenance after a real unavailable-provider connection |
| `npm run test:a11y` | 26 route/theme scans with zero axe violations; the generated scenario's keyboard-scroll region is covered separately |
| `npm run test:rules` | 18 passed in the Firestore emulator |
| `npm run test:firebase` | 3 passed in Auth/Firestore emulators, including account isolation and persistence |
| `npm run check:release`, `npm run format:check`, `npm run test:release` | PASS: documentation, exclusions/secret patterns, formatting and 4 release-scanner regressions |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |
| Production Vercel builds | PASS: FastAPI on Python 3.12, then Next.js on Node 22; both production aliases updated |
| Extended `npm run smoke:public` | PASS: existing public checks plus offline diagnosis, three contradictions with evidence and non-predictive scenario contract |
| Public browser feature test | PASS: Spanish diagnosis labels, 3 evidence-first contradictions, scenario result, mobile viewport and axe scan on `pmo-compass-ai.vercel.app` |
| Authorised external scenario route | PASS: Gemini was attempted with fictional data; its result was rejected/unavailable and the documented fallback returned a contract-valid Offline PMO Engine scenario with `fallbackFrom=gemini` |

Backend unit coverage includes ES/EN evidence and classification labels, schedule/budget/status contradictions, false-positive resistance for an ordinary budget value, three scenario families in both languages, strict scenario prompts, required hypotheses and rejected/oversized tracking context. The browser test checks the actual payload mode and confirms that only the project's bounded PMO records are included. No Firestore schema, rule or index change was needed because diagnosis and scenarios are computed from the existing owned project/source/record data and do not persist new records.

## Context and actionable PMO update — 28 September 2026

Implemented, verified and deployed to the public Vercel/Firebase environment. Current local commands used Node 20.19.5, Python 3.13.1 and Chromium; installation/deployment requires Node 22.13+ because the patched PDF parser declares that engine range. Vercel built the frontend with Node 22 and the backend with Python 3.12. The browser parser and workers were exercised in both an optimised local production build and the public deployment.

| Check | Result |
| --- | --- |
| `npm run check` | PASS: lint, TypeScript, 185 API tests and production build |
| `npm run test:e2e` | 17 passed, including actual PDF/DOCX/TXT extraction, reviewed-only context, no extraction upload, source persistence, consent revocation, stale-generator privacy, tracking filters and mobile accessibility |
| Production build browser tests | 4 passed against local `next start`; PDF font/CMap resources and workers served by the app |
| `npm run test:rules` | 18 passed in Firestore emulator: new child ownership/parent invariants, immutable source snapshots, editable tracking lifecycle, cross-account denial and retryable deletion |
| `npm run test:firebase` | 3 passed in Auth/Firestore emulators, extended with source/tracking persistence, signed-in generation with excerpts and admin-verified cascade cleanup |
| `npm run test:providers` | 2 passed: bilingual fallback/provenance regression |
| `npm run test:a11y` | 26 scans with zero axe violations; separate new feature tests cover mobile source/tracking views |
| `npm run check:release`, `npm run test:release`, `npm run format:check` | PASS; 4 release scanner regression tests |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |
| Public feature browser tests | 4 passed: real PDF/DOCX/TXT extraction, invalid-file rejection, consent revocation and PMO dashboard filters on `pmo-compass-ai.vercel.app` |
| Public smoke | PASS: landing, workspace, API docs, social image, health, exact CORS, offline inference and private authentication |
| Live Firebase test | PASS with temporary accounts and fictional data: source/tracking persistence, private generation, dashboard counts, cross-account denial and cascade deletion |
| Authorised external-AI route | PASS for routing and retained source snapshot; Gemini rejected the generated result and the documented automatic fallback returned an offline document. This run does not claim a successful live Gemini response. |

New backend tests cover private-mode routing without network calls, bilingual source snapshots, valid/invalid evidence and citation references, bounded input, maximum source context and overlong external output falling back without dropping citations. Unit-level external providers were mocked. The separate public check verified live Firebase behavior and the authorised provider/fallback path with fictional data. Citations validate identifiers/quoted evidence, not every narrative inference.

Deployment completed in the required order: backend → Firestore rules/indexes → frontend. Temporary test projects, documents, sources, records, Auth accounts and profiles were removed after verification. [Workflow, privacy boundaries and limits](project-context.md).

## Earlier release checks

| Command/check | Result | Scope |
| --- | --- | --- |
| `npm run check` | PASS | ESLint, TypeScript, API tests and production build |
| `npm run build` (inside check) | PASS | Optimised Next.js build |
| `npm run lint` (inside check) | PASS | Frontend/configuration lint |
| `npm run format:check` | PASS | Prettier source/scripts/browser tests |
| `npm run test:api` | 168 passed | Provider routing, transport mocks, missing keys, free-only controls, 429/network/timeout/malformed output, quotas, bilingual formats, minimal ERP inference, previous-draft provenance, authentication including deleted-account rejection, secret-safe provider diagnostics, trusted Vercel client IP handling, bounded input and fixtures |
| `npm run test:e2e` | 9 passed | Empty start, optional/additive Starter Projects, description-only project creation, Intelligence/Copilot, CRUD, copy/export/save/reload, error feedback and mobile/theme flows |
| `npm run test:providers` | 2 passed | Automatic offline fallback after an actual connection failure to a closed local Ollama port; ES/EN saved provenance |
| `npm run test:rules` | 15 passed | Firestore emulator ownership, parent invariants, retryable deletion, accepted provider provenance and unknown-provider rejection |
| `npm run test:firebase` | 3 passed | Auth/Firestore emulators: registration/login, authenticated generation, persistence, account isolation and browser/cloud separation |
| `npm run test:a11y` | 18 scans, 0 violations | axe WCAG A/AA checks across nine routes and two themes, including the new intelligence tab |
| `npm run check:release` | PASS | Relative documentation links, safe defaults, publishable/indexed file patterns and environment exclusions |
| `npm run test:release` | 4 passed | Release scanner and documentation-link regressions |
| Hosted configuration build | PASS | Local production configuration check plus successful actual Vercel build using the public HTTPS API URL |
| Production browser smoke | PASS locally and on the public Vercel URL | Empty start, description-only ERP creation, inference/Copilot, copy/export/save/reload, optional starters, mobile, English and no localhost requests |
| `npm run smoke:public` | PASS against live HTTPS services | Landing/start, health, exact CORS, offline ERP inference and 401 for unauthenticated private generation |

## Live configuration verification

- Firebase Email/Password enabled, public domain authorised and frontend rebuilt with `NEXT_PUBLIC_DATA_MODE=firebase`.
- Backend Gemini key and account confirmation remain sensitive production variables. Firebase project billing was verified disabled.
- The configured Gemini 2.5 model returned HTTP 404. The default and deployed model now use `gemini-3.1-flash-lite`, which has a documented [free tier](https://ai.google.dev/gemini-api/docs/pricing).
- A real English Executive Brief returned HTTP 200, `provider=gemini`, no fallback and provenance sections in approximately 4.9 seconds. Public browser generation in Spanish, copy/export/save/reload and Copilot also passed. A separate signed-in browser test generated a Spanish Gemini risk register, saved/reloaded it and verified `provider=gemini` directly in Firestore before removing the temporary records.
- The live cloud test exposed a deleted-account exception being mapped to 503. It now returns 401/invalid_token, covered by a regression test and a successful live retest.
- Provider diagnostics log only fixed provider/error codes and HTTP status, never keys, tokens, prompts or upstream response bodies; transport tests assert redaction.

## Copilot response correction

Copilot now has a question-specific prompt and permits short answers instead of inheriting the Executive Brief template/minimum length. It no longer appends document provenance sections to the answer; analysis and warnings remain available in a closed disclosure. Full PMO documents retain their original provenance sections and minimum length. Offline risk answers explicitly state when impact ratings are unavailable rather than inventing an ordering.

Seven additional API tests cover bilingual ranking instructions, all three remote adapters preserving short answers, strict full-document validation and honest offline replies. Nine browser tests pass, including disclosure and copy behavior. A real Gemini API test returned three supplied risks in descending impact order, in 58 Spanish words and 54 English words, without report sections. The public browser verified a three-risk Gemini answer (63 words), a closed context disclosure and copying only the answer; two scoped axe scans (collapsed/expanded) found zero violations.

## Interface density review

Repeated introductory/marketing copy was removed from working screens. AI/data/technology explanations and format descriptions are available on `/about`, linked from the landing footer, Settings and generation privacy notices. Project description/details belong to the overview; assessment reasoning stays in expandable panels. Source data, document content and primary actions are preserved.

Measured visible words in the main content of the public Spanish interface at 1440 × 1000, using a clean browser and the same optional starter projects:

| Screen | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Landing | 596 | 310 | 48% |
| Empty dashboard | 241 | 149 | 38% |
| Dashboard with starters | 355 | 263 | 26% |
| Generator before generation | 189 | 157 | 17% |
| Project Intelligence | 298 | 203 | 32% |

These are whole-screen text counts with disclosures closed, not measurements of reading time or generated-document length. The overview sample was excluded because its measurement did not wait for client navigation to complete.

`npm run check`, format/release checks and all nine E2E tests passed after the layout changes. Four additional live axe scans (landing and About at desktop/mobile widths) reported zero WCAG A/AA violations; no horizontal overflow or nested links were found. English About navigation and expansion of document descriptions passed. Reports/screenshots remain in ignored `test-results/public/`.

## Findings corrected

The initial working tree failed lint because the Spanish product dictionary had been inserted into an import. Existing tests still required the old explicit fallback and automatic seeding. These were updated to assert the new behavior while retaining evidence, ownership, persistence and safety coverage. The browser suite caught a narrow-screen settings button overflow, now corrected. Starter fixtures were regenerated from the current OfflinePMOProvider and remain reproducible.

## Limits of this verification

- Remote error paths use mocked HTTP. Real Gemini generation was verified through the public API in English and the browser in Spanish; Groq, OpenRouter and successful Ollama generation remain unverified. This is functional verification, not a broad quality evaluation.
- In addition to emulator suites, real Firebase Email/Password registration, new-browser persistence, account isolation, project/document deletion, revoked sessions and deleted-account rejection passed on the public deployment. Only temporary test-created users and records were removed.
- Vercel built and deployed the frontend on Node 22 and FastAPI on Python 3.12. Docker and Render were not deployed.
- Public URLs are live: https://pmo-compass-ai.vercel.app and https://pmo-compass-ai-api.vercel.app. See the completed authentication and Gemini checks in [the public live checklist](public-live-checklist.md).
- Rate limits are per process and reset on restart. Vercel can create multiple instances; aggregate quota enforcement needs shared state. Gemini is configured on an unbilled project; upstream free-tier quotas apply independently of the process-local counters.
- Offline generation means no external model, but still needs the FastAPI API. It is not disconnected-browser generation.
- Automated accessibility checks are not a complete accessibility certification.
- Two existing Starlette/httpx test-transport deprecation warnings remain; tests pass. The subsequent release audit reported zero production dependency vulnerabilities (see handoff below).

## Security review

Provider secrets are server-only, excluded from frontend source and public variables. Environment examples contain blank keys. The release checker scans publishable source and indexed content, including credential patterns and accidentally tracked environments. No matching credentials were found. This is source/pattern review, not an exhaustive secret audit of Git history or a penetration test. No secret publication was performed; the owner subsequently authorised the reviewed GitHub release. A dedicated server credential was stored outside Git and as a sensitive Vercel backend variable. No real user project data was transferred.

## Reproduce

Run the commands above. The browser suites can start isolated services. Run rules and Firebase suites sequentially because they share emulator ports. `test:a11y` requires frontend/API listening locally on 3000/8000. All reports, logs, traces and private environments remain ignored.

## Authorised GitHub and publication handoff

The owner authorised commit/push and refreshed LinkedIn text/images after reviewing the public app. Before staging, `npm run check` (168 API tests plus lint/typecheck/build), `format:check`, `test:release` (4 tests), `check:release` and `git diff --check` passed. `npm audit --omit=dev --audit-level=high` reported zero vulnerabilities at this check. Earlier E2E, provider and emulator results above remain the evidence for unchanged application behavior. The publication-only change extends the screenshot script and updates documentation/media.

Thirteen screenshots were refreshed from the public URL with fictional data. The risk register and final Copilot image record `gemini`; mobile generation records the forced offline engine. The first Copilot capture encountered an upstream HTTP 503 and fell back correctly; one later retry succeeded. The capture manifest records this. The previous video was not refreshed and is explicitly historical.

Review [GitHub Actions](https://github.com/i22remua/pmo-compass-ai/actions) for remote CI results on the exact published commit. No credentials, private environments, temporary test reports or service-account files belong in that commit.

## Public presentation follow-up

The [published release CI](https://github.com/i22remua/pmo-compass-ai/actions/runs/35625330656) passed on commit `cfaeef5`. The follow-up makes the backend root redirect to `/docs`, adds a website-generated Open Graph card and social metadata, and updates GitHub/LinkedIn presentation. The public smoke script now also checks the API entry point and social image. LinkedIn copy and screenshots are prepared assets; posting from the owner’s LinkedIn account is a separate manual action.

Follow-up verification on 21 September 2026: `npm run check` passed (168 API tests, lint, TypeScript and build), along with `format:check`, `check:release`, `test:release` (4 tests) and `git diff --check`. The generated 1200 × 630 card was visually inspected. After deploying both services, `smoke:public` passed, including the backend-to-documentation redirect and PNG response. A request using the LinkedIn crawler user agent received the expected public Open Graph tags and a working image URL; the actual LinkedIn preview was not verified in an authenticated LinkedIn session. GitHub repository description, homepage and topics were updated.

## Minimal editorial interface

This redesign supersedes the earlier compact-layout screenshots and word-count comparison. The landing now contains one call to action and a document index; project lists replace cards, portfolio counts replace decorative charts, and the generator uses a native format selector. Extra context/history and secondary generation actions are available in closed disclosures. Login shows only the account form. Data, provenance, provider output and human-review notices remain available. A warm neutral palette and serif landing headline distinguish the interface without illustrations or gradients.

After the redesign, nine E2E tests and two provider tests passed. All 18 axe scans (nine routes in both themes) reported zero violations. These automated checks are not a full accessibility certification. Browser checks cover 320, 768, 1024 and 1440 pixel widths. The screenshot script and emulator tests use the updated labels and controls.

The three Firebase emulator browser tests also passed after simplifying the login/navigation. `npm run check` passed with 168 API tests, lint, TypeScript and production build; format and release checks passed. The frontend was deployed as `pmo-compass-12hr5f197-alvaroredondo.vercel.app`. No backend generation, authentication or storage logic was changed by the visual redesign.

Live follow-up: `smoke:public` passed after deployment. The Spanish landing main content contains 60 whitespace-separated words at mobile width, without horizontal overflow. All 13 publication screenshots were refreshed from the live site; both external generation captures recorded `gemini`, and mobile generation used the offline engine. The provider manifest identifies the current capture.

## Five-minute visitor walkthrough — 22 September 2026

The landing now offers a public fictional case before asking visitors to create a project. The first risk register is explicitly pre-generated by the Offline PMO Engine; only pressing Generate sends the fictional project to the existing public API. Fresh results identify their actual provider. The page supports all eight formats, source review, copy/export and separate links to the author's contribution and source/CI evidence. It creates no account and writes no projects/documents.

Consistency fixes: one provider label across results/history/Copilot, unsaved versus saved browser notices, preserved budget decimals and locale-aware note counters. New-project details are optional disclosures; empty-screen duplicate actions and a redundant mitigation count were removed.

Validation: 168 backend tests plus lint/typecheck/build passed; all 11 E2E tests, 2 provider tests, 3 Firebase emulator tests and 4 release-tool tests passed. The public-case tests cover ES/EN generation, explicit provenance, export, network-error recovery and unchanged browser storage. The Firebase suite verifies that public-case generation does not switch a signed-in cloud session or create projects. Responsive checks cover 320, 768, 1024 and 1440 pixels in both themes; all 22 axe scans across 11 routes passed. This is automated coverage, not an accessibility certification.

The frontend was deployed to `pmo-compass-6imtraied-alvaroredondo.vercel.app`; the stable public URL passed the smoke checks, including `/case-study` and `/about`. Publication screenshots now include the source-to-result case and contribution page. Backend generation/authentication and Firestore rules were not changed in this iteration.

A live mobile walkthrough returned `Generated now · Gemini` with four risks, unchanged browser storage and no horizontal overflow. The initial example remains explicitly labelled as pre-generated offline output. The source summary stays visible; the full fictional notes and project fields are available in the context disclosure to keep the mobile result within easier reach.


## Compass navigation redesign — closed 28 September 2026

The cover no longer repeats the fictional case. Its CTA opens the existing case page. The shared visual system now uses warm paper, charcoal and an orange signal, a numbered navigation index, unboxed portfolio totals, aligned project records, project dossiers, a document assembly desk and an archive. Logo, favicon and Open Graph image follow the same identity. [Design-system specification](design-system.md).

The accumulated workspace stylesheet was replaced; API contracts, authentication/storage implementation, provider routing, document content and Firebase rules were not modified. Both languages and themes remain supported. Keyboard behaviour was strengthened for the mobile menu and dossier sections.

Verification completed during this redesign: 12 E2E tests, 2 provider tests, 3 Firebase emulator tests, 22 axe route/theme scans with zero violations, 168 API tests and 4 release-tool tests. Responsive tests exercise 320, 768, 1024 and 1440 px widths. A hovered-record contrast issue was found and corrected before the passing accessibility run. Automated scans do not establish a full accessibility certification.

On 28 September, lint, typecheck, formatting, the complete `check` command and production build passed again. The public smoke passed against both HTTPS aliases. Vercel confirmed frontend deployment `pmo-compass-qhhju3muo-alvaroredondo.vercel.app` is Ready and serves the new cover and favicon. The deployment was created on 22 September; final publication assets and GitHub handoff were completed on 28 September.

Fifteen screenshots were refreshed from the public site using an isolated browser and fictional Starter Projects. The risk-register and Copilot requests both returned Gemini; mobile generation was explicitly offline. The case image remains pre-generated offline content. The capture manifest records actual provider output and timestamp. No real cloud account was used in this capture run; current Firebase regression evidence is emulator-based, with the earlier live checks separately recorded above. LinkedIn text and images are prepared; no post was published.
