import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemePreference } from '../theme';

type ThemeSwitcherProps = {
  className?: string;
  preference: ThemePreference;
  onPreferenceChange: (preference: ThemePreference) => void;
};

type ThemeOption = {
  value: ThemePreference;
  icon: string;
  labelKey: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'system', icon: '🌓', labelKey: 'theme.options.system' },
  { value: 'light', icon: '🌕', labelKey: 'theme.options.light' },
  { value: 'dark', icon: '🌙', labelKey: 'theme.options.dark' },
];

const ThemeSwitcher = ({
  className,
  preference,
  onPreferenceChange,
}: ThemeSwitcherProps): React.JSX.Element => {
  const { t } = useTranslation();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPreference = event.target.value as ThemePreference;
    onPreferenceChange(nextPreference);
  };

  const activeOption =
    THEME_OPTIONS.find((option) => option.value === preference) ?? THEME_OPTIONS[0];

  return (
    <div className={className}>
      <span className="sr-only">{t('theme.label')}</span>
      <div className="theme-switcher">
        <span className="theme-switcher__icon">{activeOption.icon}</span>
        <select
          className="theme-switcher__select"
          value={preference}
          onChange={handleChange}
          aria-label={t('theme.label')}
        >
          {THEME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ThemeSwitcher;
