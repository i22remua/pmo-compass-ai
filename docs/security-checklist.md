# Security release checklist

Automated checks supply evidence for the code controls. Console and production items remain manual until observed in the real environment.

- [x] Firestore rules tests pass.
- [x] Cross-user read, create, update and delete isolation passes.
- [ ] App Check production key is restricted to the production domain.
- [ ] App Check monitoring shows valid legitimate requests.
- [ ] Production App Check enforcement is enabled and verified.
- [ ] Production CSP contains a per-request nonce and no `unsafe-inline`, `unsafe-eval` or wildcard source.
- [ ] Production CORS allowlist returns the public origin and rejects an arbitrary origin.
- [x] No AI secrets or private Firebase credentials exist in frontend source/build output.
- [x] `npm run security:secrets` passes against tracked files.
- [x] `npm audit` and `pip-audit` results are reviewed.
- [x] Minimal external AI payload tests pass.
- [x] Operational logs contain no private project content or credentials.
- [x] Account deletion and cross-account isolation pass in the Firebase emulator.
- [ ] Production HTTPS and security headers pass `npm run security:headers`.
- [ ] Password reset, email verification and expired-session behavior are exercised.
- [ ] Data export is downloaded and reviewed for completeness.
