'use client';
import { useState } from 'react';
import { useLocale } from './providers';
import { ControlSummary } from './project-control-summary';

/** Authored fictional continuation, isolated from live generation and user storage. */
export function CaseLifecycle() {
  const { t } = useLocale();
  const l = t.controls;
  const [step, setStep] = useState(0);
  const stages = [l.caseStages0, l.caseStages1, l.caseStages2, l.caseStages3, l.caseStages4];
  const headings = [
    l.caseHeadings0,
    l.caseHeadings1,
    l.caseHeadings2,
    l.caseHeadings3,
    l.caseHeadings4,
  ];
  const texts = [l.caseTexts0, l.caseTexts1, l.caseTexts2, l.caseTexts3, l.caseTexts4];
  const evidence = [
    l.caseEvidence0,
    l.caseEvidence1,
    l.caseEvidence2,
    l.caseEvidence3,
    l.caseEvidence4,
  ];
  return (
    <details className="case-lifecycle">
      <summary>{l.caseTitle}</summary>
      <p className="field-hint">{l.caseNotice}</p>
      <nav className="case-cycle-navigation" aria-label={l.caseTitle}>
        {stages.map((label, index) => (
          <button
            key={index}
            className="text-button"
            aria-current={step === index ? 'step' : undefined}
            onClick={() => setStep(index)}
          >
            {index + 1}. {label}
          </button>
        ))}
      </nav>
      <section className="case-cycle-step" aria-live="polite" aria-atomic="true">
        <span className="record-meta">
          {l.caseStep} {step + 1} / 5
        </span>
        <h3>{headings[step]}</h3>
        <p>{texts[step]}</p>
        {step === 4 && (
          <ControlSummary
            value={{
              kind: 'milestone',
              title: l.caseOutcome,
              evidence: evidence[4],
              recordId: '',
              archived: false,
              data: {
                baselineDate: '2026-10-30',
                actualDate: '2026-11-04',
                forecastDate: '',
                dependency: '',
              },
            }}
          />
        )}
        <details key={step}>
          <summary>{l.evidence}</summary>
          <p>{evidence[step]}</p>
        </details>
      </section>
      <div className="case-cycle-actions">
        <button
          className="button button-secondary"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          {l.casePrevious}
        </button>
        <button
          className="button button-primary"
          onClick={() => setStep(step === 4 ? 0 : step + 1)}
        >
          {step === 4 ? l.caseBack : l.caseNext}
        </button>
      </div>
    </details>
  );
}
