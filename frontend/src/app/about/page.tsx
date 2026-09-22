'use client';
import Link from 'next/link';
import { useLocale } from '@/components/providers';
import { LanguageSwitch, Logo } from '@/components/ui';
import { ThemeToggle } from '@/components/theme-controls';
import { documentTypes } from '@/types';

export default function About() {
  const { t } = useLocale();
  return (
    <div className="landing about-page">
      <header className="landing-header">
        <Logo />
        <div className="landing-header-actions">
          <ThemeToggle />
          <LanguageSwitch />
          <Link href="/start" className="button button-primary button-small">
            {t.tryDemo}
          </Link>
        </div>
      </header>
      <main id="main-content">
        <div className="about-heading">
          <Link className="back-link" href="/">
            {t.backHome}
          </Link>
          <h1>{t.presentation.buildTitle}</h1>
        </div>
        <section id="built" className="about-built">
          <p>{t.presentation.buildIntro}</p>
          <dl>
            {[
              [t.presentation.problemTitle, t.presentation.problemText],
              [t.presentation.decisionTitle, t.presentation.decisionText],
              [t.presentation.proofTitle, t.presentation.proofText],
            ].map(([title, text]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
          <div className="editorial-actions">
            <a className="text-link" href="https://github.com/i22remua/pmo-compass-ai">
              {t.presentation.sourceCode} →
            </a>
            <a className="text-link" href="https://github.com/i22remua/pmo-compass-ai/actions">
              {t.presentation.checks} →
            </a>
            <Link className="text-link" href="/case-study">
              {t.presentation.caseLink} →
            </Link>
          </div>
        </section>
        <section className="about-topics" aria-label={t.product.usageDetails}>
          <details>
            <summary>{t.showcase.aiTitle}</summary>
            <p>{t.showcase.aiText}</p>
            <p>{t.product.privacy}</p>
            <p>{t.product.reviewNotice}</p>
          </details>
          <details>
            <summary>{t.dataStorage}</summary>
            <h2>{t.localStorage}</h2>
            <p>{t.localStorageHint}</p>
            <h2>{t.firebaseStorage}</h2>
            <p>{t.firebaseStorageHint}</p>
            <p>{t.product.localSave}</p>
          </details>
          <details id="documents">
            <summary>{t.value1}</summary>
            {documentTypes.map((type) => (
              <div key={type}>
                <h2>{t.documentTypes[type]}</h2>
                <p>{t.documentDescriptions[type]}</p>
              </div>
            ))}
          </details>
        </section>
      </main>
      <footer className="landing-footer">
        <Logo />
        <Link href="/start">{t.tryDemo}</Link>
      </footer>
    </div>
  );
}
