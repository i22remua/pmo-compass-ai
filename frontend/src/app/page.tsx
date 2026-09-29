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
        <div className="landing-registration">
          <span>PMO / COMPASS</span>
          <span>{t.compass.system}</span>
        </div>
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
        <nav className="direction-index" aria-label={t.compass.workflow}>
          <p className="section-reference">01 — 03 / {t.compass.workflow}</p>
          {[
            [t.compass.context, t.compass.contextDetail, '/start'],
            [t.compass.judgement, t.compass.judgementDetail, '/about'],
            [t.compass.document, t.compass.documentDetail, '/about#documents'],
          ].map(([title, detail, href], index) => (
            <Link href={href} key={title}>
              <span className="direction-number" aria-hidden="true">
                0{index + 1}
              </span>
              <span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
              <span className="direction-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </nav>
      </main>
      <footer className="landing-footer">
        <span>Next.js · FastAPI · Firebase</span>
        <a href="https://github.com/i22remua/pmo-compass-ai">GitHub</a>
        <Link href="/about">{t.product.about}</Link>
        <Link href="/security">{t.securityPage}</Link>
      </footer>
    </div>
  );
}
