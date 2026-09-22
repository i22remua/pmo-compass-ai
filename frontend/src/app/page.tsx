'use client';
import Link from 'next/link';
import { useLocale } from '@/components/providers';
import { LanguageSwitch, Logo } from '@/components/ui';
import { ThemeToggle } from '@/components/theme-controls';

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
          <span className="editorial-kicker">
            <Link href="/about#built">{t.presentation.author}</Link>
          </span>
          <h1>
            {t.heroLine1}
            <br />
            <em>{t.heroLine2}</em>
          </h1>
          <p>{t.heroDescription}</p>
          <div className="editorial-actions">
            <Link href="/case-study" className="button button-primary button-large">
              {t.presentation.caseLink}
            </Link>
            <Link className="text-link" href="/start">
              {t.presentation.ownProject} →
            </Link>
          </div>
        </section>
        <section className="editorial-index landing-case" aria-labelledby="case-title">
          <span className="editorial-kicker">{t.presentation.caseLabel}</span>
          <h2 id="case-title">{t.presentation.caseTitle}</h2>
          <dl>
            <div>
              <dt>{t.presentation.source}</dt>
              <dd>{t.presentation.caseInput}</dd>
            </div>
            <div>
              <dt>{t.presentation.result}</dt>
              <dd>{t.presentation.caseOutput}</dd>
            </div>
          </dl>
          <Link className="text-link" href="/about#documents">
            {t.presentation.formats} →
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <span>Next.js · FastAPI · Firebase</span>
        <a href="https://github.com/i22remua/pmo-compass-ai">GitHub</a>
        <Link href="/about">{t.product.about}</Link>
      </footer>
    </div>
  );
}
