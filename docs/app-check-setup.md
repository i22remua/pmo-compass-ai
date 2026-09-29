# Firebase App Check rollout

The source supports reCAPTCHA Enterprise App Check and sends `X-Firebase-AppCheck` to FastAPI. Enforcement is deliberately not enabled by code. Complete monitoring and verify real traffic before blocking requests.

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
