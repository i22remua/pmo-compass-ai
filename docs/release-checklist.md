# Release checklist

Candidate: **v1.0.0-rc.1** (suggested tag; not created). Scope: stabilisation, publication hygiene and presentation. No major feature expansion or mandatory paid AI API.

This checklist separates a locally validated candidate from a published repository and deployed application. Final command results are recorded in [VALIDATION.md](VALIDATION.md).

## Local quality gate

- [x] Setup rerun successfully with existing configuration preserved.
- [x] Backend/provider tests pass, including demo fixtures and production configuration guards.
- [x] Demo browser tests pass, including generation, persistence, responsive behavior and additive example loading.
- [x] Ollama failure/fallback browser tests pass without an installed model.
- [x] Firestore rules tests pass for ownership and parent/document invariants.
- [x] Firebase browser tests pass for login, isolation, persistence and demo separation.
- [x] Production build passes.
- [x] A clean copy of the Git index passes `npm ci`, setup, regenerated types, lint, build, 95 backend tests and production/API smoke checks.
- [x] TypeScript and ESLint pass.
- [x] Formatting check passes.
- [x] Four release-tool regression tests pass, including a secret left in the Git index after its working copy was cleaned.
- [x] Eighteen automated accessibility scans pass in light and dark themes.
- [x] Documentation links, filename case and anchors pass `npm run check:docs`: 14 Markdown files and 119 internal links checked.
- [x] Publishable files, ignore rules and demo defaults pass `npm run check:release`.

## Configuration and publication hygiene

- [x] `AI_PROVIDER=demo` is the backend and example default.
- [x] The first-time demo needs neither Firebase credentials nor Ollama.
- [x] Public demo generation remains template-only when private generation uses Firebase.
- [x] Demo examples and edits stay in localStorage; real accounts use owner-scoped Firestore data.
- [x] Ollama has bounded failure handling and a deliberate fallback action with saved provenance.
- [x] ExternalAIProvider remains a typed placeholder with no paid transport.
- [x] `.env.example` files contain safe defaults and blank credential values.
- [x] Actual local environment files are excluded from the publication file list.
- [x] Ignore rules cover dependencies, Next builds, Python caches/venvs, logs, temporary files and credential patterns.
- [x] Source/credential-pattern review rerun: 127 publishable files, 117 text files scanned; no matching secrets found.
- [x] Firebase production configuration rejects emulator variables; rules and setup are documented.
- [x] Demo records/screenshots are fictional; author attribution is intentional public portfolio information.

## Documentation and presentation

- [x] English README covers the product, problem, features, demo, stack, architecture, providers, setup, environments, tests, roadmap and portfolio value.
- [x] Architecture, AI strategy, database schema and roadmap are linked from the README.
- [x] Relative internal links are used throughout README and docs; no machine-specific local links are included.
- [x] Ten real application screenshots are available in [screenshots](screenshots).
- [x] Recommended carousel screenshots are listed in [linkedin-publication.md](linkedin-publication.md#recommended-screenshots).
- [x] A 60–90 second video script, project input and captions are prepared.
- [x] Full and short English/Spanish posts are ready in [linkedin-publication.md](linkedin-publication.md).
- [x] GitHub description, topics and import commands are ready in [github-setup.md](github-setup.md).
- [ ] Record and review the actual demo video.
- [ ] Upload the video and replace the video placeholder.

## GitHub publication

- [x] Local source and publication instructions are prepared for a public repository.
- [ ] Choose a licence and add the corresponding file if intended.
- [ ] Create the empty public repository **pmo-compass-ai**.
- [x] Initialise local Git on `main` and review the staged file list.
- [x] Complete the clean-copy check and review the final staged diff.
- [x] Create the local commit `Prepare PMO Compass AI release candidate`.
- [x] Configure `origin` as `https://github.com/i22remua/pmo-compass-ai.git`.
- [ ] Push `main` only after the owner explicitly confirms publication.
- [ ] Verify GitHub Actions on the exact pushed revision.
- [ ] Add the repository description and topics; verify README images/links on GitHub.
- [ ] Create the candidate tag/pre-release after the checks pass remotely.
- [x] Prepare the selected repository URL in the English/Spanish post drafts.
- [ ] Verify that the repository opens publicly before posting.

The candidate is committed locally on `main` and `origin` targets the URL above; there was no pre-existing project history. Publication is still pending: configuring `origin` does not create a remote repository or upload content. No push, tag or pre-release is performed automatically. `.gitignore` cannot remove secrets from an existing history; the automated source check complements the final staged-content review.

## Deployment

- [x] [Deployment instructions](deployment.md) cover Next.js, FastAPI, Firebase, CORS, HTTPS and secret handling.
- [ ] Provision the frontend/backend and Firebase production environment.
- [ ] Use the supported Node runtime from `.nvmrc`; keep emulators disabled.
- [ ] Verify deployed login, two-account isolation, generation, save/reload and demo/cloud separation.
- [ ] Verify the live app on desktop/mobile and both themes.
- [ ] Add the verified live URL to README and GitHub About.

**Deployment status: pending.** Local emulator/model-contract tests are not live infrastructure or live Ollama inference checks. Ollama does not need to be deployed for the template demo.

## Known limits for this portfolio candidate

- The release-time npm audit reports nine moderate package findings in development/Firebase CLI tooling and none in production dependencies. The previous Python vulnerability scan found no known issues; this candidate reran dependency consistency with `pip check`, not the Python vulnerability service.
- Live Firebase, live Ollama inference and remote CI require their own environment validation.
- Python direct dependencies are pinned; the transitive Python tree is not fully locked.
- Two Starlette test-client deprecation warnings remain; all relevant tests must still pass.
- Browser automation targets Chromium. Automated axe results do not establish complete accessibility certification.
- The MVP uses whole-workspace reads, client-side filtering and per-process rate limiting.

Track later product work in [product-roadmap.md](product-roadmap.md). Keep this release focused on the documented workflow and update this checklist when the actual publication/deployment steps happen.

## Reproduce the gate

```bash
npm run setup
npm run check
npm run format:check
npm run check:release
npm run test:release
npm run test:e2e
npm run test:providers
npm run test:rules
npm run test:firebase
npm audit --omit=dev
```

With the development app running, `npm run test:a11y` checks the nine public/private routes in both themes. `npm run screenshots` refreshes the existing images if presentation changes require it.

## Changes in this candidate

Created:

- `docs/release-checklist.md`, `docs/github-setup.md`, `docs/linkedin-publication.md`.
- `scripts/check-docs.mjs`, `scripts/check-release.mjs`, `scripts/check-release.test.mjs`.

Modified:

- `README.md`, `.env.example`, `.gitignore`, `package.json` and `.github/workflows/ci.yml`.
- `docs/publication-kit.md`, `docs/demo-script.md`, `docs/deployment.md`, `docs/VALIDATION.md` and `docs/final-audit.md`.

The application UI, Firebase rules, AI providers and persisted data schema were not changed. Existing environment files are preserved locally and excluded from Git; only safe examples are intended for public distribution. The candidate adds no paid API or new product module.

## GitHub preparation changes

- Excluded Next.js-managed `next-env.d.ts`; type checking now regenerates route types before running TypeScript. The release guard also rejects a forced addition of that generated file.
- Fixed the bilingual snapshot tests to freeze the provider clock at the saved draft date. They still compare the complete document, risks and warnings; production generation keeps the current date.
- Limited GitHub Actions permissions to reading repository contents.
- Personalised repository instructions, description, topics and publication drafts for `i22remua/pmo-compass-ai`.
- Removed a trailing blank line flagged by the staged whitespace check.

No application feature, provider implementation, architecture or dependency was changed during GitHub preparation.
