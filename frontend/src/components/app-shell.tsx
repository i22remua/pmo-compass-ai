'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth, useLocale, useToast } from './providers';
import { LanguageSwitch, LoadingState, Logo, ErrorBanner } from './ui';
import { WorkspaceProvider, useWorkspace } from './workspace-provider';
import { errorMessage } from '@/lib/errors';
import { ThemeToggle } from './theme-controls';

function WorkspaceContent({ children }: { children: React.ReactNode }) {
  const { loading, error, refresh } = useWorkspace();
  const { t } = useLocale();
  return loading ? (
    <LoadingState />
  ) : error ? (
    <div className="page-content">
      <ErrorBanner message={errorMessage(error, t)} onRetry={() => void refresh()} />
    </div>
  ) : (
    children
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, authIssue } = useAuth();
  const { t } = useLocale();
  const { notify } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rail = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!loading && !user && !loggingOut) router.replace('/login');
  }, [loading, user, router, loggingOut]);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const trigger = menuButton.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(
        rail.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') || [],
      );
    rail.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const desktop = window.matchMedia('(min-width: 801px)');
    const resize = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener('change', resize);
    window.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener('change', resize);
      window.removeEventListener('keydown', close);
      trigger?.focus();
    };
  }, [open]);
  if (loading || !user) return <LoadingState />;
  const nav = [
    { href: '/dashboard', label: t.dashboard, code: '01' },
    { href: '/projects', label: t.projects, code: '02' },
    { href: '/generator', label: t.generator, code: '03' },
    { href: '/documents', label: t.documents, code: '04' },
  ];
  const current = nav.find((item) => pathname.startsWith(item.href))?.label || t.settings;
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      setLoggingOut(false);
      notify(errorMessage(error, t), 'error');
    }
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t.visual.skipContent}
      </a>
      {open && (
        <button className="sidebar-overlay" aria-label={t.close} onClick={() => setOpen(false)} />
      )}
      <aside
        ref={rail}
        id="workspace-index"
        className={`sidebar ${open ? 'sidebar-open' : ''}`}
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        aria-label={t.workspace}
      >
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button mobile-only"
            onClick={() => setOpen(false)}
            aria-label={t.close}
          >
            <X size={20} />
          </button>
        </div>
        <p className="rail-index">{t.compass.index} / 01—04</p>
        <nav aria-label={t.workspace}>
          {nav.map(({ href, label, code }) => (
            <div key={href}>
              <Link
                className={`nav-link ${pathname.startsWith(href) ? 'nav-active' : ''}`}
                href={href}
                aria-current={pathname.startsWith(href) ? 'page' : undefined}
              >
                <span className="nav-code" aria-hidden="true">
                  {code}
                </span>
                <span>{label}</span>
              </Link>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href="/settings"
            className={`nav-link ${pathname === '/settings' ? 'nav-active' : ''}`}
            aria-current={pathname === '/settings' ? 'page' : undefined}
          >
            <span className="nav-code" aria-hidden="true">
              05
            </span>
            <span>{t.settings}</span>
          </Link>
          <div className="sidebar-user">
            <div>
              <strong>{user.name}</strong>
              <span>{user.mode === 'demo' ? t.demo : t.account}</span>
            </div>
            <button className="icon-button" aria-label={t.logout} onClick={handleLogout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-main" inert={open}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-only"
              aria-label={t.workspace}
              aria-expanded={open}
              aria-controls="workspace-index"
              ref={menuButton}
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="section-reference">
              PMO / {nav.find((item) => pathname.startsWith(item.href))?.code || '05'}
            </span>
            <strong>{current}</strong>
          </div>
          <div className="topbar-right">
            <span className={`mode-indicator ${user.mode === 'demo' ? '' : 'mode-cloud'}`}>
              <span />
              {user.mode === 'demo' ? t.demo : t.cloudMode}
            </span>
            <ThemeToggle />
            <LanguageSwitch />
          </div>
        </header>
        {authIssue !== null && (
          <div className="shell-notice">
            <ErrorBanner message={errorMessage(authIssue, t)} />
          </div>
        )}
        <WorkspaceProvider key={`${user.mode}-${user.uid}`}>
          <main id="main-content">
            <WorkspaceContent>{children}</WorkspaceContent>
          </main>
        </WorkspaceProvider>
        <footer className="app-footer">
          <span>PMO Compass AI</span>
          <Link href="/about">{t.product.about}</Link>
          <Link href="/security">{t.securityPage}</Link>
        </footer>
      </div>
    </div>
  );
}
