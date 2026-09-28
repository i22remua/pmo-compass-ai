'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Trash2, Upload } from 'lucide-react';
import type { Project, ProjectSource } from '@/types';
import { useAuth, useLocale, useToast } from './providers';
import { useWorkspace } from './workspace-provider';
import { ConfirmDialog, ErrorBanner, Spinner } from './ui';
import { extractFile, excerptsFromText, type ExtractedExcerpt } from '@/lib/extract-context';
import { addSources, removeSource, setProjectAIAccess } from '@/lib/repository';
import { AppError, errorMessage } from '@/lib/errors';

export function ProjectSources({ project }: { project: Project }) {
  const { user } = useAuth();
  const { t } = useLocale();
  const { notify } = useToast();
  const { sources, refresh } = useWorkspace();
  const existing = sources.filter((s) => s.projectId === project.id);
  const [drafts, setDrafts] = useState<ExtractedExcerpt[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [onlyRelevant, setOnlyRelevant] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<ProjectSource | null>(null);
  const [consent, setConsent] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const load = async (file?: File) => {
    if (!file || busy || project.deleting) return;
    setBusy(true);
    setError('');
    setDrafts([]);
    setSelected([]);
    try {
      setDrafts(await extractFile(file));
    } catch (issue) {
      setError(errorMessage(issue, t));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  const save = async () => {
    if (!user || busy) return;
    const chosen = drafts.filter((d) => selected.includes(d.id));
    setBusy(true);
    setError('');
    try {
      if (
        chosen.length + existing.length > 20 ||
        [...chosen, ...existing].reduce((n, s) => n + s.text.length, 0) > 20000
      )
        throw new AppError('context_limit');
      await addSources(
        user,
        project,
        chosen.map(({ id, label, locator, text, reviewed }) => ({
          id,
          label,
          locator,
          text,
          reviewed,
        })),
      );
      await refresh();
      setDrafts([]);
      setSelected([]);
      setTranscript('');
      notify(t.sources.saved);
    } catch (issue) {
      setError(errorMessage(issue, t));
    } finally {
      setBusy(false);
    }
  };
  const access = async (value: 'offline' | 'external') => {
    if (!user || busy) return;
    setBusy(true);
    setError('');
    try {
      await setProjectAIAccess(user, project, value);
      await refresh();
      setConsent(false);
    } catch (issue) {
      setError(errorMessage(issue, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="source-workspace">
      <section className="privacy-setting">
        <div>
          <h2>{t.sources.privacy}</h2>
          <strong>{project.aiAccess === 'offline' ? t.sources.private : t.sources.external}</strong>
          <p>{project.aiAccess === 'offline' ? t.sources.privateHint : t.sources.externalHint}</p>
        </div>
        <button
          className="button button-secondary"
          disabled={busy || project.deleting}
          onClick={() =>
            project.aiAccess === 'offline' ? setConsent(true) : void access('offline')
          }
        >
          {project.aiAccess === 'offline' ? t.sources.allow : t.sources.deny}
        </button>
      </section>
      {user?.mode === 'demo' && (
        <p className="source-storage-note">
          {t.sources.browser}{' '}
          <Link className="text-link" href="/login">
            {t.login}
          </Link>
        </p>
      )}
      <section
        className="source-drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (event.dataTransfer.files.length !== 1) setError(t.sources.fileError);
          else void load(event.dataTransfer.files[0]);
        }}
        aria-label={t.sources.drop}
      >
        <h2>{t.sources.drop}</h2>
        <p>{t.sources.local}</p>
        <input
          ref={input}
          className="sr-only"
          type="file"
          id="context-upload"
          accept=".pdf,.docx,.txt"
          disabled={busy || project.deleting}
          aria-label={t.sources.pick}
          onChange={(e) => void load(e.target.files?.[0])}
        />
        <button
          className="button button-secondary"
          disabled={busy || project.deleting}
          onClick={() => input.current?.click()}
        >
          {busy ? <Spinner /> : <Upload size={16} />} {busy ? t.sources.loading : t.sources.pick}
        </button>
        <p className="field-hint">{t.sources.limits}</p>
      </section>
      <details className="source-transcript">
        <summary>{t.sources.paste}</summary>
        <label className="field">
          {t.sources.transcript}
          <textarea
            rows={6}
            maxLength={120000}
            value={transcript}
            disabled={busy}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </label>
        <button
          className="button button-secondary"
          disabled={!transcript.trim() || busy || project.deleting}
          onClick={() => {
            setError('');
            try {
              setDrafts(excerptsFromText(transcript, t.sources.transcript));
              setSelected([]);
            } catch (issue) {
              setError(errorMessage(issue, t));
            }
          }}
        >
          {t.sources.read}
        </button>
      </details>
      {error && <ErrorBanner message={error} />}
      {!!drafts.length && (
        <section className="source-review">
          <h2>{t.sources.review}</h2>
          <p className="field-hint">{t.sources.reviewHint}</p>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={onlyRelevant}
              onChange={(e) => setOnlyRelevant(e.target.checked)}
            />
            {t.sources.onlyRelevant}
          </label>
          {drafts
            .filter((d) => !onlyRelevant || d.relevant)
            .map((draft) => (
              <div className="source-excerpt" key={draft.id}>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={selected.includes(draft.id)}
                    onChange={(e) =>
                      setSelected((current) =>
                        e.target.checked
                          ? [...current, draft.id]
                          : current.filter((id) => id !== draft.id),
                      )
                    }
                  />
                  {t.sources.select} · {draft.locator}
                </label>
                <label className="field">
                  {t.sources.label}
                  <input
                    value={draft.label}
                    maxLength={120}
                    onChange={(e) =>
                      setDrafts((current) =>
                        current.map((d) =>
                          d.id === draft.id ? { ...d, label: e.target.value } : d,
                        ),
                      )
                    }
                  />
                </label>
                <label className="field">
                  {t.sources.excerpt}
                  <textarea
                    value={draft.text}
                    maxLength={2000}
                    rows={3}
                    onChange={(e) =>
                      setDrafts((current) =>
                        current.map((d) =>
                          d.id === draft.id ? { ...d, text: e.target.value, reviewed: true } : d,
                        ),
                      )
                    }
                  />
                </label>
                {draft.relevant && <small>{t.sources.suggested}</small>}
              </div>
            ))}
          <div className="source-review-actions">
            <span>
              {selected.length} / 20 {t.sources.count}
            </span>
            <button
              className="button button-primary"
              disabled={busy || !selected.length || project.deleting}
              onClick={() => void save()}
            >
              {busy && <Spinner />}
              {t.sources.save}
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setDrafts([]);
                setSelected([]);
                setTranscript('');
              }}
            >
              {t.cancel}
            </button>
          </div>
        </section>
      )}
      <section className="saved-sources">
        <h2>
          {t.sources.available} · {existing.length}
        </h2>
        {!existing.length && <p className="muted">{t.sources.empty}</p>}
        {existing
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((source, index) => (
            <div className="source-record" key={source.id}>
              <details>
                <summary>
                  [S{index + 1}] {source.label} · {source.locator}
                  {source.reviewed ? ` · ${t.sources.edited}` : ''}
                </summary>
                <blockquote>{source.text}</blockquote>
              </details>
              <button
                className="icon-button danger-text"
                disabled={busy}
                aria-label={`${t.sources.delete}: ${source.label} · ${source.locator}`}
                onClick={() => setDeleting(source)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        <p className="field-hint">{t.sources.snapshot}</p>
        <details>
          <summary>{t.sources.privacy}</summary>
          <p className="field-hint">{t.sources.boundary}</p>
        </details>
      </section>
      {consent && (
        <ConfirmDialog
          title={t.sources.allow}
          text={t.sources.consent}
          confirmLabel={t.sources.allow}
          busy={busy}
          error={error}
          onClose={() => setConsent(false)}
          onConfirm={() => void access('external')}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t.sources.delete}
          text={t.sources.deleteHint}
          busy={busy}
          error={error}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            if (!user) return;
            setBusy(true);
            try {
              await removeSource(user, deleting);
              await refresh();
              setDeleting(null);
            } catch (issue) {
              setError(errorMessage(issue, t));
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}
