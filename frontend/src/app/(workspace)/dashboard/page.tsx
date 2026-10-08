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
import {
  localDate,
  portfolioReview,
  type AttentionKind,
  type AttentionItem,
} from '@/lib/pmo-metrics';
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
  const review = portfolioReview(projects, records, today);
  const { metrics, coverage } = review;
  const [filter, setFilter] = useState<AttentionKind | null>(null);
  const [expanded, setExpanded] = useState(false);
  const items: AttentionItem[] =
    filter === 'riskProjects'
      ? metrics.riskProjects.map((project) => ({ kind: 'riskProjects', project }))
      : review.queue.filter((item) => !filter || item.kind === filter);
  const visibleProjects = review.sortedProjects.slice(0, 4);
  const hasTracking = coverage.overdue + coverage.highRisks + coverage.decisions > 0;
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
      <section
        id="portfolio-results"
        className="portfolio-attention"
        aria-labelledby="attention-title"
      >
        <div className="section-heading">
          <h2 id="attention-title">
            {filter ? t.tracking[filter] : t.attention.title}{' '}
            <span className="attention-count">{items.length}</span>
          </h2>
          {filter && (
            <button
              className="text-button"
              onClick={() => {
                setFilter(null);
                setExpanded(false);
              }}
            >
              {t.attention.clearFilter}
            </button>
          )}
        </div>
        {!items.length && (
          <p className="attention-empty">
            {filter
              ? coverage[filter]
                ? t.attention.emptyFilter
                : t.attention.noKind
              : hasTracking
                ? t.attention.clear
                : t.attention.noTracking}
          </p>
        )}
        <ul className="attention-list">
          {(expanded ? items : items.slice(0, 5)).map(({ kind, project, record }) => (
            <li key={record ? `record-${record.id}` : `project-${project.id}`}>
              <Link
                className={`attention-row attention-${kind}`}
                href={
                  record
                    ? `/projects/${project.id}?record=${encodeURIComponent(record.id)}#tracking`
                    : `/projects/${project.id}`
                }
              >
                <div className="attention-item-main">
                  <span className="attention-reason">
                    {t.attention[kind]}
                    {kind === 'overdue' && record
                      ? ` · ${formatDate(record.dueDate, language)}`
                      : ''}
                  </span>
                  <strong>{record?.title || project.name}</strong>
                  {record && <span className="attention-project">{project.name}</span>}
                </div>
                <span className="attention-open">
                  {record ? t.attention.openRecord : t.attention.openProject}{' '}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {items.length > 5 && (
          <button className="text-button" onClick={() => setExpanded(!expanded)}>
            {expanded ? t.attention.showLess : `${t.attention.showAll} (${items.length})`}
          </button>
        )}
        {!!(review.missingDates || review.unassessedRisks) && (
          <p className="attention-gaps">
            {[
              review.missingDates ? `${t.attention.missingDates}: ${review.missingDates}` : '',
              review.unassessedRisks ? `${t.attention.unassessed}: ${review.unassessedRisks}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        <details className="metric-method">
          <summary>{t.attention.order}</summary>
          <p>{t.attention.orderText}</p>
          <p>{t.tracking.methodText}</p>
        </details>
      </section>
      <div className="pmo-signals" aria-label={t.tracking.title}>
        {(Object.keys(metrics) as AttentionKind[]).map((key) => (
          <button
            key={key}
            aria-label={`${coverage[key] ? metrics[key].length : t.attention.noRecords} ${t.tracking[key]}`}
            aria-pressed={filter === key}
            onClick={() => {
              setFilter(filter === key ? null : key);
              setExpanded(false);
            }}
            aria-controls="portfolio-results"
          >
            <strong>{coverage[key] ? metrics[key].length : '—'}</strong>
            <span>{t.tracking[key]}</span>
            <small>
              {!coverage[key]
                ? t.attention.noRecords
                : key === 'riskProjects'
                  ? t.attention.registeredStatus
                  : t.attention.recorded}
            </small>
          </button>
        ))}
      </div>
      <div className={`quiet-dashboard-columns ${projects.length ? '' : 'is-empty'}`}>
        <section hidden={!!filter}>
          <div className="section-heading">
            <h2>{t.attention.portfolio}</h2>
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
          {projects.length === 0 && <DemoGuide />}
        </section>
        {projects.length > 0 && !filter && (
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
