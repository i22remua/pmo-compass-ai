'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import type { GeneratedDocument } from '@/types';
import { comparisonCandidates, compareDocumentText } from '@/lib/document-comparison';
import { useLocale } from './providers';
import { ProviderLabel, SelectField } from './ui';
import { DocumentActions, DocumentWarnings, MarkdownContent } from './document-view';

function Comparison({
  current,
  candidates,
}: {
  current: GeneratedDocument;
  candidates: GeneratedDocument[];
}) {
  const { t, language } = useLocale();
  const labels = t.documentComparison;
  const selectId = useId();
  const [baseId, setBaseId] = useState(candidates[0]?.id || '');
  const base = candidates.find((item) => item.id === baseId);
  const diff = useMemo(
    () => (base ? compareDocumentText(base.generatedContent, current.generatedContent) : null),
    [base, current],
  );
  const date = (value: string) =>
    new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date(value));
  return (
    <section className="document-comparison" aria-label={labels.title}>
      <div className="comparison-versions">
        <div>
          <div className="field">
            <label htmlFor={selectId}>{labels.previous}</label>
            <SelectField
              id={selectId}
              value={base ? baseId : ''}
              onChange={(event) => setBaseId(event.target.value)}
            >
              {!base && <option value="">{labels.choose}</option>}
              {candidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {date(item.createdAt)}
                </option>
              ))}
            </SelectField>
          </div>
          {base && (
            <span>
              <ProviderLabel provider={base.provider} /> ·{' '}
              <Link href={`/documents/${base.id}`}>{labels.openPrevious}</Link>
            </span>
          )}
        </div>
        <div className="comparison-current">
          <span>{labels.current}</span>
          <time dateTime={current.createdAt}>{date(current.createdAt)}</time>
          <ProviderLabel provider={current.provider} />
        </div>
      </div>
      <p className="field-hint">{labels.hint}</p>
      {!base && <p role="status">{labels.unavailable}</p>}
      {diff?.identical && <p role="status">{labels.identical}</p>}
      {diff?.grouped && <p role="status">{labels.grouped}</p>}
      <div className="comparison-changes">
        {diff?.changes.map((change, index) =>
          change.kind === 'unchanged' ? (
            <details className="comparison-unchanged" key={index}>
              <summary>
                {labels.unchanged} ({change.lines.length})
              </summary>
              <pre>{change.lines.join('\n')}</pre>
            </details>
          ) : (
            <section className={`comparison-change comparison-${change.kind}`} key={index}>
              <h3>
                {change.kind === 'removed' ? '−' : '+'} {labels[change.kind]}
              </h3>
              <pre>{change.lines.join('\n')}</pre>
            </section>
          ),
        )}
      </div>
      {base && (base.warnings.length > 0 || current.warnings.length > 0) && (
        <details className="comparison-warnings">
          <summary>{labels.warnings}</summary>
          <h3>{labels.previous}</h3>
          <DocumentWarnings document={{ generatedContent: '', warnings: base.warnings }} />
          <h3>{labels.current}</h3>
          <DocumentWarnings document={{ generatedContent: '', warnings: current.warnings }} />
        </details>
      )}
    </section>
  );
}

export function SavedDocumentView({
  document,
  documents,
  projectName,
}: {
  document: GeneratedDocument;
  documents: GeneratedDocument[];
  projectName: string;
}) {
  const { t } = useLocale();
  const [comparing, setComparing] = useState(false);
  const candidates = useMemo(
    () => comparisonCandidates(document, documents),
    [document, documents],
  );
  return (
    <section className="panel document-detail">
      <div className="document-detail-toolbar">
        {comparing ? (
          <h2 className="comparison-title">{t.documentComparison.title}</h2>
        ) : (
          <span className="provider-badge">
            <ProviderLabel provider={document.provider} />
          </span>
        )}
        <div className="document-actions">
          {(candidates.length > 0 || comparing) && (
            <button
              className="button button-secondary button-small"
              aria-expanded={comparing}
              aria-controls="saved-document-comparison"
              onClick={() => setComparing(!comparing)}
            >
              {comparing ? t.documentComparison.back : t.documentComparison.title}
            </button>
          )}
          {!comparing && <DocumentActions document={document} projectName={projectName} />}
        </div>
      </div>
      <div id="saved-document-comparison" hidden={!comparing}>
        {comparing && <Comparison current={document} candidates={candidates} />}
      </div>
      {!comparing && (
        <>
          <MarkdownContent content={document.generatedContent} />
          <DocumentWarnings document={document} />
        </>
      )}
    </section>
  );
}
