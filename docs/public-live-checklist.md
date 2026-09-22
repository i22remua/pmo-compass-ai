# Public live checklist

**21 September 2026: public workspace deployed and smoke-verified.** The owner has authorised the GitHub release. Firebase cloud login and real Gemini generation are verified. Gemini uses a sensitive backend-only key and an unbilled project.

- [x] Owner requested completion of deployment work. Git commit/push and the updated publication material are now authorised.
- [x] Vercel serves the working-tree revision at https://pmo-compass-ai.vercel.app.
- [x] FastAPI serves HTTPS at https://pmo-compass-ai-api.vercel.app.
- [x] Both projects use Vercel Hobby. Firebase billing is disabled.
- [x] Exact frontend CORS and health endpoint verified.
- [x] Public browser smoke found no localhost request.
- [x] Firebase project `pmo-compass-ai-2026`, web app and Firestore Standard `(default)` database created; database region `nam5`.
- [x] Firestore ownership rules and indexes deployed successfully.
- [x] Dedicated backend identity created with only `firebaseauth.users.get`; credential kept outside Git and in sensitive backend-only Vercel environment.
- [x] No emulator flags in production configuration.
- [x] `npm run smoke:public` passes against the real URLs: landing/start, health, CORS, offline inference and private endpoint authentication.
- [x] Clean public browser starts empty without account/installation.
- [x] Description-only ERP project, inferred risks, Copilot, source/missing-information labels verified publicly.
- [x] Public copy, Markdown download, browser save, document reload and additive Starter Projects verified.
- [x] Mobile viewport and English inference verified publicly.
- [x] Forced offline generation records `offline`; automatic Gemini generation records `gemini`. External failure still produces a visible fallback explanation.
- [x] README public status and LinkedIn drafts distinguish available features from pending configuration.
- [x] Activate Authentication → Get started → Email/Password in [Firebase Console](https://console.firebase.google.com/project/pmo-compass-ai-2026/authentication), retaining the free plan.
- [x] Add `pmo-compass-ai.vercel.app` to authorised domains, set frontend `NEXT_PUBLIC_DATA_MODE=firebase` and redeploy.
- [x] Verify real account A persistence, account B isolation (including direct Firestore access), revoked-token handling and deleted-account token rejection against production. Temporary test users, profiles and records were removed.
- [x] Configure Gemini on an unbilled project; real English API generation and Spanish browser generation return `gemini`. A signed-in Spanish Gemini document was saved and reloaded, and its provider was verified directly in Firestore. Groq and OpenRouter remain optional alternatives.
- [ ] Introduce shared quota enforcement before relying on aggregate external-AI limits across Vercel instances. Current counters are process-local and reset with instances; upstream Gemini free-tier quotas apply, but application quotas are not globally enforced.

Production deployments: frontend `pmo-compass-6imtraied-alvaroredondo.vercel.app`, backend `pmo-compass-ai-b76hwms8i-alvaroredondo.vercel.app`. Use the stable public aliases above. The frontend includes the public case walkthrough and contribution page; the backend root redirects to API documentation. Deployments are made explicitly from the reviewed source; these identifiers identify the snapshots independently of Git.

Reports remain in ignored `test-results/public/`; no real client project data or credentials are included in publishable documentation. Container/Render deployment and a broad external-model quality evaluation were not tested.
