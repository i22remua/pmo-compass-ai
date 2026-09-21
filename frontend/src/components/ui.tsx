'use client';
import { useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  Compass,
  FileText,
  Flag,
  GitBranch,
  ListChecks,
  LoaderCircle,
  Mail,
  MessagesSquare,
  NotebookPen,
  ShieldAlert,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { DocumentType, ProjectStatus } from '@/types';
import { useLocale } from './providers';

export const documentIcons: Record<DocumentType, LucideIcon> = {
  executive_brief: Flag,
  weekly_status: FileText,
  risk_register: ShieldAlert,
  meeting_minutes: MessagesSquare,
  action_items: ListChecks,
  stakeholder_email: Mail,
  scope_change: GitBranch,
  lessons_learned: NotebookPen,
};
export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className={`logo ${light ? 'logo-light' : ''}`} aria-label="PMO Compass AI">
      <span className="logo-mark">
        <Compass size={25} strokeWidth={1.7} />
      </span>
      {!compact && (
        <span>
          PMO Compass <b className="ai-label">AI</b>
        </span>
      )}
    </Link>
  );
}
export function LanguageSwitch() {
  const { language, setLanguage, t } = useLocale();
  return (
    <div className="language-switch" role="group" aria-label={t.interfaceLanguage}>
      <button
        onClick={() => setLanguage('es')}
        aria-pressed={language === 'es'}
        className={language === 'es' ? 'selected' : ''}
      >
        ES
      </button>
      <button
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={language === 'en' ? 'selected' : ''}
      >
        EN
      </button>
    </div>
  );
}
export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useLocale();
  return (
    <span className={`status-badge status-${status}`}>
      <span />
      {t.statuses[status]}
    </span>
  );
}
export function Spinner({ size = 18 }: { size?: number }) {
  return <LoaderCircle size={size} className="spin" aria-hidden="true" />;
}
export function LoadingState() {
  const { t } = useLocale();
  return (
    <div className="loading-state" role="status">
      <div className="loading-compass">
        <Compass size={32} className="spin-slow" />
      </div>
      <p>{t.loading}</p>
      <span className="loading-hint">{t.visual.loadingHint}</span>
      <div className="loading-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
export function EmptyState({
  title,
  text,
  children,
  icon: Icon = FileText,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <span className="empty-orbit" aria-hidden="true" />
        <Icon size={28} strokeWidth={1.5} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-heading-actions">{children}</div>}
    </div>
  );
}
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLocale();
  return (
    <div className="error-banner" role="alert">
      <ShieldAlert size={18} />
      <span>{message}</span>
      {onRetry && (
        <button className="text-button" onClick={onRetry}>
          {t.retry}
        </button>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  busy = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const { t } = useLocale();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'modal-wide' : ''}`}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-header">
        <h2 id={id}>{title}</h2>
        <button className="icon-button" disabled={busy} onClick={onClose} aria-label={t.close}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ConfirmDialog({
  title,
  text,
  onClose,
  onConfirm,
  busy,
  error,
  confirmLabel,
}: {
  title: string;
  text: string;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
  error?: string;
  confirmLabel?: string;
}) {
  const { t } = useLocale();
  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <div className="modal-body">
        <p className="muted">{text}</p>
        {error && <ErrorBanner message={error} />}
      </div>
      <div className="modal-footer">
        <button className="button button-secondary" onClick={onClose} disabled={busy} autoFocus>
          {t.cancel}
        </button>
        <button className="button button-danger" disabled={busy} onClick={onConfirm}>
          {busy && <Spinner />}
          {confirmLabel || t.delete}
        </button>
      </div>
    </Modal>
  );
}
export function QuickGenerate() {
  const { t } = useLocale();
  return (
    <div className="quick-generate">
      <div className="quick-orbit" aria-hidden="true">
        <Compass size={160} strokeWidth={0.65} />
      </div>
      <div className="quick-icon">
        <Sparkles size={22} />
      </div>
      <h3>{t.quickGenerate}</h3>
      <Link href="/generator" className="button button-white">
        {t.generateDocument}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
export function SelectField({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="select-wrap">
      <select {...props}>{children}</select>
      <ChevronDown size={15} />
    </div>
  );
}
