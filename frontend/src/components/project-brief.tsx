'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { DiagnosisItem, Project } from '@/types';
import type { ProjectAnalysisState } from '@/hooks/use-project-analysis';
import { useLocale } from './providers';
import { DiagnosisLine } from './project-intelligence';
import { ProposalAction, RecordForm, type RecordDraft } from './project-tracking';
import { ErrorBanner, Spinner } from './ui';

export function ProjectBrief({
  project,
  state,
  onAnalysis,
  onContext,
}: {
  project: Project;
  state: ProjectAnalysisState;
  onAnalysis: () => void;
  onContext: () => void;
}) {
  const { t, language } = useLocale();
  const { analysis, busy, error, stale, analyzedAt } = state;
  const [proposal, setProposal] = useState<RecordDraft | null>(null);
  const labels = t.projectBrief;
  const alerts =
    analysis?.diagnosis.alerts.filter((item) => item.classification !== 'insufficient') ?? [];
  // Preserve the engine's order; these are review items, not a quantified ranking.
  const items: DiagnosisItem[] = alerts.length
    ? alerts
    : (analysis?.risks ?? []).map((risk) => ({
        text: risk.risk,
        classification: risk.source === 'provided' ? 'provided' : 'inferred',
        evidence:
          risk.source === 'provided' && risk.evidence
            ? [{ origin: t.product.provided, locator: t.projectBrief.context, text: risk.evidence }]
            : [],
      }));
  const next = analysis?.diagnosis.recommendedActions[0];
  const unavailable = busy || stale || !!error || !!project.deleting;
  return (
    <section className="project-brief" aria-labelledby="project-brief-title" aria-busy={busy}>
      {proposal && (
        <RecordForm project={project} proposal={proposal} onClose={() => setProposal(null)} />
      )}
      <header className="brief-heading">
        <div>
          <h2 id="project-brief-title">{labels.title}</h2>
          <span className="brief-engine">{labels.engine}</span>
        </div>
        <button
          className="button button-secondary button-small"
          disabled={busy || project.deleting}
          onClick={() => void state.refresh()}
        >
          {busy ? <Spinner /> : <RefreshCw size={15} />}
          {t.product.analyze}
        </button>
      </header>
      <p className="brief-freshness" role="status">
        {stale ? (
          labels.stale
        ) : busy ? (
          labels.updating
        ) : analyzedAt ? (
          <>
            {labels.updated}{' '}
            <time dateTime={analyzedAt}>
              {new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(
                new Date(analyzedAt),
              )}
            </time>
          </>
        ) : null}
      </p>
      {error && <ErrorBanner message={error} />}
      {!analysis && !error && <p className="brief-loading">{t.loading}</p>}
      {analysis && (
        <>
          <div className={`brief-assessment brief-${analysis.health}`}>
            <strong>{alerts.length ? labels.attention : t.product[analysis.health]}</strong>
            <p>{alerts.length ? labels.reviewReason : analysis.healthReason}</p>
            <details>
              <summary>{labels.basis}</summary>
              <p>
                {t.product.confidence}: {t.product[analysis.confidence]}
              </p>
              <p>{analysis.confidenceReason}</p>
              <ul>
                {analysis.diagnosis.currentSituation.map((item, index) => (
                  <DiagnosisLine key={index} item={item} />
                ))}
              </ul>
            </details>
          </div>
          <div className="brief-columns">
            <section aria-labelledby="brief-attention-title">
              <h3 id="brief-attention-title">
                {alerts.length ? labels.attention : labels.proposals}
              </h3>
              {!alerts.length && <p className="brief-caution">{labels.noConfirmedAlerts}</p>}
              <ul className="brief-items">
                {items.slice(0, 3).map((item, index) => (
                  <DiagnosisLine key={index} item={item} />
                ))}
              </ul>
              <button className="text-button" onClick={onAnalysis}>
                {labels.fullAnalysis}
                {items.length > 3 ? ` (${items.length})` : ''} →
              </button>
            </section>
            <section className="brief-next" aria-labelledby="brief-next-title">
              <h3 id="brief-next-title">{labels.next}</h3>
              {next ? (
                <ul className="brief-items">
                  <DiagnosisLine item={next}>
                    <ProposalAction
                      project={project}
                      className="button button-primary button-small"
                      disabled={unavailable}
                      onReview={setProposal}
                      proposal={{
                        kind: 'action',
                        title: next.text,
                        evidence: [
                          t.tracking.proposed,
                          ...next.evidence.map(
                            (ref) => `${ref.origin} · ${ref.locator}: ${ref.text}`,
                          ),
                        ].join('\n'),
                      }}
                    />
                  </DiagnosisLine>
                </ul>
              ) : (
                <p>{labels.noAction}</p>
              )}
              <details className="brief-missing">
                <summary>
                  {t.product.diagnosisMissing} ({analysis.diagnosis.missingData.length})
                </summary>
                <ul>
                  {analysis.diagnosis.missingData.map((item, index) => (
                    <DiagnosisLine key={index} item={item} />
                  ))}
                </ul>
                <button className="text-button" onClick={onContext}>
                  {labels.completeContext} →
                </button>
              </details>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
