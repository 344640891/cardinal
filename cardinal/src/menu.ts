import { getName } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { openUrl } from '@tauri-apps/plugin-opener';
import i18n from './i18n/config';
import { openPreferences } from './utils/openPreferences';

const HELP_UPDATES_URL = 'https://github.com/cardisoft/cardinal/releases';

let menuInitPromise: Promise<void> | null = null;

export function initializeAppMenu(): Promise<void> {
  if (!menuInitPromise) {
    scheduleMenuBuild();
  }

  return menuInitPromise ?? Promise.resolve();
}

const dispatchMenuEvent = (name: string): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(name));
  }
};

const menuText = (key: string, fallback: string): string => i18n.t(key, { defaultValue: fallback });

async function buildAppMenu(): Promise<void> {
  const name = (await getName().catch(() => null)) ?? 'Cardinal';
  const separator = () => PredefinedMenuItem.new({ item: 'Separator' });

  const newWindowItem = await MenuItem.new({
    id: 'menu.new_window',
    text: '新建搜索窗口',
    accelerator: 'CmdOrCtrl+N',
    action: () => dispatchMenuEvent('cardinal:focus-search'),
  });
  const preferencesItem = await MenuItem.new({
    id: 'menu.preferences',
    text: menuText('menu.preferences', '首选项...'),
    accelerator: 'CmdOrCtrl+,',
    action: openPreferences,
  });
  const hideItem = await MenuItem.new({
    id: 'menu.hide',
    text: '隐藏窗口',
    action: () => void invoke('hide_main_window'),
  });
  const quitItem = await PredefinedMenuItem.new({
    item: 'Quit',
    text: menuText('preferences.quit', '完全退出'),
  });
  const appSubmenu = await Submenu.new({
    id: 'menu.app',
    text: name,
    items: [quitItem],
  });
  const fileSubmenu = await Submenu.new({
    id: 'menu.file',
    text: menuText('menu.file', '文件(F)'),
    items: [newWindowItem, await separator(), preferencesItem, hideItem],
  });

  const editSubmenu = await Submenu.new({
    id: 'menu.edit',
    text: `${menuText('menu.edit', '编辑')}(E)`,
    items: [
      await PredefinedMenuItem.new({ item: 'Undo', text: menuText('menu.undo', '撤销') }),
      await PredefinedMenuItem.new({ item: 'Redo', text: menuText('menu.redo', '重做') }),
      await separator(),
      await PredefinedMenuItem.new({ item: 'Cut', text: menuText('menu.cut', '剪切') }),
      await PredefinedMenuItem.new({ item: 'Copy', text: menuText('menu.copy', '复制') }),
      await PredefinedMenuItem.new({ item: 'Paste', text: menuText('menu.paste', '粘贴') }),
      await PredefinedMenuItem.new({ item: 'SelectAll', text: menuText('menu.selectAll', '全选') }),
    ],
  });

  const viewSubmenu = await Submenu.new({
    id: 'menu.view',
    text: `${menuText('menu.view', '视图')}(V)`,
    items: [
      await PredefinedMenuItem.new({
        item: 'Fullscreen',
        text: menuText('menu.fullscreen', '全屏'),
      }),
      await separator(),
      await MenuItem.new({
        id: 'menu.view.files',
        text: '文件结果',
        action: () => dispatchMenuEvent('cardinal:show-files'),
      }),
      await MenuItem.new({
        id: 'menu.view.events',
        text: '事件记录',
        action: () => dispatchMenuEvent('cardinal:show-events'),
      }),
      await MenuItem.new({
        id: 'menu.view.status',
        text: '状态栏',
        action: () => dispatchMenuEvent('cardinal:toggle-status-bar'),
      }),
    ],
  });

  const searchSubmenu = await Submenu.new({
    id: 'menu.search',
    text: '搜索(S)',
    items: [
      await MenuItem.new({
        id: 'menu.search.focus',
        text: '聚焦搜索框',
        accelerator: 'CmdOrCtrl+F',
        action: () => dispatchMenuEvent('cardinal:focus-search'),
      }),
      await MenuItem.new({
        id: 'menu.search.clear',
        text: '清除搜索',
        action: () => dispatchMenuEvent('cardinal:clear-search'),
      }),
      await separator(),
      await MenuItem.new({
        id: 'menu.search.case-sensitive',
        text: '区分大小写',
        action: () => dispatchMenuEvent('cardinal:toggle-case-sensitive'),
      }),
      await MenuItem.new({
        id: 'menu.search.directory-scope',
        text: '搜索指定目录',
        action: () => dispatchMenuEvent('cardinal:toggle-directory-scope'),
      }),
    ],
  });

  const bookmarksSubmenu = await Submenu.new({
    id: 'menu.bookmarks',
    text: '书签(B)',
    items: [await MenuItem.new({ id: 'menu.bookmarks.placeholder', text: '书签功能暂未配置' })],
  });

  const rescanItem = await MenuItem.new({
    id: 'menu.tools.rescan',
    text: '重新扫描',
    action: () => void invoke('trigger_rescan'),
  });
  const toolsPreferencesItem = await MenuItem.new({
    id: 'menu.tools.preferences',
    text: menuText('menu.preferences', '首选项...'),
    action: openPreferences,
  });
  const toolsSubmenu = await Submenu.new({
    id: 'menu.tools',
    text: '工具(T)',
    items: [rescanItem, await separator(), toolsPreferencesItem],
  });

  const getUpdatesItem = await MenuItem.new({
    id: 'menu.help_updates',
    text: menuText('menu.getUpdates', '检查更新'),
    action: () => void openUpdatesPage(),
  });
  const aboutItem = await MenuItem.new({
    id: 'menu.about',
    text: menuText('menu.about', `关于 ${name}`),
  });
  const helpSubmenu = await Submenu.new({
    id: 'menu.help-root',
    text: `${menuText('menu.help', '帮助')}(H)`,
    items: [getUpdatesItem, await separator(), aboutItem],
  });

  await helpSubmenu.setAsHelpMenuForNSApp().catch(() => {});

  const menu = await Menu.new({
    items: [
      appSubmenu,
      fileSubmenu,
      editSubmenu,
      viewSubmenu,
      searchSubmenu,
      bookmarksSubmenu,
      toolsSubmenu,
      helpSubmenu,
    ],
  });
  await menu.setAsAppMenu();
}

async function openUpdatesPage(): Promise<void> {
  try {
    await openUrl(HELP_UPDATES_URL);
  } catch (error) {
    console.error('Failed to open updates page', error);
  }
}

function scheduleMenuBuild(): void {
  const start = menuInitPromise ?? Promise.resolve();

  menuInitPromise = start
    .catch(() => {})
    .then(buildAppMenu)
    .catch((error) => {
      console.error('Failed to initialize app menu', error);
      menuInitPromise = null;
    });
}

i18n.on('languageChanged', () => {
  scheduleMenuBuild();
});
