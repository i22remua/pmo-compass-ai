'use client';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Compass,
  FileText,
  FolderKanban,
  Languages,
  LayoutDashboard,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { useLocale } from '@/components/providers';
import { documentIcons, LanguageSwitch, Logo } from '@/components/ui';
import { ThemeToggle } from '@/components/theme-controls';
import { documentTypes } from '@/types';

export default function Landing() {
  const { t } = useLocale();
  const badges = [
    { label: 'AI', icon: Sparkles },
    { label: 'PMO', icon: Compass },
    { label: t.visual.risk, icon: ShieldAlert },
    { label: t.visual.reports, icon: FileText },
    { label: t.visual.stakeholders, icon: Users },
  ];
  return (
    <div className="landing">
      <a className="skip-link" href="#main-content">
        {t.visual.skipContent}
      </a>
      <header className="landing-header">
        <Logo />
        <nav aria-label={t.featuresNav}>
          <a href="#features">{t.featuresNav}</a>
          <a href="#how-it-works">{t.howNav}</a>
          <a href="#example">{t.exampleNav}</a>
        </nav>
        <div className="landing-header-actions">
          <ThemeToggle />
          <LanguageSwitch />
          <Link href="/login" className="landing-login">
            {t.login}
          </Link>
          <Link href="/demo" className="button button-primary button-small">
            {t.tryDemo}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main id="main-content">
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <Sparkles size={13} />
              {t.visual.aiAssisted}
              <ChevronRight size={13} />
            </span>
            <h1>
              {t.heroLine1}
              <br />
              <span>{t.heroLine2}</span>
            </h1>
            <p>{t.heroDescription}</p>
            <div className="hero-actions">
              <Link className="button button-primary button-large" href="/demo">
                {t.tryDemo}
                <ArrowRight size={17} />
              </Link>
              <a href="#example" className="button button-secondary button-large">
                {t.exampleNav}
                <ArrowDown size={16} />
              </a>
            </div>
            <span className="hero-demo-note">
              <CheckCircle2 size={13} />
              {t.noCard}
            </span>
          </div>
          <div className="product-stage" id="example">
            <div className="product-preview">
              <div className="preview-chrome">
                <span className="window-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  <Compass size={13} />
                  {t.visual.previewAddress}
                </span>
                <span className="preview-live">
                  <span />
                  {t.exampleLabel}
                </span>
              </div>
              <div className="preview-workspace">
                <div className="preview-rail" aria-hidden="true">
                  <span className="preview-brand">
                    <Compass size={22} />
                  </span>
                  <LayoutDashboard size={18} />
                  <FolderKanban size={18} />
                  <span className="preview-rail-active">
                    <Sparkles size={18} />
                  </span>
                  <FileText size={18} />
                  <span className="preview-rail-end">AR</span>
                </div>
                <div className="preview-context">
                  <span className="eyebrow">01 / {t.visual.sourceContext}</span>
                  <h2>{t.visual.previewWorkflow}</h2>
                  <p>{t.visual.previewWorkflowText}</p>
                  <div className="context-note">
                    <div>
                      <FileText size={15} />
                      <span>{t.visual.sourceHint}</span>
                    </div>
                    <blockquote>{t.heroNote}</blockquote>
                    <span className="context-note-footer">
                      <Check size={13} />
                      {t.visual.previewSaved}
                    </span>
                  </div>
                  <div className="context-flow">
                    <span>
                      <Sparkles size={15} />
                      PMO Compass AI
                    </span>
                    <ArrowRight size={18} />
                  </div>
                </div>
                <div className="preview-output">
                  <div className="preview-output-top">
                    <span>02 / {t.visual.previewDoc}</span>
                    <span className="review-badge">
                      <CheckCircle2 size={12} />
                      {t.visual.reviewReady}
                    </span>
                  </div>
                  <article className="preview-paper">
                    <div className="preview-paper-meta">
                      <span>HORIZON / {t.visual.reports}</span>
                      <span className="draft-badge">{t.draft}</span>
                    </div>
                    <h3>{t.heroOutputLabel}</h3>
                    <div className="paper-rule" />
                    <h4>{t.visual.previewSummary}</h4>
                    <p>{t.heroOutputSummary}</p>
                    <div className="paper-callout">
                      <ShieldAlert size={17} />
                      <div>
                        <h4>{t.previewRisk}</h4>
                        <p>{t.heroOutputRisk}</p>
                      </div>
                    </div>
                    <div className="paper-next">
                      <span>
                        <Check size={15} />
                      </span>
                      <div>
                        <h4>{t.previewNext}</h4>
                        <p>{t.heroOutputNext}</p>
                      </div>
                    </div>
                    <footer>
                      <Compass size={13} />
                      <span>PMO Compass AI</span>
                      <span>01</span>
                    </footer>
                  </article>
                  <span className="preview-disclaimer">{t.visual.reviewHint}</span>
                </div>
              </div>
            </div>
            <div className="preview-caption">
              <span>{t.heroPreviewLabel}</span>
              <Link href="/demo">
                {t.visual.openExample}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
          <div className="capability-badges" aria-label={t.toolkit}>
            {badges.map(({ label, icon: Icon }) => (
              <span className="capability-badge" key={label}>
                <Icon size={14} />
                {label}
              </span>
            ))}
          </div>
        </section>
        <section className="problem-section">
          <div>
            <span className="eyebrow">{t.problemEyebrow}</span>
            <h2>{t.problemTitle}</h2>
          </div>
          <p>{t.problemText}</p>
        </section>
        <section className="features-section" id="features">
          <div className="landing-section-heading">
            <div>
              <span className="eyebrow">{t.visual.featureEyebrow}</span>
              <h2>{t.featureTitle}</h2>
            </div>
            <p>{t.featureText}</p>
          </div>
          <div className="features-grid">
            {documentTypes.map((type, index) => {
              const Icon = documentIcons[type];
              return (
                <article key={type} className="feature-card">
                  <div className="feature-top">
                    <span className="feature-icon">
                      <Icon size={21} strokeWidth={1.6} />
                    </span>
                    <span className="feature-number">0{index + 1}</span>
                  </div>
                  <h3>{t.moduleNames[type]}</h3>
                  <p>{t.documentDescriptions[type]}</p>
                </article>
              );
            })}
          </div>
        </section>
        <section className="how-section" id="how-it-works">
          <div className="how-heading">
            <span className="eyebrow">PMO COMPASS AI</span>
            <h2>{t.howTitle}</h2>
            <Compass className="how-compass" size={240} strokeWidth={0.45} aria-hidden="true" />
          </div>
          <div className="how-grid">
            {[
              [t.how1, t.how1Text],
              [t.how2, t.how2Text],
              [t.how3, t.how3Text],
            ].map(([title, text], index) => (
              <div key={title}>
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
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
              [t.showcase.aiTitle, t.showcase.aiText],
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
        <section className="landing-cta">
          <span className="cta-icon">
            <Compass size={28} />
          </span>
          <h2>{t.ctaTitle}</h2>
          <p>{t.ctaText}</p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" href="/demo">
              {t.tryDemo}
              <ArrowRight size={17} />
            </Link>
            <Link className="button button-secondary button-large" href="/login">
              {t.login}
            </Link>
          </div>
          <span>{t.noCard}</span>
        </section>
      </main>
      <footer className="landing-footer">
        <Logo />
        <span>{t.footerNote}</span>
        <span>ES / EN</span>
      </footer>
    </div>
  );
}
