'use client';
import { useCallback, useEffect, useState } from 'react';
import type { FindingResolution, Project, ProjectReview, ReviewFinding } from '@/types';
import type { ProjectAnalysisState } from '@/hooks/use-project-analysis';
import { committeeReport, parseReview, reviewData, snapshotChanges } from '@/lib/project-review';
import { digest } from '@/lib/review-context';
import {
  loadProjectHistory,
  historyCursor,
  resolveFinding,
  saveDocument,
  saveProjectReview,
} from '@/lib/repository';
import { errorMessage } from '@/lib/errors';
import { exportMarkdown } from '@/lib/format';
import { useAuth, useLocale, useToast } from './providers';
import { useWorkspace } from './workspace-provider';
import { ProposalAction, RecordForm, type RecordDraft } from './project-tracking';
import { ErrorBanner, Spinner } from './ui';

function FindingRow({
  finding,
  resolution,
  previous,
  project,
  references,
  readonly,
  disabled,
  reload,
}: {
  finding: ReviewFinding;
  resolution?: FindingResolution;
  previous: FindingResolution[];
  project: Project;
  references: Record<string, { kind: string; id: string; view?: string }>;
  readonly: boolean;
  disabled: boolean;
  reload: () => Promise<void>;
}) {
  const { user } = useAuth(),
    { t } = useLocale(),
    l = t.committee;
  const [reason, setReason] = useState(resolution?.reason || ''),
    [status, setStatus] = useState<FindingResolution['status']>(
      resolution?.fingerprint === finding.fingerprint ? resolution.status : 'pending',
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [proposal, setProposal] = useState<RecordDraft>();
  return (
    <article className="committee-finding">
      <h3>{finding.title}</h3>
      <span className="record-meta">
        {l[finding.classification]} · {finding.rule} v{finding.version}
      </span>
      {resolution && resolution.fingerprint !== finding.fingerprint && (
        <p role="status">{l.recheck}</p>
      )}
      <p>{finding.question}</p>
      <details>
        <summary>{l.evidence}</summary>
        <p>{finding.explanation}</p>
        {finding.evidence.map((e, i) => {
          const ref = references[e.reference];
          const href =
            ref?.kind === 'control'
              ? `?controlView=${ref.view || 'delivery'}&control=${encodeURIComponent(ref.id)}#tracking`
              : ref?.kind === 'record'
                ? `?record=${encodeURIComponent(ref.id)}#tracking`
                : '#sources';
          return (
            <div key={i}>
              <p className="preserve-lines">{e.text}</p>
              {ref && (
                <a href={`/projects/${encodeURIComponent(project.id)}${href}`}>{e.reference} →</a>
              )}
            </div>
          );
        })}
      </details>
      {readonly ? (
        <p>
          {resolution?.fingerprint === finding.fingerprint
            ? `${l[resolution.status]}: ${resolution.reason}`
            : l.pending}
        </p>
      ) : (
        <details>
          <summary>
            {l.saveResolution} · {l[status]}
          </summary>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user || busy || disabled) return;
              setBusy(true);
              setError('');
              try {
                await resolveFinding(
                  user,
                  project,
                  { findingId: finding.id, fingerprint: finding.fingerprint, status, reason },
                  resolution,
                );
                await reload();
              } catch (x) {
                setError(errorMessage(x, t));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              {l.saveResolution}
              <select
                aria-label={l.saveResolution}
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                disabled={busy || disabled}
              >
                {(['pending', 'confirmed', 'dismissed'] as const).map((x) => (
                  <option key={x} value={x}>
                    {l[x]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              {l.reason}
              <textarea
                required
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy || disabled}
              />
            </label>
            <button className="button button-secondary button-small" disabled={busy || disabled}>
              {busy && <Spinner />}
              {l.saveResolution}
            </button>
            {error && <ErrorBanner message={error} />}
          </form>
        </details>
      )}
      {!readonly && finding.action && (
        <ProposalAction
          project={project}
          disabled={disabled}
          proposal={{
            kind: 'action',
            title: finding.question,
            evidence: `${finding.rule} v${finding.version}; ${finding.cutoff}. ${finding.evidence.map((e) => e.text).join(' | ')}`,
          }}
          onReview={setProposal}
        />
      )}
      {proposal && (
        <RecordForm project={project} proposal={proposal} onClose={() => setProposal(undefined)} />
      )}
      {!!previous.length && (
        <details>
          <summary>{l.history}</summary>
          {previous.map((x) => (
            <p key={x.versionId}>
              {x.updatedAt} · {l[x.status]} · {x.reason}
            </p>
          ))}
        </details>
      )}
    </article>
  );
}
export function ProjectReviewPanel({
  project,
  state,
}: {
  project: Project;
  state: ProjectAnalysisState;
}) {
  const { user } = useAuth(),
    { t, language } = useLocale(),
    l = t.committee,
    { notify } = useToast();
  const { records, reviews, refresh, cutoff, setCutoff } = useWorkspace();
  const [history, setHistory] = useState<ProjectReview[]>([]),
    [resolutions, setResolutions] = useState<FindingResolution[]>([]),
    [versions, setVersions] = useState<FindingResolution[]>([]);
  const [selectedReview, setSelectedReview] = useState(''),
    [baselineId, setBaseline] = useState(''),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const reload = useCallback(async () => {
    if (!user) return;
    setHistoryReady(false);
    const [h, r, v] = await Promise.all([
      loadProjectHistory(user, project, 'reviewHistory'),
      (async () => {
        const all: FindingResolution[] = [];
        let cursor = '';
        for (;;) {
          const page = (await loadProjectHistory(
            user,
            project,
            'findingStates',
            cursor,
          )) as FindingResolution[];
          all.push(...page);
          if (page.length < 100) return all;
          cursor = historyCursor(page[page.length - 1], 'findingStates');
        }
      })(),
      loadProjectHistory(user, project, 'findingVersions'),
    ]);
    setHistory(h as ProjectReview[]);
    setHasMore(h.length === 100);
    setResolutions(r as FindingResolution[]);
    setVersions(v as FindingResolution[]);
    setHistoryReady(true);
  }, [user, project]);
  useEffect(() => {
    if (new URLSearchParams(location.search).get('review') === 'latest')
      setSelectedReview('latest');
  }, [project.id]);
  useEffect(() => {
    let active = true;
    void reload().catch((e) => {
      if (active) setError(errorMessage(e, t));
    });
    return () => {
      active = false;
    };
  }, [reload, t]);
  const current = state.analysis
    ? {
        ...reviewData(project, state.analysis, records),
        resolutions: resolutions.filter((r) =>
          state.analysis?.reviewFindings?.some((f) => f.id === r.findingId),
        ),
      }
    : null;
  const legacy = reviews.find((x) => x.projectId === project.id);
  const choices =
    legacy && !history.some((x) => x.contextKey === legacy.contextKey)
      ? [...history, legacy]
      : history;
  const saved =
      selectedReview === 'latest' ? choices[0] : choices.find((x) => x.id === selectedReview),
    data = saved ? parseReview(saved.payload) : current;
  const baseline = choices.find((x) => x.id === baselineId),
    before = baseline && parseReview(baseline.payload);
  const snapshot = data?.snapshot,
    findings = data?.findings || [];
  const findingKey = findings.map((f) => `${f.id}:${f.fingerprint}`).join();
  useEffect(() => {
    setSelected(findings.map((f) => f.id));
  }, [findingKey, selectedReview]); // eslint-disable-line react-hooks/exhaustive-deps
  const changes = before?.snapshot && snapshot ? snapshotChanges(before.snapshot, snapshot) : [];
  const save = async () => {
    if (!user || !current || !snapshot || !historyReady || state.busy || state.stale || error)
      return;
    setBusy(true);
    setError('');
    try {
      const payload = JSON.stringify(current),
        contextKey = await digest(current);
      await saveProjectReview(
        user,
        project,
        { language, contextKey, payload },
        reviews.find((x) => x.projectId === project.id)?.updatedAt,
      );
      await refresh();
      await reload();
      setSelectedReview(`${project.id}--${contextKey}`);
      notify(t.projectReview.saved);
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };
  const output = () => {
    if (!saved) throw new Error(l.saveFirst);
    return committeeReport(saved, baseline, selected, language);
  };
  return (
    <section className="committee-review" aria-label={l.title}>
      <div className="section-heading">
        <div>
          <h2>{l.title}</h2>
          <p className="field-hint">{l.promise}</p>
        </div>
        {!saved && (
          <button
            className="button button-primary"
            onClick={() => void save()}
            disabled={
              busy ||
              !historyReady ||
              state.busy ||
              state.stale ||
              !!state.error ||
              !!error ||
              !snapshot ||
              project.deleting
            }
          >
            {busy && <Spinner />}
            {l.save}
          </button>
        )}
      </div>
      <div className="form-grid">
        <label className="field">
          {l.cutoff}
          <input
            type="date"
            required
            value={saved ? snapshot?.cutoff || saved.updatedAt.slice(0, 10) : cutoff}
            disabled={!!saved || busy}
            onChange={(e) => {
              if (e.target.value) setCutoff(e.target.value);
            }}
          />
        </label>
        <label className="field">
          {l.select}
          <select
            value={saved?.id || selectedReview}
            onChange={(e) => setSelectedReview(e.target.value)}
          >
            <option value="">{l.live}</option>
            {choices.map((r) => (
              <option key={r.id} value={r.id}>
                {parseReview(r.payload)?.snapshot?.cutoff || r.updatedAt.slice(0, 10)} ·{' '}
                {r.id.slice(-8)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {l.compare}
          <select value={baselineId} onChange={(e) => setBaseline(e.target.value)}>
            <option value="">{l.none}</option>
            {choices
              .filter((x) => x.id !== saved?.id)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {parseReview(r.payload)?.snapshot?.cutoff || r.updatedAt.slice(0, 10)} ·{' '}
                  {r.id.slice(-8)}
                </option>
              ))}
          </select>
        </label>
      </div>
      {hasMore && (
        <button
          className="text-button"
          disabled={busy}
          onClick={async () => {
            if (!user || !history.length) return;
            setBusy(true);
            try {
              const more = await loadProjectHistory(
                user,
                project,
                'reviewHistory',
                historyCursor(history[history.length - 1], 'reviewHistory'),
              );
              setHistory((h) => [...h, ...(more as ProjectReview[])]);
              setHasMore(more.length === 100);
            } catch (e) {
              setError(errorMessage(e, t));
            } finally {
              setBusy(false);
            }
          }}
        >
          {l.loadMore}
        </button>
      )}
      {error && <ErrorBanner message={error} />} {!saved && state.busy && <Spinner />}{' '}
      {!saved && state.error && <ErrorBanner message={state.error} />}
      {snapshot && (
        <details>
          <summary>
            {l.coverage}
            {snapshot.coverage.partial ? ` · ${l.partial}` : ''}
          </summary>
          <p>
            {snapshot.records.length}/{snapshot.coverage.recordsTotal} · {snapshot.controls.length}/
            {snapshot.coverage.controlsTotal} · {snapshot.sources.length}/
            {snapshot.coverage.sourcesTotal} · {snapshot.history.length}/
            {snapshot.coverage.historyTotal}
          </p>
          <p>{l.order}</p>
          <p>{snapshot.coverage.policy}</p>
        </details>
      )}
      {saved && !snapshot && (
        <details>
          <summary>{l.legacy}</summary>
          <p>{data ? t.statuses[data.status] : l.unknown}</p>
          <ul>
            {data?.records.map((r) => (
              <li key={r.id}>
                {r.title} · {t.tracking[r.status]} · {r.dueDate || t.tracking.noDate}
              </li>
            ))}
          </ul>
          <ul>
            {data?.risks.map((r, i) => (
              <li key={r.id || i}>
                {r.title} · {r.source === 'provided' ? t.product.provided : t.product.inferred}
              </li>
            ))}
          </ul>
        </details>
      )}
      {baseline && (
        <details open>
          <summary>
            {l.changes} ({changes.length})
          </summary>
          {changes.length ? (
            <ul>
              {changes.map((x, i) => (
                <li key={i}>
                  <strong>{x.title}</strong> · {x.field}:{' '}
                  <span>
                    {x.before} → {x.after}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>{before?.snapshot && snapshot ? l.noChanges : l.legacy}</p>
          )}
        </details>
      )}
      {snapshot && (
        <details>
          <summary>{l.commitments}</summary>
          <ul>
            {snapshot.records
              .filter(
                (r) =>
                  r.kind !== 'risk' &&
                  !snapshot.controls.some((c) => c.kind === 'decision' && c.recordId === r.id),
              )
              .map((r) => (
                <li key={r.id}>
                  <strong>{r.title}</strong> · {t.tracking[r.status]} · {r.ownerRole || l.unknown} ·{' '}
                  {r.dueDate || t.tracking.noDate}
                  {r.status === 'closed' &&
                    ` · ${r.completionEvidence ? l.evidenced : l.markedClosed}`}
                </li>
              ))}
          </ul>
          <ul>
            {snapshot.controls
              .filter(
                (c) =>
                  (c.kind === 'decision' || c.kind === 'change') &&
                  ['proposed', 'reviewed'].includes(c.data.status),
              )
              .map((c) => (
                <li key={c.id}>
                  <strong>{c.title}</strong> ·{' '}
                  {('requiredRole' in c.data && c.data.requiredRole) || l.unknown} ·{' '}
                  {('dueDate' in c.data && c.data.dueDate) || t.tracking.noDate}
                  {'deliveryId' in c.data && c.data.deliveryId && (
                    <p>
                      {l.deliveryLink}:{' '}
                      {snapshot.controls.find(
                        (x) => x.id === ('deliveryId' in c.data ? c.data.deliveryId : ''),
                      )?.title || l.unknown}
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </details>
      )}
      <h3>
        {l.findings} ({findings.length})
      </h3>
      {!findings.length && !state.busy && <p>{snapshot ? l.noFindings : l.unknown}</p>}
      {(showAll ? findings : findings.slice(0, 5)).map((f) => (
        <div key={`${selectedReview}:${f.id}:${f.fingerprint}`}>
          <label className="committee-selection">
            <input
              type="checkbox"
              aria-label={`${l.selection}: ${f.title}`}
              checked={selected.includes(f.id)}
              onChange={(e) =>
                setSelected((xs) =>
                  e.target.checked ? [...xs, f.id] : xs.filter((x) => x !== f.id),
                )
              }
            />
            {l.selection}
          </label>
          <FindingRow
            key={`${f.id}:${resolutions.find((r) => r.findingId === f.id)?.revision}`}
            finding={f}
            project={project}
            references={snapshot?.references || {}}
            readonly={!!saved}
            disabled={state.busy || state.stale || !!state.error || !historyReady}
            resolution={(saved ? data?.resolutions : resolutions)?.find(
              (r) => r.findingId === f.id,
            )}
            previous={versions.filter((x) => x.findingId === f.id)}
            reload={reload}
          />
        </div>
      ))}
      {findings.length > 5 && (
        <button className="text-button" onClick={() => setShowAll(!showAll)}>
          {showAll ? l.less : `${l.all} (${findings.length})`}
        </button>
      )}
      {versions.length > 0 && versions.length % 100 === 0 && (
        <button
          className="text-button"
          disabled={busy}
          onClick={async () => {
            if (!user) return;
            setBusy(true);
            try {
              const more = await loadProjectHistory(
                user,
                project,
                'findingVersions',
                historyCursor(versions[versions.length - 1], 'findingVersions'),
              );
              setVersions((v) => [...v, ...(more as FindingResolution[])]);
            } catch (e) {
              setError(errorMessage(e, t));
            } finally {
              setBusy(false);
            }
          }}
        >
          {l.history} · {l.loadMore}
        </button>
      )}
      {saved && snapshot ? (
        <div className="committee-export">
          <p className="field-hint">{l.immutable}</p>
          <button
            className="button button-primary"
            onClick={() => {
              try {
                exportMarkdown(
                  { generatedContent: output(), type: 'executive_brief', language },
                  project.name,
                );
              } catch (e) {
                setError(errorMessage(e, t));
              }
            }}
          >
            {l.export}
          </button>
          <button
            className="button button-secondary"
            disabled={busy}
            onClick={async () => {
              if (!user) return;
              setBusy(true);
              try {
                await saveDocument(user, {
                  id: crypto.randomUUID(),
                  ownerId: user.uid,
                  projectId: project.id,
                  type: 'executive_brief',
                  language,
                  inputContext: `Review ${saved.id}; baseline ${baselineId || 'none'}`,
                  generatedContent: output(),
                  createdAt: new Date().toISOString(),
                  provider: 'offline',
                  risks: [],
                  warnings: [l.immutable],
                });
                await refresh();
                notify(t.saved);
              } catch (e) {
                setError(errorMessage(e, t));
              } finally {
                setBusy(false);
              }
            }}
          >
            {l.saveDocument}
          </button>
        </div>
      ) : (
        <p className="field-hint">{l.saveFirst}</p>
      )}
    </section>
  );
}
