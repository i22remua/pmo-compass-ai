'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CaseLifecycle } from '@/components/case-lifecycle';
import { useLocale } from '@/components/providers';
import {
  ErrorBanner,
  LanguageSwitch,
  Logo,
  ProviderLabel,
  SelectField,
  Spinner,
} from '@/components/ui';
import { ThemeToggle } from '@/components/theme-controls';
import { DocumentActions, DocumentWarnings, MarkdownContent } from '@/components/document-view';
import { generateExample } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import projects from '@/lib/demo-projects.json';
import documents from '@/lib/demo-documents.json';
import {
  documentTypes,
  type DocumentType,
  type GenerationResult,
  type ProjectInput,
} from '@/types';

export default function CaseStudy() {
  const { t, language } = useLocale();
  const [type, setType] = useState<DocumentType>('risk_register');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const project = projects[language][1] as ProjectInput;
  const sample = documents[language].find(
    (document) => document.projectIndex === 1 && document.type === 'risk_register',
  )!;
  useEffect(() => {
    request.current?.abort();
    setResult(null);
    setError('');
    setBusy(false);
    return () => request.current?.abort();
  }, [language]);
  // Never present the risk-register fixture as a different selected document.
  const current = result?.language === language && result.type === type ? result : null;
  const output = current ?? (type === 'risk_register' ? sample : null);
  const document = output
    ? {
        type,
        language,
        generatedContent: output.content,
        warnings: output.warnings,
      }
    : null;
  const risks = output?.risks ?? [];
  const firstEvidence = risks.find((risk) => risk.source === 'provided' && risk.evidence)?.evidence;
  const riskItem = (risk: (typeof risks)[number], index: number) => {
    // Repeated mitigations remain recoverable in details, without repeating visible actions.
    const repeatedAction = risks
      .slice(0, index)
      .some((item) => item.mitigation === risk.mitigation);
    return (
      <li key={index} className="case-issue">
        <h4>{risk.risk}</h4>
        <span className="case-origin">
          {risk.source === 'provided'
            ? t.product.provided
            : risk.source === 'inferred'
              ? t.product.inferred
              : t.product.diagnosisInsufficient}
        </span>
        {risk.mitigation && !repeatedAction && (
          <p className="case-action">
            <strong>{t.presentation.proposedAction}: </strong>
            {risk.mitigation}
          </p>
        )}
        <details>
          <summary>{t.presentation.evidence}</summary>
          <p>{risk.evidence}</p>
          {repeatedAction && risk.mitigation && (
            <p>
              <strong>{t.presentation.proposedAction}: </strong>
              {risk.mitigation}
            </p>
          )}
          {risk.cause && (
            <p>
              <strong>{t.product.diagnosisCauses}: </strong>
              {risk.cause}
            </p>
          )}
          {risk.impact && (
            <p>
              <strong>{t.product.potentialImpact}: </strong>
              {risk.impact}
            </p>
          )}
        </details>
      </li>
    );
  };
  const generate = async () => {
    if (busy) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const next = await generateExample(project, type, language, controller.signal);
      if (!controller.signal.aborted) setResult(next);
    } catch (issue) {
      if (!controller.signal.aborted) setError(errorMessage(issue, t));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return (
    <div className="landing case-page">
      <header className="landing-header">
        <Logo />
        <div className="landing-header-actions">
          <ThemeToggle />
          <LanguageSwitch />
          <Link href="/about#built">{t.presentation.build}</Link>
        </div>
      </header>
      <main id="main-content" className="case-main">
        <div className="case-heading">
          <span className="editorial-kicker">{t.presentation.caseLabel}</span>
          <h1>{t.presentation.casePageTitle}</h1>
          <p>{t.presentation.caseDescription}</p>
          <a className="text-link case-result-jump" href="#case-result">
            {t.presentation.jumpToResult} ↓
          </a>
        </div>
        <CaseLifecycle />
        <div className="case-columns">
          <section className="case-source" aria-labelledby="source-title">
            <h2 id="source-title">{t.presentation.source}</h2>
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            <dl className="case-facts">
              <div>
                <dt>{t.status}</dt>
                <dd>{t.statuses[project.status]}</dd>
              </div>
              <div>
                <dt>{t.endDate}</dt>
                <dd>{formatDate(project.endDate, language)}</dd>
              </div>
              <div>
                <dt>{t.budget}</dt>
                <dd>{formatMoney(project.budget, language)}</dd>
              </div>
            </dl>
            <details>
              <summary>{t.presentation.allContext}</summary>
              <blockquote>{project.notes}</blockquote>
              <p>{project.objectives}</p>
              <p>{project.stakeholders}</p>
              <p>
                {t.budget}: {formatMoney(project.budget, language)} · {t.statuses[project.status]}
              </p>
              <p>
                {formatDate(project.startDate, language)} → {formatDate(project.endDate, language)}
              </p>
            </details>
            <div className="case-controls">
              <label className="field">
                {t.document}
                <SelectField
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value as DocumentType);
                    setError('');
                  }}
                  disabled={busy}
                >
                  {documentTypes.map((key) => (
                    <option key={key} value={key}>
                      {t.documentTypes[key]}
                    </option>
                  ))}
                </SelectField>
              </label>
              <button
                className="button button-primary"
                disabled={busy}
                onClick={() => void generate()}
              >
                {busy && <Spinner />}
                {busy ? t.generating : t.presentation.run}
              </button>
              <p className="field-hint">{t.presentation.casePrivacy}</p>
              {error && <ErrorBanner message={error} />}
            </div>
          </section>
          <section
            id="case-result"
            className="case-result"
            aria-labelledby="result-title"
            tabIndex={-1}
          >
            <div className="section-heading">
              <h2 id="result-title">{t.presentation.result}</h2>
              <span className="case-provenance" role="status">
                {busy && <span>{t.generating} · </span>}
                {current ? (
                  <>
                    {t.presentation.liveResult} · <ProviderLabel provider={current.provider} />
                  </>
                ) : output ? (
                  t.presentation.precomputed
                ) : (
                  t.presentation.pendingResult
                )}
              </span>
            </div>
            <h3>{t.documentTypes[type]}</h3>
            {document ? (
              <div aria-busy={busy}>
                <div className="case-executive">
                  <h4>{t.presentation.summary}</h4>
                  <span className="case-origin">{t.product.diagnosisProvided}</span>
                  <p>
                    {t.presentation.recordedStatus}: <strong>{t.statuses[project.status]}</strong>.{' '}
                    {firstEvidence}
                  </p>
                </div>
                <h4 className="case-issues-title">
                  {t.presentation.issues} <span>({risks.length})</span>
                </h4>
                {risks.length ? (
                  <>
                    <ul className="case-risks">{risks.slice(0, 3).map(riskItem)}</ul>
                    {risks.length > 3 && (
                      <details className="case-more-issues">
                        <summary>
                          {t.presentation.moreIssues} ({risks.length - 3})
                        </summary>
                        <ul className="case-risks">
                          {risks.slice(3).map((risk, index) => riskItem(risk, index + 3))}
                        </ul>
                      </details>
                    )}
                  </>
                ) : (
                  <p className="field-hint">{t.presentation.noStructuredIssues}</p>
                )}
                <details className="case-full-document" key={`${type}-${current?.id ?? language}`}>
                  <summary>
                    {type === 'risk_register'
                      ? t.presentation.riskRegister
                      : t.presentation.fullDocument}
                  </summary>
                  <div className="case-document">
                    <MarkdownContent content={document.generatedContent} />
                  </div>
                </details>
                <DocumentActions document={document} projectName={project.name} />
                <DocumentWarnings document={document} />
              </div>
            ) : (
              <p className="case-pending">{t.presentation.generateSelected}</p>
            )}
            <p className="field-hint">{t.product.reviewNotice}</p>
          </section>
        </div>
        <div className="case-next">
          <Link className="button button-primary" href="/start">
            {t.presentation.ownProject}
          </Link>
          <Link className="text-link" href="/about#built">
            {t.presentation.build} →
          </Link>
        </div>
      </main>
      <footer className="landing-footer">
        <span>{t.presentation.author}</span>
        <a href="https://github.com/i22remua/pmo-compass-ai">GitHub</a>
      </footer>
    </div>
  );
}
