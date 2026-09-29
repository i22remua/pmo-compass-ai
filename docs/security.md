# Security architecture

PMO Compass uses layered controls across the browser, FastAPI and Firebase. These controls reduce risk; they do not make an internet service risk-free or certified against a compliance framework.

## Trust boundaries

- Firebase Authentication establishes the account identity. Private API authorization derives only from a Firebase ID token verified by the backend with revocation checks.
- Firestore rules are the data authorization boundary. Every private resource contains `ownerId`; writes, queries and deletes are evaluated against `request.auth.uid` and child resources require an active project owned by the same uid.
- Browser input, uploaded excerpts and AI output are untrusted. Pydantic rejects unknown API fields and enforces bounds. Generated Markdown is rendered without raw HTML, images are disabled and links are limited to HTTP, HTTPS, email and local anchors.
- AI credentials stay in backend environment variables. External providers receive a purpose-built minimal context without Firebase uid, email, tokens, persistent source/record IDs or account metadata.

## Endpoint matrix

| Endpoint | Access | Owner scope | Notes |
| --- | --- | --- | --- |
| `GET /api/v1/health` | Public | N/A | Returns operational configuration names, never secrets. |
| `POST /api/v1/workspace/generate` | Public | N/A | Receives caller-supplied context only; cannot read Firestore. IP quota and App Check rollout apply. |
| `POST /api/v1/workspace/intelligence` | Public | N/A | Deterministic analysis of caller-supplied context; cannot read Firestore. |
| `POST /api/v1/demo/generate` | Public legacy | N/A | Always uses the offline engine. |
| `POST /api/v1/generate` | Firebase token | N/A | Identity is verified, but the endpoint still only processes the submitted snapshot and has no Firestore credentials. |
| `POST /api/v1/intelligence` | Firebase token | N/A | Same authorization boundary and no direct stored-data access. |

There are no administrative endpoints. Project ownership is enforced by Firestore rather than an API payload. Supplying an `ownerId`, `userId` or email to FastAPI is rejected as an unexpected field.

## Network and browser controls

Production CORS accepts explicit HTTPS origins configured server-side. The public origin is `https://pmo-compass-ai.vercel.app`; arbitrary origins are not reflected. Next.js creates a fresh CSP nonce per HTML request. Production CSP has no wildcard, `unsafe-inline` or `unsafe-eval`, blocks objects and framing, and limits connections to the configured API, Firebase and App Check dependencies. HSTS, `nosniff`, referrer and permissions policies are also sent.

Bearer tokens are added to API requests in memory and are not application cookies. Traditional cross-site request forgery does not automatically attach the authorization credential. XSS and token theft remain relevant, which is why CSP and safe rendering are required. If cookies are introduced later, they must be `Secure`, `HttpOnly`, `SameSite` and paired with CSRF protection.

## Abuse and logging

AI and intelligence endpoints have per-minute process-local limits; external free-tier calls also have daily and minute quotas by uid/IP. This is a useful no-cost guard, but it is not globally consistent across Vercel instances. Provider quotas and App Check complement it. A shared durable limiter is a future option if abuse warrants its cost.

Operational logs contain request ID, path, status, duration, provider and stable error type. Code does not log Authorization headers, App Check tokens, API keys, full project text, notes or generated documents. Upstream provider bodies are not returned to users or written to logs.

## Account and data controls

Firebase supplies password hashing, email verification messages, password reset and expired-session behavior. Settings lets a signed-in user export their current data or delete the account and owned projects, documents, sources, records and profile. Account deletion requires password reauthentication and typing the account email. Individual project deletion first marks the project as deleting, prevents new children and performs retryable owner-scoped cleanup.

The local workspace is browser-local and has no cloud account boundary. Clearing site storage removes it. It must not be used as a substitute for authenticated cross-device storage.

## Verification

Use `npm run test:security`, `npm run security:dependencies`, `npm run test:firebase` and `npm run security:headers`. See [Security validation](SECURITY-VALIDATION.md), [data security](data-security.md), [App Check setup](app-check-setup.md), and the [operator checklist](security-checklist.md).
