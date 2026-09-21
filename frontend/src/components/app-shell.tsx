'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronRight,
  FileClock,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  FileText,
  X,
} from 'lucide-react';
import { useAuth, useLocale, useToast } from './providers';
import { LanguageSwitch, LoadingState, Logo, ErrorBanner } from './ui';
import { WorkspaceProvider, useWorkspace } from './workspace-provider';
import { errorMessage } from '@/lib/errors';
import { initials } from '@/lib/format';
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
  useEffect(() => {
    if (!loading && !user && !loggingOut) router.replace('/login');
  }, [loading, user, router, loggingOut]);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  if (loading || !user) return <LoadingState />;
  const nav = [
    { href: '/dashboard', label: t.dashboard, icon: LayoutDashboard },
    { href: '/projects', label: t.projects, icon: FolderKanban },
    { href: '/generator', label: t.generator, icon: FileText },
    { href: '/documents', label: t.documents, icon: FileClock },
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
      {open && (
        <button className="sidebar-overlay" aria-label={t.close} onClick={() => setOpen(false)} />
      )}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Logo light />
          <button
            className="icon-button mobile-only"
            onClick={() => setOpen(false)}
            aria-label={t.close}
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label={t.workspace}>
          {nav.map(({ href, label, icon: Icon }) => (
            <div key={href}>
              <Link
                className={`nav-link ${pathname.startsWith(href) ? 'nav-active' : ''}`}
                href={href}
                aria-current={pathname.startsWith(href) ? 'page' : undefined}
              >
                <Icon size={19} strokeWidth={1.7} />
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
            <Settings2 size={19} />
            <span>{t.settings}</span>
          </Link>
          <div className="sidebar-user">
            <span className="user-avatar">{initials(user.name)}</span>
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
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-only"
              aria-label={t.workspace}
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb-root">{t.workspace}</span>
            <ChevronRight size={13} />
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
        </footer>
      </div>
    </div>
  );
}
