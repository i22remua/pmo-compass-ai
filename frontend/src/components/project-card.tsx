'use client';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, FileText, FolderKanban } from 'lucide-react';
import type { Project } from '@/types';
import { useLocale } from './providers';
import { StatusBadge } from './ui';
import { formatDate } from '@/lib/format';

export function ProjectCard({
  project,
  documentCount,
}: {
  project: Project;
  documentCount: number;
}) {
  const { t, language } = useLocale();
  return (
    <Link href={`/projects/${project.id}`} className={`project-card project-${project.status}`}>
      <div className="project-card-top">
        <span className={`project-symbol symbol-${project.status}`}>
          <FolderKanban size={22} strokeWidth={1.7} />
        </span>
        <StatusBadge status={project.status} />
      </div>
      <span className="project-sector">{project.sector}</span>
      <h3>
        {project.name}
        <ArrowUpRight size={18} />
      </h3>
      <p>{project.description || t.notProvided}</p>
      <div className="project-card-footer">
        <span>
          <CalendarDays size={14} />
          {formatDate(project.endDate, language)}
        </span>
        <span title={t.documentsCreated}>
          <FileText size={14} />
          {documentCount}
        </span>
      </div>
      {project.deleting && <span className="deletion-warning">{t.deletingProject}</span>}
    </Link>
  );
}
