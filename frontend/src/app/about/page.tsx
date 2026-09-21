'use client';
import Link from 'next/link';
import { Code2, Languages, ShieldAlert } from 'lucide-react';
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
          <h1>{t.product.about}</h1>
        </div>
        <section className="about-topics" aria-label={t.product.usageDetails}>
          <details open>
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
        <section className="principles-section">
          <article>
            <span className="feature-icon">
              <ShieldAlert size={22} />
            </span>
            <h3>{t.visual.reviewFirst}</h3>
            <p>{t.visual.reviewFirstText}</p>
          </article>
          <article>
            <span className="feature-icon">
              <Languages size={22} />
            </span>
            <h3>{t.visual.bilingual}</h3>
            <p>{t.visual.bilingualText}</p>
          </article>
        </section>
        <section className="portfolio-section" aria-labelledby="portfolio-title">
          <div className="portfolio-intro">
            <span className="eyebrow">{t.showcase.portfolioEyebrow}</span>
            <h2 id="portfolio-title">{t.showcase.portfolioTitle}</h2>
            <p>{t.showcase.portfolioDescription}</p>
            <span className="portfolio-author">
              <Code2 size={16} />
              {t.builtBy}
            </span>
          </div>
          <div className="portfolio-evidence">
            {[
              [t.showcase.engineeringTitle, t.showcase.engineeringText],
              [t.showcase.pmoTitle, t.showcase.pmoText],
            ].map(([title, description], index) => (
              <article key={title}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Logo />
        <Link href="/start">{t.tryDemo}</Link>
      </footer>
    </div>
  );
}
