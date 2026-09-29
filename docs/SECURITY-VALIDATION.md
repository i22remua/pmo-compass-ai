# Security validation

This report is updated only with checks actually executed for the current security-hardening revision. Console-only App Check enforcement and live account-email delivery are intentionally not marked as verified by source tests.

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
- A safe fictional external-mode generation request returned HTTP 200 through the offline fallback with `fallbackFrom: auto`. This verifies availability when external AI is unavailable; it does not verify Gemini for this revision.

## Manual production controls

- App Check registration, monitoring and enforcement: pending operator configuration described in [app-check-setup.md](app-check-setup.md).
- Production email delivery for verification/reset: requires a real inbox and Firebase Console template/domain verification.
- Process-local rate limiting is verified only as an instance-level control; no global distributed quota is claimed.
- Client-side or end-to-end encryption is not claimed or implemented.
