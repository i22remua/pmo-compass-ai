'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { Download, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth, useLocale, useToast } from '@/components/providers';
import { useWorkspace } from '@/components/workspace-provider';
import { ConfirmDialog, PageHeading, ProviderLabel, SelectField, Spinner } from '@/components/ui';
import { getFirebase } from '@/lib/firebase';
import { deleteAllUserData, loadWorkspace, resetDemo } from '@/lib/repository';
import { healthCheck } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import type { Language } from '@/types';
import { ThemePreferences } from '@/components/theme-controls';

export default function Settings() {
  const { user, requestEmailVerification, reauthenticate, deleteAuthenticatedAccount } = useAuth();
  const router = useRouter();
  const { t, language, setLanguage } = useLocale();
  const { notify } = useToast();
  const { refresh } = useWorkspace();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState<{ provider: string; status: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
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
  const exportData = async () => {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      const workspace = await loadWorkspace(user);
      const payload = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          account: { name: user.name, email: user.email },
          workspace,
        },
        null,
        2,
      );
      const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `pmo-compass-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      notify(t.exportDataReady);
    } catch (issue) {
      setError(errorMessage(issue, t));
    } finally {
      setBusy(false);
    }
  };
  const verifyEmail = async () => {
    setBusy(true);
    try {
      await requestEmailVerification();
      notify(t.verificationSent);
    } catch (issue) {
      notify(errorMessage(issue, t), 'error');
    } finally {
      setBusy(false);
    }
  };
  const deleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || user.mode !== 'firebase' || deleteConfirmation !== user.email) return;
    setBusy(true);
    setError('');
    try {
      await reauthenticate(deletePassword);
      await deleteAllUserData(user);
      await deleteAuthenticatedAccount();
      router.replace('/');
    } catch (issue) {
      setError(errorMessage(issue, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-content settings-page">
      <PageHeading eyebrow={t.preferences} title={t.settings} />
      <div className="settings-grid">
        <div className="stack">
          <section className="panel settings-panel">
            <h2>{t.account}</h2>
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
            {user?.mode === 'firebase' && !user.emailVerified && (
              <button className="button button-secondary" onClick={verifyEmail} disabled={busy}>
                {t.verifyEmail}
              </button>
            )}
          </section>
          <section className="panel settings-panel">
            <h2>{t.preferences}</h2>
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
            <h2>{t.dataStorage}</h2>
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
            <button className="button button-secondary" onClick={exportData} disabled={busy}>
              <Download size={15} />
              {t.exportMyData}
            </button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </section>
          {user?.mode === 'firebase' && (
            <section className="panel settings-panel">
              <h2>{t.deleteAccountData}</h2>
              <p className="muted">{t.deleteAccountHint}</p>
              {!deleteOpen ? (
                <button className="button button-danger" onClick={() => setDeleteOpen(true)}>
                  <Trash2 size={15} />
                  {t.deleteAccountData}
                </button>
              ) : (
                <form className="stack" onSubmit={deleteAccount}>
                  <label className="field">
                    {t.password}
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={deletePassword}
                      onChange={(event) => setDeletePassword(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    {t.confirmWithEmail}
                    <input
                      required
                      autoComplete="off"
                      value={deleteConfirmation}
                      onChange={(event) => setDeleteConfirmation(event.target.value)}
                      placeholder={user.email}
                    />
                  </label>
                  <div className="inline-actions">
                    <button
                      className="button button-danger"
                      type="submit"
                      disabled={busy || deleteConfirmation !== user.email}
                    >
                      {busy ? <Spinner size={16} /> : <Trash2 size={15} />}
                      {t.deletePermanently}
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => setDeleteOpen(false)}
                    >
                      {t.cancel}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}
        </div>
        <div className="stack">
          <section className="panel settings-panel">
            <h2>{t.apiStatus}</h2>
            <div className="api-status-row">
              <span className={`connection-dot ${health?.status === 'ok' ? 'is-online' : ''}`} />
              {checking ? t.loading : health?.status === 'ok' ? t.connected : t.disconnected}
            </div>
            <p className="muted">
              {t.provider}:{' '}
              <strong>
                {health?.provider === 'demo' || health?.provider === 'offline' ? (
                  <ProviderLabel provider={health.provider} />
                ) : (
                  health?.provider || '—'
                )}
              </strong>
            </p>
            <button className="button button-secondary" onClick={check} disabled={checking}>
              {checking ? <Spinner size={16} /> : <RefreshCw size={16} />}
              {t.checkConnection}
            </button>
          </section>
          <section className="panel settings-panel technology-panel">
            <h2>{t.product.about}</h2>
            <Link className="text-link" href="/about">
              {t.product.usageDetails}
            </Link>
            <Link className="text-link" href="/security">
              <ShieldCheck size={15} /> {t.securityPage}
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
