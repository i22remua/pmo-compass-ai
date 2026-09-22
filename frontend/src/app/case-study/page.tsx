'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
  const current = result?.language === language ? result : null;
  const document = {
    type: current?.type || ('risk_register' as DocumentType),
    language,
    generatedContent: current?.content || sample.content,
    warnings: current?.warnings || sample.warnings,
  };
  const risks = current?.risks || sample.risks;
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
        </div>
        <div className="case-columns">
          <section className="case-source" aria-labelledby="source-title">
            <h2 id="source-title">{t.presentation.source}</h2>
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            <p className="case-brief">{t.presentation.caseInput}</p>
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
                  onChange={(event) => setType(event.target.value as DocumentType)}
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
          <section className="case-result" aria-labelledby="result-title" aria-busy={busy}>
            <div className="section-heading">
              <h2 id="result-title">{t.presentation.result}</h2>
              <span className="case-provenance" role="status">
                {current ? (
                  <>
                    {t.presentation.liveResult} · <ProviderLabel provider={current.provider} />
                  </>
                ) : (
                  t.presentation.precomputed
                )}
              </span>
            </div>
            <h3>{t.documentTypes[document.type]}</h3>
            {document.type === 'risk_register' ? (
              <div className="case-risks">
                {risks.map((risk, index) => (
                  <details key={index}>
                    <summary>
                      <span>{risk.risk}</span>
                      <small>
                        {risk.source === 'inferred' ? t.product.inferred : t.product.provided}
                      </small>
                    </summary>
                    <p>{risk.evidence}</p>
                    <p>
                      <strong>{t.product.actions}: </strong>
                      {risk.mitigation}
                    </p>
                  </details>
                ))}
              </div>
            ) : (
              <div className="case-document">
                <MarkdownContent content={document.generatedContent} />
              </div>
            )}
            {document.type === 'risk_register' && (
              <details className="case-full-document">
                <summary>{t.presentation.fullDocument}</summary>
                <div className="case-document">
                  <MarkdownContent content={document.generatedContent} />
                </div>
              </details>
            )}
            <DocumentActions document={document} projectName={project.name} />
            {current && <DocumentWarnings document={document} />}
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
