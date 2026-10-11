'use client';
import { useLocale } from './providers';

const contextTabs = ['sources', 'notes', 'documents'];

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
  const inContext = contextTabs.includes(tab);
  const active = inContext ? 'context' : tab;
  const names: Record<string, string> = {
    overview: t.overview,
    intelligence: t.projectNavigation.diagnosis,
    tracking: t.projectNavigation.tracking,
    context: t.projectNavigation.context,
    sources: t.sources.title,
    notes: t.notes,
    documents: t.documents,
  };
  const renderTabs = (keys: string[], selected: string, label: string) => (
    <div className="tabs" role="tablist" aria-label={label}>
      {keys.map((key, index) => (
        <button
          key={key}
          id={`dossier-tab-${key}`}
          role="tab"
          aria-controls="dossier-panel"
          aria-selected={selected === key}
          tabIndex={selected === key ? 0 : -1}
          onClick={() => select(key === 'context' ? (inContext ? tab : 'sources') : key)}
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
              const target = keys[next];
              select(target === 'context' ? (inContext ? tab : 'sources') : target);
              document.getElementById(`dossier-tab-${target}`)?.focus();
            }
          }}
        >
          {names[key]}
          {key === 'documents' && <span>{documentCount}</span>}
          {(key === 'notes' || key === 'context') && dirty && (
            <span className="unsaved-dot">
              <span className="sr-only">{t.unsavedNotes}</span>
            </span>
          )}
        </button>
      ))}
    </div>
  );
  return (
    <div className="project-navigation">
      {renderTabs(['overview', 'intelligence', 'tracking', 'context'], active, t.workspace)}
      <div id="dossier-context" hidden={!inContext}>
        {inContext && renderTabs(contextTabs, tab, t.projectNavigation.context)}
      </div>
    </div>
  );
}
