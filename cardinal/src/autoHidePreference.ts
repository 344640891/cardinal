const AUTO_HIDE_ON_FOCUS_LOSS_STORAGE_KEY = 'cardinal.autoHideOnFocusLoss';

export const getStoredAutoHideOnFocusLoss = (): boolean => {
  try {
    return window.localStorage.getItem(AUTO_HIDE_ON_FOCUS_LOSS_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
};

export const persistAutoHideOnFocusLoss = (enabled: boolean): void => {
  try {
    window.localStorage.setItem(AUTO_HIDE_ON_FOCUS_LOSS_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage failures.
  }
};
