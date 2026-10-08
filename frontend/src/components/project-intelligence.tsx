'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Copy, RefreshCw, Send } from 'lucide-react';
import type {
  DiagnosisItem,
  EvidenceReference,
  GenerationResult,
  Project,
  ProjectIntelligence,
  ProjectSource,
} from '@/types';
import { generateDocument, simulateScenario } from '@/lib/api';
import { copyContent } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { useAuth, useLocale, useToast } from './providers';
import { ErrorBanner, Spinner, ProviderLabel } from './ui';
import { ProposalAction, RecordForm, type RecordDraft } from './project-tracking';
import { useWorkspace } from './workspace-provider';
import { DocumentWarnings, MarkdownContent } from './document-view';
import type { ProjectAnalysisState } from '@/hooks/use-project-analysis';

function Evidence({ item }: { item: EvidenceReference }) {
  return (
    <blockquote className="analysis-evidence">
      <span>
        {item.origin} · {item.locator}
      </span>
      {item.text}
    </blockquote>
  );
}

export function DiagnosisLine({
  item,
  children,
}: {
  item: DiagnosisItem;
  children?: React.ReactNode;
}) {
  const { t } = useLocale();
  const labels = {
    provided: t.product.diagnosisProvided,
    inferred: t.product.diagnosisInferred,
    insufficient: t.product.diagnosisInsufficient,
  };
  return (
    <li className="diagnosis-line">
      <span className={`diagnosis-origin diagnosis-${item.classification}`}>
        {labels[item.classification]}
      </span>
      <p>{item.text}</p>
      {!!item.evidence.length && (
        <details>
          <summary>{t.product.viewEvidence}</summary>
          {item.evidence.map((reference, index) => (
            <Evidence key={`${reference.origin}-${reference.locator}-${index}`} item={reference} />
          ))}
        </details>
      )}
      {children}
    </li>
  );
}

function Diagnosis({
  analysis,
  review,
}: {
  analysis: ProjectIntelligence;
  review?: (proposal: RecordDraft) => React.ReactNode;
}) {
  const { t } = useLocale();
  const diagnosis = analysis.diagnosis;
  const groups = [
    [t.product.currentSituation, diagnosis.currentSituation],
    [t.product.diagnosisAlerts, diagnosis.alerts],
    [t.product.diagnosisCauses, diagnosis.causes],
    [t.product.potentialImpact, diagnosis.potentialImpact],
    [t.product.diagnosisActions, diagnosis.recommendedActions],
    [t.product.diagnosisMissing, diagnosis.missingData],
  ] as [string, DiagnosisItem[]][];
  return (
    <section className="analysis-block diagnosis-block">
      <div className="section-heading">
        <h2>{t.product.diagnosisTitle}</h2>
      </div>
      <div className="diagnosis-grid">
        {groups.map(([title, items], index) => (
          <details key={title} open={index < 2}>
            <summary>
              {title} <span>{items.length}</span>
            </summary>
            <ul>
              {items.map((item, itemIndex) => (
                <DiagnosisLine key={`${title}-${itemIndex}`} item={item}>
                  {(title === t.product.diagnosisActions || title === t.product.diagnosisAlerts) &&
                    item.classification !== 'insufficient' &&
                    review?.({
                      kind: 'action',
                      title:
                        title === t.product.diagnosisAlerts
                          ? `${t.projectNavigation.check}: ${item.text}`
                          : item.text,
                      evidence: [
                        t.tracking.proposed,
                        ...item.evidence.map(
                          (ref) => `${ref.origin} · ${ref.locator}: ${ref.text}`,
                        ),
                      ].join('\n'),
                    })}
                </DiagnosisLine>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}

function Contradictions({
  analysis,
  review,
}: {
  analysis: ProjectIntelligence;
  review?: (proposal: RecordDraft) => React.ReactNode;
}) {
  const { t } = useLocale();
  return (
    <section className="analysis-block contradiction-block">
      <div className="section-heading">
        <h2>{t.product.contradictionTitle}</h2>
        <span>{analysis.contradictions.length}</span>
      </div>
      {!analysis.contradictions.length && <p className="muted">{t.product.noContradictions}</p>}
      {analysis.contradictions.map((item) => (
        <details key={item.id} className="contradiction-item">
          <summary>
            <span>{item.id}</span> {item.title}
          </summary>
          <div className="contradiction-evidence">
            <div>
              <strong>{t.product.evidenceA}</strong>
              <Evidence item={item.evidenceA} />
            </div>
            <div>
              <strong>{t.product.evidenceB}</strong>
              <Evidence item={item.evidenceB} />
            </div>
          </div>
          <p>{item.explanation}</p>
          <p>
            <strong>{t.product.suggestedCheck}: </strong>
            {item.suggestedCheck}
          </p>
          {review?.({
            kind: 'action',
            title: item.suggestedCheck,
            evidence: [
              t.tracking.proposed,
              `${t.product.evidenceA}: ${item.evidenceA.text}`,
              `${t.product.evidenceB}: ${item.evidenceB.text}`,
            ].join('\n'),
          })}
        </details>
      ))}
    </section>
  );
}

export function IntelligenceSummary({
  analysis,
  compact = false,
  review,
  onAsk,
  sources = [],
}: {
  analysis: ProjectIntelligence;
  compact?: boolean;
  review?: (proposal: RecordDraft) => React.ReactNode;
  onAsk?: (risk: string) => void;
  sources?: ProjectSource[];
}) {
  const { t } = useLocale();
  const labels = t.product;
  const groups = [
    [labels.assumptions, analysis.assumptions],
    [labels.missing, analysis.missingInformation],
    ...(!compact
      ? [
          [labels.actions, analysis.recommendedActions.map((a) => `${a.action} · ${a.ownerRole}`)],
          [labels.stakeholders, analysis.stakeholders],
          [labels.decisions, analysis.pendingDecisions],
          [labels.dependencies, analysis.dependencies],
          [labels.questions, analysis.questions],
          [labels.scope, analysis.scopeChanges],
        ]
      : []),
  ] as [string, string[]][];
  return (
    <div className="intelligence-summary">
      <div className="intelligence-indicators">
        <div>
          <span>{labels.confidence}</span>
          <strong>{labels[analysis.confidence]}</strong>
        </div>
        <div>
          <span>{labels.health}</span>
          <strong>{labels[analysis.health]}</strong>
        </div>
      </div>
      <details className="assessment-details">
        <summary>{labels.assessmentDetails}</summary>
        <p>{analysis.confidenceReason}</p>
        <p>{analysis.healthReason}</p>
        <p>{labels.engineHint}</p>
      </details>
      {!compact && (
        <div className="intelligence-risks">
          {analysis.risks.map((risk, i) => (
            <details key={`${risk.risk}-${i}`} className="intelligence-risk">
              <summary>
                <span className="risk-index" aria-hidden="true">
                  R{String(i + 1).padStart(2, '0')}
                </span>
                <span>
                  {risk.risk}
                  <small>
                    {risk.source === 'inferred' ? labels.inferred : labels.provided}
                    {risk.priority ? ` · ${t.compass.priority}: ${risk.priority}` : ''}
                  </small>
                </span>
              </summary>
              <p>{risk.evidence}</p>
              {risk.source === 'provided' &&
                sources
                  .filter((source) =>
                    source.text.replace(/\s+/g, ' ').includes(risk.evidence.replace(/\s+/g, ' ')),
                  )
                  .map((source) => (
                    <p key={source.id} className="source-attribution">
                      {source.label} · {source.locator}
                      {source.reviewed ? ` · ${t.sources.edited}` : ''}
                    </p>
                  ))}
              {review?.({
                kind: 'risk',
                title: risk.risk,
                evidence: `${risk.source === 'inferred' ? labels.inferred : labels.provided}: ${risk.evidence}`,
              })}
              <p>
                {risk.cause} {risk.impact}
              </p>
              <p>
                <strong>{labels.actions}: </strong>
                {risk.mitigation}
              </p>
              <p>
                {risk.suggestedOwner} · {risk.priority}
              </p>
              {onAsk && (
                <button className="text-button" onClick={() => onAsk(risk.risk)}>
                  {t.analysisNavigation.askRisk}
                </button>
              )}
            </details>
          ))}
        </div>
      )}
      <div className="intelligence-groups">
        {groups
          .filter(([, items]) => items.length)
          .map(([title, items]) => (
            <details key={title}>
              <summary>
                {title}
                <span>{items.length}</span>
              </summary>
              <ul>
                {items.map((item, index) => (
                  <li key={index}>
                    {item}
                    {(title === labels.actions || title === labels.decisions) &&
                      review?.({
                        kind: title === labels.actions ? 'action' : 'decision',
                        title: item,
                        evidence: t.tracking.proposed,
                      })}
                  </li>
                ))}
              </ul>
            </details>
          ))}
      </div>
    </div>
  );
}

const analysisViews = ['diagnosis', 'risks', 'scenario', 'copilot'] as const;
type AnalysisView = (typeof analysisViews)[number];

export function ProjectIntelligencePanel({
  project,
  analysisState,
  active,
}: {
  project: Project;
  analysisState: ProjectAnalysisState;
  active: boolean;
}) {
  const { analysis, busy, error, refresh, stale } = analysisState;
  const { user } = useAuth();
  const { sources, records } = useWorkspace();
  const projectRecords = useMemo(
    () => records.filter((record) => record.projectId === project.id),
    [records, project.id],
  );
  const [proposal, setProposal] = useState<RecordDraft | null>(null);
  const { t, language } = useLocale();
  const { notify } = useToast();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<GenerationResult | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState('');
  const [scenario, setScenario] = useState('');
  const [scenarioResult, setScenarioResult] = useState<GenerationResult | null>(null);
  const [scenarioBusy, setScenarioBusy] = useState(false);
  const [scenarioError, setScenarioError] = useState('');
  const copilotRequest = useRef<AbortController | null>(null);
  const scenarioRequest = useRef<AbortController | null>(null);
  const [view, setView] = useState<AnalysisView>('diagnosis');
  const [contextChanged, setContextChanged] = useState(false);
  const questionInput = useRef<HTMLTextAreaElement | null>(null);
  const focusQuestion = useRef(false);
  const responseContext = JSON.stringify({
    project,
    language,
    records: projectRecords,
    sources: sources.filter((source) => source.projectId === project.id),
  });
  const previousContext = useRef(responseContext);
  const hadResponse = useRef(false);
  useEffect(() => {
    if (previousContext.current !== responseContext) {
      setContextChanged(hadResponse.current);
      previousContext.current = responseContext;
      hadResponse.current = false;
    }
    setAnswer(null);
    setAsking(false);
    setAskError('');
    setScenarioResult(null);
    setScenarioBusy(false);
    setScenarioError('');
    setProposal(null);
    const copilot = copilotRequest;
    const scenario = scenarioRequest;
    return () => {
      copilot.current?.abort();
      scenario.current?.abort();
    };
  }, [responseContext]);
  useEffect(() => {
    const navigate = () => {
      const hash = window.location.hash.slice(1);
      if (analysisViews.includes(hash as AnalysisView)) setView(hash as AnalysisView);
    };
    navigate();
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  useEffect(() => {
    if (active && view === 'copilot' && focusQuestion.current) {
      focusQuestion.current = false;
      questionInput.current?.focus();
    }
  }, [active, view]);
  const selectView = (next: AnalysisView) => {
    setView(next);
    window.history.pushState(null, '', `#${next}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  const askRisk = (risk: string) => {
    setQuestion(t.analysisNavigation.riskQuestion.replace('{risk}', risk).slice(0, 2000));
    focusQuestion.current = true;
    selectView('copilot');
  };
  const ask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !question.trim() || asking || project.deleting) return;
    const controller = new AbortController();
    copilotRequest.current = controller;
    setAsking(true);
    hadResponse.current = true;
    setContextChanged(false);
    setAskError('');
    try {
      const result = await generateDocument(
        user,
        project,
        'executive_brief',
        language,
        '',
        controller.signal,
        false,
        { question },
      );
      if (!controller.signal.aborted) setAnswer(result);
    } catch (issue) {
      if (!controller.signal.aborted) setAskError(errorMessage(issue, t));
    } finally {
      if (!controller.signal.aborted) setAsking(false);
    }
  };
  const copy = async () => {
    if (!answer) return;
    try {
      await copyContent(answer.content);
      notify(t.copied);
    } catch (issue) {
      notify(errorMessage(issue, t), 'error');
    }
  };
  const runScenario = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !scenario.trim() || scenarioBusy || project.deleting) return;
    scenarioRequest.current?.abort();
    const controller = new AbortController();
    scenarioRequest.current = controller;
    setScenarioBusy(true);
    hadResponse.current = true;
    setContextChanged(false);
    setScenarioError('');
    try {
      const result = await simulateScenario(
        user,
        project,
        language,
        scenario.trim(),
        projectRecords,
        controller.signal,
      );
      if (!controller.signal.aborted) setScenarioResult(result);
    } catch (issue) {
      if (!controller.signal.aborted) setScenarioError(errorMessage(issue, t));
    } finally {
      if (!controller.signal.aborted) setScenarioBusy(false);
    }
  };
  const copyScenario = async () => {
    if (!scenarioResult) return;
    try {
      await copyContent(scenarioResult.content);
      notify(t.copied);
    } catch (issue) {
      notify(errorMessage(issue, t), 'error');
    }
  };
  const review = (draft: RecordDraft) => (
    <ProposalAction
      project={project}
      proposal={draft}
      disabled={stale || busy || !!error}
      onReview={setProposal}
    />
  );
  return (
    <div className="intelligence-workspace">
      {proposal && (
        <RecordForm project={project} proposal={proposal} onClose={() => setProposal(null)} />
      )}
      <div className="analysis-toolbar" hidden={view === 'scenario' || view === 'copilot'}>
        <span className="brief-engine">{t.projectBrief.engine}</span>
        <button
          className="button button-secondary button-small"
          disabled={busy || project.deleting}
          onClick={() => void refresh()}
        >
          {busy ? <Spinner /> : <RefreshCw size={15} />}
          {t.product.analyze}
        </button>
      </div>
      <div className="analysis-navigation" role="tablist" aria-label={t.analysisNavigation.label}>
        {analysisViews.map((key, index) => (
          <button
            key={key}
            id={`analysis-tab-${key}`}
            role="tab"
            aria-selected={view === key}
            aria-controls={`analysis-panel-${key}`}
            tabIndex={view === key ? 0 : -1}
            onClick={() => selectView(key)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % analysisViews.length
                  : event.key === 'ArrowLeft'
                    ? (index + analysisViews.length - 1) % analysisViews.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? analysisViews.length - 1
                        : -1;
              if (next >= 0) {
                event.preventDefault();
                selectView(analysisViews[next]);
                document.getElementById(`analysis-tab-${analysisViews[next]}`)?.focus();
              }
            }}
          >
            {t.analysisNavigation[key]}
          </button>
        ))}
      </div>
      {error && <ErrorBanner message={error} />}
      {stale && <p role="status">{t.projectBrief.stale}</p>}
      {contextChanged && (
        <p role="status" className="field-hint">
          {t.analysisNavigation.contextChanged}
        </p>
      )}
      {busy && !analysis && (
        <p role="status">
          <Spinner /> {t.loading}
        </p>
      )}
      <section
        id="analysis-panel-diagnosis"
        role="tabpanel"
        aria-labelledby="analysis-tab-diagnosis"
        tabIndex={0}
        hidden={view !== 'diagnosis'}
        className="analysis-view"
      >
        {analysis && (
          <>
            <Diagnosis analysis={analysis} review={review} />
            <Contradictions analysis={analysis} review={review} />
          </>
        )}
      </section>
      <section
        id="analysis-panel-risks"
        role="tabpanel"
        aria-labelledby="analysis-tab-risks"
        tabIndex={0}
        hidden={view !== 'risks'}
        className="analysis-view"
      >
        <h2>{t.analysisNavigation.risks}</h2>
        {analysis && (
          <IntelligenceSummary
            analysis={analysis}
            sources={sources.filter((source) => source.projectId === project.id)}
            review={review}
            onAsk={stale || busy || error || asking ? undefined : askRisk}
          />
        )}
        <Link
          className="button button-secondary"
          href={`/generator?project=${project.id}&type=risk_register`}
        >
          {t.documentTypes.risk_register}
        </Link>
      </section>
      <section
        id="analysis-panel-scenario"
        role="tabpanel"
        aria-labelledby="analysis-tab-scenario"
        tabIndex={0}
        hidden={view !== 'scenario'}
        className="panel info-panel scenario-panel analysis-view"
        aria-busy={scenarioBusy}
      >
        <div className="section-heading">
          <div>
            <h2>{t.product.scenarioTitle}</h2>
            <span>{t.product.scenarioBadge}</span>
          </div>
        </div>
        <p className="field-hint">
          {project.aiAccess === 'offline' ? t.sources.private : t.sources.external} ·{' '}
          <Link href={`/projects/${project.id}#sources`}>{t.sources.privacy}</Link>
        </p>
        <div className="copilot-prompts">
          {[t.product.scenarioDelay, t.product.scenarioSupplier, t.product.scenarioScope].map(
            (example) => (
              <button
                className="button button-secondary button-small"
                key={example}
                onClick={() => setScenario(example)}
                disabled={scenarioBusy}
              >
                {example}
              </button>
            ),
          )}
        </div>
        <form onSubmit={runScenario}>
          <label className="field">
            {t.product.scenarioQuestion}
            <textarea
              rows={3}
              maxLength={2000}
              value={scenario}
              onChange={(event) => setScenario(event.target.value)}
              placeholder={t.product.scenarioPlaceholder}
              disabled={scenarioBusy}
              required
            />
          </label>
          <button
            className="button button-primary"
            disabled={scenarioBusy || !scenario.trim() || project.deleting}
          >
            {scenarioBusy ? <Spinner /> : <Send size={16} />}
            {t.product.runScenario}
          </button>
        </form>
        {scenarioError && <ErrorBanner message={scenarioError} />}
        {scenarioResult && (
          <div className="scenario-result">
            <div className="section-heading">
              <span className="provider-badge">
                <ProviderLabel provider={scenarioResult.provider} />
              </span>
              <button
                className="button button-secondary button-small"
                onClick={() => void copyScenario()}
              >
                <Copy size={15} />
                {t.copy}
              </button>
            </div>
            <MarkdownContent content={scenarioResult.content} />
            <DocumentWarnings
              document={{
                generatedContent: scenarioResult.content,
                warnings: scenarioResult.warnings,
              }}
            />
          </div>
        )}
      </section>
      <section
        id="analysis-panel-copilot"
        role="tabpanel"
        aria-labelledby="analysis-tab-copilot"
        tabIndex={0}
        hidden={view !== 'copilot'}
        className="panel info-panel copilot-panel analysis-view"
        aria-busy={asking}
      >
        <h2>{t.product.copilot}</h2>
        <p className="field-hint">
          {project.aiAccess === 'offline' ? t.sources.private : t.sources.external} ·{' '}
          <Link href={`/projects/${project.id}#sources`}>{t.sources.privacy}</Link>
        </p>
        <div className="copilot-prompts">
          {[
            t.product.askRisks,
            t.product.askClient,
            t.product.askDecisions,
            t.product.askUpdate,
          ].map((prompt) => (
            <button
              className="button button-secondary button-small"
              key={prompt}
              onClick={() => setQuestion(prompt)}
              disabled={asking}
            >
              {prompt}
            </button>
          ))}
        </div>
        <form onSubmit={ask}>
          <label className="field">
            {t.product.question}
            <textarea
              rows={3}
              maxLength={2000}
              ref={questionInput}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t.product.questionHint}
              disabled={asking}
              required
            />
          </label>
          <button
            className="button button-primary"
            disabled={asking || !question.trim() || project.deleting}
          >
            {asking ? <Spinner /> : <Send size={16} />}
            {t.product.ask}
          </button>
        </form>
        {askError && <ErrorBanner message={askError} />}
        {answer && (
          <div className="copilot-answer">
            <div className="section-heading">
              <span className="provider-badge">
                <ProviderLabel provider={answer.provider} />
              </span>
              <button className="button button-secondary button-small" onClick={() => void copy()}>
                <Copy size={15} />
                {t.copy}
              </button>
            </div>
            <MarkdownContent content={answer.content} />
            <details className="copilot-context">
              <summary>{t.product.answerContext}</summary>
              {answer.intelligence && (
                <IntelligenceSummary analysis={answer.intelligence} compact />
              )}
              <DocumentWarnings
                document={{ generatedContent: answer.content, warnings: answer.warnings }}
              />
            </details>
          </div>
        )}
        <p className="field-hint">{t.product.reviewNotice}</p>
      </section>
    </div>
  );
}
