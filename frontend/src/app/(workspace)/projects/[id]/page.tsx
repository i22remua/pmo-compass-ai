'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Pencil, Save, Trash2 } from 'lucide-react';
import { useAuth, useLocale, useToast } from '@/components/providers';
import { useWorkspace } from '@/components/workspace-provider';
import { ConfirmDialog, EmptyState, ErrorBanner, Spinner, StatusBadge } from '@/components/ui';
import { ProjectSources } from '@/components/project-sources';
import { ProjectTracking } from '@/components/project-tracking';
import { ProjectForm } from '@/components/project-form';
import { ProjectIntelligencePanel } from '@/components/project-intelligence';
import { ProjectBrief } from '@/components/project-brief';
import { ProjectNavigation } from '@/components/project-navigation';
import { ProjectReviewPanel } from '@/components/project-review';
import { useProjectAnalysis } from '@/hooks/use-project-analysis';
import { formatDate, formatMoney } from '@/lib/format';
import { removeProject, saveProject } from '@/lib/repository';
import { errorMessage } from '@/lib/errors';

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLocale();
  const { notify } = useToast();
  const { projects, documents, refresh } = useWorkspace();
  const project = projects.find((p) => p.id === id);
  const analysisState = useProjectAnalysis(project);
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState(project?.notes || '');
  useEffect(() => {
    setNotes(project?.notes || '');
  }, [id, project?.notes]);
  useEffect(() => {
    const navigate = () => {
      const target = window.location.hash;
      if (['#copilot', '#scenario', '#risks', '#diagnosis', '#intelligence'].includes(target))
        setTab('intelligence');
      if (['#overview', '#tracking', '#sources', '#notes', '#documents'].includes(target))
        setTab(target.slice(1));
      if (!target) setTab('overview');
    };
    navigate();
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, [id]);
  const selectTab = (next: string) => {
    setTab(next);
    window.history.pushState(null, '', `#${next === 'intelligence' ? 'diagnosis' : next}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  const dirty = notes !== (project?.notes || '');
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);
  if (!project)
    return (
      <div className="page-content project-page">
        <EmptyState title={t.projectNotFound} text={t.projectNotFoundText}>
          <Link href="/projects" className="button button-primary">
            {t.backProjects}
          </Link>
        </EmptyState>
      </div>
    );
  const projectDocuments = documents.filter((d) => d.projectId === id);
  const handleNotes = async (generate = false) => {
    if (!user || busy) return;
    setBusy(true);
    setError('');
    try {
      if (dirty) {
        await saveProject(user, { ...project, notes }, language, project);
        await refresh();
        notify(t.notesSaved);
      }
      if (generate) router.push(`/generator?project=${id}`);
    } catch (error) {
      setError(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };
  const handleDelete = async () => {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      await removeProject(user, project);
      await refresh();
      notify(t.projectDeleted);
      router.push('/projects');
    } catch (error) {
      setError(errorMessage(error, t));
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-content project-page">
      <Link className="back-link" href="/projects">
        <ArrowLeft size={15} />
        {t.backProjects}
      </Link>
      <div className="project-page-heading">
        <div>
          <div className="project-title-meta">
            <span className="eyebrow">{project.sector}</span>
            <StatusBadge status={project.status} />
          </div>
          <h1>{project.name}</h1>
        </div>
        <div className="project-heading-buttons">
          <button
            className="button button-secondary"
            disabled={project.deleting}
            onClick={() => setEditing(true)}
          >
            <Pencil size={16} />
            {t.edit}
          </button>
          <button
            className="button button-secondary"
            disabled={busy || project.deleting}
            onClick={() => void handleNotes(true)}
          >
            {busy && <Spinner />}
            {t.projectNavigation.document}
          </button>
        </div>
      </div>
      {project.deleting && <ErrorBanner message={t.deletingProject} />}
      <ProjectNavigation
        tab={tab}
        select={selectTab}
        documentCount={projectDocuments.length}
        dirty={dirty}
      />
      <div role="tabpanel" id="dossier-panel" aria-labelledby={`dossier-tab-${tab}`} tabIndex={0}>
        <div hidden={tab !== 'intelligence'}>
          <ProjectIntelligencePanel
            key={project.id}
            project={project}
            analysisState={analysisState}
            active={tab === 'intelligence'}
          />
        </div>
        {tab === 'sources' && <ProjectSources project={project} />}
        {tab === 'tracking' && <ProjectTracking project={project} />}
        {tab === 'overview' && (
          <>
            <ProjectBrief
              project={project}
              state={analysisState}
              onAnalysis={() => {
                selectTab('intelligence');
                document.getElementById('dossier-tab-intelligence')?.focus();
              }}
              onContext={() => setEditing(true)}
            />
            <ProjectReviewPanel project={project} state={analysisState} />
            <details className="project-context-details">
              <summary>{t.projectBrief.context}</summary>
              <div className="project-facts">
                <div>
                  <span>{t.startDate}</span>
                  <strong>{formatDate(project.startDate, language)}</strong>
                </div>
                <div>
                  <span>{t.endDate}</span>
                  <strong>{formatDate(project.endDate, language)}</strong>
                </div>
                <div>
                  <span>{t.budget}</span>
                  <strong>{formatMoney(project.budget, language)}</strong>
                </div>
                <div>
                  <span>{t.documentsCreated}</span>
                  <strong>{projectDocuments.length}</strong>
                </div>
              </div>
              <div className="workspace-columns">
                <div className="stack">
                  <details className="panel info-panel project-description">
                    <summary>{t.description}</summary>
                    <p className="preserve-lines">{project.description || t.notProvided}</p>
                  </details>

                  <section className="panel info-panel">
                    <h2>{t.objectives}</h2>
                    <div className="objectives-list">
                      {project.objectives ? (
                        project.objectives
                          .split('\n')
                          .filter(Boolean)
                          .map((line, index) => <p key={index}>{line}</p>)
                      ) : (
                        <p className="muted">{t.notProvided}</p>
                      )}
                    </div>
                  </section>
                  <section className="panel info-panel">
                    <div className="section-heading">
                      <h2>{t.notes}</h2>
                      <button className="text-button" onClick={() => selectTab('notes')}>
                        {t.edit}
                        <Pencil size={14} />
                      </button>
                    </div>
                    <p className="preserve-lines notes-excerpt">{notes || t.noNotes}</p>
                  </section>
                </div>
                <aside className="panel info-panel">
                  <h2>{t.stakeholders}</h2>
                  <div className="stakeholder-list">
                    {project.stakeholders ? (
                      project.stakeholders
                        .split('\n')
                        .filter(Boolean)
                        .map((person, index) => (
                          <div key={index}>
                            <span className="stakeholder-avatar">{person.trim()[0]}</span>
                            <p>{person}</p>
                          </div>
                        ))
                    ) : (
                      <p className="muted">{t.notProvided}</p>
                    )}
                  </div>
                </aside>
              </div>
            </details>
          </>
        )}
        {tab === 'notes' && (
          <div className="panel notes-panel">
            <div className="section-heading">
              <div>
                <h2>{t.notes}</h2>
              </div>
              <span className={`save-indicator ${dirty ? 'is-dirty' : ''}`}>
                {dirty ? t.unsavedNotes : t.saved}
              </span>
            </div>
            <label className="sr-only" htmlFor="project-notes">
              {t.notes}
            </label>
            <textarea
              id="project-notes"
              value={notes}
              maxLength={20000}
              rows={15}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              disabled={project.deleting}
            />
            <div className="notes-toolbar">
              <span>
                {notes.length.toLocaleString(language === 'es' ? 'es-ES' : 'en-GB')} /{' '}
                {new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-GB').format(20000)}
              </span>
              <button
                className="button button-primary"
                disabled={!dirty || busy || project.deleting}
                onClick={() => void handleNotes()}
              >
                {busy ? <Spinner /> : <Save size={16} />}
                {t.saveNotes}
              </button>
            </div>
            {error && <ErrorBanner message={error} />}
          </div>
        )}
        {tab === 'documents' && (
          <div className="panel">
            {projectDocuments.length ? (
              projectDocuments.map((d) => {
                return (
                  <Link key={d.id} href={`/documents/${d.id}`} className="recent-document">
                    <div>
                      <strong>{t.documentTypes[d.type]}</strong>
                      <span>
                        {formatDate(d.createdAt, language)} · {d.language.toUpperCase()}
                      </span>
                    </div>
                    <ArrowUpRight size={18} />
                  </Link>
                );
              })
            ) : (
              <EmptyState title={t.noDocuments} text={t.noDocumentsText}>
                <button className="button button-primary" onClick={() => void handleNotes(true)}>
                  {t.generateDocument}
                </button>
              </EmptyState>
            )}
          </div>
        )}
      </div>
      <div className="project-bottom">
        <span>
          {t.created}: {formatDate(project.createdAt, language)}
        </span>
        <button
          className="text-button danger-text"
          onClick={() => {
            setError('');
            setDeleting(true);
          }}
        >
          <Trash2 size={15} />
          {t.deleteProject}
        </button>
      </div>
      {editing && <ProjectForm project={project} onClose={() => setEditing(false)} />}
      {deleting && (
        <ConfirmDialog
          title={t.deleteTitle}
          text={t.deleteText}
          onClose={() => setDeleting(false)}
          onConfirm={handleDelete}
          busy={busy}
          error={error}
        />
      )}
    </div>
  );
}
