'use client';
import { useLocale } from '@/components/providers';
import { EmptyState } from '@/components/ui';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useLocale();
  return (
    <EmptyState title={t.genericError} text="PMO Compass AI">
      <button className="button button-primary" onClick={reset}>
        {t.retry}
      </button>
    </EmptyState>
  );
}
