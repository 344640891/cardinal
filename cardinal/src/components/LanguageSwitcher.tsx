import React from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_OPTIONS, normalizeLanguageTag } from '../i18n/config';

type LanguageSwitcherProps = {
  className: string;
  language: string;
  onLanguageChange: (language: string) => void;
};

const LanguageSwitcher = ({
  className,
  language,
  onLanguageChange,
}: LanguageSwitcherProps): React.JSX.Element => {
  const { t } = useTranslation();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLang = event.target.value;
    onLanguageChange(nextLang);
  };

  const currentCode = normalizeLanguageTag(language);

  return (
    <div className={className}>
      <span className="sr-only">{t('language.label')}</span>
      <div className="language-switcher">
        <span className="language-switcher__text">{t('language.trigger')}</span>
        <select
          className="language-switcher__select"
          value={currentCode}
          onChange={handleChange}
          aria-label={t('language.label')}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LanguageSwitcher;
