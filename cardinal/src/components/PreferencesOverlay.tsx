import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createGlassScene } from '@glass-sdk/liquid-glass/dom';
import '@glass-sdk/liquid-glass/styles.css';
import type { ThemePreference } from '../theme';
import { getWatchRootValidation, isPathInputValid } from '../utils/watchRoot';
import ThemeSwitcher from './ThemeSwitcher';
import LanguageSwitcher from './LanguageSwitcher';

type PreferencesOverlayProps = {
  open: boolean;
  onClose: () => void;
  onCancel?: () => void;
  themePreference: ThemePreference;
  language: string;
  defaultLanguage: string;
  onSavePreferences: (next: {
    trayIconEnabled: boolean;
    theme: ThemePreference;
    language: string;
  }) => void;
  sortThreshold: number;
  defaultSortThreshold: number;
  onSortThresholdChange: (value: number) => void;
  trayIconEnabled: boolean;
  watchRoot: string;
  defaultWatchRoot: string;
  onWatchConfigChange: (next: {
    watchRoot: string;
    ignorePaths: string[];
    includePaths: string[];
  }) => void;
  ignorePaths: string[];
  defaultIgnorePaths: string[];
  includePaths: string[];
  defaultIncludePaths: string[];
  onReset: () => void;
};

export function PreferencesOverlay({
  open,
  onClose,
  onCancel,
  themePreference,
  language,
  defaultLanguage,
  onSavePreferences,
  sortThreshold,
  defaultSortThreshold,
  onSortThresholdChange,
  trayIconEnabled,
  watchRoot,
  defaultWatchRoot,
  onWatchConfigChange,
  ignorePaths,
  defaultIgnorePaths,
  includePaths,
  defaultIncludePaths,
  onReset,
}: PreferencesOverlayProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const removeGlassSurfaceRef = useRef<(() => void) | null>(null);
  const [thresholdInput, setThresholdInput] = useState<string>(() => sortThreshold.toString());
  const [themeInput, setThemeInput] = useState<ThemePreference>(themePreference);
  const [languageInput, setLanguageInput] = useState<string>(language);
  const [trayIconInput, setTrayIconInput] = useState(trayIconEnabled);
  const [watchRootInput, setWatchRootInput] = useState<string>(() => watchRoot);
  const [ignorePathsInput, setIgnorePathsInput] = useState<string>(() => ignorePaths.join('\n'));
  const [includePathsInput, setIncludePathsInput] = useState<string>(() => includePaths.join('\n'));

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        (onCancel ?? onClose)();
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setThemeInput(themePreference);
    setLanguageInput(language);
    setTrayIconInput(trayIconEnabled);
    setThresholdInput(sortThreshold.toString());
  }, [language, open, sortThreshold, themePreference, trayIconEnabled]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setWatchRootInput(watchRoot);
    setIgnorePathsInput(ignorePaths.join('\n'));
    setIncludePathsInput(includePaths.join('\n'));
  }, [open, watchRoot, ignorePaths, includePaths]);

  useEffect(() => {
    if (!open || !cardRef.current) {
      return;
    }

    const card = cardRef.current;
    const root = card.closest('.cardinal-glass-scene');
    const content = root?.querySelector('main.container');
    if (!(root instanceof HTMLElement) || !(content instanceof HTMLElement)) {
      return;
    }

    const resolveAppearance = (): 'light' | 'dark' => {
      const explicitTheme = document.documentElement.dataset.theme;
      if (explicitTheme === 'dark') {
        return 'dark';
      }
      if (explicitTheme === 'light') {
        return 'light';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const glassScene = createGlassScene(root, {
      maxSurfaces: 1,
      onDiagnostic: ({ error }) => {
        if (error) {
          // WebGPU is optional. The card keeps its CSS fallback when it is unavailable.
          console.debug('[Cardinal] Liquid Glass unavailable:', error);
        }
      },
    });
    glassScene.setContent(content);

    const registerSurface = (): void => {
      removeGlassSurfaceRef.current?.();
      removeGlassSurfaceRef.current = glassScene.addSurface(card, {
        material: 'regular',
        appearance: resolveAppearance(),
        radius: 18,
        refraction: 42,
        motion: 'none',
      });
    };

    registerSurface();

    const themeObserver = new MutationObserver(registerSurface);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    colorSchemeQuery.addEventListener('change', registerSurface);

    return () => {
      colorSchemeQuery.removeEventListener('change', registerSurface);
      themeObserver.disconnect();
      removeGlassSurfaceRef.current?.();
      removeGlassSurfaceRef.current = null;
      glassScene.dispose();
    };
  }, [open]);

  const commitThreshold = useCallback(() => {
    const numericText = thresholdInput.replace(/[^\d]/g, '');
    if (!numericText) {
      setThresholdInput(sortThreshold.toString());
      return;
    }
    const parsed = Number.parseInt(numericText, 10);
    if (Number.isNaN(parsed)) {
      setThresholdInput(sortThreshold.toString());
      return;
    }
    const normalized = Math.max(1, Math.round(parsed));
    onSortThresholdChange(normalized);
    setThresholdInput(normalized.toString());
  }, [onSortThresholdChange, sortThreshold, thresholdInput]);

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    if (/^\d*$/.test(value)) {
      setThresholdInput(value);
    }
  };

  const { errorKey: watchRootErrorKey } = getWatchRootValidation(watchRootInput);
  const watchRootErrorMessage = watchRootErrorKey ? t(watchRootErrorKey) : null;

  const parsedIgnorePaths = ignorePathsInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const ignorePathsErrorMessage = (() => {
    const invalid = parsedIgnorePaths.find((line) => !isPathInputValid(line));
    return invalid ? t('ignorePaths.errors.absolute') : null;
  })();

  const parsedIncludePaths = includePathsInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const includePathsErrorMessage = (() => {
    const invalid = parsedIncludePaths.find((line) => !isPathInputValid(line));
    return invalid ? t('includePaths.errors.absolute') : null;
  })();

  const handleSave = (): void => {
    if (watchRootErrorMessage || ignorePathsErrorMessage || includePathsErrorMessage) {
      return;
    }
    commitThreshold();
    onSavePreferences({
      trayIconEnabled: trayIconInput,
      theme: themeInput,
      language: languageInput,
    });
    const trimmedWatchRoot = watchRootInput.trim();
    onWatchConfigChange({
      watchRoot: trimmedWatchRoot,
      ignorePaths: parsedIgnorePaths,
      includePaths: parsedIncludePaths,
    });
    setWatchRootInput(trimmedWatchRoot);
    setIgnorePathsInput(parsedIgnorePaths.join('\n'));
    setIncludePathsInput(parsedIncludePaths.join('\n'));
    onClose();
  };

  const handleReset = (): void => {
    setThemeInput('system');
    setLanguageInput(defaultLanguage);
    setTrayIconInput(false);
    setThresholdInput(defaultSortThreshold.toString());
    setWatchRootInput(defaultWatchRoot);
    setIgnorePathsInput(defaultIgnorePaths.join('\n'));
    setIncludePathsInput(defaultIncludePaths.join('\n'));
    onReset();
  };

  const handleCancel = (): void => {
    (onCancel ?? onClose)();
  };

  if (!open) {
    return null;
  }

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      (onCancel ?? onClose)();
    }
  };

  return (
    <div
      className="preferences-overlay"
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
    >
      <div ref={cardRef} className="preferences-card">
        <header className="preferences-card__header">
          <h1 className="preferences-card__title">{t('preferences.title')}</h1>
        </header>

        <div className="preferences-section">
          <div className="preferences-row">
            <p className="preferences-label">{t('preferences.appearance')}</p>
            <ThemeSwitcher
              className="preferences-control"
              preference={themeInput}
              onPreferenceChange={setThemeInput}
            />
          </div>
          <div className="preferences-row">
            <p className="preferences-label">{t('preferences.language')}</p>
            <LanguageSwitcher
              className="preferences-control"
              language={languageInput}
              onLanguageChange={setLanguageInput}
            />
          </div>
          <div className="preferences-row">
            <p className="preferences-label">{t('preferences.trayIcon.label')}</p>
            <div className="preferences-control">
              <label className="preferences-switch">
                <input
                  className="preferences-switch__input"
                  type="checkbox"
                  checked={trayIconInput}
                  onChange={(event) => setTrayIconInput(event.target.checked)}
                  aria-label={t('preferences.trayIcon.label')}
                />
                <span className="preferences-switch__track" aria-hidden="true" />
              </label>
            </div>
          </div>
          <div className="preferences-row">
            <div className="preferences-row__details">
              <p className="preferences-label">{t('preferences.sortingLimit.label')}</p>
            </div>
            <div className="preferences-control">
              <input
                className="preferences-field preferences-number-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={thresholdInput}
                onChange={handleThresholdChange}
                aria-label={t('preferences.sortingLimit.label')}
              />
            </div>
          </div>
          <div className="preferences-row">
            <div className="preferences-row__details">
              <p className="preferences-label" title={t('watchRoot.help')}>
                {t('watchRoot.label')}
              </p>
            </div>
            <div className="preferences-control">
              <input
                className="preferences-field preferences-number-input preferences-watch-root-input"
                type="text"
                value={watchRootInput}
                onChange={(event) => setWatchRootInput(event.target.value)}
                aria-label={t('watchRoot.label')}
                autoComplete="off"
                spellCheck={false}
              />
              {watchRootErrorMessage ? (
                <p
                  className="permission-status permission-status--error preferences-field-error"
                  role="status"
                  aria-live="polite"
                >
                  {watchRootErrorMessage}
                </p>
              ) : null}
            </div>
          </div>
          <div className="preferences-row">
            <div className="preferences-row__details">
              <p className="preferences-label" title={t('ignorePaths.help')}>
                {t('ignorePaths.label')}
              </p>
            </div>
            <div className="preferences-control">
              <textarea
                className="preferences-field preferences-textarea"
                value={ignorePathsInput}
                onChange={(event) => setIgnorePathsInput(event.target.value)}
                aria-label={t('ignorePaths.label')}
                autoComplete="off"
                spellCheck={false}
              />
              {ignorePathsErrorMessage ? (
                <p
                  className="permission-status permission-status--error preferences-field-error"
                  role="status"
                  aria-live="polite"
                >
                  {ignorePathsErrorMessage}
                </p>
              ) : null}
            </div>
          </div>
          <div className="preferences-row">
            <div className="preferences-row__details">
              <p className="preferences-label" title={t('includePaths.help')}>
                {t('includePaths.label')}
              </p>
            </div>
            <div className="preferences-control">
              <textarea
                className="preferences-field preferences-textarea"
                value={includePathsInput}
                onChange={(event) => setIncludePathsInput(event.target.value)}
                aria-label={t('includePaths.label')}
                autoComplete="off"
                spellCheck={false}
              />
              {includePathsErrorMessage ? (
                <p
                  className="permission-status permission-status--error preferences-field-error"
                  role="status"
                  aria-live="polite"
                >
                  {includePathsErrorMessage}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <footer className="preferences-card__footer">
          <button
            className="preferences-save"
            type="button"
            onClick={handleSave}
            disabled={Boolean(
              watchRootErrorMessage || ignorePathsErrorMessage || includePathsErrorMessage,
            )}
          >
            {t('preferences.save')}
          </button>
          <button className="preferences-cancel" type="button" onClick={handleCancel}>
            {t('preferences.cancel')}
          </button>
          <button className="preferences-reset" type="button" onClick={handleReset}>
            {t('preferences.reset')}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default PreferencesOverlay;
