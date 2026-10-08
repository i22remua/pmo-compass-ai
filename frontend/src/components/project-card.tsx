'use client';
import Link from 'next/link';
import type { Project } from '@/types';
import { useLocale } from './providers';
import { StatusBadge } from './ui';
import { formatDate } from '@/lib/format';
import { useWorkspace } from './workspace-provider';
import { portfolioReview } from '@/lib/pmo-metrics';

export function ProjectCard({
  project,
  documentCount,
}: {
  project: Project;
  documentCount: number;
  index?: number;
}) {
  const { t, language } = useLocale();
  const { records } = useWorkspace();
  const attention = portfolioReview([project], records).queue[0];
  return (
    <Link href={`/projects/${project.id}`} className={`project-card project-${project.status}`}>
      <div className="record-title">
        <span className="project-sector">{project.sector}</span>
        <h3>{project.name}</h3>
      </div>
      <div className="project-card-top">
        <StatusBadge status={project.status} />
      </div>
      <div className="record-date">
        <span>{t.endDate}</span>
        <time>{formatDate(project.endDate, language)}</time>
      </div>
      <div className={`record-documents ${attention ? 'record-attention' : ''}`}>
        <span>{attention ? t.attention[attention.kind] : t.documentsCreated}</span>
        <strong>
          {attention ? attention.record?.title || t.statuses[project.status] : documentCount}
        </strong>
      </div>
      <span className="record-arrow" aria-hidden="true">
        ↗
      </span>
      {project.deleting && <span className="deletion-warning">{t.deletingProject}</span>}
    </Link>
  );
}
