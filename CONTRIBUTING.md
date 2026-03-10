# 贡献者指南

感谢你有兴趣为 Obsidian Attachments Voyager 做出贡献！

---

## 1. 环境准备

### 必需工具

| 工具 | 版本要求 | 用途 |
|------|---------|------|
| Node.js | 18+ | 前端构建、测试 |
| npm | 8+ | 包管理 |
| Rust (rustc + cargo) | 1.70+ | 后端编译 |
| Git | 2.30+ | 版本控制 |

### 平台特定依赖

**Windows**：无额外依赖，安装 Node.js 和 Rust 即可。

**macOS**：
```bash
xcode-select --install
```

**Linux (Ubuntu/Debian)**：
```bash
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.0-dev build-essential curl wget file \
  libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### 验证环境

```bash
node -v && npm -v && rustc -V && cargo -V
```

四个命令都应该输出版本号，没有报错。

---

## 2. 获取代码

```bash
# Fork 本仓库后克隆你的 fork
git clone https://github.com/YOUR_USERNAME/Obsidian-attachments-voyager.git
cd Obsidian-attachments-voyager

# 安装前端依赖
npm install
```

---

## 3. 开发流程

### 启动开发模式

```bash
npm run tauri:dev
```

这会同时启动 Vite 前端热重载和 Tauri 后端。修改前端代码会即时刷新，修改 Rust 代码会自动重新编译。

### 仅测试前端

```bash
npm test                    # 运行全部前端测试
npx tsc -b --noEmit         # TypeScript 类型检查（不生成文件）
```

当前前端测试除了原有扫描/迁移/修复预览用例外，还新增了以下回归测试：
- `app-gallery-persistence.test.tsx`：验证附件总览在 Tab 切换、ScanPage 重新挂载后不会丢失 `allImages`
- `gallery-page.test.tsx`：验证附件总览预览弹层具备与扫描页一致的核心看图动作
- `sidebar-layout.test.ts`：验证侧边栏 CSS 支持纵向滚动

当前主工作区验证状态：
- `npm test` 已通过（9 个测试文件 / 16 个用例）
- `cargo test --manifest-path src-tauri/Cargo.toml` 已通过（40 个测试）
- `.worktrees/**` 已在 Vitest 配置中排除，不再污染主工作区测试收集

#### Windows ↔ Linux/Docker/WSL 切换注意（重要）

在 Windows 和 Linux（Docker/WSL）之间切换开发时，`node_modules` 中的原生二进制（rollup）不兼容，可能导致 `npm test` / `npm run build` 报错（例如缺少 `@rollup/rollup-linux-x64-gnu`）。

在当前平台重新安装依赖即可：

```bash
rm -rf node_modules
npm ci
```

#### Debian/Ubuntu 容器内后端测试依赖（Tauri v1 / WebKitGTK）

在 Linux 容器内跑 `cargo test` 需要系统依赖（WebKitGTK / GTK / libsoup / pkg-config）。Ubuntu/Debian 可参考：

```bash
sudo apt update && sudo apt install -y \
  pkg-config build-essential curl \
  libwebkit2gtk-4.0-dev libgtk-3-dev libsoup2.4-dev

# 使用 rustup 安装新版 Rust（推荐），并让当前 shell 生效
curl -fsSL https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"

cargo test --manifest-path src-tauri/Cargo.toml
```

### 后端命令安全边界

Tauri 命令里的前端参数（尤其是路径、文件名、storage key）**不能视为可信输入**。新增或修改后端命令时，请遵守以下规则：

1. **不要把前端字符串直接当成允许操作的依据**
   - 前端传来的路径只代表“用户意图”，不代表该路径一定允许访问。
   - 后端必须自行决定这个路径是否可读、可写、可删、可打开。

2. **区分三类路径边界**
   - **vault-bound 路径**：只允许当前 vault 内的文件（如扫描结果图片、Markdown、重命名/去重/转换目标）
   - **export-bound 路径**：允许写到 vault 外，但仅限用户明确选择的导出/备份目标
   - **app-private 路径**：只能位于 `voyager-data/` 目录内（本地设置、历史等）

3. **文件名和 key 不是路径**
   - `broken_image_name`、storage `key` 这类输入必须按 basename / 标识符处理
   - 不允许包含 `/`、`\\`、`..` 等路径语义

4. **优先写窄接口，不要暴露通用文件原语**
   - 类似 `write_text_file` 这类命令必须限制用途
   - 不要把“任意路径写入”暴露给前端作为通用能力

5. **优先做后端校验，而不是只靠前端约束**
   - 前端可以减少误操作
   - 真正的安全边界必须在 Rust 命令层落地

当前项目已经开始落地的第一批规则：
- `write_text_file` 仅允许导出到 `.json` / `.csv` / `.md`
- local storage key 仅允许 `[A-Za-z0-9_-]`
- 更多 vault 边界校验将继续补到 `rename_image`、`merge_duplicates`、`convert_images`、`fix_broken_with_file`、`open_file`、`backup_*` 等命令

### 仅测试后端

```bash
cd src-tauri
cargo test                  # Rust 单元测试
cargo clippy                # Lint 检查
cargo fmt --check           # 格式检查
```

### 生产构建

```bash
npm run tauri:build
```

> 首次构建约 5-15 分钟（Rust crate 下载 + 编译），后续增量构建快很多。

---

## 4. 项目架构

### 前端（`src/`）

- **React 19** + **TypeScript 5.9** + **Vite 7** + **Recharts 3.7**
- 组件在 `src/components/`，页面在 `src/pages/`，工具库在 `src/lib/`
- 测试在 `src/__tests__/`，使用 **Vitest** + **@testing-library/react** + **jsdom**
- 全局样式在 `src/index.css`（约 1301 行），使用 CSS 变量实现四套主题
- 与后端通信通过 `@tauri-apps/api` 的 `invoke()` 函数 + `listen()` 事件监听

#### 前端关键文件

| 文件 | 行数 | 职责 |
|------|------|------|
| `App.tsx` | ~142 | 根组件：LangContext 提供者、5 Tab 路由（scan/migrate/stats/gallery/help）、主题/语言设置管理 |
| `pages/ScanPage.tsx` | ~1082 | 扫描页主逻辑（扫描/修复/重命名/选择/过滤/导出/备份/全屏/右键菜单/Web Worker） |
| `pages/StatsPage.tsx` | ~332 | 统计图表页（7 种 Recharts 可视化，含 Broken 类型统计） |
| `pages/GalleryPage.tsx` | ~480 | 附件总览画廊（全部附件展示 + 空间分析仪表盘 + 图片预览弹窗 + 生成/清除缩略图 + 与扫描页接近一致的看图交互） |
| `pages/HelpPage.tsx` | ~80+ | 说明页（Obsidian 前提设置 + 功能导览 + 常见流程 + 快捷键） |
| `pages/MigratePage.tsx` | - | 笔记迁移页 |
| `components/TitleBar.tsx` | ~106 | 自定义标题栏：5 个 Tab + 语言切换 + 主题选择 + 窗口控制 |
| `components/Toolbar.tsx` | ~182 | 工具栏（扫描/修复/导出/备份下拉菜单） |
| `components/Sidebar.tsx` | - | 侧边栏（3 分类：Orphan/Misplaced/Broken + 搜索/文件类型/文件大小筛选） |
| `components/VirtualGallery.tsx` | - | 虚拟滚动画廊（readOnly + fillHeight props） |
| `components/GalleryCard.tsx` | - | 画廊卡片（broken 占位符 + readOnly 模式） |
| `components/DetailPanel.tsx` | - | 右侧详情面板（broken 展示 + 重命名按钮 + 打开引用笔记） |
| `components/StatusBar.tsx` | - | 底部状态栏 + 日志抽屉 |
| `components/ProgressBar.tsx` | ~50 | 扫描进度条（三阶段 + 不定进度动画） |
| `components/StatsCards.tsx` | ~40 | 附件总览统计卡片（总数/总大小/筛选结果） |
| `components/ConfirmDialog.tsx` | - | 确认对话框（body/confirmLabel/cancelLabel props） |
| `components/ContextMenu.tsx` | - | 右键菜单（broken 类型特供打开引用笔记/笔记目录） |
| `lib/i18n.ts` | ~900+ | 中英双语翻译模块（包含页面文案、上下文说明文案、Help 页导览内容） |
| `lib/filterUtils.ts` | ~48 | 共享过滤逻辑（主线程 + Web Worker 复用） |
| `lib/storage.ts` | - | 本地存储模块（exe 同目录文件存储 + 内存缓存） |
| `lib/export.ts` | - | 导出格式生成（JSON/CSV/Markdown，支持 Broken 类型） |
| `workers/filterWorker.ts` | ~6 | Web Worker 异步过滤（接收 FilterParams → filterIssues → postMessage） |
| `vite-env.d.ts` | ~6 | Vite `?worker` 导入的 TypeScript 类型声明 |
| `types.ts` | ~70 | 所有 TypeScript 类型定义（IssueType 含 broken、AttachmentInfo 等） |

### 后端（`src-tauri/src/`）

- **Rust 2021 Edition** + **Tauri v1.5** + **Rayon 1.10**（多线程并行） + **zip 0.6**（ZIP 打包） + **image 0.25**（图片处理）
- `main.rs`：21 个 Tauri 命令注册（`#[tauri::command]`），包含进度推送 + 备份 + 重命名 + 缩略图 + 去重 + 转格式 + 断链修复
- `scanner.rs`（344 行）：仓库扫描核心逻辑——Orphan/Misplaced/Broken 三种检测 + 增量扫描 + Rayon `par_iter()` 并行 MD 解析和缩略图生成 + allImages 收集
- `parser.rs`（148 行）：Markdown 图片链接提取——代码块预处理（围栏/行内）+ data URI 过滤 + Wiki Link & Markdown 双正则 + normalize_filename
- `models.rs`：`ScanIssue`、`ScanResult`、`ScanIndex`、`AttachmentInfo`、`DuplicateGroup`、`DuplicateFile`、`MergeSummary`、`ConvertSummary` 数据结构
- `ops_log.rs`（166 行）：操作历史 JSON 持久化（voyager-data/ops-history.json），支持 fix/migration/backup/rename 四种任务类型
- `thumb_cache.rs`（185 行）：三级 WebP 缩略图生成与缓存（哈希命名 + 级联缩放）
- `migrate.rs`（123 行）：笔记 + 附件整体搬家 + 冲突策略
- `fix_plan.rs`（87 行）：修复计划
- `runtime_log.rs`（71 行）：内存运行日志
- `startup_diag.rs`（85 行）：启动诊断（收集环境信息）

### 最近前端实现注意点

1. **Gallery 持久化**
   - `App.tsx` 中父级 `lastScanResult` 需要保留完整扫描结果里的 `allImages`
   - `ScanPage` 本地缓存会主动剥离 `allImages` 控制体积，因此不要让缓存版结果覆盖父级完整结果

2. **Gallery 与 Scan 预览一致性**
   - `GalleryPage` 与 `ScanPage` 都有图片预览覆盖层
   - 修改看图交互时，优先保持这两页在核心能力上接近一致：上一张/下一张、滚轮缩放、拖拽平移、100% 原始尺寸、全屏原图

3. **Tauri `listen()` 清理**
   - 事件监听清理不要假设返回值一定可直接调用
   - 当前 `ScanPage` 和 `GalleryPage` 都采用了更安全的 `typeof unlisten === 'function'` 判断

4. **Sidebar 布局**
   - 侧边栏在小窗口下必须允许纵向滚动
   - 相关 CSS 在 `src/index.css` 的 `.sidebar` 规则中维护

5. **Gallery 缩略图缓存分离**
   - 问题扫描页继续使用 `.voyager-gallery-cache`
   - 附件总览页独立使用 `.voyager-gallery-cache-all`
   - `GalleryPage` 的生成、清理、读取都应围绕 all-cache 命名空间维护
   - 不要再让 Gallery 依赖 issue-scope 的 `thumbnailPaths`

前端通过 `invoke('command_name', { params })` 调用后端 Rust 函数，返回 JSON 自动反序列化。所有命令定义在 `main.rs` 中。

全部 24 个命令：

| 命令 | 功能 |
|------|------|
| `scan_vault` | 扫描仓库（Orphan/Misplaced/Broken），返回问题列表 + allImages + scanIndex |
| `fix_issues` | 执行修复：移动 Misplaced、删除 Orphan、跳过 Broken |
| `rename_image` | 重命名图片文件 + 更新所有引用该文件名的 MD 文件 |
| `generate_all_thumbnails` | 批量生成问题/扫描图片的三级缩略图（Rayon 并行） |
| `generate_all_thumbnails_all` | 批量生成附件总览页 `.voyager-gallery-cache-all` 的三级缩略图 |
| `get_all_thumbnail_paths` | 查询一组原图在 `.voyager-gallery-cache-all` 中已有的缩略图路径 |
| `find_duplicates` | SHA-256 哈希查找重复图片（Rayon 并行），返回 `Vec<DuplicateGroup>` |
| `merge_duplicates` | 合并重复图片：删除 remove 文件，更新 MD 引用指向 keep 文件 |
| `convert_images` | 批量转格式（WebP/JPEG），Rayon 并行编码 + 更新 MD 引用 + 删除原文件 |
| `fix_broken_with_file` | 拖入图片修复断链：复制文件到 attachments 目录 |
| `list_operation_history` | 获取操作历史列表 |
| `execute_migration` | 笔记 + 附件连带迁移 |
| `open_file` / `open_file_parent` | 打开文件 / 在文件管理器中显示 |
| `clear_thumbnail_cache` | 清除问题/扫描缩略图缓存 |
| `clear_thumbnail_cache_all` | 清除附件总览页专用缩略图缓存 |
| `get_runtime_logs` | 获取运行日志 |
| `read_all_local_storage` | 读取本地设置 |
| `write_local_storage` | 写入本地设置 |
| `read_local_storage` / `remove_local_storage` | 读取/删除单个设置 |
| `write_text_file` | 写入导出文件 |
| `backup_selected_files` | 选中图片复制到目录 |
| `backup_selected_zip` | 选中图片打包 ZIP |

### 数据存储

- **用户设置/缓存**：存储在 exe 同目录的 `voyager-data/` 文件夹，每个 key 一个 `.json` 文件
- **操作历史**：持久化到 `voyager-data/ops-history.json`，启动时自动加载，重启后不丢失
- **缩略图缓存**：存储在 exe 同目录的 `.voyager-gallery-cache/`

### TypeScript 类型定义速查（`src/types.ts`）

```typescript
export type IssueType = 'orphan' | 'misplaced' | 'broken' | 'multi_ref_conflict' | 'target_conflict'

export interface AuditIssue {
  id: string
  type: IssueType
  mdPath?: string          // 引用此图片的 MD 文件路径（orphan 为空）
  imagePath: string        // 图片文件路径（broken 为裸文件名）
  reason: string
  suggestedTarget?: string
  thumbnailPath?: string
  thumbnailPaths?: { tiny?: string; small?: string; medium?: string }
  fileSize?: number
  fileMtime?: number
}

export interface AttachmentInfo {
  path: string; fileName: string; fileSize: number; fileMtime: number
}

export interface ScanIndex {
  files: Record<string, number>      // 文件路径 → mtime
  mdRefs: Record<string, string[]>   // MD 路径 → 引用的图片文件名列表
}

export interface ScanResult {
  totalMd: number
  totalImages: number
  issues: AuditIssue[]
  scanIndex: ScanIndex
  allImages?: AttachmentInfo[]  // 全部附件信息（缓存时剔除以控制体积）
}

export type Lang = 'zh' | 'en'
export type GalleryDisplayMode = 'thumbnail' | 'rawImage' | 'noImage'
export type SizeFilter = 'all' | 'small' | 'medium' | 'large'
export type ThemeMode = 'auto' | 'light' | 'dark' | 'parchment'
export type ConflictPolicy = 'promptEach' | 'overwriteAll' | 'renameAll'
```

---

## 5. 代码规范

### 前端 (TypeScript/React)

- 严格模式（`strict: true`）
- 尽量不用 `any`，优先使用明确的类型
- 组件用 PascalCase，文件名与组件名一致
- 新组件放 `src/components/`，页面级放 `src/pages/`
- CSS 不用 CSS-in-JS，统一写在 `src/index.css`，使用 `var(--xxx)` 主题变量
- 提交前运行 `npx tsc -b --noEmit` 确保无类型错误

### 后端 (Rust)

- 提交前运行 `cargo fmt` 格式化
- 提交前运行 `cargo clippy` 检查 lint
- 新的 Tauri 命令必须在 `main.rs` 的 `generate_handler![]` 中注册
- 数据结构加 `#[serde(rename_all = "camelCase")]` 保证前后端字段名匹配
- 不要 `unwrap()`，使用 `?` 或 `.map_err()` 传播错误
- 并行环境（Rayon `par_iter()`）中使用 `.unwrap_or_default()` 而非 `?`

### 主题兼容

- 所有颜色使用 CSS 变量（`var(--text-main)` 等），不要硬编码颜色值
- 全屏图片查看器是例外，保持黑底
- 新增 CSS 变量需要在 `:root`、`[data-theme="light"]`、`[data-theme="dark"]`、`[data-theme="parchment"]` 四个块中都定义

---

## 6. 测试

当前前端测试文件包括：

| 文件 | 内容 |
|------|------|
| `smoke.test.ts` | App 渲染、品牌名显示 |
| `scan-page.test.tsx` | 目录选择、扫描、修复、全选、扫描页说明文案 |
| `fix-preview.test.tsx` | 修复前确认对话框 |
| `migrate-page.test.tsx` | 迁移页交互与说明文案 |
| `app-gallery-persistence.test.tsx` | Gallery 数据在 Tab 往返后的持久化 |
| `gallery-page.test.tsx` | Gallery 预览动作、Gallery all-cache 命令与读取路径 |
| `sidebar-layout.test.ts` | Sidebar 在小窗口下的纵向滚动 |
| `types-contract.test.ts` | 前后端字段兼容性 |
| `cargo-custom-protocol.test.ts` | Cargo/Tauri 特性检查 |

运行测试：
```bash
npm test
```

注意：当前 `vite.config.ts` 已显式排除 `.worktrees/**`，主工作区执行 `npm test` 不应再收集 worktree 内的测试。如果你后来调整了 Vitest 配置，记得保留这条排除规则。

### 测试注意事项

- 测试环境是 jsdom，需要 mock **四个** Tauri API 模块：
  - `@tauri-apps/api/tauri` — `invoke` 和 `convertFileSrc`
  - `@tauri-apps/api/window` — `appWindow` 对象
  - `@tauri-apps/api/dialog` — `open` 和 `save` 函数
  - `@tauri-apps/api/event` — `listen` 函数（**不 mock 会导致测试挂掉**）
- `invoke` mock 需要根据命令名返回不同数据，特别是 `read_all_local_storage` **必须返回 `{}`（对象）**，不能返回 `[]`（数组），否则 `initStorage` 解析失败
- `scan_vault` mock 必须返回完整结构，包含 `scanIndex: { files: {}, mdRefs: {} }`
- `listen` mock 必须返回 `Promise.resolve(() => {})`（一个返回 unlisten 函数的 Promise）
- `window.matchMedia` 在 jsdom 中不存在，需要在 `beforeEach` 中 mock
- `ResizeObserver` 同样需要 mock
- `selectedIssueIds` 在 ScanPage 中是 `Set<string>` 类型（不是数组），VirtualGallery 的 props 也对应为 `Set<string>`
- 图片 `src` 断言应使用 `.toContain()` 而非精确匹配，因为 URL 末尾有 `?v={scanVersion}`

#### 测试 Mock 完整示例

```typescript
// 所有测试文件都需要以下四个 mock
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === 'read_all_local_storage') return Promise.resolve({})
    if (cmd === 'scan_vault') return Promise.resolve({
      totalMd: 0, totalImages: 0, issues: [],
      scanIndex: { files: {}, mdRefs: {} },
      allImages: [],
    })
    return Promise.resolve([])
  }),
  convertFileSrc: (p: string) => `tauri-file://${p}`,
}))

vi.mock('@tauri-apps/api/dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}))

vi.mock('@tauri-apps/api/window', () => ({
  appWindow: {
    isMaximized: () => Promise.resolve(false),
    isFullscreen: () => Promise.resolve(false),
    setFullscreen: () => Promise.resolve(),
    minimize: () => Promise.resolve(),
    toggleMaximize: () => Promise.resolve(),
    close: () => Promise.resolve(),
    onResized: () => Promise.resolve(() => {}),
  },
}))
```

---

## 7. 提交 PR

1. **Fork** 本仓库
2. **创建分支**：`git checkout -b feature/your-feature` 或 `fix/bug-description`
3. **开发并测试**：确保 `npm test` 全部通过，`npx tsc -b --noEmit` 无错误
4. **提交**：一次提交只做一件事，Commit message 描述清晰
5. **推送**：`git push origin feature/your-feature`
6. **创建 PR**：在 GitHub 上点击 "Compare & pull request"

### PR 检查清单

- [ ] `npx tsc -b --noEmit` 通过
- [ ] `npm test` 全部通过
- [ ] `cargo test`（如果改了 Rust 代码）通过
- [ ] `cargo fmt --check` 无格式问题
- [ ] 没有升级 Tauri 版本
- [ ] 没有硬编码颜色（使用 CSS 变量）
- [ ] 新功能有对应测试或说明
- [ ] 新增 UI 文本有对应的中英文 i18n 翻译键

---

## 8. 安全原则

本工具操作用户的本地文件，**数据安全是最高优先级**：

- **只读先行**：任何删除/移动操作必须先扫描预览，用户确认后才执行
- **操作可追溯**：所有修复、重命名、备份操作记录在操作历史中（持久化到 JSON），用于审计和追溯。修复操作执行后无法自动撤回，UI 会提醒用户提前备份
- **出错即停**：批量操作遇到错误立即停止并报告，不吞错误继续
- **不要 `unwrap()`**：Rust 代码中文件操作使用 `?` 或 `.map_err()` 传播错误，避免 panic

---

## 9. 重要提醒

### 不要升级 Tauri 版本
项目锁定 Tauri v1.5.0，因为 v2 要求 glib-2.0 >= 2.70，很多 Linux 环境不满足。

### Docker/WSL 切换注意
在 Windows 和 Linux 之间切换开发时，`node_modules` 中的原生二进制（rollup）不兼容：
```bash
rm -rf node_modules && npm install
```
每次切换平台后都需要重新安装。这是 rollup 原生 addon 的已知问题。

### localStorage 已被替换
项目不使用浏览器 localStorage，而是通过 Rust 后端将数据存储在 exe 同目录的 `voyager-data/` 文件夹。前端通过 `src/lib/storage.ts` 模块操作。

### 扫描结果缓存键版本
当前缓存键为 **`voyager-cached-scan-result-v5`**。**如果修改了 `ScanResult`/`ScanIssue`（Rust）或 `AuditIssue`/`AttachmentInfo`（TypeScript）的数据结构，必须 bump 缓存版本号**（v5 → v6），否则旧缓存数据会导致新字段为 undefined。

版本历史：
- v1 → v2：添加 `fileSize` 字段
- v2 → v3：添加 `fileMtime` 字段
- v3 → v4：添加 `scanIndex`（ScanIndex）字段到 ScanResult
- v4 → v5：添加 `allImages`（AttachmentInfo[]）字段 + `broken` issue 类型

### 问题类型（IssueType）

当前支持的问题类型：

| 类型 | 含义 | 修复行为 |
|------|------|---------|
| `orphan` | 没有被任何 MD 引用的附件图片 | 删除文件 |
| `misplaced` | 图片未存放在引用它的 MD 旁的 attachments/ 中 | 移动到正确位置 |
| `broken` | MD 引用了磁盘上不存在的图片 | 跳过（无法自动修复） |
| `multi_ref_conflict` | （预留）多个 MD 引用冲突 | 未实现 |
| `target_conflict` | （预留）目标路径冲突 | 未实现 |

新增问题类型时需要同步更新：
1. `src-tauri/src/scanner.rs` — 后端检测逻辑
2. `src/types.ts` — `IssueType` 类型
3. `src/components/Sidebar.tsx` — 分类按钮
4. `src/pages/ScanPage.tsx` — Tab 切换和过滤
5. `src/components/GalleryCard.tsx` — 卡片展示
6. `src/components/DetailPanel.tsx` — 详情面板
7. `src/pages/StatsPage.tsx` — 统计图表
8. `src/lib/i18n.ts` — 中英翻译键
9. `src/lib/export.ts` — 导出格式

### Markdown 解析预处理
- `parser.rs` 在正则匹配前会先剥离围栏代码块（```/~~~）和行内代码（反引号）
- data URI（`data:image/...`）和 HTTP/HTTPS 外部链接自动跳过
- 新增解析规则时需确保代码块内的内容不会被误识别

### 断链检测注意事项
- `.trash` 目录中的 MD 文件自动跳过断链检测（`is_trash_markdown` 函数）
- `broken` issue 的 `image_path` 存裸文件名（非真实路径），因为文件不存在
- `broken` issue 的 `md_path` 存引用笔记路径
- 缩略图生成阶段自动过滤掉 `broken` 类型（`i.r#type != "broken"`）

### 重命名功能注意事项
- `rename_image` 命令利用前端传入的 `md_refs`（来自 ScanIndex）反向查找引用
- `replace_image_refs_in_md` 使用双正则分别匹配 Wiki Link 和 Markdown 语法
- `regex::escape(old_name)` 处理文件名中的特殊字符
- 替换保留路径前缀和别名后缀，只替换文件名部分
- 操作记录到 ops_log（任务类型 `"rename"`）

### 附件总览画廊注意事项
- `ScanResult.allImages` 包含仓库全部附件，缓存时需剔除以控制体积
- `GalleryPage` 通过 `toDisplayItem()` 将 `AttachmentInfo` 适配为 `AuditIssue` 格式复用画廊
- `VirtualGallery` 的 `readOnly` prop 隐藏选中相关 UI，但点击卡片/图片仍会打开预览弹窗
- 预览弹窗（Lightbox）支持左右方向键切换、ESC 关闭、打开文件/目录
- `generate_all_thumbnails` 是独立命令，与 `scan_vault` 的缩略图生成分离

### i18n（国际化）
- 翻译模块在 `src/lib/i18n.ts`，包含 200+ 翻译键值（zh/en）
- 使用 React Context（`LangContext` + `useLang()` hook），无外部依赖
- `UiSettings` 中新增 `lang: Lang` 字段（`Lang = 'zh' | 'en'`）
- 新增/修改 UI 文本时，**必须在 `i18n.ts` 中添加对应的中英文翻译**
- `export.ts` 导出函数接受 `lang` 参数
- 翻译键按功能模块分组（TitleBar/Sidebar/Toolbar/ScanPage/GalleryPage/HelpPage 等）

### 增量扫描
- `scan_vault` 命令接受 `prev_index: Option<ScanIndex>` 参数
- `ScanIndex` 包含 `files`（路径→mtime）和 `mdRefs`（MD路径→引用列表）
- 后端比对 mtime，跳过未变化的 MD 文件，复用上次的引用数据
- `ScanResult` 返回值中包含 `scanIndex` 字段

### 图片缓存刷新
- `ScanPage` 和 `GalleryPage` 维护 `scanVersion` 状态，每次扫描或清除缓存后递增
- 所有图片/缩略图 URL 追加 `?v={scanVersion}` 查询参数
- 测试中图片 `src` 断言应使用 `.toContain()` 而非精确匹配（因 URL 末尾有 `?v=N`）

### 缩略图格式
缩略图使用 WebP 格式（不是 PNG），缓存文件扩展名为 `.webp`。如果之前有旧的 PNG 缓存，需要在设置中点击「清除缩略图缓存」让系统重新生成 WebP 版本。

### Rayon 并行 MD 解析
- `scanner.rs` 中 MD 文件读取+引用解析使用 `par_iter()` 多线程并行
- 每个文件返回 `(md_key, mtime, refs)` 元组，避免共享可变状态
- `AtomicUsize` 原子计数器实现无锁进度回调（每 100 个文件一次）
- 文件读取失败使用 `.unwrap_or_default()` 而非 `?`，不中断整个扫描
- `collect()` 完成后单线程顺序合并到 `referenced_filenames`、`references`、`new_md_refs`
- ScanIndex 构建阶段复用 `parsed` 中已获取的 mtime，避免重复 `fs::metadata()` 调用

### 一键备份
- 后端两个命令：`backup_selected_files`（复制到目录）、`backup_selected_zip`（ZIP 打包）
- 文件名冲突自动重命名：`stem (1).ext`、`stem (2).ext`、...
- ZIP 模式使用 `zip` crate v0.6，Deflate 压缩，`HashSet` 检测 ZIP 内文件名冲突
- 两种模式都通过 `ops_log::create_task()` + `save_task()` 记录操作历史
- 前端 `Toolbar.tsx` 新增备份下拉菜单（仅 `selectedCount > 0` 时显示）

### Web Worker 过滤
- `src/workers/filterWorker.ts`（6 行）：接收 `FilterParams` → `filterIssues()` → `postMessage`
- `src/lib/filterUtils.ts`（48 行）：主线程和 Worker 共享的过滤逻辑
- ScanPage 和 GalleryPage 双路架构：`WORKER_THRESHOLD = 5000`，小数据集同步 `useMemo`，大数据集异步 Worker
- `extGroupMap` 使用 `Record<string, string>` 而非 `Map`（因为 `Map` 不能通过 `postMessage` 序列化）
- Vite `?worker` 导入需要 `src/vite-env.d.ts` 中的类型声明
- **测试兼容**：jsdom 没有 `Worker`，创建包裹在 `try/catch` 中，失败时自动回退到同步路径，无需额外 mock
- 如果修改 `FilterParams` 接口或 `filterIssues` 函数，需同时检查 Worker 和主线程两条路径

### 应用图标生成
- `scripts/generate-icons.mjs`：内联 SVG 定义，使用 `sharp` 转换为 14 种 PNG 尺寸 + `png-to-ico` 生成 ICO
- 运行 `npm run generate-icons` 重新生成所有图标到 `src-tauri/icons/`
- `sharp` 和 `png-to-ico` 为 devDependencies（仅开发时需要）
- macOS `icon.icns` 需要在 macOS 上使用 `iconutil` 手动生成

### 用户指南
- `docs/user-guide-zh.md`：中文用户指南（9 章，面向最终用户）
- `docs/user-guide-en.md`：英文用户指南（结构对应）
- 新增/修改用户可见功能时，应同步更新用户指南

---

感谢你的贡献！
