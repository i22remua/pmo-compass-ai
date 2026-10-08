# Security validation

## Public fallback — 8 October 2026

The owner requested that AI reviewers can interact with the public workspace. The deployed backend now has `APP_CHECK_PUBLIC_FALLBACK=true`: missing/invalid App Check is accepted only on the public workspace generation/intelligence routes, with server-enforced internal inference and existing bounds/rate limits. It grants no external-provider or Firestore access. Private API routes retain `APP_CHECK_MODE=enforce`; Firestore configuration was not changed.

225 backend tests passed, including 12 new boundary/fallback tests. Live public smoke passed. An automated browser received a Google attestation rejection but still generated an explicitly labelled offline document, exported Markdown and passed the mobile overflow check. Live private API access without attestation returned `401 invalid_app_check`. This verifies the bounded public fallback, not successful browser attestation or signed-in Firestore access. [Full current validation](VALIDATION.md#public-review-access--8-october-2026).


This report is updated only with checks actually executed for the current security-hardening revision. Live App Check evidence is recorded separately from source tests; live account-email delivery is not inferred from automated checks.

## Automated validation

Executed on 29 September 2026 against the security-hardening revision:

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed using the production Next.js configuration.
- `npm run test:api`: 213 tests passed. Two third-party deprecation warnings were reported; neither is a security test failure.
- `npm run test:rules`: 20 Firestore emulator tests passed, including cross-user access and invalid ownership relationships.
- `npm run test:e2e`: 21 tests passed, including malicious Markdown/URL rendering cases.
- `npm run test:providers`: 2 tests passed.
- `npm run test:firebase`: 4 Firebase emulator tests passed, including account-data deletion and cross-account isolation.
- `npm run test:a11y`: passed in light and dark themes on the public, workspace and security routes.
- `npm run security:secrets`: passed against Git-tracked files. The scanner reports paths and rule names only, never candidate values.
- `npm run security:dependencies`: npm reported zero production vulnerabilities and `pip-audit` reported no known vulnerabilities in `backend/requirements.txt`.
- `npm run check:docs`, `npm run check:release`, `npm run test:release` and `npm run format:check`: passed.

## Production verification

Commit `6c5a6a2` was deployed on 29 September 2026 to the stable frontend and backend URLs.

- Frontend deployment `dpl_5goqMSmHZPzdc3sbS67yX1ATYAyw` reached `READY` and was aliased to `https://pmo-compass-ai.vercel.app`.
- Backend deployment `dpl_878hRT1YwGfibo8QpkiEAubpRNwk` reached `READY` and was aliased to `https://pmo-compass-ai-api.vercel.app`.
- `npm run security:headers` passed against the stable frontend URL. HTTPS, HSTS, nonce CSP, `nosniff`, Referrer Policy, Permissions Policy and `frame-ancestors` were observed.
- The public smoke passed for landing, start flow, API documentation, social image, health, allowed-origin CORS, offline generation, inferred risks, diagnosis, contradictions, scenario simulation and rejection of unauthenticated private generation.
- A CORS preflight from `https://pmo-compass-ai.vercel.app` returned that exact allow-origin value. `https://attacker.example` returned no allow-origin value.
- `/security` returned HTTP 200 with the precise Spanish security disclosure.
- A safe fictional external-AI request reached Gemini, received an upstream HTTP 503 and returned HTTP 200 through the offline engine with `fallbackFrom: gemini`. This verifies provider failure handling and availability; it does not count as a successful Gemini generation for this revision.

## Manual production controls

- App Check registration, monitoring and enforcement: verified below for the API and Cloud Firestore. Authentication App Check enforcement is not enabled.
- Production email delivery for verification/reset: requires a real inbox and Firebase Console template/domain verification.
- Process-local rate limiting is verified only as an instance-level control; no global distributed quota is claimed.
- Client-side or end-to-end encryption is not claimed or implemented.

## App Check production rollout — 30 September 2026

- Enabled the App Check and reCAPTCHA Enterprise APIs in the existing unbilled Google Cloud project. Registered a score-based key restricted to `pmo-compass-ai.vercel.app`, with domain validation enabled, no localhost/previews, and a 3,600-second App Check token lifetime. The production app has zero registered debug tokens.
- Deployed the public site key as frontend production configuration and corrected CSP to permit Google's specific reCAPTCHA frame and connection paths. The frontend deployment is `dpl_GWkrmF9VfeAQovkLAEYwNb8hvQuT`.
- Deployed backend monitoring first (`dpl_CvGieoWCc73GCxWJnVoxQXvt3rMP`). Real browser exchanges returned 200; the token was independently verified for the expected Firebase app ID; backend logs recorded `outcome=valid mode=monitor` for public and authenticated generation. The browser recorded no CSP violations in the generation check.
- A dedicated temporary account completed login, project creation, source extraction/storage, PMO record creation, private document generation, saved-document persistence after reload, JSON export and reauthenticated account deletion. The export contained the project, document, source and record. Owner-scoped administrative checks found no remaining test data or Auth account. No existing user data was changed and no verification emails were sent.
- After those monitoring checks passed, enabled Cloud Firestore `ENFORCED` and backend `APP_CHECK_MODE=enforce` (`dpl_2853FVyfWzVfBT9z5W3w2hGmnBFM`). Repeated the complete temporary-account lifecycle successfully. The same authenticated Firestore profile read returned 200 with App Check and 403 without it. API requests with missing and invalid App Check tokens both returned 401 `invalid_app_check`.
- Production `security:headers` and the updated `smoke:public` passed. The smoke obtains a real browser attestation in memory and verifies that private generation still rejects missing Firebase authentication after App Check succeeds. No debug or administrative bypass is used.
- Local lint, typecheck, 213 API tests, production build, formatting and all three security browser tests passed for the CSP adjustment. The browser tests assert the reCAPTCHA CSP paths remain available without adding `unsafe-inline`.

These are controlled browser checks from the verification environment, not evidence of every visitor/device or long-term abuse resistance. Firebase Authentication App Check enforcement remains off; password authentication, verified API ID tokens and owner rules remain in place.
