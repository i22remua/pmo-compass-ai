'use client';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Project, ProjectRecord, RecordKind } from '@/types';
import { useAuth, useLocale, useToast } from './providers';
import { useWorkspace } from './workspace-provider';
import { ConfirmDialog, ErrorBanner, Modal, SelectField, Spinner } from './ui';
import { removeRecord, saveRecord } from '@/lib/repository';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';

export type RecordDraft = Partial<Pick<ProjectRecord, 'kind' | 'title' | 'evidence'>>;
export function RecordForm({
  project,
  existing,
  proposal,
  onClose,
}: {
  project: Project;
  existing?: ProjectRecord;
  proposal?: RecordDraft;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { t } = useLocale();
  const { notify } = useToast();
  const { refresh } = useWorkspace();
  const [form, setForm] = useState({
    kind: existing?.kind || proposal?.kind || ('action' as RecordKind),
    title: existing?.title || proposal?.title?.slice(0, 300) || '',
    status: existing?.status || ('open' as 'open' | 'closed'),
    dueDate: existing?.dueDate || '',
    severity: existing?.severity || ('unspecified' as ProjectRecord['severity']),
    evidence: existing?.evidence || proposal?.evidence?.slice(0, 2000) || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title={existing ? t.tracking.edit : t.tracking.add} onClose={onClose} busy={busy}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!user || busy) return;
          setBusy(true);
          try {
            await saveRecord(user, project, form, existing);
            await refresh();
            notify(t.tracking.saved);
            onClose();
          } catch (issue) {
            setError(errorMessage(issue, t));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="modal-body form-grid">
          {proposal && <p className="field-hint full-span">{t.tracking.proposed}</p>}
          <label className="field full-span">
            {t.tracking.kind}
            <SelectField
              value={form.kind}
              disabled={busy}
              onChange={(e) =>
                setForm({
                  ...form,
                  kind: e.target.value as RecordKind,
                  dueDate: '',
                  severity: 'unspecified',
                })
              }
            >
              {(['action', 'decision', 'risk'] as const).map((kind) => (
                <option key={kind} value={kind}>
                  {t.tracking[kind]}
                </option>
              ))}
            </SelectField>
          </label>
          <label className="field full-span">
            {t.tracking.name}
            <input
              autoFocus
              required
              minLength={2}
              maxLength={300}
              disabled={busy}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          {form.kind === 'action' && (
            <label className="field full-span">
              {t.tracking.due}
              <input
                type="date"
                max="9999-12-31"
                disabled={busy}
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </label>
          )}
          {form.kind === 'risk' && (
            <label className="field full-span">
              {t.tracking.severity}
              <SelectField
                disabled={busy}
                value={form.severity}
                onChange={(e) =>
                  setForm({ ...form, severity: e.target.value as ProjectRecord['severity'] })
                }
              >
                {(['unspecified', 'low', 'medium', 'high'] as const).map((value) => (
                  <option key={value} value={value}>
                    {t.tracking[value]}
                  </option>
                ))}
              </SelectField>
            </label>
          )}
          <label className="field full-span">
            {t.tracking.evidence}
            <textarea
              rows={3}
              maxLength={2000}
              disabled={busy}
              value={form.evidence}
              onChange={(e) => setForm({ ...form, evidence: e.target.value })}
            />
          </label>
          {error && (
            <div className="full-span">
              <ErrorBanner message={error} />
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="button button-secondary"
            disabled={busy}
            onClick={onClose}
          >
            {t.cancel}
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy && <Spinner />}
            {t.tracking.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function ProjectTracking({ project }: { project: Project }) {
  const { user } = useAuth();
  const { t, language } = useLocale();
  const { records, refresh } = useWorkspace();
  const [editing, setEditing] = useState<ProjectRecord | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<ProjectRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const entries = records
    .filter((r) => r.projectId === project.id)
    .sort((a, b) => b.status.localeCompare(a.status) || b.updatedAt.localeCompare(a.updatedAt));
  return (
    <section className="tracking-workspace">
      <div className="section-heading">
        <h2>{t.tracking.title}</h2>
        <button
          className="button button-primary"
          disabled={project.deleting}
          onClick={() => setEditing(null)}
        >
          {t.tracking.add}
        </button>
      </div>
      <p className="field-hint">{t.tracking.hint}</p>
      {error && <ErrorBanner message={error} />}
      {!entries.length && <p className="muted">{t.tracking.empty}</p>}
      {entries.map((record) => (
        <div
          className={`tracking-record ${record.status === 'closed' ? 'record-closed' : ''}`}
          key={record.id}
        >
          <div>
            <span className="section-reference">
              {t.tracking[record.kind]} / {t.tracking[record.status]}
            </span>
            <h3>{record.title}</h3>
            <p>
              {record.kind === 'action'
                ? `${t.tracking.due}: ${record.dueDate ? formatDate(record.dueDate, language) : t.tracking.noDate}`
                : record.kind === 'risk'
                  ? `${t.tracking.severity}: ${t.tracking[record.severity]}`
                  : ''}
            </p>
            {record.evidence && (
              <details>
                <summary>{t.tracking.evidence}</summary>
                <p className="preserve-lines">{record.evidence}</p>
              </details>
            )}
          </div>
          <div className="tracking-actions">
            <button
              className="text-button"
              disabled={busy || project.deleting}
              onClick={async () => {
                if (!user) return;
                setBusy(true);
                setError('');
                try {
                  await saveRecord(
                    user,
                    project,
                    { ...record, status: record.status === 'open' ? 'closed' : 'open' },
                    record,
                  );
                  await refresh();
                } catch (issue) {
                  setError(errorMessage(issue, t));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {record.status === 'open' ? t.tracking.close : t.tracking.reopen}
            </button>
            <button
              className="icon-button"
              disabled={busy || project.deleting}
              aria-label={`${t.edit}: ${record.title}`}
              onClick={() => setEditing(record)}
            >
              <Pencil size={16} />
            </button>
            <button
              className="icon-button danger-text"
              disabled={busy}
              aria-label={`${t.tracking.delete}: ${record.title}`}
              onClick={() => setDeleting(record)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
      {editing !== undefined && (
        <RecordForm
          project={project}
          existing={editing || undefined}
          onClose={() => setEditing(undefined)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t.tracking.delete}
          text={t.tracking.deleteHint}
          busy={busy}
          error={error}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            if (!user) return;
            setBusy(true);
            try {
              await removeRecord(user, deleting);
              await refresh();
              setDeleting(null);
            } catch (issue) {
              setError(errorMessage(issue, t));
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </section>
  );
}
