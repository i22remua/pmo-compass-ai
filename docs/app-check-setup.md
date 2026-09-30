# Firebase App Check rollout

Production rollout completed on **30 September 2026** with the owner's authorization. reCAPTCHA Enterprise is registered for the existing Firebase web app, restricted to `pmo-compass-ai.vercel.app`, with a one-hour token lifetime. No debug tokens are registered for this production app. The Google Cloud project has no billing account enabled.

Valid public and authenticated browser requests were observed in `APP_CHECK_MODE=monitor` before enabling enforcement. **Cloud Firestore now uses `ENFORCED` and FastAPI uses `APP_CHECK_MODE=enforce`.** Firebase Authentication App Check enforcement was not enabled; Firebase ID-token authentication and Firestore ownership rules remain independent controls.

The production smoke obtains a real browser token when the API requires it; it does not use debug tokens, service-account bypasses or a stored App Check token. Install Chromium with `npx playwright install chromium` before running `npm run smoke:public` from a fresh checkout. See [verified evidence](SECURITY-VALIDATION.md#app-check-production-rollout--30-september-2026).

The steps below describe setup for another deployment or a future key replacement. Follow monitoring before enforcement for every new app/domain.

## 1. Create the production key

1. In Google Cloud Console, select the Firebase production project.
2. Open **reCAPTCHA Enterprise → Keys → Create key → Website**.
3. Add only `pmo-compass-ai.vercel.app` and any owned production custom domain. Do not add `localhost` to this production key.
4. Keep the integration type suitable for score-based web assessment and create the key.
5. Copy the public site key. It is intended for browser configuration; there is no reCAPTCHA secret in the frontend.

## 2. Register the Firebase web app

1. Open **Firebase Console → App Check → Apps**.
2. Select the existing PMO Compass web app and choose **reCAPTCHA Enterprise**.
3. Enter the public site key and register.
4. In Vercel frontend production variables, set `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY` to that public key.
5. Leave `NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG` unset or `false` in Production and Preview.
6. Redeploy the frontend. Confirm the browser sends `X-Firebase-AppCheck` to the PMO API and Firebase App Check metrics show valid requests.

## 3. Monitor the custom backend

1. Set backend `APP_CHECK_MODE=monitor` and deploy.
2. Confirm logs contain only `endpoint`, `outcome` and `mode`; they must never contain token values.
3. Exercise landing, account registration/login, project CRUD, sources, generation, intelligence, export and deletion from the production domain.
4. Review valid, missing and invalid results for at least the intended test window. Investigate legitimate missing requests before enforcement.

## 4. Enforce after verification

1. In Firebase App Check, enable enforcement for Cloud Firestore and other supported Firebase products used by the web app only after their valid-request metrics are healthy.
2. Set backend `APP_CHECK_MODE=enforce` and redeploy.
3. Repeat the production smoke tests. Requests without a valid token should receive `401 invalid_app_check`; valid web requests must continue to work.
4. Record the date and evidence in `docs/SECURITY-VALIDATION.md` and check the enforcement items in `docs/security-checklist.md`.

App Check attests the application instance; it does not identify a user and never replaces Firebase Authentication, Firestore rules or rate limits.

## Local development

The Firebase emulators bypass App Check initialization. To test against a real non-production Firebase project, set a non-production site key and `NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG=true` only in a local untracked environment. Open the browser console once, copy the generated debug token, and register it under **App Check → Manage debug tokens** for the non-production app. Remove it after testing.

The production build fails if the debug flag is `true`. Never register a development debug token as a production operational credential and never put a debug token in a `NEXT_PUBLIC_` variable or the repository.

## Recovery

If legitimate production requests begin to fail, change backend `APP_CHECK_MODE` to `monitor` and redeploy. Set Cloud Firestore App Check enforcement to monitoring in Firebase Console while investigating. Preserve Firebase Authentication and Firestore owner rules. Preview domains and localhost are deliberately not authorized by the production reCAPTCHA key; use the emulators or a separate non-production app/key for development.

Official references: [Firebase Enterprise setup](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider), [reCAPTCHA CSP guidance](https://docs.cloud.google.com/recaptcha/docs/faq), and [service enforcement API](https://firebase.google.com/docs/reference/appcheck/rest/v1/projects.services/patch).
