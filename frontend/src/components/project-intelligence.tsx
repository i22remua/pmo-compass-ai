'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BrainCircuit, Copy, RefreshCw, Send, ShieldAlert } from 'lucide-react';
import type { GenerationResult, Project, ProjectIntelligence } from '@/types';
import { analyzeProject, generateDocument } from '@/lib/api';
import { copyContent } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { useAuth, useLocale, useToast } from './providers';
import { ErrorBanner, Spinner } from './ui';
import { DocumentWarnings, MarkdownContent } from './document-view';

export function IntelligenceSummary({
  analysis,
  compact = false,
}: {
  analysis: ProjectIntelligence;
  compact?: boolean;
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
                <ShieldAlert size={17} />
                <span>
                  {risk.risk}
                  <small>{risk.source === 'inferred' ? labels.inferred : labels.provided}</small>
                </span>
              </summary>
              <p>{risk.evidence}</p>
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
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </details>
          ))}
      </div>
    </div>
  );
}

export function ProjectIntelligencePanel({ project }: { project: Project }) {
  const { user } = useAuth();
  const { t, language } = useLocale();
  const { notify } = useToast();
  const [analysis, setAnalysis] = useState<ProjectIntelligence | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<GenerationResult | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState('');
  const analysisRequest = useRef<AbortController | null>(null);
  const copilotRequest = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!user || project.deleting) return;
    analysisRequest.current?.abort();
    const controller = new AbortController();
    analysisRequest.current = controller;
    setBusy(true);
    setError('');
    try {
      const next = await analyzeProject(user, project, language, controller.signal);
      if (!controller.signal.aborted) setAnalysis(next);
    } catch (issue) {
      if (!controller.signal.aborted) setError(errorMessage(issue, t));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, [user, project, language, t]);
  useEffect(() => {
    setAnalysis(null);
    setAnswer(null);
    setAsking(false);
    setAskError('');
    copilotRequest.current?.abort();
    void refresh();
    return () => {
      analysisRequest.current?.abort();
      copilotRequest.current?.abort();
    };
  }, [refresh]);
  const ask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !question.trim() || asking || project.deleting) return;
    const controller = new AbortController();
    copilotRequest.current = controller;
    setAsking(true);
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
  return (
    <div className="intelligence-workspace">
      <section className="panel info-panel" aria-busy={busy}>
        <div className="section-heading">
          <div>
            <h2>
              <BrainCircuit size={21} />
              {t.product.intelligenceTitle}
            </h2>
          </div>
          <button
            className="button button-secondary button-small"
            disabled={busy || project.deleting}
            onClick={() => void refresh()}
          >
            {busy ? <Spinner /> : <RefreshCw size={15} />}
            {t.product.analyze}
          </button>
        </div>
        {error && <ErrorBanner message={error} />}
        {busy && !analysis && (
          <p role="status">
            <Spinner /> {t.loading}
          </p>
        )}
        {analysis && <IntelligenceSummary analysis={analysis} />}
        <Link
          className="button button-primary"
          href={`/generator?project=${project.id}&type=risk_register`}
        >
          {t.product.inferRisks}
        </Link>
      </section>
      <section className="panel info-panel copilot-panel" id="copilot" aria-busy={asking}>
        <h2>{t.product.copilot}</h2>
        <p className="field-hint">
          {t.product.privacyShort} <Link href="/about">{t.product.learnMore}</Link>
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
                {answer.provider === 'offline' ? t.product.offline : answer.provider}
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
