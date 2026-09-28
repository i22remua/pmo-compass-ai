'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useLocale } from '@/components/providers';
import { useWorkspace } from '@/components/workspace-provider';
import { EmptyState, PageHeading } from '@/components/ui';
import { ProjectCard } from '@/components/project-card';
import { ProjectForm } from '@/components/project-form';
import { DemoGuide } from '@/components/demo-guide';
import { formatDate } from '@/lib/format';
import { localDate, pmoMetrics } from '@/lib/pmo-metrics';
import type { ProjectStatus } from '@/types';

export default function Dashboard() {
  const { t, language } = useLocale();
  const { projects, documents, records } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const timer = setInterval(() => setToday(localDate()), 60000);
    return () => clearInterval(timer);
  }, []);
  const metrics = pmoMetrics(projects, records, today);
  const [filter, setFilter] = useState<keyof typeof metrics | null>(null);
  const visibleProjects = filter === 'riskProjects' ? metrics.riskProjects : projects.slice(0, 4);
  return (
    <div className="page-content quiet-dashboard">
      <PageHeading eyebrow={t.compass.control} title={t.dashboard}>
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
      <div className="pmo-signals" aria-label={t.tracking.title}>
        {(Object.keys(metrics) as (keyof typeof metrics)[]).map((key) => (
          <button
            key={key}
            aria-pressed={filter === key}
            onClick={() => setFilter(filter === key ? null : key)}
            aria-controls="portfolio-results"
          >
            <strong>{String(metrics[key].length).padStart(2, '0')}</strong>
            <span>{t.tracking[key]}</span>
          </button>
        ))}
      </div>
      <details className="metric-method">
        <summary>{t.tracking.method}</summary>
        <p>{t.tracking.methodText}</p>
      </details>
      {filter && (
        <div className="section-heading">
          <h2>
            {t.tracking[filter]} · {metrics[filter].length}
          </h2>
          <button className="text-button" onClick={() => setFilter(null)}>
            {t.tracking.all}
          </button>
        </div>
      )}
      {filter && filter !== 'riskProjects' && (
        <section
          id="portfolio-results"
          className="filtered-records"
          aria-label={t.tracking[filter]}
        >
          {!metrics[filter].length && <p className="muted">{t.tracking.none}</p>}
          {metrics[filter].map((record) => (
            <Link
              className="recent-document"
              href={`/projects/${record.projectId}#tracking`}
              key={record.id}
            >
              <div>
                <strong>{record.title}</strong>
                <span>{projects.find((p) => p.id === record.projectId)?.name}</span>
              </div>
              <span className="recent-date">
                {record.kind === 'action'
                  ? formatDate(record.dueDate, language)
                  : t.tracking[record.kind]}{' '}
                →
              </span>
            </Link>
          ))}
        </section>
      )}
      <div className={`quiet-dashboard-columns ${projects.length ? '' : 'is-empty'}`}>
        <section
          id={!filter || filter === 'riskProjects' ? 'portfolio-results' : undefined}
          hidden={!!filter && filter !== 'riskProjects'}
        >
          <div className="section-heading">
            <h2>{t.projects}</h2>
            <Link className="text-link" href="/projects">
              {t.viewAll} →
            </Link>
          </div>
          {visibleProjects.length ? (
            <div className="projects-grid">
              {visibleProjects.map((p, index) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  index={index}
                  documentCount={documents.filter((d) => d.projectId === p.id).length}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={filter ? t.tracking.none : t.noProjects}
              text={filter ? '' : t.noProjectsText}
            />
          )}
          <DemoGuide />
        </section>
        {projects.length > 0 && (
          <section className="desk-records">
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
            </details>
          </section>
        )}
      </div>
      {creating && <ProjectForm onClose={() => setCreating(false)} />}
    </div>
  );
}
