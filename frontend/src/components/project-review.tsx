'use client';
import { useEffect, useMemo, useState } from 'react';
import { openRecord } from './project-tracking';
import type { Project } from '@/types';
import type { ProjectAnalysisState } from '@/hooks/use-project-analysis';
import { parseReview, reviewChanges, reviewContextKey, reviewData } from '@/lib/project-review';
import { saveProjectReview } from '@/lib/repository';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { useAuth, useLocale, useToast } from './providers';
import { useWorkspace } from './workspace-provider';
import { ConfirmDialog, ErrorBanner, Spinner } from './ui';

export function ProjectReviewPanel({
  project,
  state,
}: {
  project: Project;
  state: ProjectAnalysisState;
}) {
  const { user } = useAuth();
  const { t, language } = useLocale();
  const labels = t.projectReview;
  const { notify } = useToast();
  const { reviews, records, sources, refresh } = useWorkspace();
  const previous = reviews.find((review) => review.projectId === project.id);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [contextKey, setContextKey] = useState('');
  useEffect(() => {
    let current = true;
    setContextKey('');
    reviewContextKey(project, sources, records)
      .then((key) => {
        if (current) setContextKey(key);
      })
      .catch(() => {
        if (current) setError(t.genericError);
      });
    return () => {
      current = false;
    };
  }, [project, sources, records, t.genericError]);
  const now = useMemo(
    () => (state.analysis ? reviewData(project, state.analysis, records) : null),
    [project, state.analysis, records],
  );
  const then = useMemo(() => (previous ? parseReview(previous.payload) : null), [previous]);
  const changes = now && then ? reviewChanges(then, now, previous?.language === language) : null;
  const unavailable =
    state.busy ||
    state.stale ||
    !!state.error ||
    !now ||
    !contextKey ||
    !!project.deleting ||
    !parseReview(JSON.stringify(now));
  const save = async () => {
    if (!user || !now || unavailable || busy) return;
    setBusy(true);
    setError('');
    try {
      await saveProjectReview(
        user,
        project,
        { language, contextKey, payload: JSON.stringify(now) },
        previous?.updatedAt,
      );
      await refresh();
      setConfirm(false);
      notify(labels.saved);
    } catch (issue) {
      setError(errorMessage(issue, t));
    } finally {
      setBusy(false);
    }
  };
  const groups = changes
    ? ([
        [labels.added, changes.added],
        [labels.closed, changes.closed],
        [labels.reopened, changes.reopened],
        [labels.updated, changes.updated],
        [labels.pending, changes.pending],
        [labels.removed, changes.removed],
      ] as const)
    : [];
  const changed =
    changes &&
    (changes.statusChanged ||
      groups.some(([, items]) => items.length) ||
      changes.risksAdded.length ||
      changes.risksAbsent.length);
  return (
    <details className="project-review">
      <summary>
        {labels.title}
        {previous ? ` · ${formatDate(previous.updatedAt, language)}` : ''}
      </summary>
      <div className="review-body">
        <p className="field-hint">{labels.hint}</p>
        {!previous && <p>{labels.empty}</p>}
        {previous && !then && <ErrorBanner message={labels.invalid} />}
        {previous && contextKey && (
          <p className="field-hint">
            {previous.contextKey === contextKey ? labels.unchangedContext : labels.changedContext}
          </p>
        )}
        {previous && previous.language !== language && <p>{labels.language}</p>}
        {state.stale && <p role="status">{t.projectBrief.stale}</p>}
        {now && !parseReview(JSON.stringify(now)) && <p role="status">{labels.limit}</p>}
        {changes && !state.stale && (
          <>
            {!changed && <p>{labels.noChanges}</p>}
            {changes.statusChanged && (
              <p>
                {labels.status}: {t.statuses[then!.status]} → {t.statuses[now!.status]}
              </p>
            )}
            {groups
              .filter(([, items]) => items.length)
              .map(([title, items]) => (
                <section key={title}>
                  <h3>
                    {title} ({items.length})
                  </h3>
                  <ul>
                    {items.map((item) => (
                      <li key={item.id}>
                        {title === labels.removed ? (
                          item.title
                        ) : (
                          <button className="text-button" onClick={() => openRecord(item)}>
                            {item.title}
                          </button>
                        )}
                        {title === labels.updated && (
                          <span className="field-hint"> · {labels.reviewRecord}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            {(
              [
                [labels.risksAdded, changes.risksAdded],
                [labels.risksAbsent, changes.risksAbsent],
              ] as const
            )
              .filter(([, items]) => items.length)
              .map(([title, items]) => (
                <section key={title}>
                  <h3>
                    {title} ({items.length})
                  </h3>
                  <ul>
                    {items.map((risk, index) => (
                      <li key={index}>
                        {risk.title}{' '}
                        <span className="diagnosis-origin">
                          {risk.source === 'provided' ? t.product.provided : t.product.inferred}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            {!!changes.risksAbsent.length && <p className="field-hint">{labels.notResolved}</p>}
          </>
        )}
        {error && !confirm && <ErrorBanner message={error} />}
        <button
          className="button button-secondary button-small"
          disabled={unavailable || busy}
          onClick={() => (previous ? setConfirm(true) : void save())}
        >
          {busy && <Spinner />}
          {previous ? labels.update : labels.save}
        </button>
        {confirm && (
          <ConfirmDialog
            title={labels.update}
            text={labels.replace}
            confirmLabel={labels.update}
            destructive={false}
            busy={busy}
            error={error}
            onClose={() => setConfirm(false)}
            onConfirm={save}
          />
        )}
      </div>
    </details>
  );
}
