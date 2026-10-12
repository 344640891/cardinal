<div align="center">
  <img src="cardinal/mac-icon_1024x1024.png" alt="Cardinal icon" width="120" height="120">
  <h1>Cardinal</h1>
  <p>最快最准的 macOS 文件搜索应用</p>
  <p>
    <a href="#使用-cardinal">使用 Cardinal</a> ·
    <a href="#构建-cardinal">构建 Cardinal</a>
  </p>
  <img src="doc/pub/UI.gif" alt="Cardinal UI preview" width="720">
</div>

---

[English](doc/pub/README.en-US.md) · [Español](doc/pub/README.es-ES.md) · [한국어](doc/pub/README.ko-KR.md) · [Русский](doc/pub/README.ru-RU.md) · [简体中文](README.md) · [繁體中文](doc/pub/README.zh-TW.md) · [Português](doc/pub/README.pt-BR.md) · [日本語](doc/pub/README.ja-JP.md) · [Français](doc/pub/README.fr-FR.md) · [Deutsch](doc/pub/README.de-DE.md) · [Українська](doc/pub/README.uk-UA.md) · [العربية](doc/pub/README.ar-SA.md) · [हिन्दी](doc/pub/README.hi-IN.md) · [Türkçe](doc/pub/README.tr-TR.md)

## 使用 Cardinal

### 下载

通过 Homebrew 安装：

```bash
brew install --cask cardinal-search
```

你也可以从 [GitHub Releases](https://github.com/cardisoft/cardinal/releases/) 获取最新的安装包。

### 国际化支持

想切换其他语言？点击状态栏里的 ⚙️ 按钮即可即时切换。

### 基础搜索语法

Cardinal 现在在经典的子串/前缀匹配基础上叠加了 Everything 兼容语法：

- `report draft` – 空格代表 `AND`，只会得到同时包含两个词的文件。
- `*.pdf briefing` – 只显示文件名包含 “briefing” 的 PDF 结果。
- `*.zip size:>100MB` – 查找大于 100MB 的 ZIP 文件。
- `in:/Users demo !.psd` – 把搜索范围限制在 `/Users`，然后匹配包含 `demo` 但排除 `.psd` 的文件。
- `tag:ProjectA;ProjectB` – 按 Finder 标签（macOS）过滤；`;` 表示 `OR`（满足任一标签即可）。
- `*.md content:"Bearer "` – 仅筛选包含字符串 `Bearer ` 的 Markdown 文件。
- `"Application Support"` – 使用引号匹配完整短语。
- `brary/Applicat` – 使用 `/` 作为路径分隔符向下匹配子路径，例如 `Library/Application Support`。
- `/report` · `draft/` · `/report/` – 在词首/词尾添加 `/`，分别强制匹配前缀、后缀或精确文件名，补足 Everything 语法之外的整词控制。
- `~/**/.DS_Store` – `**` 会深入所有子目录，在整个家目录中查找散落的 `.DS_Store` 文件。

更多支持的操作符（布尔组合、文件夹限定、扩展名过滤、正则示例等）请参见 [`search-syntax.zh-CN.md`](doc/pub/search-syntax.zh-CN.md)。

### 键盘快捷键与预览

- `Cmd+Shift+Space` – 通过全局快捷键开/关 Cardinal 窗口。
- `Cmd+,` – 打开偏好设置。
- `Esc` – 隐藏 Cardinal 窗口。
- `ArrowUp`/`ArrowDown` – 上下移动选中项。
- `Shift+ArrowUp`/`Shift+ArrowDown` – 扩展选中范围。
- `Space` – 不离开 Cardinal 即可对当前行执行 Quick Look。
- `Cmd+O` – 打开选中的结果。
- `Cmd+R` – 在 Finder 中定位选中的结果。
- `Cmd+C` – 复制所选文件到剪贴板。
- `Cmd+Shift+C` – 复制所选路径到剪贴板。
- `Cmd+F` – 焦点回到搜索框。
- `ArrowUp`/`ArrowDown`（在搜索框内）– 浏览搜索历史。

祝你搜索愉快！

### 和原版的差异

- 参考windows下的everything对界面做了调整。
- 现在在编辑框输入回车键或者方向↓键，会选中下方结果list里的第一项了，如果list里有数据的话。
- 在list里按回车键，会直接打开当前高亮item的目标文件了。
- 双击结果list里的路径列的单元格，会打开该条item的路径的访达窗口了。

---

## 构建 Cardinal

### 环境要求

- macOS 12+
- Rust 工具链
- Node.js 18+（附 npm）
- Xcode 命令行工具和 Tauri 依赖（<https://tauri.app/start/prerequisites/>）

### 开发模式

```bash
cd cardinal
npm run tauri dev -- --release --features dev
```

### 生产构建

```bash
cd cardinal
npm run tauri build
```
