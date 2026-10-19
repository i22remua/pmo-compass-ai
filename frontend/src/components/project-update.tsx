'use client';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useLocale } from './providers';
import { useWorkspace } from './workspace-provider';
import { ErrorBanner, Modal, SelectField } from './ui';
import { CostInstructionUpdate } from './cost-instruction-update';
import { useUnsavedNotes } from '@/hooks/use-unsaved-notes';
import {
  InstructionError,
  instructionArea,
  parseProjectInstruction,
  type InstructionArea,
  type InstructionKind,
  type InstructionProposal,
} from '@/lib/project-instructions';
import type { Project, ProjectRecord } from '@/types';
import type { ProjectControl } from '@/lib/project-controls';

const kinds: InstructionKind[] = [
  'action',
  'risk',
  'change',
  'decision',
  'milestone',
  'cost',
  'benefit',
];
function InstructionComposer({
  project,
  kind,
  existing,
  selector,
  close,
  review,
}: {
  project: Project;
  kind: InstructionKind;
  existing?: ProjectControl | ProjectRecord;
  selector: (request: (next: () => void) => void) => ReactNode;
  close: () => void;
  review: (proposal: InstructionProposal) => void;
}) {
  const { t } = useLocale(),
    l = t.projectUpdate;
  const [source, setSource] = useState(''),
    [error, setError] = useState('');
  const id = useId();
  const guard = useUnsavedNotes(!!source);
  useEffect(() => {
    if (guard.pending) {
      if (window.confirm(t.controls.discard)) guard.proceed();
      else guard.cancel();
    }
  }, [guard, t.controls.discard]);
  return (
    <Modal title={l.title} onClose={() => guard.request(close)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            review(parseProjectInstruction(kind, source, existing));
          } catch (issue) {
            setError(issue instanceof InstructionError ? l[issue.reason] : t.invalidFields);
          }
        }}
      >
        <div className="modal-body">
          {selector(guard.request)}
          <p className="field-hint">{l.generalScope}</p>
          <label className="field" htmlFor={id}>
            {l.generalInstruction}
          </label>
          <textarea
            className="instruction-input"
            id={id}
            required
            rows={5}
            maxLength={2000}
            value={source}
            aria-describedby={`${id}-help`}
            placeholder={existing ? l.updateExample : t.instructionExamples[kind]}
            onChange={(event) => {
              setSource(event.target.value);
              setError('');
            }}
          />
          <p id={`${id}-help`} className="field-hint">
            {l.generalHint}
          </p>
          <details>
            <summary>{l.showExample}</summary>
            <p className="preserve-lines">{t.instructionExamples[kind]}</p>
          </details>
          {error && <ErrorBanner message={error} />}
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => guard.request(close)}
          >
            {t.cancel}
          </button>
          <button className="button button-primary" disabled={project.deleting}>
            {l.prepare}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ProjectUpdate({
  project,
  initialArea,
  close,
  saved,
  review,
}: {
  project: Project;
  initialArea: InstructionArea;
  close: () => void;
  saved: (area: InstructionArea) => void;
  review: (proposal: InstructionProposal) => void;
}) {
  const { t } = useLocale(),
    l = t.projectUpdate;
  const { records, controls } = useWorkspace();
  const [kind, setKind] = useState<InstructionKind>(
    ({ activity: 'action', governance: 'change', delivery: 'cost', benefits: 'benefit' } as const)[
      initialArea
    ],
  );
  const [target, setTarget] = useState('');
  const options = (kind === 'action' || kind === 'risk' ? records : controls).filter(
    (item) =>
      item.ownerId === project.ownerId &&
      item.projectId === project.id &&
      item.kind === kind &&
      !('archived' in item && item.archived),
  );
  const existing = options.find((item) => item.id === target);
  const selector = (request: (next: () => void) => void) => (
    <div className="form-grid instruction-selectors">
      <label className="field">
        {t.controls.kind}
        <SelectField
          value={kind}
          onChange={(event) => {
            const next = event.target.value as InstructionKind;
            request(() => {
              setKind(next);
              setTarget('');
            });
          }}
        >
          {(['activity', 'governance', 'delivery', 'benefits'] as const).map((area) => (
            <optgroup key={area} label={t.controls[area]}>
              {kinds
                .filter((item) => instructionArea(item) === area)
                .map((item) => (
                  <option key={item} value={item}>
                    {item === 'action' || item === 'risk' ? t.tracking[item] : t.controls[item]}
                  </option>
                ))}
            </optgroup>
          ))}
        </SelectField>
      </label>
      <label className="field">
        {l.targetRecord}
        <SelectField
          value={target}
          onChange={(event) => {
            const next = event.target.value;
            request(() => setTarget(next));
          }}
        >
          <option value="">{l.createRecord}</option>
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </SelectField>
      </label>
    </div>
  );
  if (target && !existing)
    return (
      <Modal title={l.title} onClose={close}>
        <div className="modal-body">
          <ErrorBanner message={t.controls.missingLink} />
        </div>
      </Modal>
    );
  return kind === 'cost' && !existing ? (
    <CostInstructionUpdate
      key={`${kind}:${target}`}
      project={project}
      close={close}
      saved={() => saved('delivery')}
      selector={selector}
    />
  ) : (
    <InstructionComposer
      key={`${kind}:${target}`}
      project={project}
      kind={kind}
      existing={existing}
      selector={selector}
      close={close}
      review={review}
    />
  );
}
