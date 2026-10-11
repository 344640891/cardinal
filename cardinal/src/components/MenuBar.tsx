import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isComposingKeyboardEvent } from '../utils/keyboard';
import type { StatusTabKey } from './StatusBar';

type MenuBarProps = {
  activeTab: StatusTabKey;
  onTabChange: (tab: StatusTabKey) => void;
  onFocusSearch: () => void;
  onClearSearch: () => void;
  caseSensitive: boolean;
  onToggleCaseSensitive: () => void;
  directoryScopeOpen: boolean;
  onToggleDirectoryScope: () => void;
  showStatusBar: boolean;
  onToggleStatusBar: () => void;
  onOpenPreferences: () => void;
  onRequestRescan: () => void;
};

type MenuId = 'file' | 'edit' | 'view' | 'search' | 'bookmarks' | 'tools' | 'help';

type MenuItem = {
  label: string;
  onSelect?: () => void;
  checked?: boolean;
  disabled?: boolean;
  separator?: boolean;
};

const isTauriRuntime = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function MenuBar({
  activeTab,
  onTabChange,
  onFocusSearch,
  onClearSearch,
  caseSensitive,
  onToggleCaseSensitive,
  directoryScopeOpen,
  onToggleDirectoryScope,
  showStatusBar,
  onToggleStatusBar,
  onOpenPreferences,
  onRequestRescan,
}: MenuBarProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isComposingKeyboardEvent(event)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (isTauriRuntime()) {
    return null;
  }

  const menuLabel = (key: string, fallback: string): string =>
    t(key, { defaultValue: fallback });

  const menus: Array<{ id: MenuId; label: string; items: MenuItem[] }> = [
    {
      id: 'file',
      label: '文件(F)',
      items: [
        { label: '新建搜索窗口', onSelect: onFocusSearch },
        { separator: true, label: '' },
        { label: menuLabel('menu.preferences', '首选项...'), onSelect: onOpenPreferences },
      ],
    },
    {
      id: 'edit',
      label: `${menuLabel('menu.edit', '编辑')}(E)`,
      items: [
        { label: menuLabel('menu.undo', '撤销'), disabled: true },
        { label: menuLabel('menu.redo', '重做'), disabled: true },
        { separator: true, label: '' },
        { label: menuLabel('menu.cut', '剪切'), disabled: true },
        { label: menuLabel('menu.copy', '复制'), disabled: true },
        { label: menuLabel('menu.paste', '粘贴'), disabled: true },
        { label: menuLabel('menu.selectAll', '全选'), onSelect: onFocusSearch },
      ],
    },
    {
      id: 'view',
      label: `${menuLabel('menu.view', '视图')}(V)`,
      items: [
        { label: '文件结果', checked: activeTab === 'files', onSelect: () => onTabChange('files') },
        { label: '事件记录', checked: activeTab === 'events', onSelect: () => onTabChange('events') },
        { separator: true, label: '' },
        { label: '状态栏', checked: showStatusBar, onSelect: onToggleStatusBar },
      ],
    },
    {
      id: 'search',
      label: '搜索(S)',
      items: [
        { label: '聚焦搜索框', onSelect: onFocusSearch },
        { label: '清除搜索', onSelect: onClearSearch },
        { separator: true, label: '' },
        { label: '区分大小写', checked: caseSensitive, onSelect: onToggleCaseSensitive },
        {
          label: '搜索指定目录',
          checked: directoryScopeOpen,
          onSelect: onToggleDirectoryScope,
        },
      ],
    },
    {
      id: 'bookmarks',
      label: '书签(B)',
      items: [{ label: '书签功能暂未配置', disabled: true }],
    },
    {
      id: 'tools',
      label: '工具(T)',
      items: [
        { label: '重新扫描', onSelect: onRequestRescan },
        { separator: true, label: '' },
        { label: menuLabel('menu.preferences', '首选项...'), onSelect: onOpenPreferences },
      ],
    },
    {
      id: 'help',
      label: `${menuLabel('menu.help', '帮助')}(H)`,
      items: [
        { label: menuLabel('menu.getUpdates', '检查更新'), disabled: true },
        { label: menuLabel('menu.about', '关于 Cardinal'), disabled: true },
      ],
    },
  ];

  const selectItem = (item: MenuItem) => {
    if (item.disabled || item.separator) {
      return;
    }
    item.onSelect?.();
    setOpenMenu(null);
  };

  return (
    <div ref={rootRef} className="everything-menu-bar" role="menubar">
      {menus.map((menu) => (
        <div key={menu.id} className="everything-menu" role="none">
          <button
            type="button"
            className="everything-menu-trigger"
            aria-haspopup="menu"
            aria-expanded={openMenu === menu.id}
            onClick={() => setOpenMenu((current) => (current === menu.id ? null : menu.id))}
          >
            {menu.label}
          </button>
          {openMenu === menu.id && (
            <div className="everything-menu-dropdown" role="menu">
              {menu.items.map((item, index) =>
                item.separator ? (
                  <div key={`separator-${index}`} className="everything-menu-separator" role="separator" />
                ) : (
                  <button
                    key={`${menu.id}-${item.label}`}
                    type="button"
                    className="everything-menu-item"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => selectItem(item)}
                  >
                    <span className="everything-menu-check" aria-hidden="true">
                      {item.checked ? '✓' : ''}
                    </span>
                    <span>{item.label}</span>
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
