'use client';
import Link from 'next/link';
import { useLocale } from '@/components/providers';
import { LanguageSwitch, Logo } from '@/components/ui';
import { ThemeToggle } from '@/components/theme-controls';

export default function SecurityPage() {
  const { t } = useLocale();
  const sections = [
    [t.security.authentication, t.security.authenticationText],
    [t.security.isolation, t.security.isolationText],
    [t.security.encryption, t.security.encryptionText],
    [t.security.ai, t.security.aiText],
    [t.security.offline, t.security.offlineText],
    [t.security.deletion, t.security.deletionText],
    [t.security.limits, t.security.limitsText],
  ];
  return (
    <div className="landing about-page">
      <header className="landing-header">
        <Logo />
        <div className="landing-header-actions">
          <ThemeToggle />
          <LanguageSwitch />
        </div>
      </header>
      <main id="main-content">
        <div className="about-heading">
          <Link className="back-link" href="/">
            {t.backHome}
          </Link>
          <h1>{t.security.title}</h1>
          <p>{t.security.intro}</p>
        </div>
        <section className="about-built">
          <dl>
            {sections.map(([title, description]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
          <a
            className="text-link"
            href="https://github.com/i22remua/pmo-compass-ai/blob/main/docs/security.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.security.technical} →
          </a>
        </section>
      </main>
      <footer className="landing-footer">
        <Logo />
        <Link href="/start">{t.tryDemo}</Link>
      </footer>
    </div>
  );
}
