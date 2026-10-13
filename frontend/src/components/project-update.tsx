'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useAuth, useLocale, useToast } from './providers';
import { useWorkspace } from './workspace-provider';
import { ErrorBanner, Modal, SelectField, Spinner } from './ui';
import { useUnsavedNotes } from '@/hooks/use-unsaved-notes';
import {
  costInstructionDraft,
  costInstructionId,
  parseCostInstruction,
  type CostField,
  type CostParseResult,
} from '@/lib/cost-instructions';
import { saveControl } from '@/lib/repository';
import { errorMessage } from '@/lib/errors';
import type { Project } from '@/types';

export function ProjectUpdate({
  project,
  close,
  saved,
}: {
  project: Project;
  close: () => void;
  saved: () => void;
}) {
  const { t, language } = useLocale();
  const { user } = useAuth();
  const { controls, refresh } = useWorkspace();
  const { notify } = useToast();
  const l = t.projectUpdate;
  const instructionId = useId();
  const [source, setSource] = useState('');
  const [preview, setPreview] = useState<Extract<CostParseResult, { ok: true }> | null>(null);
  const [title, setTitle] = useState('');
  const [field, setField] = useState<CostField | ''>('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const completed = useRef(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const guard = useUnsavedNotes(!!source && !savedSuccessfully);
  useEffect(() => {
    if (guard.pending) {
      if (window.confirm(t.controls.discard)) guard.proceed();
      else guard.cancel();
    }
  }, [guard, t.controls.discard]);
  const requestClose = () => {
    if (!saving.current) guard.request(close);
  };
  const money = (amount: number) =>
    new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR' }).format(amount);
  return (
    <Modal title={l.title} onClose={requestClose} busy={busy}>
      <form
        className="instruction-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (saving.current || completed.current || !user || project.deleting) return;
          if (!preview) {
            const parsed = parseCostInstruction(source);
            if (!parsed.ok) {
              setError(l[parsed.reason]);
              return;
            }
            setError('');
            setPreview(parsed);
            return;
          }
          if (!field) return;
          saving.current = true;
          setBusy(true);
          setError('');
          try {
            const draft = costInstructionDraft(source, title, field, date);
            const id = await costInstructionId(project.id, source, field, date);
            if (controls.some((control) => control.id === id)) {
              setError(l.duplicate);
              return;
            }
            await saveControl(user, project, draft, undefined, id);
            completed.current = true;
            setSavedSuccessfully(true);
            notify(t.controls.saved);
            // Saving succeeded: refresh problems must never cause a second creation.
            await refresh();
            saved();
          } catch (issue) {
            setError(errorMessage(issue, t));
          } finally {
            saving.current = false;
            setBusy(false);
          }
        }}
      >
        <div className="modal-body">
          {!preview && <p className="field-hint">{l.scope}</p>}
          <fieldset disabled={busy} className="control-form-fields">
            {!preview ? (
              <div className="field">
                <label htmlFor={instructionId}>{l.instruction}</label>
                <textarea
                  id={instructionId}
                  autoFocus
                  required
                  rows={4}
                  maxLength={2000}
                  value={source}
                  placeholder={l.example}
                  aria-describedby={`${instructionId}-help`}
                  onChange={(event) => {
                    setSource(event.target.value);
                    setError('');
                  }}
                />
                <span id={`${instructionId}-help`} className="field-hint">
                  {l.formatHint}
                </span>
              </div>
            ) : (
              <>
                <div className="section-heading">
                  <h3>{l.review}</h3>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setPreview(null);
                      setError('');
                    }}
                  >
                    {l.edit}
                  </button>
                </div>
                <p className="record-meta">
                  {t.controls.provided} · {l.engine}
                </p>
                <dl className="instruction-breakdown">
                  {preview.lines.map((line) => (
                    <div key={line.label}>
                      <dt>{line.label}</dt>
                      <dd>{money(line.cents / 100)}</dd>
                    </div>
                  ))}
                  <div className="instruction-total">
                    <dt>{l.total}</dt>
                    <dd>{money(preview.total)}</dd>
                  </div>
                </dl>
                <div className="form-grid">
                  <label className="field full-span">
                    {t.controls.title}
                    <input
                      autoFocus
                      required
                      minLength={2}
                      maxLength={160}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    {l.costType}
                    <SelectField
                      required
                      value={field}
                      onChange={(event) => setField(event.target.value as CostField)}
                    >
                      <option value="">{l.choose}</option>
                      {(['actual', 'forecast', 'approved'] as const).map((value) => (
                        <option key={value} value={value}>
                          {t.controls[value]}
                        </option>
                      ))}
                    </SelectField>
                  </label>
                  <label className="field">
                    {t.controls.asOf}
                    <input
                      type="date"
                      required
                      max="9999-12-31"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </label>
                </div>
                <p className="field-hint">{l.snapshot}</p>
                <details>
                  <summary>{l.source}</summary>
                  <p className="preserve-lines">{source}</p>
                </details>
              </>
            )}
          </fieldset>
          {error && <ErrorBanner message={error} />}
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="button button-secondary"
            disabled={busy}
            onClick={requestClose}
          >
            {t.cancel}
          </button>
          <button className="button button-primary" disabled={busy || project.deleting}>
            {busy && <Spinner />}
            {preview ? l.confirm : l.prepare}
          </button>
        </div>
      </form>
    </Modal>
  );
}
