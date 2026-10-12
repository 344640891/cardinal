import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { i18n as I18nInstance } from 'i18next';
import { OPEN_PREFERENCES_EVENT } from '../constants/appEvents';
import { getBrowserLanguage } from '../i18n/config';
import {
  applyThemePreference,
  getStoredThemePreference,
  persistThemePreference,
  type ThemePreference,
} from '../theme';
import { setAutoHideOnFocusLoss, setTrayEnabled } from '../tray';
import { getStoredTrayIconEnabled, persistTrayIconEnabled } from '../trayIconPreference';
import { getStoredAutoHideOnFocusLoss, persistAutoHideOnFocusLoss } from '../autoHidePreference';
import { setWatchConfig } from '../utils/watchConfig';
import type { FullDiskAccessStatus } from './useFullDiskAccessPermission';
import { useIgnorePaths } from './useIgnorePaths';
import { useIncludePaths } from './useIncludePaths';
import { useWatchRoot } from './useWatchRoot';

type WatchConfigChangePayload = {
  watchRoot: string;
  ignorePaths: string[];
  includePaths: string[];
};

export type SavePreferencesPayload = {
  trayIconEnabled: boolean;
  autoHideOnFocusLoss: boolean;
  theme: ThemePreference;
  language: string;
};

type UseAppPreferencesOptions = {
  fullDiskAccessStatus: FullDiskAccessStatus;
  isCheckingFullDiskAccess: boolean;
  refreshSearchResults: () => void;
  i18n: Pick<I18nInstance, 'changeLanguage'> & { language?: string };
};

type UseAppPreferencesResult = {
  isPreferencesOpen: boolean;
  closePreferences: () => void;
  cancelPreferences: () => void;
  trayIconEnabled: boolean;
  autoHideOnFocusLoss: boolean;
  setTrayIconEnabled: (enabled: boolean) => void;
  themePreference: ThemePreference;
  language: string;
  defaultLanguage: string;
  savePreferences: (next: SavePreferencesPayload) => void;
  watchRoot: string;
  defaultWatchRoot: string;
  ignorePaths: string[];
  defaultIgnorePaths: string[];
  includePaths: string[];
  defaultIncludePaths: string[];
  preferencesResetToken: number;
  handleWatchConfigChange: (next: WatchConfigChangePayload) => void;
  handleResetPreferences: () => void;
};

const areStringArraysEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

/**
 * Manages app preferences including watch config, tray, theme, language, and overlay state.
 * Provides actions for updating watch settings and resetting preferences to defaults.
 */
export function useAppPreferences({
  fullDiskAccessStatus,
  isCheckingFullDiskAccess,
  refreshSearchResults,
  i18n,
}: UseAppPreferencesOptions): UseAppPreferencesResult {
  const { watchRoot, setWatchRoot, defaultWatchRoot } = useWatchRoot();
  const { ignorePaths, setIgnorePaths, defaultIgnorePaths } = useIgnorePaths();
  const { includePaths, setIncludePaths, defaultIncludePaths } = useIncludePaths();
  const logicStartedRef = useRef(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [trayIconEnabled, setTrayIconEnabled] = useState<boolean>(() => getStoredTrayIconEnabled());
  const [autoHideOnFocusLoss, setAutoHideOnFocusLossState] = useState<boolean>(() =>
    getStoredAutoHideOnFocusLoss(),
  );
  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    getStoredThemePreference(),
  );
  const [language, setLanguage] = useState<string>(() => i18n.language ?? getBrowserLanguage());
  const [preferencesResetToken, setPreferencesResetToken] = useState(0);

  useEffect(() => {
    persistTrayIconEnabled(trayIconEnabled);
    void setTrayEnabled(trayIconEnabled).catch((error) => {
      console.error('Failed to apply tray icon preference', error);
    });
  }, [trayIconEnabled]);

  useEffect(() => {
    persistAutoHideOnFocusLoss(autoHideOnFocusLoss);
    void setAutoHideOnFocusLoss(autoHideOnFocusLoss);
  }, [autoHideOnFocusLoss]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOpenPreferences = () => setIsPreferencesOpen(true);
    window.addEventListener(OPEN_PREFERENCES_EVENT, handleOpenPreferences);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, handleOpenPreferences);
  }, []);

  useEffect(() => {
    if (isCheckingFullDiskAccess) {
      return;
    }
    if (fullDiskAccessStatus !== 'granted') {
      return;
    }
    if (!watchRoot) {
      return;
    }
    if (logicStartedRef.current) {
      return;
    }

    logicStartedRef.current = true;
    void invoke('start_logic', { watchRoot, ignorePaths, includePaths });
  }, [fullDiskAccessStatus, ignorePaths, includePaths, isCheckingFullDiskAccess, watchRoot]);

  const applyWatchConfig = useCallback(
    (nextWatchRoot: string, nextIgnorePaths: string[], nextIncludePaths: string[]) => {
      const watchConfigChanged =
        nextWatchRoot !== watchRoot ||
        !areStringArraysEqual(nextIgnorePaths, ignorePaths) ||
        !areStringArraysEqual(nextIncludePaths, includePaths);

      if (!watchConfigChanged) {
        return;
      }

      setWatchRoot(nextWatchRoot);
      setIgnorePaths(nextIgnorePaths);
      setIncludePaths(nextIncludePaths);
      if (logicStartedRef.current && nextWatchRoot) {
        void setWatchConfig({
          watchRoot: nextWatchRoot,
          ignorePaths: nextIgnorePaths,
          includePaths: nextIncludePaths,
        });
      }
      refreshSearchResults();
    },
    [
      ignorePaths,
      includePaths,
      refreshSearchResults,
      setIgnorePaths,
      setIncludePaths,
      setWatchRoot,
      watchRoot,
    ],
  );

  const handleWatchConfigChange = useCallback(
    (next: WatchConfigChangePayload) => {
      applyWatchConfig(next.watchRoot, next.ignorePaths, next.includePaths);
    },
    [applyWatchConfig],
  );

  const handleResetPreferences = useCallback(() => {
    setPreferencesResetToken((token) => token + 1);
  }, []);

  const savePreferences = useCallback(
    (next: SavePreferencesPayload) => {
      setTrayIconEnabled(next.trayIconEnabled);
      setAutoHideOnFocusLossState(next.autoHideOnFocusLoss);
      setThemePreference(next.theme);
      persistThemePreference(next.theme);
      applyThemePreference(next.theme);
      setLanguage(next.language);
      void i18n.changeLanguage(next.language);
    },
    [i18n],
  );

  const closePreferences = useCallback(() => setIsPreferencesOpen(false), []);

  const cancelPreferences = useCallback(() => setIsPreferencesOpen(false), []);

  return {
    isPreferencesOpen,
    closePreferences,
    cancelPreferences,
    trayIconEnabled,
    autoHideOnFocusLoss,
    setTrayIconEnabled,
    themePreference,
    language,
    defaultLanguage: getBrowserLanguage(),
    savePreferences,
    watchRoot,
    defaultWatchRoot,
    ignorePaths,
    defaultIgnorePaths,
    includePaths,
    defaultIncludePaths,
    preferencesResetToken,
    handleWatchConfigChange,
    handleResetPreferences,
  };
}
