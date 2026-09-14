# PMO Compass AI validation

Final portfolio review: **13 September 2026**. Local environment: macOS, Node.js 20.19.5, npm 10.8.2, Python 3.13.1, Java 21 and Chromium. Node 22 is the recommended supported runtime in `.nvmrc` and the configured GitHub Actions job; that remote CI job has not been run by this local audit.

## Executed checks

| Check | Result | Scope |
| --- | --- | --- |
| ESLint | Passed | Frontend and configuration code |
| TypeScript | Passed | Strict checking and production compilation |
| Prettier | Passed | UI, services, scripts and browser tests |
| FastAPI / provider tests | 95 passed | Eight formats × two languages, sparse/large inputs, negation, owners/deadlines, schema/evidence validation, auth, fallback, failures, complete bilingual fixtures and production emulator guards |
| Firestore rules emulator | 9 passed | Ownership, scoped queries, immutable records, parent ownership, deletion and profiles |
| Demo browser tests | 8 passed | Full CRUD/generation/save/copy/export flow, error states, filters, themes, mobile, logout, four featured sectors and additive demo loading without overwriting existing work |
| Ollama fallback browser tests | 2 passed | Actual FastAPI with a closed local Ollama port: clear failure, explicit fallback, preserved input and saved provenance in ES/EN |
| Firebase browser tests | 3 passed | SDK registration/login, token verification, persistence, two-account isolation, cascade deletion, public demo and cloud-to-demo/reset/return preservation |
| axe WCAG A/AA | 18 scans passed | Nine routes in light and dark themes |
| Production build | Passed | All application routes |
| Production server smoke | Passed | Built Next.js server: landing, security headers, EN switch, demo entry and six projects |
| npm lockfile install preview | Passed | `npm ci --dry-run --ignore-scripts`; verifies install planning, not a fresh deployment |
| Production emulator rejection | Passed | Next.js build rejects an enabled emulator flag; Python tests reject emulator environment variables in production |
| npm production dependency audit | 0 known vulnerabilities | Installed JavaScript production dependency tree |
| npm full dependency audit | 9 moderate package findings | Remaining Firebase CLI/development-tool chain; none high/critical |
| Python dependency audit | 0 known vulnerabilities | 56 installed packages scanned after updating pydantic-settings and pytest |
| Python dependency consistency | Passed | `pip check` |
| Source credential pattern review | No matching secrets found | 112 publishable text files and environment variable names; no Git history was available |
| Local Markdown links | Passed | README/docs file existence and filename case |

## What was corrected during review

- An old Firebase browser assertion referred to retired empty-state microcopy. It now uses the current typed dictionary and the complete suite passes.
- Production configuration now rejects Firebase emulator variables; the Next.js build rejects its emulator flag too.
- `.gitignore` now covers additional `.env.*` files, Firebase Admin key naming patterns and private key files while retaining environment examples.
- `pydantic-settings` was updated to 2.14.2 and `pytest` to 9.0.3 after dependency findings. Python's audit is clear after the update.
- A scoped Express → qs override selects 6.16.0 or later in the compatible major, removing two development-tree package findings. `package-lock.json` records the resolved tree.
- CI now includes source formatting and a production npm audit in addition to the existing quality, build and integration jobs.

The source review used credential-pattern matching, code inspection and environment-name checks; it was not a formal penetration test or an exhaustive secret-scanning service. No repository history or remote was present. `.env.example` files contain names/defaults/placeholders, never actual secrets.

## Screenshots and visual review

Ten images were regenerated from the actual app with `npm run screenshots`: the English hero/full landing, light/dark landing and Spanish dashboard, a generated risk register in both themes, and mobile landing/dashboard/generator views. The landing, dashboard and mobile dashboard were visually inspected. The responsive browser test checks 320, 768, 1024 and 1440 px layouts.

Automated accessibility scans cover supported axe rules, not a complete WCAG certification. Keyboard/screen-reader and Firefox/WebKit coverage remain roadmap items.

## Scope and remaining dependency work

Firebase checks use only `demo-pmo-compass` local emulators, not a production account. Model response success/failure contracts are mocked; actual connection failure is exercised, but live Ollama inference was not performed. No paid provider calls or deployment were made.

Nine npm findings remain in development tools, including OpenTelemetry, csv-parse, uuid, stream-json and re2 with dependent packages. Resolving the full tree requires upstream/major dependency work; newer native tooling also requires a newer Node runtime. The review did not force a major Firebase CLI downgrade or break the existing Node 20 compatibility to suppress audit output. See [final audit](final-audit.md) for the publication decision and remaining priorities.

Two deprecation warnings from the installed Starlette test-client stack remain. They do not fail tests; migrating that test transport is future maintenance. Python direct dependencies are pinned, but its complete transitive tree is not yet locked.

## Reproduce

```bash
npm run check
npm run format:check
npm run test:e2e
npm run test:providers
npm run test:rules
npm run test:firebase
npm audit --omit=dev
npm audit
backend/.venv/bin/python -m pip check
```

With `npm run dev` active, run `npm run test:a11y` and `npm run screenshots`. Browser suites can start their own test servers. Run Firebase suites sequentially because they share emulator ports. The Python vulnerability audit used an isolated temporary pip-audit environment against a freeze of the application's installed packages; it added no audit dependency to the product.

Generated failure traces, reports and debug logs are excluded from version control. The [publication kit](publication-kit.md) and [deployment guide](deployment.md) distinguish local evidence from checks still required on a hosted release.

## Release candidate verification

The release-preparation pass on **13 September 2026** reran `npm run setup`, `npm run check` (lint, types, 95 backend tests and build), formatting, eight demo browser tests, two provider browser tests, nine Firestore rules tests, three Firebase browser tests and all 18 axe scans. All passed. The app's UI, provider implementation and storage schema were unchanged in this pass, so the ten existing screenshots remain the current presentation assets.

`npm run check:release` now validates relative documentation links and anchors, checks filename case, evaluates Git ignore rules and scans publishable text and indexed content for credential patterns. It includes already-tracked files even when ignored, so a staged environment file cannot silently pass. Without a project Git repository it uses an isolated temporary directory and leaves the source folder uninitialised.

`npm run test:release` adds four passing regression tests: safe sources and ignored artifacts before/after Git initialisation; a staged token whose working copy has been cleaned; an already-indexed environment file; and invalid documentation links/anchors. These tools are wired into CI, which still requires a real run after pushing to GitHub.

The publication file review includes **128 files / 118 text files** with no matching secrets. The actual local environment files remain ignored; all three environment examples use safe defaults and blank credential values. `AI_PROVIDER=demo` remains active in the local API. `pip check` passes; npm reports zero production vulnerabilities and the same nine moderate development-tool findings. The earlier Python vulnerability scan remains the reference; it was not repeated as part of this preparation.

The [release checklist](release-checklist.md) distinguishes completed local verification from pending licence choice, first commit, remote CI, tag, video recording and deployment. [GitHub setup](github-setup.md) and [LinkedIn publication](linkedin-publication.md) provide the final commands and copy. No Git remote, commit, tag, post or live deployment was created by this pass.

## GitHub publication preparation

This follow-up supersedes the earlier no-Git status above. The repository is now initialised locally on `main`, with no inherited project history. The intended remote is `https://github.com/i22remua/pmo-compass-ai.git`. Creating the empty public repository, the first push, remote CI, a release tag and deployment remain owner-controlled steps.

The final local gate passes: setup, lint, regenerated Next.js types, production build, 95 backend tests, eight demo browser tests, two provider browser tests, nine rules tests, three Firebase browser tests, four publication-tool regression tests and 18 axe scans. Formatting and `pip check` also pass. There is no generic `npm test` script; every available named `test:*` suite was run. The current documentation scan checks 14 Markdown files and 119 relative internal links. Publication scans cover 127 files, including 117 text files and ten fictional screenshots.

Two snapshot tests initially failed after the calendar date changed: stored draft headers retained the prior day while the provider correctly used the current date. Those tests now freeze only the provider's clock at the snapshot's recorded date, preserving the full content/evidence comparison. All 95 backend tests pass on the new day. A browser/a11y attempt also timed out when the local development server stopped responding; both suites passed after restarting the server. No browser assertion or timeout was weakened.

The initial staged whitespace review found one extra blank line at the end of `backend/tests/conftest.py`; it was removed. Next.js's generated `next-env.d.ts` contained references to local emulator build types, so it is now ignored and rejected by the release check. `npm run typecheck` runs `next typegen` before TypeScript, following the documentation shipped with the installed Next.js version. CI has explicit read-only repository permissions.

The source and index checks found no matching secrets, private environment files, credential JSON, personal absolute paths, dependency folders or build/cache/log artifacts. All three `.env.example` files are included with blank credential values; ignored local configurations remain available for development. The lockfile resolves packages through the public npm registry and contains no local file dependency paths. npm again reports zero production vulnerabilities and nine moderate development-tool package findings; the earlier Python vulnerability audit was not repeated, while `pip check` was.

A clean copy was extracted from the Git index without local environments, dependencies, caches or `next-env.d.ts`. Actual `npm ci`, `npm run setup`, `npm run typecheck`, lint, build and all 95 backend tests passed there. The separate API started in default demo mode and generated a substantive document; the built Next.js server passed a Chromium smoke check for landing content, security headers, language switching, demo entry and six projects on the Projects page. The initial supplementary smoke probe incorrectly expected all six cards on the dashboard, which intentionally previews four; the probe was corrected to check the full Projects page, without changing the app.

The local candidate commit uses `Prepare PMO Compass AI release candidate`; `origin` points to the intended HTTPS URL. No push, remote repository creation, tag or deployment was performed. The complete staged diff, file manifest and status/stat snapshots were retained in ignored `test-results/publication/` for local review and are excluded from the commit. Use `git log -1 --oneline`, `git status` and `git remote -v` to inspect the final Git state.

## Final delivery and public GitHub review

On **14 September 2026**, the public GitHub API and remote refs confirmed that `main` and tag `v0.1.0-rc1` point to `443dd0a8abb9fcb033906a3c74f9ca2889b7e925`, matching the local application baseline. The [published CI run](https://github.com/i22remua/pmo-compass-ai/actions/runs/34795716626) completed successfully. A browser without authentication confirmed HTTP 200 and loaded both README images. The description is correct; topics, hosting, a licence and a GitHub release were absent at the review checkpoint.

The final presentation pass reran lint, regenerated types, all 95 backend tests, production build, formatting and four release-tool tests. All passed. The application source, Firebase rules and provider implementations were unchanged, so their prior local/emulator/browser evidence remains applicable. The new recording command itself exercised the live demo: source notes, two generation formats, copy, save, history and themes, in isolated browser storage.

The approximately 83-second MP4 was decoded completely and representative frames were visually reviewed. It uses H.264/yuv420p at 1440 × 1000, 25 fps, with Spanish captions and no audio. Five screenshots, ES/EN subtitles and full/short posts are packaged locally; only the additional saved-document screenshot and recording script are versioned. The [final delivery guide](final-delivery.md) documents reproduction and the upload files. Media exports are ignored by Git and rejected by the release guard if forced into the index.

The published workflow reported Node 20 action-runtime deprecations. The updated checkout/setup/upload actions have been checked against their official manifests: all use Node 24 and accept the configured inputs. The application's CI runtime remains Node 22. The updated workflow has not been executed on GitHub yet; the delivery commit requires its own run after an authorised push. No existing tag, remote setting or social post was changed.
