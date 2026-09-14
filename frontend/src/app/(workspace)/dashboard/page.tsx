'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChartNoAxesCombined,
  ChevronRight,
  FileText,
  FolderKanban,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { useAuth, useLocale } from '@/components/providers';
import { useWorkspace } from '@/components/workspace-provider';
import { documentIcons, EmptyState, PageHeading, QuickGenerate } from '@/components/ui';
import { ProjectCard } from '@/components/project-card';
import { ProjectForm } from '@/components/project-form';
import { DemoGuide } from '@/components/demo-guide';
import { formatDate } from '@/lib/format';
import type { ProjectStatus } from '@/types';

export default function Dashboard() {
  const { user } = useAuth();
  const { t, language } = useLocale();
  const { projects, documents } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const counts = Object.fromEntries(
    Object.keys(t.statuses).map((status) => [
      status,
      projects.filter((p) => p.status === status).length,
    ]),
  ) as Record<ProjectStatus, number>;
  const latest = projects
    .map((project) => documents.find((d) => d.projectId === project.id))
    .filter(Boolean);
  const riskCount = latest.reduce((count, document) => count + (document?.risks?.length || 0), 0);
  const activeShare = projects.length ? Math.round((counts.active / projects.length) * 100) : 0;
  const formatCount = new Set(documents.map((document) => document.type)).size;
  const metrics = [
    {
      label: t.totalProjects,
      value: projects.length,
      icon: FolderKanban,
      color: 'teal',
      detail: t.visual.portfolioStates,
    },
    {
      label: t.documentsCreated,
      value: documents.length,
      icon: FileText,
      color: 'blue',
      detail: `${formatCount} / 8 ${t.visual.documentFormats}`,
    },
    {
      label: t.activeProjects,
      value: counts.active,
      icon: ChartNoAxesCombined,
      color: 'violet',
      detail: `${activeShare}% ${t.visual.inProgress}`,
    },
    {
      label: t.risksDetected,
      value: riskCount,
      icon: ShieldAlert,
      color: 'amber',
      detail: t.latestProjectDocuments,
    },
  ];
  const colors = {
    active: 'var(--chart-active)',
    planning: 'var(--chart-planning)',
    at_risk: 'var(--chart-risk)',
    completed: 'var(--chart-completed)',
  };
  let angle = 0;
  const gradient = (['active', 'at_risk', 'planning', 'completed'] as ProjectStatus[])
    .map((status) => {
      const start = angle;
      angle += projects.length ? (counts[status] / projects.length) * 360 : 0;
      return `${colors[status]} ${start}deg ${angle}deg`;
    })
    .join(',');
  return (
    <div className="page-content">
      <PageHeading
        eyebrow={t.personalWorkspace}
        title={`${t.hello}, ${user?.name.split(' ')[0] || 'PM'}`}
        subtitle={t.overviewSubtitle}
      >
        <button className="button button-primary" onClick={() => setCreating(true)}>
          <Plus size={18} />
          {t.newProject}
        </button>
      </PageHeading>
      <div className="metrics-grid">
        {metrics.map(({ label, value, icon: Icon, color, detail }, index) => (
          <div className="metric-card" key={label}>
            <div className="metric-top">
              <span>{label}</span>
              <span className={`metric-icon metric-${color}`}>
                <Icon size={18} />
              </span>
            </div>
            <strong>{value.toString().padStart(2, '0')}</strong>
            <span className="metric-detail">{detail}</span>
            <div className="metric-visual" aria-hidden="true">
              {index === 0 ? (
                <div className="metric-meter">
                  {(Object.keys(counts) as ProjectStatus[]).map((status) => (
                    <span
                      key={status}
                      style={{
                        width: `${projects.length ? (counts[status] / projects.length) * 100 : 0}%`,
                        background: colors[status],
                      }}
                    />
                  ))}
                </div>
              ) : index < 3 ? (
                <div className="metric-meter">
                  <span
                    style={{ width: `${index === 1 ? (formatCount / 8) * 100 : activeShare}%` }}
                  />
                </div>
              ) : (
                <span className="metric-review">
                  <ShieldAlert size={12} />
                  {t.visual.riskHint}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <DemoGuide />
      <div className="dashboard-columns">
        <div className="dashboard-primary">
          <div className="section-heading">
            <div>
              <h2>{t.portfolio}</h2>
              <p>{t.portfolioSubtitle}</p>
            </div>
            <Link className="text-link" href="/projects">
              {t.viewAll}
              <ArrowRight size={15} />
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
            <div className="panel">
              <EmptyState title={t.noProjects} text={t.noProjectsText} icon={FolderKanban}>
                <button className="button button-primary" onClick={() => setCreating(true)}>
                  <Plus size={17} />
                  {t.newProject}
                </button>
              </EmptyState>
            </div>
          )}
          <div className="panel recent-panel">
            <div className="section-heading">
              <h2>{t.recentDocuments}</h2>
              <Link href="/documents" className="text-link">
                {t.viewAll}
                <ArrowRight size={15} />
              </Link>
            </div>
            {documents.length ? (
              documents.slice(0, 4).map((d) => {
                const Icon = documentIcons[d.type];
                return (
                  <Link href={`/documents/${d.id}`} className="recent-document" key={d.id}>
                    <span className={`document-icon doc-${d.type}`}>
                      <Icon size={19} />
                    </span>
                    <div>
                      <strong>{t.documentTypes[d.type]}</strong>
                      <span>
                        {projects.find((p) => p.id === d.projectId)?.name || t.projectNotFound}
                      </span>
                    </div>
                    <span className="recent-date">{formatDate(d.createdAt, language)}</span>
                    <ChevronRight size={16} />
                  </Link>
                );
              })
            ) : (
              <EmptyState title={t.noDocuments} text={t.noDocumentsText} />
            )}
          </div>
        </div>
        <aside className="dashboard-aside">
          <QuickGenerate />
          <div className="panel health-panel">
            <h2>{t.projectHealth}</h2>
            <p>{t.healthSubtitle}</p>
            <div
              className="health-donut"
              aria-hidden="true"
              style={{
                background: projects.length ? `conic-gradient(${gradient})` : 'var(--border)',
              }}
            >
              <div>
                <strong>{projects.length}</strong>
                <span>{t.projects.toLowerCase()}</span>
              </div>
            </div>
            <div className="health-legend">
              {(['active', 'at_risk', 'planning', 'completed'] as ProjectStatus[]).map((status) => (
                <div key={status}>
                  <span className="legend-dot" style={{ background: colors[status] }} />
                  <span>{t.statuses[status]}</span>
                  <strong>{counts[status]}</strong>
                </div>
              ))}
            </div>
            <div className="coverage-summary">
              <div>
                <span>{t.visual.coverage}</span>
                <strong>
                  {latest.length}
                  <span> / {projects.length}</span>
                </strong>
              </div>
              <div className="metric-meter" aria-hidden="true">
                <span
                  style={{
                    width: `${projects.length ? (latest.length / projects.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <p>{t.visual.coverageHint}</p>
            </div>
          </div>
          <div className="demo-footnote">
            <span className="legend-dot" />
            {user?.mode === 'demo' ? t.demoNotice : t.firebaseStorageHint}
          </div>
        </aside>
      </div>
      {creating && <ProjectForm onClose={() => setCreating(false)} />}
    </div>
  );
}
