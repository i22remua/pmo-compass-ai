'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth, useLocale } from '@/components/providers';
import { ErrorBanner, LanguageSwitch, Logo, Spinner } from '@/components/ui';
import { firebaseConfigured } from '@/lib/firebase';
import { errorMessage } from '@/lib/errors';
import { ThemeToggle } from '@/components/theme-controls';

export default function Login() {
  const { t } = useLocale();
  const { login } = useAuth();
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firebaseConfigured || busy) return;
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password, register ? name.trim() : undefined);
      router.push('/dashboard');
    } catch (error) {
      setError(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <main className="auth-main">
        <div className="auth-top">
          <Link className="back-link" href="/">
            <ArrowLeft size={15} />
            {t.backHome}
          </Link>
          <div className="auth-appearance">
            <ThemeToggle />
            <LanguageSwitch />
          </div>
        </div>
        <div className="auth-form-container">
          <Logo />
          <h2>{register ? t.registerTitle : t.loginTitle}</h2>
          <p>{register ? t.registerSubtitle : t.loginSubtitle}</p>
          <form onSubmit={submit}>
            {register && (
              <label className="field">
                {t.fullName}
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder={t.nameExample}
                  disabled={busy}
                />
              </label>
            )}
            <label className="field">
              {t.email}
              <input
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder={t.emailExample}
                disabled={busy}
              />
            </label>
            <label className="field">
              {t.password}
              <input
                type="password"
                required
                minLength={register ? 8 : 1}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={register ? 'new-password' : 'current-password'}
                placeholder={t.passwordHint}
                disabled={busy}
              />
            </label>
            {error && <ErrorBanner message={error} />}
            {!firebaseConfigured && <div className="auth-config-notice">{t.cloudUnavailable}</div>}
            <button
              className="button button-primary button-full"
              type="submit"
              disabled={busy || !firebaseConfigured}
            >
              {busy ? <Spinner /> : null}
              {busy ? t.authWorking : register ? t.register : t.login}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? t.hasAccount : t.noAccount}{' '}
            <button
              onClick={() => {
                setRegister(!register);
                setError('');
              }}
            >
              {register ? t.login : t.register}
            </button>
          </p>
          <div className="auth-divider">
            <span>PMO COMPASS AI</span>
          </div>
          <Link className="button button-secondary button-full" href="/start">
            {t.tryDemo}
            <ArrowRight size={16} />
          </Link>
          <p className="auth-demo-note">{t.noCard}</p>
        </div>
      </main>
    </div>
  );
}
