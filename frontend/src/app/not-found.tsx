'use client';
import Link from 'next/link';
import { useLocale } from '@/components/providers';
import { EmptyState } from '@/components/ui';
export default function NotFound() {
  const { t } = useLocale();
  return (
    <EmptyState title="404" text={t.noMatches}>
      <Link className="button button-primary" href="/">
        {t.backHome}
      </Link>
    </EmptyState>
  );
}
