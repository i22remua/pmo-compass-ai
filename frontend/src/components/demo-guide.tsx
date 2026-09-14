'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, FlaskConical, Plus } from 'lucide-react';
import { useAuth, useLocale, useToast } from './providers';
import { useWorkspace } from './workspace-provider';
import { Spinner } from './ui';
import { loadDemoExamples } from '@/lib/repository';
import { errorMessage } from '@/lib/errors';
import examples from '@/lib/demo-projects.json';

export function DemoGuide() {
  const { user } = useAuth();
  const { t, language } = useLocale();
  const { notify } = useToast();
  const { projects, refresh } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const ready = examples[language].every((_, index) =>
    projects.some((project) => project.id === `demo-project-${index + 1}`),
  );
  const load = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await loadDemoExamples(user, language);
      await refresh();
      notify(t.showcase.examplesLoaded);
    } catch (error) {
      notify(errorMessage(error, t), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="demo-guide panel" aria-labelledby="demo-guide-title">
      <div className="demo-guide-copy">
        <h2 id="demo-guide-title">
          <FlaskConical size={18} />
          {t.showcase.demoMode}
        </h2>
        <p>{user?.mode === 'demo' ? t.showcase.demoGuide : t.showcase.cloudDemoGuide}</p>
        <div className="demo-sector-tags">
          {[0, 2, 4, 5].map((index) => (
            <span key={index}>{examples[language][index].sector}</span>
          ))}
        </div>
      </div>
      <div className="demo-guide-actions">
        {user?.mode === 'demo' ? (
          <>
            <Link className="button button-secondary button-small" href="/projects">
              {t.showcase.exploreProjects}
              <ArrowRight size={15} />
            </Link>
            <button className="text-button" onClick={() => void load()} disabled={busy || ready}>
              {busy ? <Spinner size={14} /> : ready ? <Check size={14} /> : <Plus size={14} />}
              {busy ? t.saving : ready ? t.showcase.examplesReady : t.showcase.loadExamples}
            </button>
          </>
        ) : (
          <Link className="button button-secondary button-small" href="/demo">
            {t.tryDemo}
            <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </section>
  );
}
