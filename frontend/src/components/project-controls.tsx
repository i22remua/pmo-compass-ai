'use client';
import { useEffect, useState } from 'react';
import { useAuth, useLocale, useToast } from './providers';
import { useWorkspace } from './workspace-provider';
import { ProjectTracking, openRecord } from './project-tracking';
import { ProjectUpdate } from './project-update';
import { ErrorBanner, Modal, SelectField, Spinner } from './ui';
import { useUnsavedNotes } from '@/hooks/use-unsaved-notes';
import { saveControl } from '@/lib/repository';
import { errorMessage } from '@/lib/errors';
import { ControlSummary } from './project-control-summary';
import { formatDate } from '@/lib/format';
import {
  difference,
  newControl,
  type ControlInput,
  type ControlKind,
  type ProjectControl,
} from '@/lib/project-controls';
import type { Project } from '@/types';
import type { Dictionary } from '@/locales/en';

type Labels = Dictionary['controls'];
type Field = {
  key: string;
  label: keyof Labels;
  type?: 'date' | 'number' | 'text';
  required?: boolean;
  max?: number;
  readonly?: boolean;
};
function fields(value: ControlInput, existing = false): Field[] {
  switch (value.kind) {
    case 'milestone':
      return [
        {
          key: 'baselineDate',
          label: 'baselineDate',
          type: 'date',
          required: true,
          readonly: existing,
        },
        { key: 'forecastDate', label: 'forecastDate', type: 'date' },
        { key: 'actualDate', label: 'actualDate', type: 'date' },
        { key: 'dependency', label: 'dependency', max: 1000 },
      ];
    case 'cost':
      return [
        { key: 'approved', label: 'approved', type: 'number' },
        { key: 'actual', label: 'actual', type: 'number' },
        { key: 'forecast', label: 'forecast', type: 'number' },
        { key: 'asOf', label: 'asOf', type: 'date', required: true },
      ];
    case 'benefit':
      return [
        { key: 'objective', label: 'objective', required: true, max: 1000 },
        { key: 'unit', label: 'unit', type: 'text', required: true, max: 80 },
        { key: 'baseline', label: 'benefitBaseline', type: 'number' },
        { key: 'target', label: 'target', type: 'number' },
        { key: 'actual', label: 'measurement', type: 'number' },
        ...(value.data.actual !== null
          ? [
              {
                key: 'measuredOn',
                label: 'measuredOn' as const,
                type: 'date' as const,
                required: true,
              },
            ]
          : []),
      ];
    default:
      return [
        { key: 'reason', label: 'reason', required: true },
        { key: 'alternatives', label: 'alternatives', required: value.data.status !== 'proposed' },
        { key: 'baseline', label: 'baseline' },
        ...(value.kind === 'change'
          ? [
              { key: 'scopeImpact', label: 'scopeImpact' as const },
              { key: 'timeImpact', label: 'timeImpact' as const },
              { key: 'costImpact', label: 'costImpact' as const },
            ]
          : []),
        ...(['accepted', 'rejected'].includes(value.data.status)
          ? [
              { key: 'resolution', label: 'resolution' as const, required: true },
              {
                key: 'decidedOn',
                label: 'decidedOn' as const,
                type: 'date' as const,
                required: true,
              },
              {
                key: 'decisionRole',
                label: 'decisionRole' as const,
                type: 'text' as const,
                required: true,
                max: 120,
              },
            ]
          : []),
      ];
  }
}
const values = (value: ControlInput) =>
  value.data as unknown as Record<string, string | number | null>;

function ControlDetails({ value }: { value: ProjectControl }) {
  const { t, language } = useLocale();
  const { records } = useWorkspace();
  const l = t.controls;
  const linked = records.find((r) => r.id === value.recordId && r.projectId === value.projectId);
  return (
    <>
      <dl className="control-details">
        {fields(value).map((field) => {
          const v = values(value)[field.key];
          return (
            <div key={field.key}>
              <dt>{l[field.label]}</dt>
              <dd className="preserve-lines">
                {v === '' || v === null
                  ? l.unknown
                  : field.type === 'date'
                    ? formatDate(String(v), language)
                    : typeof v === 'number'
                      ? new Intl.NumberFormat(language, { maximumFractionDigits: 4 }).format(v)
                      : v}
              </dd>
            </div>
          );
        })}
        {value.kind === 'benefit' && (
          <>
            <div>
              <dt>{l.direction}</dt>
              <dd>{l[value.data.direction]}</dd>
            </div>
            <div>
              <dt>{l.changeAmount}</dt>
              <dd>
                {difference(value.data.actual, value.data.baseline) === null
                  ? l.unknown
                  : new Intl.NumberFormat(language).format(
                      difference(value.data.actual, value.data.baseline)!,
                    )}{' '}
                {value.data.actual !== null && value.data.baseline !== null && value.data.unit}
              </dd>
            </div>
          </>
        )}
        <div>
          <dt>{l.evidence}</dt>
          <dd className="preserve-lines">{value.evidence || l.unknown}</dd>
        </div>
      </dl>
      {value.recordId &&
        (linked ? (
          <button className="text-button" onClick={() => openRecord(linked)}>
            {l.openRecord}: {linked.title} →
          </button>
        ) : (
          <p className="field-hint">{l.missingLink}</p>
        ))}
      <p className="field-hint">
        {l.recorded} · {formatDate(value.updatedAt, language)} · {l.version} {value.revision}
        {value.archived && ` · ${l.archivedLabel}`}
      </p>
    </>
  );
}

function ControlForm({
  project,
  initialKind,
  existing,
  close,
}: {
  project: Project;
  initialKind: ControlKind;
  existing?: ProjectControl;
  close: () => void;
}) {
  const { user } = useAuth();
  const { t } = useLocale();
  const { records, refresh } = useWorkspace();
  const { notify } = useToast();
  const l = t.controls;
  const [initial] = useState<ControlInput>(() => existing || newControl(initialKind));
  const [form, setForm] = useState<ControlInput>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const guard = useUnsavedNotes(dirty);
  useEffect(() => {
    if (guard.pending) {
      if (window.confirm(l.discard)) guard.proceed();
      else guard.cancel();
    }
  }, [guard, l.discard]);
  const requestClose = () => {
    if (!busy) guard.request(close);
  };
  const setValue = (key: string, value: string | number | null) =>
    setForm(
      (current) =>
        ({
          ...current,
          data: {
            ...current.data,
            [key]: value,
            ...(current.kind === 'benefit' && key === 'actual' && value === null
              ? { measuredOn: '' }
              : {}),
            ...((current.kind === 'change' || current.kind === 'decision') &&
            key === 'status' &&
            !['accepted', 'rejected'].includes(String(value))
              ? { resolution: '', decidedOn: '', decisionRole: '' }
              : {}),
          },
        }) as ControlInput,
    );
  const decision = form.kind === 'change' || form.kind === 'decision';
  const previousStatus =
    existing && (existing.kind === 'change' || existing.kind === 'decision')
      ? existing.data.status
      : null;
  const states = !previousStatus
    ? (['proposed'] as const)
    : previousStatus === 'proposed'
      ? (['proposed', 'reviewed'] as const)
      : previousStatus === 'reviewed'
        ? (['reviewed', 'accepted', 'rejected'] as const)
        : [previousStatus];
  const evidenceRequired =
    (decision && ['accepted', 'rejected'].includes(form.data.status)) ||
    ((form.kind === 'cost' || form.kind === 'benefit') && form.data.actual !== null);
  return (
    <Modal title={existing ? t.edit : l.add} onClose={requestClose} busy={busy}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!user || busy) return;
          setBusy(true);
          setError('');
          try {
            await saveControl(user, project, form, existing);
            await refresh();
            notify(l.saved);
            close();
          } catch (issue) {
            setError(errorMessage(issue, t));
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="control-form-fields">
          <div className="form-grid">
            {!existing && (
              <label className="field full-span">
                {l.kind}
                <SelectField
                  value={form.kind}
                  onChange={(event) =>
                    setForm({
                      ...newControl(event.target.value as ControlKind),
                      title: form.title,
                      evidence: form.evidence,
                      recordId: form.recordId,
                    })
                  }
                >
                  {(initialKind === 'change' || initialKind === 'decision'
                    ? (['change', 'decision'] as const)
                    : initialKind === 'benefit'
                      ? (['benefit'] as const)
                      : (['milestone', 'cost'] as const)
                  ).map((k) => (
                    <option key={k} value={k}>
                      {l[k]}
                    </option>
                  ))}
                </SelectField>
              </label>
            )}
            <label className="field full-span">
              {l.title}
              <input
                autoFocus
                required
                minLength={2}
                maxLength={160}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            {decision && (
              <label className="field full-span">
                {l.status}
                <SelectField
                  value={form.data.status}
                  onChange={(event) => setValue('status', event.target.value)}
                >
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {l[s]}
                    </option>
                  ))}
                </SelectField>
              </label>
            )}
            {fields(form, !!existing).map((field) => (
              <label key={field.key} className={`field ${!field.type ? 'full-span' : ''}`}>
                {l[field.label]}
                {field.type ? (
                  <input
                    type={field.type}
                    required={field.required}
                    readOnly={field.readonly}
                    min={field.type === 'number' && form.kind !== 'benefit' ? 0 : undefined}
                    max={
                      field.type === 'date'
                        ? '9999-12-31'
                        : field.type === 'number'
                          ? 1e12
                          : undefined
                    }
                    maxLength={field.type === 'text' ? field.max : undefined}
                    minLength={
                      field.type === 'text' && field.required
                        ? field.key === 'unit'
                          ? 1
                          : 2
                        : undefined
                    }
                    step={field.type === 'number' ? 'any' : undefined}
                    value={values(form)[field.key] ?? ''}
                    onChange={(event) =>
                      setValue(
                        field.key,
                        field.type === 'number'
                          ? event.target.value === ''
                            ? null
                            : Number(event.target.value)
                          : event.target.value,
                      )
                    }
                  />
                ) : (
                  <textarea
                    rows={2}
                    required={field.required}
                    minLength={field.required ? (field.key === 'unit' ? 1 : 2) : undefined}
                    maxLength={field.max || 2000}
                    value={String(values(form)[field.key] ?? '')}
                    onChange={(event) => setValue(field.key, event.target.value)}
                  />
                )}
              </label>
            ))}
            {form.kind === 'benefit' && (
              <label className="field">
                {l.direction}
                <SelectField
                  value={form.data.direction}
                  onChange={(event) => setValue('direction', event.target.value)}
                >
                  <option value="increase">{l.increase}</option>
                  <option value="decrease">{l.decrease}</option>
                </SelectField>
              </label>
            )}
            <label className="field full-span">
              {l.evidence}
              <textarea
                rows={2}
                required={evidenceRequired}
                maxLength={2000}
                value={form.evidence}
                onChange={(event) => setForm({ ...form, evidence: event.target.value })}
              />
            </label>
            <label className="field full-span">
              {l.recordId}
              <SelectField
                value={form.recordId}
                onChange={(event) => setForm({ ...form, recordId: event.target.value })}
              >
                <option value="">{l.none}</option>
                {form.recordId && !records.some((r) => r.id === form.recordId) && (
                  <option value={form.recordId}>{l.missingLink}</option>
                )}
                {records
                  .filter((r) => r.projectId === project.id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {t.tracking[r.kind]} · {r.title}
                    </option>
                  ))}
              </SelectField>
            </label>
            {existing && (
              <label className="checkbox-field full-span">
                <input
                  type="checkbox"
                  checked={form.archived}
                  onChange={(event) => setForm({ ...form, archived: event.target.checked })}
                />
                {l.archive}
              </label>
            )}
          </div>
        </fieldset>
        <p className="field-hint">
          {decision
            ? l.decisionNote
            : form.kind === 'milestone'
              ? l.baselineNote
              : form.kind === 'cost'
                ? l.costNote
                : l.benefitNote}
        </p>
        {error && <ErrorBanner message={error} />}
        <div className="modal-footer">
          <button
            type="button"
            className="button button-secondary"
            disabled={busy}
            onClick={requestClose}
          >
            {t.cancel}
          </button>
          <button className="button button-primary" disabled={busy || project.deleting}>
            {busy && <Spinner />}
            {t.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ProjectControlWorkspace({ project }: { project: Project }) {
  const { t, language } = useLocale();
  const l = t.controls;
  const { controls, controlVersions, refresh } = useWorkspace();
  const [section, setSection] = useState<'activity' | 'governance' | 'delivery' | 'benefits'>(
    'activity',
  );
  const [editing, setEditing] = useState<ProjectControl | null | undefined>();
  const [archived, setArchived] = useState(false);
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    const navigate = () => {
      const p = new URLSearchParams(location.search);
      const value = p.get('controlView');
      setSection(
        !p.get('record') && ['governance', 'delivery', 'benefits'].includes(value || '')
          ? (value as typeof section)
          : 'activity',
      );
    };
    navigate();
    window.addEventListener('hashchange', navigate);
    window.addEventListener('popstate', navigate);
    return () => {
      window.removeEventListener('hashchange', navigate);
      window.removeEventListener('popstate', navigate);
    };
  }, [project.id]);
  const select = (value: typeof section) => {
    const url = new URL(location.href);
    url.searchParams.delete('record');
    url.searchParams.set('controlView', value);
    url.hash = 'tracking';
    history.pushState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  const kinds: ControlKind[] =
    section === 'governance'
      ? ['change', 'decision']
      : section === 'delivery'
        ? ['milestone', 'cost']
        : ['benefit'];
  const entries = controls
    .filter(
      (c) => c.projectId === project.id && kinds.includes(c.kind) && (archived || !c.archived),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="control-workspace">
      <div className="project-update-entry">
        <button
          className="button button-secondary"
          disabled={project.deleting}
          onClick={() => setUpdating(true)}
        >
          {t.projectUpdate.title}
        </button>
      </div>
      {updating && (
        <ProjectUpdate
          key={project.id}
          project={project}
          close={() => setUpdating(false)}
          saved={() => {
            setUpdating(false);
            select('delivery');
          }}
        />
      )}
      <nav className="control-navigation" aria-label={t.tracking.title}>
        {(['activity', 'governance', 'delivery', 'benefits'] as const).map((key) => (
          <button
            key={key}
            className="text-button"
            aria-current={section === key ? 'page' : undefined}
            onClick={() => select(key)}
          >
            {l[key]}
          </button>
        ))}
      </nav>
      {section === 'activity' ? (
        <ProjectTracking project={project} />
      ) : (
        <section aria-label={l[section]}>
          <div className="section-heading">
            <h2>{l[section]}</h2>
            <button
              className="button button-primary"
              disabled={project.deleting}
              onClick={() => setEditing(null)}
            >
              {l.add}
            </button>
          </div>
          <div className="control-tools">
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={archived}
                onChange={(event) => setArchived(event.target.checked)}
              />
              {l.showArchived}
            </label>
            <button className="text-button" onClick={() => void refresh()}>
              {l.refresh}
            </button>
          </div>
          {!entries.length && <p className="muted">{l.empty}</p>}
          {entries.map((c) => (
            <article className="control-record" key={c.id}>
              <div className="section-heading">
                <div>
                  <span className="record-meta">
                    {l[c.kind]} · {l.provided}
                    {c.archived && ` · ${l.archivedLabel}`}
                  </span>
                  <h3>{c.title}</h3>
                </div>
                <button
                  className="text-button"
                  disabled={project.deleting}
                  onClick={() => setEditing(c)}
                >
                  {t.edit}
                </button>
              </div>
              <ControlSummary value={c} />
              <details>
                <summary>{l.details}</summary>
                <ControlDetails value={c} />
              </details>
              <details>
                <summary>
                  {l.history} ({c.revision})
                </summary>
                {controlVersions
                  .filter((v) => v.id === c.id && v.projectId === project.id)
                  .sort((a, b) => b.revision - a.revision)
                  .map((v) => (
                    <details className="control-version" key={v.versionId}>
                      <summary>
                        {l.version} {v.revision} · {new Date(v.updatedAt).toLocaleString(language)}
                      </summary>
                      <ControlSummary value={v} />
                      <ControlDetails value={v} />
                    </details>
                  ))}
              </details>
            </article>
          ))}
          <p className="field-hint">{l.privacy}</p>
        </section>
      )}
      {editing !== undefined && (
        <ControlForm
          project={project}
          initialKind={kinds[0]}
          existing={editing || undefined}
          close={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}
