'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useLocale } from '@/components/providers';
import { useWorkspace } from '@/components/workspace-provider';
import { EmptyState, PageHeading } from '@/components/ui';
import { ProjectCard } from '@/components/project-card';
import { ProjectForm } from '@/components/project-form';
import { DemoGuide } from '@/components/demo-guide';
import { formatDate } from '@/lib/format';
import type { ProjectStatus } from '@/types';

export default function Dashboard() {
  const { t, language } = useLocale();
  const { projects, documents } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const latest = projects
    .map((project) => documents.find((d) => d.projectId === project.id))
    .filter(Boolean);
  const metrics = [
    [t.totalProjects, projects.length],
    [t.documentsCreated, documents.length],
    [t.risksDetected, latest.reduce((count, doc) => count + (doc?.risks?.length || 0), 0)],
  ] as const;
  return (
    <div className="page-content quiet-dashboard">
      <PageHeading title={t.dashboard}>
        {projects.length > 0 && (
          <Link className="button button-secondary" href="/generator">
            {t.generateDocument}
          </Link>
        )}
        <button className="button button-primary" onClick={() => setCreating(true)}>
          <Plus size={16} />
          {t.newProject}
        </button>
      </PageHeading>
      {projects.length > 0 && (
        <dl className="summary-strip">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className={`quiet-dashboard-columns ${projects.length ? '' : 'is-empty'}`}>
        <section>
          <div className="section-heading">
            <h2>{t.projects}</h2>
            <Link className="text-link" href="/projects">
              {t.viewAll} →
            </Link>
          </div>
          {projects.length ? (
            <div className="projects-grid">
              {projects.slice(0, 4).map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  documentCount={documents.filter((d) => d.projectId === p.id).length}
                />
              ))}
            </div>
          ) : (
            <EmptyState title={t.noProjects} text={t.noProjectsText} />
          )}
          <DemoGuide />
        </section>
        {projects.length > 0 && (
          <aside>
            <section className="quiet-recent">
              <div className="section-heading">
                <h2>{t.recentDocuments}</h2>
                <Link href="/documents" className="text-link">
                  {t.viewAll} →
                </Link>
              </div>
              {documents.length ? (
                documents.slice(0, 4).map((d) => (
                  <Link href={`/documents/${d.id}`} className="recent-document" key={d.id}>
                    <div>
                      <strong>{t.documentTypes[d.type]}</strong>
                      <span>
                        {projects.find((p) => p.id === d.projectId)?.name || t.projectNotFound}
                      </span>
                    </div>
                    <span className="recent-date">{formatDate(d.createdAt, language)}</span>
                  </Link>
                ))
              ) : (
                <p className="muted">{t.noDocuments}</p>
              )}
            </section>
            <details className="quiet-health">
              <summary>{t.projectHealth}</summary>
              <dl>
                {(Object.keys(t.statuses) as ProjectStatus[]).map((status) => (
                  <div key={status}>
                    <dt>{t.statuses[status]}</dt>
                    <dd>{projects.filter((p) => p.status === status).length}</dd>
                  </div>
                ))}
              </dl>
              <p className="field-hint">{t.product.pendingActionsHint}</p>
            </details>
          </aside>
        )}
      </div>
      {creating && <ProjectForm onClose={() => setCreating(false)} />}
    </div>
  );
}
