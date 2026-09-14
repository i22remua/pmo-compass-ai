# Deployment guide

Recommended first deployment: a managed Next.js frontend, a separate Python web service for FastAPI, and Firebase Authentication/Firestore. Keep `AI_PROVIDER=demo` so the public presentation does not depend on a paid AI API or a local model.

This is a configuration guide, not evidence of a deployment. Hosting resources and Firebase quotas depend on the services/account selected.

For the release candidate, first follow [github-setup.md](github-setup.md) and record the actual publication/deployment status in [release-checklist.md](release-checklist.md).

## 1. Prepare a release

Use a supported Node.js LTS version. `.nvmrc` and CI select Node 22; the original local validation environment used Node 20.19.5, which should not be used for a new public deployment because that line is end-of-life. See the [official release status](https://nodejs.org/en/about/previous-releases).

Run `npm ci`, install `backend/requirements-dev.txt` in a virtual environment and run the commands in [validation](VALIDATION.md). Review the outstanding development-tool dependency findings in [the audit](final-audit.md). Commit source, lockfile, environment examples and documentation; exclude actual environments, credentials, caches and test traces.

The repository `https://github.com/i22remua/pmo-compass-ai.git` is public and its initial candidate passed CI. Push later updates only with owner confirmation and require their exact revision to pass CI before deploying. No live deployment is performed automatically. See the [release checklist](release-checklist.md) for status. Licence terms remain a separate owner decision.

## 2. Configure Firebase

1. Create a dedicated Firebase project and web app.
2. Enable email/password Authentication and authorise the final frontend hostname.
3. Create Firestore and deploy the reviewed rules/indexes:

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

4. Give the FastAPI runtime Application Default Credentials or a server-only service-account secret file, with the access required for ID-token verification and revocation checking. Do not put the credential in the repository or frontend environment.
5. Use the same Firebase project ID in frontend and backend. Real accounts start empty.

The public Firebase web configuration identifies the app; Firestore rules and Firebase Auth provide the access control. The [database schema](database-schema.md) explains ownership and deletion.

## 3. Deploy FastAPI

On a Python 3.11–3.13 host, set the service root to `backend`. Install production dependencies:

```bash
python -m pip install -r requirements.txt
```

Start the process using the host's assigned port:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
```

For a host without a `PORT` variable, configure a fixed internal port such as 8000. Use the platform's HTTPS ingress/reverse proxy and managed process restart. Do not use `--reload` for the production service. These commands follow FastAPI's [manual deployment guidance](https://fastapi.tiangolo.com/deployment/manually/).

Set environment values on the host:

```dotenv
APP_ENV=production
AUTH_MODE=firebase
AI_PROVIDER=demo
FIREBASE_PROJECT_ID=your-project
CORS_ORIGINS=["https://your-frontend.example"]
RATE_LIMIT_PER_MINUTE=30
```

Configure credentials through ADC or a private `GOOGLE_APPLICATION_CREDENTIALS` file path. **Remove** `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST` rather than assigning production endpoints to those variables. The backend refuses startup when emulator variables are present in production. Firebase's [emulator documentation](https://firebase.google.com/docs/emulator-suite/connect_auth) explains that emulator configuration permits unsigned test tokens.

Use `/api/v1/health` as a readiness endpoint. It reports API configuration, not a successful model inference. `/api/v1/generate` requires a verified token; `/api/v1/demo/generate` remains a public template endpoint. Do not cache generation responses at the proxy. Start with one application process or introduce shared quotas before claiming cross-instance rate limiting.

## 4. Deploy Next.js

For Vercel, import the repository as a Next.js project with `frontend` as the Root Directory. Include source files outside that directory so the workspace lockfile/root package configuration are available; use the detected Next.js build output. See [Vercel's monorepo guidance](https://vercel.com/docs/monorepos/monorepo-faq). No project ID or deployment configuration containing account details has been checked in.

Set browser environment values before building:

```dotenv
NEXT_PUBLIC_DATA_MODE=firebase
NEXT_PUBLIC_API_URL=https://your-api.example
NEXT_PUBLIC_FIREBASE_API_KEY=your-public-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_APP_ID=your-public-web-app-id
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
```

Use the real HTTPS API URL; `localhost` on a visitor's browser points to that visitor's device. Public variables are built into the client bundle, so changing them requires a rebuild. The Next.js production build rejects an enabled Firebase emulator flag.

Alternatively, on a Node host, run `npm ci` and `npm run build` from the repository root, then `npm start` under a managed process with HTTPS ingress. Keep backend and frontend environment variables scoped to their own services. Consult [Next.js self-hosting guidance](https://nextjs.org/docs/app/guides/self-hosting) for proxy, cache and multi-instance considerations.

## 5. Verify the deployed app

Use fictional data and dedicated test accounts:

- Open the landing and demo in a clean browser; generate, copy, save and reload a report.
- Register account A, create a project and save a document. Confirm persistence after logout/login.
- Register account B; confirm A's project/document URLs do not expose their contents.
- Switch from A's dashboard to Demo Mode, then log in again; A's cloud data must remain unchanged.
- Request private generation without a token and confirm a 401; confirm public demo generation uses `demo`.
- Check mobile layout, both themes, browser console/network errors and the final HTTPS/CORS settings.
- Confirm that no emulator endpoints, localhost API URLs or server secrets appear in the deployed configuration.

Only after these checks should the README's live-demo placeholder be replaced with the real URL. Live Firebase/model behavior and hosting configuration were not verified by the local audit.

## 6. Leave Ollama optional

The initial deployment should use templates. A local Ollama running on your laptop is not available at `localhost:11434` inside a hosted backend. A later model deployment needs a controlled network path, suitable compute, timeout/concurrency planning and a real inference check. Do not expose an unauthenticated Ollama service publicly to make the demo work.

## Follow-up priorities

Add password recovery/email verification, shared quotas, monitoring without source-text logging, pagination and document versioning as the application moves beyond a portfolio workspace. Keep the current demo available throughout. See [product roadmap](product-roadmap.md).
