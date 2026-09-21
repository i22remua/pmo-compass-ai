'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, runTransaction } from 'firebase/firestore';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { en, type Dictionary } from '@/locales/en';
import { es } from '@/locales/es';
import type { Language, User } from '@/types';
import { firebaseConfigured, getFirebase } from '@/lib/firebase';
import { readStorage, writeStorage } from '@/lib/errors';

const LocaleContext = createContext<{
  language: Language;
  t: Dictionary;
  setLanguage: (language: Language) => void;
}>({ language: 'es', t: es, setLanguage: () => {} });
export const useLocale = () => useContext(LocaleContext);

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authIssue: unknown;
  login: (email: string, password: string, name?: string) => Promise<void>;
  startDemo: () => void;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}

type ToastValue = { notify: (message: string, kind?: 'success' | 'error') => void };
const ToastContext = createContext<ToastValue>({ notify: () => {} });
export const useToast = () => useContext(ToastContext);

async function syncProfile(account: FirebaseUser, language: Language) {
  const { db } = getFirebase();
  const ref = doc(db, 'users', account.uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists() ? snapshot.data() : null;
    const profile = {
      uid: account.uid,
      name: account.displayName || previous?.name || account.email?.split('@')[0] || 'PM',
      email: account.email || '',
      preferredLanguage: previous?.preferredLanguage || language,
      createdAt: previous?.createdAt || new Date().toISOString(),
    };
    transaction.set(ref, profile);
    return profile;
  });
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authIssue, setAuthIssue] = useState<unknown>(null);
  const authOperation = useRef(false);
  const { language, setLanguage } = useLocale();
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    let live = true;
    try {
      const demoId = readStorage('pmo.demo.active');
      if (demoId) {
        setUser({ uid: demoId, name: 'PM', email: '', mode: 'demo' });
        setLoading(false);
      }
      if (!firebaseConfigured) {
        setLoading(false);
        return;
      }
      const { auth } = getFirebase();
      const unsubscribe = onAuthStateChanged(auth, async (account) => {
        try {
          if (authOperation.current) return;
          if (readStorage('pmo.demo.active')) return;
          if (account) {
            setUser({
              uid: account.uid,
              name: account.displayName || account.email?.split('@')[0] || 'PM',
              email: account.email || '',
              mode: 'firebase',
            });
            const profile = await syncProfile(account, languageRef.current);
            if (!live) return;
            const preferred = profile.preferredLanguage;
            if (preferred === 'es' || preferred === 'en') setLanguage(preferred);
          } else setUser(null);
        } catch (error) {
          if (live) setAuthIssue(error);
        } finally {
          if (live) setLoading(false);
        }
      });
      return () => {
        live = false;
        unsubscribe();
      };
    } catch (error) {
      setAuthIssue(error);
      setLoading(false);
    }
    return () => {
      live = false;
    };
  }, [setLanguage]);

  const login = async (email: string, password: string, name?: string) => {
    const { auth } = getFirebase();
    authOperation.current = true;
    try {
      const result =
        name !== undefined
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password);
      if (name !== undefined) await updateProfile(result.user, { displayName: name.trim() });
      const profile = await syncProfile(result.user, language);
      writeStorage('pmo.demo.active', null);
      if (profile.preferredLanguage === 'es' || profile.preferredLanguage === 'en')
        setLanguage(profile.preferredLanguage);
      setAuthIssue(null);
      setUser({
        uid: result.user.uid,
        name: result.user.displayName || name || email.split('@')[0],
        email,
        mode: 'firebase',
      });
    } finally {
      authOperation.current = false;
    }
  };
  const startDemo = () => {
    const uid = readStorage('pmo.demo.uid') || `demo-${crypto.randomUUID()}`;
    writeStorage('pmo.demo.uid', uid);
    writeStorage('pmo.demo.active', uid);
    setAuthIssue(null);
    setUser({ uid, name: 'PM', email: '', mode: 'demo' });
  };
  const logout = async () => {
    if (firebaseConfigured) await signOut(getFirebase().auth);
    writeStorage('pmo.demo.active', null);
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, loading, authIssue, login, startDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>('es');
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setLanguage = useCallback((value: Language) => {
    updateLanguage(value);
    document.documentElement.lang = value;
    try {
      writeStorage('pmo.language', value);
    } catch {
      /* UI language remains usable without storage. */
    }
  }, []);
  useEffect(() => {
    try {
      const stored = readStorage('pmo.language');
      if (stored === 'en' || stored === 'es') setLanguage(stored);
    } catch {
      /* The workspace surfaces persistence errors when storage is needed. */
    }
  }, [setLanguage]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const notify = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, kind });
    timer.current = setTimeout(() => setToast(null), 5500);
  }, []);
  return (
    <LocaleContext.Provider value={{ language, t: language === 'es' ? es : en, setLanguage }}>
      <ToastContext.Provider value={{ notify }}>
        <AuthProvider>{children}</AuthProvider>
        <div aria-live="polite" aria-atomic="true" className="toast-region">
          {toast && (
            <div className={`toast toast-${toast.kind}`}>
              {toast.kind === 'success' ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}
              <span>{toast.message}</span>
              <button
                className="icon-button"
                aria-label={language === 'es' ? 'Cerrar' : 'Close'}
                onClick={() => setToast(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </ToastContext.Provider>
    </LocaleContext.Provider>
  );
}
