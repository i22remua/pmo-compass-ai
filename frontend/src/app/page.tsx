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
        <nav className="direction-index" aria-label={t.compass.workflow}>
          {[
            [t.compass.context, '/start'],
            [t.projectNavigation.how, '/about'],
            [t.compass.document, '/about#documents'],
          ].map(([title, href]) => (
            <Link href={href} key={title}>
              <strong>{title}</strong>
              <span className="direction-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </nav>
      </main>
      <footer className="landing-footer">
        <Link className="landing-author" href="/about#built">
          {t.presentation.author}
        </Link>
        <a href="https://github.com/i22remua/pmo-compass-ai">GitHub</a>
        <Link href="/about">{t.product.about}</Link>
        <Link href="/security">{t.securityPage}</Link>
      </footer>
    </div>
  );
}
