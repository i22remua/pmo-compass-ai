'use client';
import { useState } from 'react';
import { FolderKanban, Plus, Search } from 'lucide-react';
import { useLocale } from '@/components/providers';
import { useWorkspace } from '@/components/workspace-provider';
import { EmptyState, PageHeading, SelectField } from '@/components/ui';
import { ProjectCard } from '@/components/project-card';
import { ProjectForm } from '@/components/project-form';

export default function Projects() {
  const { t } = useLocale();
  const { projects, documents } = useWorkspace();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [creating, setCreating] = useState(false);
  const filtered = projects.filter(
    (p) =>
      (status === 'all' || p.status === status) &&
      `${p.name} ${p.sector} ${p.description}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  return (
    <div className="page-content">
      <PageHeading title={t.projects}>
        <button className="button button-primary" onClick={() => setCreating(true)}>
          <Plus size={18} />
          {t.newProject}
        </button>
      </PageHeading>
      <div className="filter-bar">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label={t.searchProjects}
            placeholder={t.searchProjects}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <SelectField
          aria-label={t.status}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">{t.allStatuses}</option>
          {Object.entries(t.statuses).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
        <span className="result-count">
          {filtered.length} {t.projects.toLowerCase()}
        </span>
      </div>
      {filtered.length ? (
        <div className="projects-grid projects-grid-full">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              documentCount={documents.filter((d) => d.projectId === p.id).length}
            />
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState
            icon={FolderKanban}
            title={projects.length ? t.noMatches : t.noProjects}
            text={projects.length ? t.noMatchesText : t.noProjectsText}
          />
        </div>
      )}
      {creating && <ProjectForm onClose={() => setCreating(false)} />}
    </div>
  );
}
