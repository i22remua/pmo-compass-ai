# Release checklist

Current scope: public deployment preparation, free-tier provider routing, explainable inference and a product-first bilingual workspace. **The owner has approved commit/push and refreshed LinkedIn material. The app is deployed directly to Vercel; public offline generation, real Gemini generation and Firebase login/persistence are verified.**

## Local quality gate

Record actual outcomes in [VALIDATION.md](VALIDATION.md): check:release, check (lint/typecheck/API/build), format:check, test:release, browser tests, provider tests, rules/Firebase emulators and accessibility. Generated traces, logs and private environments remain ignored.

## Configuration and publication hygiene

- `AI_PROVIDER=auto` with offline fallback; provider keys in backend secrets only.
- Free-only controls, input/output limits, timeouts, per-user/IP quotas and visible actual-provider provenance.
- Starter Projects optional; existing browser storage remains compatible and cloud storage stays separate.
- Ownership/document-parent invariants and retryable deletion preserved.
- Public frontend/backend URLs pass smoke:public; the Render URL remains an alternative placeholder.
- Firebase production guards reject emulators; Vercel hosted builds reject localhost API configuration.
- Review the publishable and staged diff for secrets before the authorised commit/push.

## Documentation and presentation

[README](../README.md), [deployment](deployment.md), [public live checklist](public-live-checklist.md), [AI strategy](ai-strategy.md), [architecture](architecture.md), [roadmap](product-roadmap.md) and [LinkedIn copy](linkedin-publication.md) describe the current candidate. Screenshots and LinkedIn copy reflect the live compact interface. Older audit reports/video remain historical.

## Approval and release

1. Owner reviewed the public app and authorised commit/push and refreshed publication material.
2. Review the staged files, preserve remote changes and run the release checks.
3. Commit and push; inspect GitHub Actions for the published revision.
4. Keep deployment IDs and live checks in the validation record.
5. Owner publishes the prepared LinkedIn text and current images manually.
