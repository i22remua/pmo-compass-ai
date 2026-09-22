'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, setDoc } from 'firebase/firestore';
import { CheckCircle2, Code2, Database, Languages, RefreshCw, UserRound } from 'lucide-react';
import { useAuth, useLocale, useToast } from '@/components/providers';
import { useWorkspace } from '@/components/workspace-provider';
import { ConfirmDialog, PageHeading, SelectField, Spinner } from '@/components/ui';
import { getFirebase } from '@/lib/firebase';
import { resetDemo } from '@/lib/repository';
import { healthCheck } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import type { Language } from '@/types';
import { ThemePreferences } from '@/components/theme-controls';

export default function Settings() {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLocale();
  const { notify } = useToast();
  const { refresh } = useWorkspace();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState<{ provider: string; status: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const check = async () => {
    setChecking(true);
    try {
      setHealth(await healthCheck());
    } catch {
      setHealth({ status: 'error', provider: '—' });
    } finally {
      setChecking(false);
    }
  };
  useEffect(() => {
    void check();
  }, []);
  const changeLanguage = async (value: Language) => {
    setLanguage(value);
    if (user?.mode === 'firebase') {
      try {
        await setDoc(
          doc(getFirebase().db, 'users', user.uid),
          { preferredLanguage: value },
          { merge: true },
        );
      } catch (error) {
        notify(errorMessage(error, t), 'error');
      }
    }
  };
  const reset = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await resetDemo(user, language);
      await refresh();
      notify(t.resetSuccess);
      setConfirm(false);
    } catch (error) {
      setError(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-content settings-page">
      <PageHeading title={t.settings} />
      <div className="settings-grid">
        <div className="stack">
          <section className="panel settings-panel">
            <h2>
              <UserRound size={20} />
              {t.account}
            </h2>
            <div className="settings-account">
              <div>
                <span>{t.fullName}</span>
                <strong>{user?.name}</strong>
              </div>
              <div>
                <span>{t.email}</span>
                <strong>{user?.email || t.demo}</strong>
              </div>
            </div>
          </section>
          <section className="panel settings-panel">
            <h2>
              <Languages size={20} />
              {t.preferences}
            </h2>
            <label className="field">
              {t.interfaceLanguage}
              <SelectField
                value={language}
                onChange={(e) => void changeLanguage(e.target.value as Language)}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </SelectField>
            </label>
            <p className="muted">{t.languageHint}</p>
            <ThemePreferences />
          </section>
          <section className="panel settings-panel">
            <h2>
              <Database size={20} />
              {t.dataStorage}
            </h2>
            <strong>{user?.mode === 'demo' ? t.localStorage : t.firebaseStorage}</strong>
            <p className="muted">
              {user?.mode === 'demo' ? t.localStorageHint : t.firebaseStorageHint}
            </p>
            {user?.mode === 'demo' && (
              <button className="button button-secondary" onClick={() => setConfirm(true)}>
                <RefreshCw size={15} />
                {t.resetDemo}
              </button>
            )}
          </section>
        </div>
        <div className="stack">
          <section className="panel settings-panel">
            <h2>
              <CheckCircle2 size={20} />
              {t.apiStatus}
            </h2>
            <div className="api-status-row">
              <span className={`connection-dot ${health?.status === 'ok' ? 'is-online' : ''}`} />
              {checking ? t.loading : health?.status === 'ok' ? t.connected : t.disconnected}
            </div>
            <p className="muted">
              {t.provider}: <strong>{health?.provider || '—'}</strong>
            </p>
            <button className="button button-secondary" onClick={check} disabled={checking}>
              {checking ? <Spinner size={16} /> : <RefreshCw size={16} />}
              {t.checkConnection}
            </button>
          </section>
          <section className="panel settings-panel technology-panel">
            <Code2 size={22} />
            <h2>{t.product.about}</h2>
            <Link className="text-link" href="/about">
              {t.product.usageDetails}
            </Link>
          </section>
        </div>
      </div>
      {confirm && (
        <ConfirmDialog
          title={t.resetTitle}
          text={t.resetText}
          confirmLabel={t.resetDemo}
          onClose={() => setConfirm(false)}
          onConfirm={reset}
          busy={busy}
          error={error}
        />
      )}
    </div>
  );
}
