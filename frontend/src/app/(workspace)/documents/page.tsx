'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search, Sparkles } from 'lucide-react';
import { documentTypes } from '@/types';
import { useLocale } from '@/components/providers';
import { useWorkspace } from '@/components/workspace-provider';
import {
  documentIcons,
  EmptyState,
  PageHeading,
  SelectField,
  ProviderLabel,
} from '@/components/ui';
import { formatDate } from '@/lib/format';

export default function Documents() {
  const { t, language } = useLocale();
  const { documents, projects } = useWorkspace();
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('all');
  const filtered = documents.filter(
    (d) =>
      (type === 'all' || d.type === type) &&
      (projectId === 'all' || d.projectId === projectId) &&
      `${t.documentTypes[d.type]} ${projects.find((p) => p.id === d.projectId)?.name || ''} ${d.generatedContent}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  return (
    <div className="page-content">
      <PageHeading title={t.documents}>
        <Link href="/generator" className="button button-primary">
          <Sparkles size={17} />
          {t.generateDocument}
        </Link>
      </PageHeading>
      <div className="filter-bar">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchDocuments}
            aria-label={t.searchDocuments}
          />
        </div>
        <SelectField aria-label={t.document} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">{t.allTypes}</option>
          {documentTypes.map((key) => (
            <option key={key} value={key}>
              {t.documentTypes[key]}
            </option>
          ))}
        </SelectField>
        <SelectField
          aria-label={t.project}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="all">{t.allProjects}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="panel document-history">
        {filtered.length ? (
          <>
            <div className="document-table-header">
              <span>{t.document}</span>
              <span>{t.project}</span>
              <span>{t.created}</span>
              <span>{t.language}</span>
              <span />
            </div>
            {filtered.map((d) => {
              const Icon = documentIcons[d.type];
              return (
                <Link href={`/documents/${d.id}`} key={d.id} className="document-table-row">
                  <div className="document-title-cell">
                    <span className={`document-icon doc-${d.type}`}>
                      <Icon size={20} />
                    </span>
                    <div>
                      <strong>{t.documentTypes[d.type]}</strong>
                      <span>
                        <ProviderLabel provider={d.provider} />
                      </span>
                    </div>
                  </div>
                  <span className="document-project-cell">
                    {projects.find((p) => p.id === d.projectId)?.name || t.projectNotFound}
                  </span>
                  <span className="document-date-cell">{formatDate(d.createdAt, language)}</span>
                  <span className="language-badge">{d.language.toUpperCase()}</span>
                  <ArrowUpRight size={17} />
                </Link>
              );
            })}
          </>
        ) : (
          <EmptyState
            title={documents.length ? t.noMatches : t.noDocuments}
            text={documents.length ? t.noMatchesText : t.noDocumentsText}
          />
        )}
      </div>
      <p className="history-count">
        {filtered.length} {t.documentsCreated.toLowerCase()}
      </p>
    </div>
  );
}
