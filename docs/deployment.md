# Public deployment

## Current live environment — 21 September 2026

- Frontend: https://pmo-compass-ai.vercel.app
- FastAPI: [API documentation](https://pmo-compass-ai-api.vercel.app/docs) · [Health](https://pmo-compass-ai-api.vercel.app/api/v1/health)
- Hosting: two Vercel Hobby projects. Approved source is published on GitHub; production deployments are performed explicitly with the Vercel CLI.
- Firebase project: `pmo-compass-ai-2026`, billing disabled. Firestore Standard database `(default)` in `nam5`; ownership rules and indexes deployed.
- Public workspace and Offline PMO Engine: available. `smoke:public` passed against both HTTPS URLs.
- Cloud login: enabled with Email/Password, the public domain authorised and frontend `NEXT_PUBLIC_DATA_MODE=firebase`. Real registration, persistence and cross-account isolation verified.
- External models: `auto` uses Gemini `gemini-3.1-flash-lite`; a real generation returned `provider=gemini`. Groq and OpenRouter remain optional and unconfigured. Offline fallback remains available.

For another deployment, open [Authentication](https://console.firebase.google.com/project/pmo-compass-ai-2026/authentication), click Get started and enable Email/Password. Then add `pmo-compass-ai.vercel.app` to authorised domains, set Vercel frontend `NEXT_PUBLIC_DATA_MODE=firebase`, redeploy and run the live account-isolation checklist.

The backend uses `backend/vercel.json` and a sensitive `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable. Its dedicated service account has only `firebaseauth.users.get` through the project role `pmoTokenVerifier`, for revocation checks. The original credential file is kept outside the repository with restricted file permissions. It is not a frontend variable. ADC/secret-file configuration remains supported for Render.

Vercel's [FastAPI support](https://vercel.com/docs/frameworks/backend/fastapi) packages the API as a scalable Python function. Current limits are process-local, reset on restarts and are not global across Vercel instances. Gemini is configured on an unbilled project; introduce shared quota enforcement before relying on application quotas for aggregate remote usage. Upstream provider quotas remain applicable. No paid plan or billing account was enabled.

The remaining sections describe configuration and the prepared Render alternative. The `onrender.com` address remains an unused placeholder. Replace it with the active Vercel backend URL for this deployment.

Target URLs (placeholders, not proof of a live deployment):

```dotenv
PUBLIC_FRONTEND_URL=https://pmo-compass-ai.vercel.app
PUBLIC_BACKEND_URL=https://pmo-compass-ai-api.onrender.com
```

The application now runs on public HTTPS services; visitors do not need localhost. Firebase login and real Gemini generation are now verified, as recorded in [the checklist](public-live-checklist.md). The owner has authorised committing and pushing the reviewed release.

## Firebase Spark

1. Create a Firebase project and web app. Enable Email/Password Authentication and create Firestore.
2. In Authentication → Settings → Authorised domains, add `pmo-compass-ai.vercel.app` (or your actual hostname), without scheme/path. Add a preview domain only if testing it deliberately.
3. Configure the four public web identifiers in Vercel. Do not use a service-account key in browser code.
4. Deploy ownership rules and indexes to your own project after review:

```bash
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

5. Provide the backend an appropriately scoped service-account JSON through Render Secret Files, named `firebase-service-account.json`. Set `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/firebase-service-account.json` and matching `FIREBASE_PROJECT_ID`. The backend checks token revocation; it needs access for Firebase token verification. Do not commit the file.
6. Accounts start empty. Local projects remain in the browser and are not automatically imported into Firestore. Test account isolation and retryable project/document deletion.

Firebase's [Spark plan and quotas](https://firebase.google.com/pricing) cover the starting architecture. Exceeding free limits affects availability; do not silently enable billing.

## FastAPI on Render

Use the checked-in [render.yaml](../render.yaml) Blueprint or configure a free Python web service manually:

- Root: `backend`; Python 3.13.
- Build: `pip install -r requirements.txt`.
- Start: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`.
- Health check: `/api/v1/health`.
- Disable automatic deployment until the revision is approved.

Required environment:

```dotenv
APP_ENV=production
AUTH_MODE=firebase
FIREBASE_PROJECT_ID=your-project-id
CORS_ORIGINS=["https://pmo-compass-ai.vercel.app"]
AI_PROVIDER=auto
AI_PROVIDER_ORDER=gemini,groq,openrouter,offline
AI_COST_MODE=free_only
FREE_AI_DAILY_LIMIT_PER_USER=20
FREE_AI_RATE_LIMIT_PER_MINUTE=5
RATE_LIMIT_PER_MINUTE=30
EXTERNAL_AI_TIMEOUT_SECONDS=20
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/firebase-service-account.json
```

Add AI secrets only when enabling a provider. Firebase emulator environment variables must be absent. Keep one worker/instance: quotas are in memory and reset on restart. Configure trusted proxy IP handling for your hosting topology; the app does not trust arbitrary `X-Forwarded-For`. Verify that real client IPs reach Uvicorn before launch. Do not use a wildcard proxy trust setting on a directly accessible container. A proxy shared by all visitors otherwise shares their IP quota.

Render supplies HTTPS and its public hostname. Keep generation responses uncached. The health endpoint proves API readiness, not live Firebase or model availability. [Free services sleep after inactivity and may have a cold start](https://render.com/docs/free); allow time for the first request. The frontend generation timeout accommodates cold starts and bounded provider attempts. If Render is unavailable, browser editing/export of stored documents remains possible, but new generation needs the API.

An optional [Dockerfile](../backend/Dockerfile) runs as a non-root user and honours `PORT`; [.dockerignore](../backend/.dockerignore) only admits application code and requirements. Build with `docker build -t pmo-compass-api backend`. Inject runtime settings/secrets through the host. Docker is not required for the Render Python configuration.

## Next.js on Vercel

Import the repository, choose the Next.js preset and **Root Directory `frontend`**. Include files outside that directory for the npm workspace lockfile. Use the detected Next.js build/output settings (`npm run build` within frontend). No `vercel.json` is needed. See [Vercel monorepo settings](https://vercel.com/docs/monorepos/monorepo-faq).

Set before building:

```dotenv
NEXT_PUBLIC_API_URL=https://pmo-compass-ai-api.onrender.com
NEXT_PUBLIC_DATA_MODE=firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-public-web-config-value
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_APP_ID=your-public-web-app-id
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
```

These are public browser configuration values, not server credentials. Never add provider keys to Vercel's frontend variables. Changes to public values require a rebuild. Hosted preview/production builds refuse missing or localhost API URLs. The [Hobby plan](https://vercel.com/docs/plans/hobby) is for personal, non-commercial projects; review eligibility if this portfolio becomes a commercial service.

## Free-tier external AI

The backend uses ordinary HTTPX adapters, no extra SDK dependency. Default routing is Gemini → Groq → OpenRouter → Offline PMO Engine. It catches missing configuration, HTTP 429, upstream errors, timeouts, malformed/oversized/truncated output and unsupported evidence. Each remote attempt has a maximum 20-second total timeout by default. No tool execution, web search or paid grounding is requested.

1. **Gemini:** obtain an authorization key in Google AI Studio for an unbilled free-tier project. Google documents rejection of standard keys from September 2026; use a newly created auth key, as described in the [official API-key guide](https://ai.google.dev/gemini-api/docs/api-key). In the backend secret store set `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.1-flash-lite`, `GEMINI_FREE_TIER_CONFIRMED=true`. The default was updated after the configured 2.5 model returned HTTP 404 for this project. Gemini 3.1 Flash-Lite has a documented free tier; the allowlist retains `gemini-2.5-flash` and `gemini-2.5-flash-lite` for existing accounts that still have access. Check [current pricing and data-use terms](https://ai.google.dev/gemini-api/docs/pricing). Free-tier prompts may be used to improve provider products; use fictional/non-sensitive data for the public portfolio.
2. **Groq:** create a free account; set `GROQ_API_KEY`, `GROQ_MODEL=openai/gpt-oss-20b`, `GROQ_FREE_TIER_CONFIRMED=true`. This replaces the requested `llama-3.1-8b-instant` default because [the current model list](https://console.groq.com/docs/models) lists it as Enterprise, while [free-plan limits](https://console.groq.com/docs/rate-limits) list GPT-OSS 20B. Check account eligibility and limits before enabling.
3. **OpenRouter:** set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL=openrouter/free` or a reviewed model ID ending in `:free`. Other model IDs are rejected in `free_only` mode. Requests also set zero prompt/completion `max_price` and require supported parameters. [Free router](https://openrouter.ai/openrouter/free) and [routing constraints](https://openrouter.ai/docs/guides/routing/provider-selection). Some free models may not support the JSON contract; the router then continues offline.

Gemini/Groq do not offer a per-request free-only billing switch. Their confirmation variables attest to operator account configuration; code cannot guarantee your account billing state. Unset keys/confirmation flags skip those providers, preserving operation without payment. Free tiers can change or be unavailable in some regions. The model allowlists must be reviewed when changing defaults.

To verify an external adapter, set `AI_PROVIDER=gemini` (or `groq`/`openrouter`), restart and generate fictional context. Check the **actual result provider**, not just health/configuration: success may legitimately fall back to `offline`. Then restore `auto`.

To verify fallback, leave keys blank, use an invalid test key, or mock a quota/network failure in tests. Generation must complete with `provider=offline`, retained source context and a visible fallback warning. To use offline directly, select **Offline PMO Engine** in the generator or set `AI_PROVIDER=offline`. It needs the FastAPI service, but no external model or local Ollama process.

## Verify before publication

```bash
PUBLIC_FRONTEND_URL=https://pmo-compass-ai.vercel.app \
PUBLIC_BACKEND_URL=https://pmo-compass-ai-api.onrender.com npm run smoke:public
```

Then test bilingual generation, copy/download, starter opt-in, mobile layout, account A persistence, account B isolation and external provider provenance in a real browser. [Public live checklist](public-live-checklist.md). Never claim real Firebase or external AI was verified solely because mocks/emulators passed.
