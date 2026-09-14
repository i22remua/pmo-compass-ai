import { getApp, getApps, initializeApp } from 'firebase/app';
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

export function getFirebase() {
  if (!firebaseConfigured) throw new AppError('firebase_not_configured');
  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' && !connected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8085);
    connected = true;
  }
  return { auth, db };
}
