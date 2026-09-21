'use client';
import Link from 'next/link';
import { useLocale } from '@/components/providers';
import { LanguageSwitch, Logo } from '@/components/ui';
import { ThemeToggle } from '@/components/theme-controls';
import { documentTypes } from '@/types';

export default function Landing() {
  const { t } = useLocale();
  return (
    <div className="landing editorial-landing">
      <a className="skip-link" href="#main-content">
        {t.visual.skipContent}
      </a>
      <header className="landing-header">
        <Logo />
        <div className="landing-header-actions">
          <ThemeToggle />
          <LanguageSwitch />
          <Link href="/login" className="landing-login">
            {t.login}
          </Link>
        </div>
      </header>
      <main id="main-content" className="editorial-main">
        <section className="editorial-intro">
          <span className="editorial-kicker">{t.simple.workspaceLabel}</span>
          <h1>
            {t.heroLine1}
            <br />
            <em>{t.heroLine2}</em>
          </h1>
          <p>{t.heroDescription}</p>
          <div className="editorial-actions">
            <Link href="/start" className="button button-primary button-large">
              {t.tryDemo}
            </Link>
            <span>{t.noCard}</span>
          </div>
        </section>
        <section className="editorial-index" aria-labelledby="formats-title">
          <div className="editorial-section-label">
            <h2 id="formats-title">{t.simple.documentsLabel}</h2>
            <span>01—08</span>
          </div>
          <ol>
            {documentTypes.map((type) => (
              <li key={type}>{t.documentTypes[type]}</li>
            ))}
          </ol>
          <div className="editorial-tools">
            <span>{t.simple.riskAnalysis}</span>
            <span>PMO Copilot</span>
            <Link href="/about">{t.product.learnMore} →</Link>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <span>{t.builtBy}</span>
        <a href="https://github.com/i22remua/pmo-compass-ai">GitHub</a>
        <Link href="/about">{t.product.about}</Link>
      </footer>
    </div>
  );
}
