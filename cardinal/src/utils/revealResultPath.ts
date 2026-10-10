import { invoke } from '@tauri-apps/api/core';

export const revealResultPath = (path: string | null | undefined): void => {
  if (!path) {
    return;
  }

  void invoke('open_in_finder', { path });
};
