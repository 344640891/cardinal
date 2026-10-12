import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getName, getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { isComposingKeyboardEvent } from '../utils/keyboard';

const GIT_REPOSITORY_URL = 'https://github.com/cardisoft/cardinal';

type AboutOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export function AboutOverlay({ open, onClose }: AboutOverlayProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [appName, setAppName] = useState('Cardinal');
  const [appVersion, setAppVersion] = useState('unknown');

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !isComposingKeyboardEvent(event)) {
        onClose();
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let disposed = false;
    void Promise.all([getName().catch(() => null), getVersion().catch(() => null)]).then(
      ([name, version]) => {
        if (disposed) {
          return;
        }
        if (name) {
          setAppName(name);
        }
        if (version) {
          setAppVersion(version);
        }
      },
    );

    return () => {
      disposed = true;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleRepositoryClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    void openUrl(GIT_REPOSITORY_URL);
  };

  return (
    <div
      className="preferences-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
      onClick={handleOverlayClick}
    >
      <div className="preferences-card about-card">
        <header className="preferences-card__header">
          <h1 id="about-dialog-title" className="preferences-card__title">
            {t('menu.about', { appName, defaultValue: `关于 ${appName}` })}
          </h1>
        </header>
        <div className="about-card__details">
          <p>{appName}</p>
          <p>{t('about.version', { defaultValue: '版本 {{version}}', version: appVersion })}</p>
          <p>
            <span>{t('about.repository', { defaultValue: 'Git 仓库' })}：</span>
            <a href={GIT_REPOSITORY_URL} onClick={handleRepositoryClick}>
              {GIT_REPOSITORY_URL}
            </a>
          </p>
        </div>
        <footer className="preferences-card__footer">
          <button type="button" className="preferences-cancel" onClick={onClose}>
            {t('preferences.close', '关闭')}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default AboutOverlay;
