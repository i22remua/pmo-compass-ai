'use client';
import { Monitor, Moon, Sun, Check } from 'lucide-react';
import { useLocale } from './providers';
import { useTheme, type Theme } from './theme-provider';

export function ThemeToggle() {
  const { t } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      className="theme-toggle icon-button"
      type="button"
      aria-label={t.visual.toggleTheme}
      title={t.visual.toggleTheme}
      aria-pressed={resolvedTheme === 'dark'}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Moon className="theme-moon" size={17} />
      <Sun className="theme-sun" size={17} />
    </button>
  );
}

export function ThemePreferences() {
  const { t } = useLocale();
  const { theme, setTheme } = useTheme();
  const choices = [
    { value: 'light', icon: Sun },
    { value: 'dark', icon: Moon },
    { value: 'system', icon: Monitor },
  ] as const;
  return (
    <div className="appearance-field">
      <h3>{t.visual.appearance}</h3>
      <p className="muted">{t.visual.appearanceHint}</p>
      <div className="theme-options" role="group" aria-label={t.visual.appearance}>
        {choices.map(({ value, icon: Icon }) => (
          <button
            type="button"
            key={value}
            className={`theme-option theme-option-${value}`}
            aria-pressed={theme === value}
            onClick={() => setTheme(value as Theme)}
          >
            <span className="theme-swatch" aria-hidden="true">
              <i />
              <span>
                <b />
                <b />
                <b />
              </span>
            </span>
            <span className="theme-option-label">
              <Icon size={15} />
              {t.visual[value]}
              {theme === value && <Check size={14} />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
