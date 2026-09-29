import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getToken as getAppCheckToken,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { AppError } from './errors';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
export const cloudEnabled = process.env.NEXT_PUBLIC_DATA_MODE === 'firebase';
export const firebaseConfigured = cloudEnabled && Object.values(config).every(Boolean);
let connected = false;
let appCheck: AppCheck | null = null;

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean;
  }
}

function configureAppCheck(app: ReturnType<typeof initializeApp>) {
  if (typeof window === 'undefined' || appCheck) return appCheck;
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;
  const emulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
  if (!siteKey || emulators) return null;
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG === 'true'
  )
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return appCheck;
}

export function getFirebase() {
  if (!firebaseConfigured) throw new AppError('firebase_not_configured');
  const app = getApps().length ? getApp() : initializeApp(config);
  configureAppCheck(app);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' && !connected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8085);
    connected = true;
  }
  return { auth, db };
}

export async function appCheckHeader() {
  if (!firebaseConfigured) return {};
  const current = configureAppCheck(getApps().length ? getApp() : initializeApp(config));
  if (!current) return {};
  try {
    const token = await getAppCheckToken(current, false);
    return { 'X-Firebase-AppCheck': token.token };
  } catch {
    // Monitoring mode must remain usable while App Check registration is being validated.
    // Enforced backends still reject the missing token with a bounded public error.
    return {};
  }
}
