import { getName, getVersion } from '@tauri-apps/api/app';
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { openUrl } from '@tauri-apps/plugin-opener';
import i18n from './i18n/config';

const GIT_REPOSITORY_URL = 'https://github.com/cardisoft/cardinal';

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
  const [name, version] = await Promise.all([
    getName().catch(() => null),
    getVersion().catch(() => null),
  ]);
  const appName = name ?? 'Cardinal';
  const appVersion = version ?? 'unknown';
  const separator = () => PredefinedMenuItem.new({ item: 'Separator' });

  const quitItem = await PredefinedMenuItem.new({
    item: 'Quit',
    text: menuText('preferences.quit', '完全退出'),
  });
  const appSubmenu = await Submenu.new({
    id: 'menu.app',
    text: appName,
    items: [quitItem],
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

  const aboutVersionItem = await MenuItem.new({
    id: 'menu.about.version',
    text: `${appName} v${appVersion}`,
    enabled: false,
  });
  const aboutRepositoryItem = await MenuItem.new({
    id: 'menu.about.repository',
    text: `Git 仓库：${GIT_REPOSITORY_URL}`,
    action: () => void openUrl(GIT_REPOSITORY_URL),
  });
  const aboutSubmenu = await Submenu.new({
    id: 'menu.about',
    text: i18n.t('menu.about', { appName, defaultValue: `关于 ${appName}` }),
    items: [aboutVersionItem, aboutRepositoryItem],
  });
  const helpSubmenu = await Submenu.new({
    id: 'menu.help-root',
    text: `${menuText('menu.help', '帮助')}(H)`,
    items: [aboutSubmenu],
  });

  await helpSubmenu.setAsHelpMenuForNSApp().catch(() => {});

  const menu = await Menu.new({
    items: [appSubmenu, searchSubmenu, bookmarksSubmenu, helpSubmenu],
  });
  await menu.setAsAppMenu();
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
