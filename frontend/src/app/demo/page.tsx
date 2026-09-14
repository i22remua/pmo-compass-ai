'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useLocale } from '@/components/providers';
import { ErrorBanner, LoadingState } from '@/components/ui';
import { errorMessage } from '@/lib/errors';

export default function Demo() {
  const { startDemo } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      startDemo();
      router.replace('/dashboard');
    } catch (error) {
      setError(errorMessage(error, t));
    }
  }, [startDemo, router, t]);
  return error ? (
    <div className="page-content">
      <ErrorBanner message={error} />
    </div>
  ) : (
    <LoadingState />
  );
}
