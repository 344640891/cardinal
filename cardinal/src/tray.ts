import { defaultWindowIcon } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { Image as TauriImage } from '@tauri-apps/api/image';
import { Menu, MenuItem, PredefinedMenuItem } from '@tauri-apps/api/menu';
import { TrayIcon, type TrayIconOptions } from '@tauri-apps/api/tray';
import i18n from './i18n/config';
import { QUICK_LAUNCH_SHORTCUT } from './utils/globalShortcuts';
import trayIconUrl from './assets/tray-icon.png?url';

const TRAY_ID = 'cardinal.tray';

let trayInitPromise: Promise<void> | null = null;
let trayIcon: TrayIcon | null = null;
let trayImagePromise: Promise<TauriImage | undefined> | null = null;

export function initializeTray(): Promise<void> {
  if (!trayInitPromise) {
    trayInitPromise = createTray().catch((error) => {
      console.error('Failed to initialize Cardinal tray', error);
      trayInitPromise = null;
    });
  }

  return trayInitPromise;
}

export async function setTrayEnabled(enabled: boolean): Promise<void> {
  await invoke('set_tray_activation_policy', { enabled }).catch((error) => {
    console.error('Failed to update activation policy', error);
  });

  if (enabled) {
    await initializeTray();
    return;
  }

  const pendingInit = trayInitPromise;
  trayInitPromise = null;

  await pendingInit?.catch(() => {});

  const current = trayIcon;
  trayIcon = null;

  await Promise.allSettled([current?.close(), TrayIcon.removeById(TRAY_ID)]);
}

export async function setAutoHideOnFocusLoss(enabled: boolean): Promise<void> {
  await invoke('set_auto_hide_on_focus_loss', { enabled }).catch((error) => {
    console.error('Failed to update focus-loss window policy', error);
  });
}

async function createTray(): Promise<void> {
  const openItem = await MenuItem.new({
    id: 'tray.open',
    text: i18n.t('tray.open'),
    accelerator: QUICK_LAUNCH_SHORTCUT,
    action: () => {
      void activateMainWindow();
    },
  });
  const menu = await Menu.new({
    items: [
      openItem,
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'Quit', text: i18n.t('tray.quit') }),
    ],
  });
  const options: TrayIconOptions = {
    id: TRAY_ID,
    tooltip: 'Cardinal',
    icon: (await loadTrayImage()) ?? (await defaultWindowIcon()) ?? undefined,
    iconAsTemplate: true,
    menu,
  };

  trayIcon = await TrayIcon.new(options);
}

async function loadTrayImage(): Promise<TauriImage | undefined> {
  if (!trayImagePromise) {
    trayImagePromise = createTrayImage().catch((error) => {
      console.warn('Failed to load monochrome Cardinal tray icon', error);
      return undefined;
    });
  }

  return trayImagePromise;
}

async function createTrayImage(): Promise<TauriImage> {
  const response = await fetch(trayIconUrl);
  if (!response.ok) {
    throw new Error(`Tray icon request failed with status ${response.status}`);
  }

  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Unable to create a canvas context for the tray icon');
  }

  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  return TauriImage.new(Uint8Array.from(pixels.data), canvas.width, canvas.height);
}

async function activateMainWindow(): Promise<void> {
  await invoke('activate_main_window');
}
