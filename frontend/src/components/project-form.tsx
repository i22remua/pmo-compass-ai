'use client';
import { useState } from 'react';
import type { Project, ProjectInput, ProjectStatus } from '@/types';
import { useAuth, useLocale, useToast } from './providers';
import { ErrorBanner, Modal, SelectField, Spinner } from './ui';
import { emptyProject } from '@/lib/format';
import { saveProject } from '@/lib/repository';
import { errorMessage } from '@/lib/errors';
import { useWorkspace } from './workspace-provider';

export function ProjectForm({
  project,
  onClose,
  onSaved,
}: {
  project?: Project;
  onClose: () => void;
  onSaved?: (project: Project) => void;
}) {
  const { user } = useAuth();
  const { t, language } = useLocale();
  const { notify } = useToast();
  const { refresh } = useWorkspace();
  const [form, setForm] = useState<ProjectInput>(project || emptyProject);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || busy) return;
    setBusy(true);
    setError('');
    try {
      const saved = await saveProject(user, form, language, project);
      await refresh();
      notify(t.projectSaved);
      onSaved?.(saved);
      onClose();
    } catch (error) {
      setError(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={project ? t.editProject : t.newProject} onClose={onClose} wide busy={busy}>
      <form onSubmit={submit}>
        <div className="modal-body form-grid">
          <label className="field full-span">
            {t.projectName}
            <input
              autoFocus
              required
              minLength={2}
              maxLength={120}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder={t.namePlaceholder}
            />
          </label>
          <label className="field">
            {t.sector}
            <input
              required
              minLength={2}
              maxLength={80}
              value={form.sector}
              onChange={(e) => update('sector', e.target.value)}
              placeholder={t.sectorPlaceholder}
            />
          </label>
          <label className="field">
            {t.status}
            <SelectField
              value={form.status}
              onChange={(e) => update('status', e.target.value as ProjectStatus)}
            >
              {Object.entries(t.statuses).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </SelectField>
          </label>
          <label className="field full-span">
            {t.description}
            <textarea
              rows={3}
              maxLength={5000}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder={t.descriptionPlaceholder}
            />
          </label>
          <label className="field full-span">
            {t.objectives}
            <textarea
              rows={3}
              maxLength={5000}
              value={form.objectives}
              onChange={(e) => update('objectives', e.target.value)}
              placeholder={t.objectivesPlaceholder}
            />
          </label>
          <label className="field">
            {t.startDate}
            <input
              type="date"
              max="9999-12-31"
              value={form.startDate}
              onChange={(e) => update('startDate', e.target.value)}
            />
          </label>
          <label className="field">
            {t.endDate}
            <input
              type="date"
              min={form.startDate || undefined}
              max="9999-12-31"
              value={form.endDate}
              onChange={(e) => update('endDate', e.target.value)}
            />
          </label>
          <label className="field full-span">
            {t.budget} <span className="optional">({t.optional})</span>
            <input
              type="number"
              min={0}
              max={1e12}
              step="0.01"
              value={form.budget ?? ''}
              onChange={(e) =>
                update('budget', e.target.value === '' ? null : Number(e.target.value))
              }
              placeholder="85 000"
            />
          </label>
          <label className="field full-span">
            {t.stakeholders}
            <textarea
              rows={2}
              maxLength={4000}
              value={form.stakeholders}
              onChange={(e) => update('stakeholders', e.target.value)}
              placeholder={t.stakeholdersPlaceholder}
            />
          </label>
          {!project && (
            <label className="field full-span">
              {t.notes}
              <textarea
                rows={3}
                maxLength={20000}
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder={t.notesPlaceholder}
              />
            </label>
          )}
          {error && (
            <div className="full-span">
              <ErrorBanner message={error} />
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="button button-secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            {t.cancel}
          </button>
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy && <Spinner />}
            {busy ? t.saving : project ? t.saveProject : t.createProject}
          </button>
        </div>
      </form>
    </Modal>
  );
}
