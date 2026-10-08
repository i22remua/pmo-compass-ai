'use client';
import { useEffect, useState } from 'react';
import { useLocale } from './providers';
import { SelectField } from './ui';

export function ProjectNavigation({
  tab,
  select,
  documentCount,
  dirty,
}: {
  tab: string;
  select: (tab: string) => void;
  documentCount: number;
  dirty: boolean;
}) {
  const { t } = useLocale();
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = matchMedia('(max-width: 800px)');
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const names: Record<string, string> = {
    overview: t.overview,
    intelligence: t.product.intelligenceTitle,
    tracking: t.tracking.title,
    sources: t.sources.title,
    notes: t.notes,
    documents: t.documents,
  };
  const keys = mobile
    ? ['overview', 'tracking', 'sources']
    : ['overview', 'intelligence', 'tracking', 'sources', 'notes', 'documents'];
  return (
    <div className={`project-navigation ${mobile ? 'project-navigation-mobile' : ''}`}>
      <div className="tabs" role="tablist" aria-label={t.workspace}>
        {keys.map((key, index) => (
          <button
            key={key}
            id={`dossier-tab-${key}`}
            role="tab"
            aria-controls="dossier-panel"
            aria-label={names[key]}
            aria-selected={tab === key}
            tabIndex={tab === key || (!keys.includes(tab) && index === 0) ? 0 : -1}
            onClick={() => select(key)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % keys.length
                  : event.key === 'ArrowLeft'
                    ? (index + keys.length - 1) % keys.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? keys.length - 1
                        : -1;
              if (next >= 0) {
                event.preventDefault();
                select(keys[next]);
                document.getElementById(`dossier-tab-${keys[next]}`)?.focus();
              }
            }}
          >
            {mobile && key === 'tracking'
              ? t.projectNavigation.tracking
              : mobile && key === 'sources'
                ? t.projectNavigation.context
                : names[key]}
            {key === 'documents' && <span>{documentCount}</span>}
            {key === 'notes' && dirty && <span className="unsaved-dot" />}
          </button>
        ))}
      </div>
      {mobile && (
        <div className="project-more">
          {!keys.includes(tab) && (
            <span className="sr-only" id={`dossier-tab-${tab}`}>
              {names[tab]}
            </span>
          )}
          <SelectField
            aria-label={t.projectNavigation.more}
            value={keys.includes(tab) ? '' : tab}
            onChange={(event) => {
              if (event.target.value) select(event.target.value);
            }}
          >
            <option value="">{t.projectNavigation.moreShort}</option>
            {['intelligence', 'notes', 'documents'].map((key) => (
              <option key={key} value={key}>
                {names[key]}
                {key === 'documents' ? ` (${documentCount})` : ''}
                {key === 'notes' && dirty ? ' *' : ''}
              </option>
            ))}
          </SelectField>
        </div>
      )}
    </div>
  );
}
