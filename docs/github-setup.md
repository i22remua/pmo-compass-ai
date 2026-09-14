# Publish to GitHub

Repository: **[i22remua/pmo-compass-ai](https://github.com/i22remua/pmo-compass-ai)**, publicly available on `main`. The first candidate is already published. **Further pushes still require the owner's explicit confirmation.** See the [final delivery guide](final-delivery.md) and [release checklist](release-checklist.md) for the current handoff.

## Repository details

**Visibility:** Public.

**Description:**

> Bilingual PMO workspace that transforms project notes into professional documents using Next.js, FastAPI, Firebase and AI provider architecture.

**Topics:**

```text
project-management
pmo
generative-ai
nextjs
typescript
fastapi
firebase
ollama
full-stack
portfolio-project
software-engineering
```

Add a live URL in the About section only after deployment is verified. Choose the project's licence before presenting it as open source; no licence terms have been selected automatically.

## 1. Verified public baseline

- Published application commit: `443dd0a8abb9fcb033906a3c74f9ca2889b7e925`.
- Public tag: **v0.1.0-rc1**, pointing to that commit.
- [Quality and integration](https://github.com/i22remua/pmo-compass-ai/actions/runs/34795716626) completed successfully for the same commit.
- The recommended description is already configured. The About section still needs the topics listed above.
- No hosted-app URL, licence file or GitHub release was present at this review checkpoint.

Do not create a second repository or reinitialise Git. Local presentation changes go into a new commit; keep the published candidate tag unchanged. Add topics through the repository's **About → settings** control, then pin this repository on your profile if you want to feature it.

## 2. Validate locally

Open a terminal in the project root, the folder containing `package.json`:

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
```

There is no generic `npm test` script: the named `test:*` scripts above run the available suites. With `npm run dev` active, also run `npm run test:a11y`. Use Java 21 for Firebase tests and run the emulator suites sequentially. The [release checklist](release-checklist.md) records what has passed and what remains outstanding.

`check:release` validates README/docs links, filename case and heading anchors; checks Git's publishable file list, working/indexed credential patterns and ignore rules; and confirms safe demo defaults in the environment examples. It works before `git init` by evaluating ignores in an isolated temporary Git directory. It does not create or modify the project's Git repository.

## 3. Review a delivery update

The existing repository is already on `main` with `origin` configured. Inspect the current state:

```bash
git status --short --branch
git log -1 --oneline
git remote -v
```

Stage only after checking the file list:

```bash
git add .
npm run check:release
git diff --cached --stat
git diff --cached --name-only
git diff --cached --check
git diff --cached
```

Review the staged content in your terminal; do not paste credentials into a chat or screenshot. The automated pattern check is a guard, not proof that arbitrary future source data is non-sensitive.

Expected staged files include source, tests, `.env.example` templates, `package-lock.json`, `.github/workflows/ci.yml`, README, docs and fictional screenshots. Expected exclusions include actual `.env` files, dependencies, compiled output, `next-env.d.ts`, caches, logs, temporary files and credentials. `npm run typecheck` regenerates Next.js route types before checking, so a fresh checkout does not depend on local emulator/build artifacts.

Then commit:

```bash
git commit -m "Polish final delivery and LinkedIn materials"
```

If Git asks for an author identity, configure your intended name and GitHub-verified email locally for this repository before retrying. Do not replace a previously configured identity automatically.

## 4. Configure the remote; keep push manual

The expected existing remote is `https://github.com/i22remua/pmo-compass-ai.git`. Verify it without overwriting configuration:

```bash
git remote -v
```

If `origin` already exists, inspect it with `git remote -v` and use the intended remote instead of overwriting it. Authenticate through your configured Git credential helper or GitHub CLI; never put a token into the URL or commit it in a script. A GitHub account password is not a Git HTTPS credential.

**Only after the owner confirms the push**, publish the local commit:

```bash
git push -u origin main
```

Wait for the **Quality and integration** Actions job to pass on the pushed revision. Local checks do not prove that a remote CI run has completed. Add the description and topics in the repository About settings; GitHub documents [repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics).

## 5. Preserve the published candidate

The existing **v0.1.0-rc1** tag identifies the initial application baseline. The earlier proposed `v1.0.0-rc.1` name was not used. Do not move or replace a published tag to include presentation updates.

A GitHub pre-release is optional. If a later candidate is needed, choose a new version after its exact commit passes CI. The local package/API version fields remain `1.0.0`; they were not changed as part of this presentation pass.

## Never upload

- Actual `.env`, `.env.local`, `.env.production` or other private environment variants.
- Service-account JSON, private `.pem`/`.key` files, cloud credentials, API keys or tokens.
- Real project exports, customer notes, emails, financial information or personally identifying screenshots.
- Browser storage exports, emulator data exports, session recordings or test traces containing real data.
- `node_modules`, `.next`, virtual environments, Python caches, logs or temporary files.

Commit only `.env.example` files with safe defaults and blank credential values. `npm run setup` creates ignored local configuration files when missing and preserves existing settings. Ignore rules do not remove files already committed: if a real secret has entered Git history, stop publication and treat it as a credential incident before sharing the repository.

## After GitHub

Follow [deployment.md](deployment.md), record the [demo script](demo-script.md), upload the prepared media with the post in [linkedin-publication.md](linkedin-publication.md), and update [release-checklist.md](release-checklist.md). The default `AI_PROVIDER=demo` keeps the presentation independent of paid AI APIs and local model availability.
