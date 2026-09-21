'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, ChevronRight, FileText, Save } from 'lucide-react';
import {
  documentTypes,
  type DocumentType,
  type GeneratedDocument,
  type Language,
  type ProjectIntelligence,
} from '@/types';
import { useAuth, useLocale, useToast } from '@/components/providers';
import { useWorkspace } from '@/components/workspace-provider';
import {
  EmptyState,
  ErrorBanner,
  LoadingState,
  PageHeading,
  SelectField,
  Spinner,
} from '@/components/ui';
import { DocumentActions, DocumentWarnings, MarkdownContent } from '@/components/document-view';
import { generateDocument } from '@/lib/api';
import { saveDocument } from '@/lib/repository';
import { AppError, errorMessage } from '@/lib/errors';
import { IntelligenceSummary } from '@/components/project-intelligence';

function Generator() {
  const query = useSearchParams();
  const { user } = useAuth();
  const { t, language } = useLocale();
  const { notify } = useToast();
  const { projects, documents, refresh } = useWorkspace();
  const available = projects.filter((p) => !p.deleting);
  const [projectId, setProjectId] = useState(query.get('project') || available[0]?.id || '');
  const initialType = query.get('type') as DocumentType;
  const [type, setType] = useState<DocumentType>(
    documentTypes.includes(initialType) ? initialType : 'weekly_status',
  );
  const [outputLanguage, setOutputLanguage] = useState<Language>(language);
  const [context, setContext] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [output, setOutput] = useState<(GeneratedDocument & { projectName: string }) | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [analysis, setAnalysis] = useState<ProjectIntelligence | null>(null);
  const [includeHistory, setIncludeHistory] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const project = available.find((p) => p.id === projectId);
  const saved = output ? documents.some((d) => d.id === output.id) : false;
  const canFallback = error instanceof AppError && error.fallbackAvailable;
  useEffect(() => () => abort.current?.abort(), []);
  const generate = async (useDemoFallback = false, selectedType = type, improve = false) => {
    if (!project || !user || busy) return;
    setBusy(true);
    setError(null);
    setUsingFallback(useDemoFallback);
    abort.current = new AbortController();
    try {
      const result = await generateDocument(
        user,
        project,
        selectedType,
        outputLanguage,
        context,
        abort.current.signal,
        useDemoFallback,
        {
          previousDocuments:
            improve && output
              ? [
                  {
                    type: output.type,
                    provider: output.provider,
                    content: output.generatedContent.slice(0, 4000),
                  },
                ]
              : includeHistory
                ? documents
                    .filter((d) => d.projectId === project.id)
                    .slice(0, 3)
                    .map((d) => ({
                      type: d.type,
                      provider: d.provider,
                      content: d.generatedContent.slice(0, 4000),
                    }))
                : [],
        },
      );
      setAnalysis(result.intelligence || null);
      setOutput({
        id: result.id,
        ownerId: user.uid,
        projectId: project.id,
        projectName: project.name,
        type: result.type,
        language: result.language,
        inputContext: context,
        generatedContent: result.content,
        createdAt: result.generatedAt,
        provider: result.provider,
        risks: result.risks,
        warnings: result.warnings,
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setError(error);
    } finally {
      setBusy(false);
    }
  };
  const persist = async () => {
    if (!output || !user || saving || saved) return;
    setSaving(true);
    try {
      const document = { ...output };
      delete (document as Partial<typeof output>).projectName;
      await saveDocument(user, document);
      await refresh();
      notify(t.docSaved);
    } catch (error) {
      notify(errorMessage(error, t), 'error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="page-content generator-page">
      <PageHeading title={t.generatorTitle} />
      {!available.length ? (
        <div className="panel">
          <EmptyState title={t.noProjects} text={t.noProjectsText}>
            <Link className="button button-primary" href="/projects">
              {t.newProject}
            </Link>
          </EmptyState>
        </div>
      ) : (
        <div className="generator-layout">
          <section className="panel generator-controls">
            <div className="generator-step">
              <h2>{t.stepProject}</h2>
              <SelectField
                aria-label={t.selectProject}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={busy}
              >
                {!project && <option value="">{t.selectProject}</option>}
                {available.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectField>
              {project && (
                <>
                  <Link href={`/projects/${project.id}`} className="generator-project-hint">
                    {project.sector}
                    <span>
                      {t.projectContext}
                      <ChevronRight size={13} />
                    </span>
                  </Link>
                  <details className="generator-source-preview">
                    <summary>{t.showcase.sourcePreview}</summary>
                    <p>{project.description || t.notProvided}</p>
                    <strong>{t.notes}</strong>
                    <p>{project.notes || t.noNotes}</p>
                  </details>
                </>
              )}
            </div>
            <div className="generator-step">
              <h2>{t.stepDocument}</h2>
              <SelectField
                aria-label={t.stepDocument}
                value={type}
                disabled={busy}
                onChange={(event) => setType(event.target.value as DocumentType)}
              >
                {documentTypes.map((key) => (
                  <option key={key} value={key}>
                    {t.documentTypes[key]}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="generator-step">
              <label className="field">
                {t.outputLanguage}
                <SelectField
                  value={outputLanguage}
                  disabled={busy}
                  onChange={(e) => setOutputLanguage(e.target.value as Language)}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </SelectField>
              </label>
              <details className="generator-context-options">
                <summary>{t.simple.contextOptions}</summary>
                <label className="field context-field">
                  {t.extraContext}
                  <span className="optional">({t.optional})</span>
                  <textarea
                    rows={3}
                    value={context}
                    maxLength={12000}
                    disabled={busy}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder={t.contextPlaceholder}
                  />
                </label>
                <label className="history-opt-in">
                  <input
                    type="checkbox"
                    checked={includeHistory}
                    disabled={busy}
                    onChange={(e) => setIncludeHistory(e.target.checked)}
                  />
                  {t.product.includeHistory}
                </label>
              </details>
              <p className="field-hint">
                {t.product.privacyShort} <Link href="/about">{t.product.learnMore}</Link>
              </p>
            </div>
            <div className="generator-submit">
              {!!error && <ErrorBanner message={errorMessage(error, t)} />}
              {canFallback && (
                <div className="fallback-offer">
                  <p>{t.ai.fallbackDescription}</p>
                  <button
                    className="button button-secondary button-full"
                    disabled={busy || !project}
                    onClick={() => void generate(true)}
                  >
                    <FileText size={17} />
                    {t.ai.fallbackAction}
                  </button>
                </div>
              )}
              <button
                className="button button-primary button-full"
                disabled={busy || !project}
                onClick={() => void generate()}
              >
                {busy && <Spinner />}
                {busy ? t.generating : output ? t.regenerate : t.generate}
              </button>
              <details className="generator-more">
                <summary>{t.simple.moreOptions}</summary>
                <div className="generator-intelligence-actions">
                  {output && (
                    <button
                      className="button button-secondary button-full"
                      disabled={busy || !project}
                      onClick={() => void generate(false, type, true)}
                    >
                      {t.product.improve}
                    </button>
                  )}
                  <button
                    className="button button-secondary button-full"
                    disabled={busy || !project}
                    onClick={() => {
                      setType('risk_register');
                      void generate(false, 'risk_register');
                    }}
                  >
                    {t.product.inferRisks}
                  </button>
                  <button
                    className="text-button"
                    disabled={busy || !project}
                    onClick={() => void generate(true)}
                  >
                    {t.product.offline}
                  </button>
                  {project && (
                    <Link className="text-link" href={`/projects/${project.id}#copilot`}>
                      {t.product.ask}
                    </Link>
                  )}
                </div>
              </details>
              {busy && (
                <button
                  className="text-button cancel-generation"
                  onClick={() => abort.current?.abort()}
                >
                  {t.cancel}
                </button>
              )}
              <span className="generator-review-hint">{t.reviewHint}</span>
            </div>
          </section>
          <section
            className={`panel generator-output ${output ? 'has-output' : ''}`}
            aria-busy={busy}
            aria-label={t.outputPreview}
          >
            <div className="preview-header">
              <span>
                <FileText size={17} />
                {t.outputPreview}
              </span>
              {output && <span className="draft-badge">{saved ? t.savedDocument : t.draft}</span>}
            </div>
            {busy ? (
              <div className="output-empty" role="status">
                <Spinner size={26} />
                <h2>{usingFallback ? t.ai.fallbackWorking : t.generating}</h2>
                <p>{t.basedOn}</p>
                <div className="skeleton-lines">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : output ? (
              <>
                <div className="output-meta">
                  <span>{output.projectName}</span>
                  <span>
                    {output.language.toUpperCase()} ·{' '}
                    {output.provider === 'offline' ? t.product.offline : output.provider}
                  </span>
                </div>
                <DocumentActions document={output} projectName={output.projectName}>
                  <button
                    className="button button-primary button-small"
                    disabled={saving || saved}
                    onClick={persist}
                  >
                    {saving ? (
                      <Spinner size={15} />
                    ) : saved ? (
                      <Check size={15} />
                    ) : (
                      <Save size={15} />
                    )}
                    {saved ? t.saved : t.saveDocument}
                  </button>
                </DocumentActions>
                {user?.mode === 'demo' && (
                  <div className="local-save-note">
                    <p>{t.product.localSave}</p>
                    <Link href="/login" className="text-link">
                      {t.product.cloudSave}
                    </Link>
                  </div>
                )}
                {analysis && (
                  <details className="output-analysis">
                    <summary>{t.product.intelligenceTitle}</summary>
                    <IntelligenceSummary analysis={analysis} compact />
                  </details>
                )}
                <div className="output-paper">
                  <MarkdownContent content={output.generatedContent} />
                </div>
                <DocumentWarnings document={output} />
              </>
            ) : (
              <div className="output-empty">
                <h2>{t.outputEmpty}</h2>
                <p>{t.outputEmptyText}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
export default function GeneratorPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Generator />
    </Suspense>
  );
}
