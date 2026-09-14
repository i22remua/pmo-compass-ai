# Publish to GitHub

Repository: **i22remua/pmo-compass-ai**. Local Git preparation targets `main` and `https://github.com/i22remua/pmo-compass-ai.git`. Repository creation, pushing and a GitHub release remain manual steps. **Do not push until the owner explicitly confirms publication.** See the [release checklist](release-checklist.md) for the recorded preparation status.

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

## 1. Create an empty public repository

On GitHub, create **pmo-compass-ai** under **i22remua** and select **Public**. Leave the initial README, .gitignore and licence options unselected when importing this existing folder, so the remote starts empty. This project already contains a README and ignore rules. Add your chosen licence locally before the first commit, or in a later reviewed commit.

The HTTPS remote is `https://github.com/i22remua/pmo-compass-ai.git`. Configuring it locally does not create the repository on GitHub. See GitHub's [instructions for importing local code](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github).

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

## 3. Initialise and inspect the first commit

For a folder that does not yet have a Git repository:

```bash
git init -b main
git status --short --untracked-files=all
git check-ignore .env backend/.env frontend/.env.local node_modules frontend/.next backend/.venv
```

The last command should list the ignored local configurations and generated directories. They can exist for local execution; they must not enter the commit. If the folder already has Git history, keep that history and inspect the existing branch/remote rather than reinitialising or force-pushing.

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
git commit -m "Prepare PMO Compass AI release candidate"
```

If Git asks for an author identity, configure your intended name and GitHub-verified email locally for this repository before retrying. Do not replace a previously configured identity automatically.

## 4. Configure the remote; keep push manual

For the new empty remote created above:

```bash
git remote add origin https://github.com/i22remua/pmo-compass-ai.git
git remote -v
```

If `origin` already exists, inspect it with `git remote -v` and use the intended remote instead of overwriting it. Authenticate through your configured Git credential helper or GitHub CLI; never put a token into the URL or commit it in a script. A GitHub account password is not a Git HTTPS credential.

**Only after the owner confirms the push**, publish the local commit:

```bash
git push -u origin main
```

Wait for the **Quality and integration** Actions job to pass on the pushed revision. Local checks do not prove that a remote CI run has completed. Add the description and topics in the repository About settings; GitHub documents [repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics).

## 5. Mark the release candidate

After the intended revision passes CI and the [checklist](release-checklist.md) has been reviewed, the suggested candidate tag is **v1.0.0-rc.1**:

```bash
git tag -a v1.0.0-rc.1 -m "PMO Compass AI release candidate 1"
git push origin v1.0.0-rc.1
```

Create a GitHub pre-release from that tag if desired. Describe the bilingual demo, provider architecture, verification results and remaining limits. Do not move an existing published tag; use the next candidate suffix for later fixes. The tag is a proposed publication step, not a tag already created in this workspace.

## Never upload

- Actual `.env`, `.env.local`, `.env.production` or other private environment variants.
- Service-account JSON, private `.pem`/`.key` files, cloud credentials, API keys or tokens.
- Real project exports, customer notes, emails, financial information or personally identifying screenshots.
- Browser storage exports, emulator data exports, session recordings or test traces containing real data.
- `node_modules`, `.next`, virtual environments, Python caches, logs or temporary files.

Commit only `.env.example` files with safe defaults and blank credential values. `npm run setup` creates ignored local configuration files when missing and preserves existing settings. Ignore rules do not remove files already committed: if a real secret has entered Git history, stop publication and treat it as a credential incident before sharing the repository.

## After GitHub

Follow [deployment.md](deployment.md), record the [demo script](demo-script.md), add the real repository/video links to [linkedin-publication.md](linkedin-publication.md), and update [release-checklist.md](release-checklist.md). The default `AI_PROVIDER=demo` keeps the presentation independent of paid AI APIs and local model availability.
