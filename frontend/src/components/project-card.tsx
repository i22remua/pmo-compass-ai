'use client';
import Link from 'next/link';
import type { Project } from '@/types';
import { useLocale } from './providers';
import { StatusBadge } from './ui';
import { formatDate } from '@/lib/format';

export function ProjectCard({
  project,
  documentCount,
  index = 0,
}: {
  project: Project;
  documentCount: number;
  index?: number;
}) {
  const { t, language } = useLocale();
  return (
    <Link href={`/projects/${project.id}`} className={`project-card project-${project.status}`}>
      <span className="record-index" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
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
      <div className="record-documents">
        <span>{t.documentsCreated}</span>
        <strong>{String(documentCount).padStart(2, '0')}</strong>
      </div>
      <span className="record-arrow" aria-hidden="true">
        ↗
      </span>
      {project.deleting && <span className="deletion-warning">{t.deletingProject}</span>}
    </Link>
  );
}
