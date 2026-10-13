'use client';
import { useLocale } from './providers';
import { formatDate, formatMoney } from '@/lib/format';
import {
  benefitResult,
  difference,
  milestoneVariance,
  type ControlInput,
} from '@/lib/project-controls';

export function ControlSummary({ value }: { value: ControlInput }) {
  const { t, language } = useLocale();
  const l = t.controls;
  const number = (n: number | null) =>
    n === null
      ? l.unknown
      : new Intl.NumberFormat(language, { maximumFractionDigits: 4 }).format(n);
  if (value.kind === 'change' || value.kind === 'decision')
    return (
      <p className="control-summary">
        {l[value.data.status]}
        {value.data.decidedOn && ` · ${formatDate(value.data.decidedOn, language)}`}
      </p>
    );
  if (value.kind === 'milestone')
    return (
      <p className="control-summary">
        {l.baselineDate}: {formatDate(value.data.baselineDate, language)} ·{' '}
        {value.data.actualDate ? l.actualVariance : l.forecastVariance}:{' '}
        {milestoneVariance(value.data) === null
          ? l.unknown
          : `${number(milestoneVariance(value.data))} ${l.days}`}
      </p>
    );
  if (value.kind === 'cost')
    return (
      <dl className="control-metrics">
        <div>
          <dt>{l.actual}</dt>
          <dd>
            {value.data.actual === null ? l.unknown : formatMoney(value.data.actual, language)}
          </dd>
        </div>
        <div>
          <dt>{l.actualVariance}</dt>
          <dd>
            {difference(value.data.actual, value.data.approved) === null
              ? l.unknown
              : formatMoney(difference(value.data.actual, value.data.approved), language)}
          </dd>
        </div>
        <div>
          <dt>{l.forecastVariance}</dt>
          <dd>
            {difference(value.data.forecast, value.data.approved) === null
              ? l.unknown
              : formatMoney(difference(value.data.forecast, value.data.approved), language)}
          </dd>
        </div>
        <div>
          <dt>{l.asOf}</dt>
          <dd>{formatDate(value.data.asOf, language)}</dd>
        </div>
      </dl>
    );
  if (value.kind === 'benefit')
    return (
      <dl className="control-metrics">
        <div>
          <dt>{l.target}</dt>
          <dd>
            {number(value.data.target)} {value.data.unit}
          </dd>
        </div>
        <div>
          <dt>{l.measurement}</dt>
          <dd>
            {number(value.data.actual)} {value.data.actual !== null && value.data.unit}
          </dd>
        </div>
        <div>
          <dt>{l.observed}</dt>
          <dd>{l[benefitResult(value.data)]}</dd>
        </div>
      </dl>
    );
}
