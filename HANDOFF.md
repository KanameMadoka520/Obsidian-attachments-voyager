# Obsidian Attachments Voyager - 开发交接（Handoff）

> 最后更新：2026-03-09

## 项目概览

这是一个基于 **Tauri v1.5** 的桌面应用，用于审计、管理和迁移 Obsidian 仓库中的图片附件。技术栈：**Rust 2021 + React 19 + TypeScript 5.9 + Vite 7**。

**核心问题**：Obsidian 仓库长期积累会出现孤立附件（Orphan）、错位附件（Misplaced）、断链引用（Broken）等问题。本工具负责扫描、可视化，并提供批量修复能力。

---

## 当前状态

### 下一次会话快速开始

如果你是接手该项目的下一位开发者，建议按以下顺序进行：

1. **先读本文件**，了解哪些功能已经实现但仍未提交。
2. **先确认主工作区的验证状态**（不要在测试没跑通时贸然改动）：
   - `npm run build` 当前可通过。
   - `npm test` 当前可通过（Vitest 已排除 `.worktrees/**`）。
   - `cargo test --manifest-path src-tauri/Cargo.toml` 当前可通过。
   - `npm run tauri:build` 当前可通过（Windows 下可产出 MSI + NSIS）。
3. **从这些文件开始定位最近的修复与变更**：
   - `src/App.tsx` — 父组件持有扫描结果，确保 `allImages` 在 Tab 切换后不丢。
   - `src/pages/GalleryPage.tsx` — Gallery all-cache 命令、预览一致性、引导文案。
   - `src/components/GalleryCard.tsx` — 缩略图模式使用 all-cache 命名空间解析路径。
   - `src-tauri/src/thumb_cache.rs` — issue-scope 与 all-scope 缓存分离。
   - `src-tauri/src/main.rs` — Gallery all-cache 相关 Tauri 命令。
   - `src/index.css` — Sidebar 纵向滚动。
4. **如果你在排查 Gallery 缩略图**，按如下链路逐项核对：
   - 生成命令：`generate_all_thumbnails_all`
   - 查询路径：`get_all_thumbnail_paths`
   - 清除缓存：`clear_thumbnail_cache_all`
   - 缓存根目录：`.voyager-gallery-cache-all`
5. **不要再假设 ScanPage 与 GalleryPage 共用缩略图路径**：
   - 扫描/问题缩略图缓存：`.voyager-gallery-cache`
   - 附件总览 all-images 缩略图缓存：`.voyager-gallery-cache-all`
6. **在改动文档或测试前**，先对照当前命令列表与 `src/__tests__/` 的真实内容。

### 验证快照

#### 安全加固说明（新增）
- `src-tauri/src/main.rs` 已对高风险命令面做了第一轮后端加固。
- `write_text_file` 不再是任意路径写入：仅允许导出 `.json` / `.csv` / `.md`。
- 本地存储命令（`read_local_storage` / `write_local_storage` / `remove_local_storage`）会校验 key，拒绝带路径语义的输入；允许字符集为 `[A-Za-z0-9_-]`。
- `fix_broken_with_file` 会拒绝 path-like 的 broken 文件名，并要求 `md_path` 必须在 vault 内。
- `rename_image`、`merge_duplicates`、`convert_images`、`open_file` / `open_file_parent`、`backup_*` 等命令均增加了 vault 边界校验。
- `scan_vault` 会拒绝缺失/符号链接 root，并跳过 `.git`、`node_modules`、`.worktrees` 等工作区目录。
- `find_duplicates` 现在先按文件大小预分组，仅对重复大小候选做哈希，减少无效 IO 与哈希计算。
- `convert_images` 现在会在目标已存在时跳过、以临时文件写入并在必要时回滚 Markdown 更新，降低部分写入风险。
- `backup_selected_zip` 现在流式写入 ZIP，不再整文件读入内存。
- 安全设计与实现文档位于：
  - `docs/plans/2026-03-07-security-hardening-design.md`
  - `docs/plans/2026-03-07-security-hardening.md`

#### 主工作区验证结果
- `npm run build` 通过。
- `npm test` 通过（10 个测试文件 / 21 个用例）。
- `cargo test --manifest-path src-tauri/Cargo.toml` 通过（46 个测试）。
- `npm run tauri:build` 通过（当前环境已验证 Debian 12 下可产出 `.deb` / `.rpm` / `.AppImage`；历史记录中 Windows 下可产出 MSI + NSIS）。
- 前端回归测试覆盖（通过）：
  - `app-gallery-persistence.test.tsx`
  - `gallery-page.test.tsx`
  - `sidebar-layout.test.ts`

#### 跨系统验证注意事项（Windows ↔ Linux/Docker/WSL）
- `node_modules` **无法跨操作系统复用**（rollup 原生可选依赖会不匹配）。如果切换 OS 后 `npm test` / `npm run build` 失败，请在当前 OS 重新安装依赖：`rm -rf node_modules && npm ci`。
- 在 Debian / Ubuntu 容器内跑 Rust 后端测试需要 WebKitGTK / GTK / libsoup 等系统依赖，并建议使用 rustup 安装较新的 Cargo。
- Linux/Tauri 构建现已通过仓库内 patch 固化：`src-tauri/Cargo.toml` 使用 `[patch.crates-io]` 指向 `src-tauri/vendor/wry/`。该 vendored `wry` 包含一处 WebKitGTK trait 导入修复，用于保证 Debian 12 环境下 `cargo test` 可通过；在未确认上游依赖已修复并完成回归前，不要移除此 patch。
  - 维护说明见：`docs/maintenance/wry-linux-patch.md`
- 下一阶段路线设计已落文档：`docs/plans/2026-03-14-next-phase-roadmap-design.md`

#### 仍需关注（非阻塞）
- 当前已通过页面级懒加载消除主入口的 Vite chunk-size warning；后续如继续扩展图表/画廊功能，仍建议关注 bundle 体积，优先保持非首屏页面按需加载。

### 已完成阶段

| 阶段 | 描述 | 状态 |
|------|------|------|
| 1 | Layout overhaul: TitleBar, Sidebar, Toolbar, DetailPanel, StatusBar | 已提交 |
| 2 | Scan page restructure, three-panel layout | 已提交 |
| 3 | Tooltip hint for thumbnail checkbox | 已提交 |
| 4 | Selective fix implementation | 已提交 |
| 5 | Gallery + thumbnails + cache clear | 已提交 |
| 6 | Rayon parallel thumbnails, WebP, progress bar, stats page | 已提交 |
| 7 | Undo removal, history persistence, incremental scan, cascade thumbnails, i18n | 已提交 |
| 8 | Broken detection, batch rename, parser preprocessing | **已实现，未提交** |
| 9 | Gallery preview overlay (Lightbox), Help page, user guides | **已实现，未提交** |
| 10 | One-click backup all, dedup merge, convert format, health score, drag-fix broken, keyboard shortcuts | **已实现，未提交** |
| 11 | In-app feature guidance, Gallery persistence fixes, preview parity, sidebar scroll | **已实现，未提交** |

### 未提交改动

Phase 8–11 的代码已存在于工作区，但尚未提交。

#### 交接说明（可直接转给下一位开发者）

- 当前工作区的自动化验证已通过：`npm test`（10 个测试文件 / 21 个用例）与 `cargo test --manifest-path src-tauri/Cargo.toml`（46 个测试）。
- `HANDOFF.md`、`README.md`、`CONTRIBUTING.md` 已同步更新；下一步请优先查看本文件中的「下一步清单（推荐）」。
- 当前最值得优先做的后续工作不是继续改代码，而是执行 smoke checklist，并按建议拆分 Phase 8–11 的未提交改动。
- Broken 拖拽修复已明确列为延后高风险检查项；当前实现依赖 `File.path`，需要在 Windows 真机/Tauri 环境手工验证。
- 如在 Windows 与 Linux / Docker / WSL 之间切换开发，请重新安装当前 OS 对应的 `node_modules`，不要跨系统复用。
- `.gitignore` 已补齐运行时缓存、本地工作目录与临时文件规则；后续整理提交时，请额外检查是否存在“历史上已被 Git 跟踪、现在虽已 ignore 但仍留在索引里”的文件（例如 `tsconfig.tsbuildinfo`），必要时将其从索引移出。

### 下一步清单（推荐）

把这份清单作为下一次会话的任务列表，目标是让分支达到“可评审 / 可合并 / 可发布”的状态。

#### 0) 跨系统卫生（Windows ↔ Linux/Docker/WSL）
- [ ] 如果你在不同 OS 间切换过：在当前 OS 重新安装前端依赖：`rm -rf node_modules && npm ci`

#### 1) 先跑通验证（任何提交前必须绿）
- [ ] `npm test`（期望：10 个测试文件 / 21 个用例）
- [ ] `npm run build`（期望：成功；当前主工作区已无 Vite chunk-size warning）
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml`（期望：46 个测试）

#### 1.5) 手工验收烟雾测试（推荐）
- [ ] 备份（目录 + zip）：选中几张非 broken 图片执行备份流程；核对输出与操作历史。
- [ ] 打开文件 / 目录：确认只能打开 vault 内路径（broken 不应出现打开图片文件入口）。
- [ ] 去重合并：执行 find duplicates → merge；确认 MD 引用更新且重复文件删除。
- [ ] 转格式：对少量选中图片转格式；确认输出与 MD 引用更新。
- [ ] Gallery all-cache：生成 / 查询 / 清除 `.voyager-gallery-cache-all`，并确认 Tab 切换后 allImages 不丢。

#### 1.6) 延后 / 高风险检查：Broken 拖拽修复
- [ ] 在 Windows 上验证 Broken 拖拽修复：选中 broken issue → 将图片拖入 DetailPanel → 确认能拿到 dropped file path 且后端修复成功。
  - 说明：当前前端使用 `(files[0] as File & { path?: string }).path`，行为可能依赖平台 / WebView。

#### 2) Phase 8–11 的提交策略（避免一个超级大提交）
- [ ] 拆分为 3–6 个聚焦提交（建议分组）：
  - [ ] 安全加固（Rust 命令边界校验 + 单测）
  - [ ] Gallery all-cache 分离 + 预览一致性
  - [ ] 备份 / 去重 / 转格式功能
  - [ ] 引导文案 + i18n 扩展
  - [ ] 前端回归测试
  - [ ] 文档 / 用户指南更新

#### 3) Release / CI 验证（可选但推荐）
- [ ] Windows 跑 `npm run tauri:build`（MSI / NSIS）
- [ ] 如准备发布：打 tag 并触发 GitHub release workflow：`git tag vX.Y.Z && git push --tags`

---

#### 最近完成的前端体验与修复

- `src/App.tsx` — preserve `allImages` in parent state so Gallery does not lose data after tab switching
- `src/pages/GalleryPage.tsx` — added page-level guidance copy, fixed thumbnail-generation event cleanup, upgraded preview overlay to match ScanPage core viewing actions (zoom/reset/100%/fullscreen), improved gallery interaction consistency, and moved Gallery thumbnail generation/read/clear behavior to the dedicated `.voyager-gallery-cache-all` namespace
- `src/pages/HelpPage.tsx` — expanded from prerequisite-only content into a fuller usage/help center
- `src/pages/StatsPage.tsx` — added page-level explanation for latest-scan stats and health-score interpretation
- `src/pages/ScanPage.tsx` — added workflow guidance banner above main panels
- `src/components/Sidebar.tsx` — added contextual filter guidance
- `src/components/DetailPanel.tsx` — added empty-state guidance when no issue is selected
- `src/components/StatusBar.tsx` — added explanation distinguishing runtime logs from operation history
- `src/index.css` — sidebar now supports vertical scrolling in constrained window sizes
- `src/lib/i18n.ts` — expanded bilingual UI/help copy for contextual guidance and Help page sections

#### New regression tests added

- `src/__tests__/app-gallery-persistence.test.tsx` — ensures Gallery retains attachment overview data after tab switches that remount ScanPage
- `src/__tests__/gallery-page.test.tsx` — ensures Gallery preview exposes the same core image-viewing actions as Scan preview
- `src/__tests__/sidebar-layout.test.ts` — ensures sidebar CSS enables vertical scrolling

#### Existing Phase 8–10 feature files still relevant

**Rust backend:**
- `src-tauri/src/main.rs` — rename, duplicate merge, convert format, drag-fix broken, backup, thumbnail commands; now includes Gallery-specific all-cache thumbnail commands
- `src-tauri/src/scanner.rs` — Broken issue detection, `.trash` skip, `allImages` collection
- `src-tauri/src/parser.rs` — `strip_code()`, data URI / HTTP skip
- `src-tauri/src/models.rs` — `all_images` and duplicate/convert result types
- `src-tauri/src/thumb_cache.rs` — issue-scope and all-scope thumbnail cache separation (`.voyager-gallery-cache` vs `.voyager-gallery-cache-all`)

**Frontend:**
- `src/pages/GalleryPage.tsx` — attachment overview, preview overlay, thumbnail generation/cache clear, filterable read-only gallery
- `src/pages/HelpPage.tsx` — expanded in-app help center
- `src/pages/StatsPage.tsx` — charts + health score + new guidance copy
- `src/pages/ScanPage.tsx` — scan/fix/backup/dedup/convert workflow + new guidance copy
- `src/types.ts` — `'broken'` issue type, `AttachmentInfo`
- `src/lib/i18n.ts` — expanded translation surface
- `src/lib/filterUtils.ts` / `src/workers/filterWorker.ts` — dual-path filtering
- `src/components/VirtualGallery.tsx` — `readOnly` / `fillHeight`
- `src/components/GalleryCard.tsx`, `Sidebar.tsx`, `DetailPanel.tsx`, `StatusBar.tsx`, `Toolbar.tsx` — updated feature and guidance support

**Docs:**
- `docs/user-guide-en.md`, `docs/user-guide-zh.md`
- `README.md`, `CONTRIBUTING.md`, `HANDOFF.md`

---

## Architecture

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop runtime | Tauri | 1.5 |
| Backend | Rust | 2021 edition |
| Frontend | React | 19 |
| Build tool | Vite | 7 |
| TypeScript | | 5.9 |
| Parallel processing | Rayon | 1.10 |
| Image processing | image crate | 0.25 |
| Virtual scrolling | @tanstack/react-virtual | 3.x |
| Charts | Recharts | 3.x |
| Archiving | zip crate | 0.6 |
| Hashing | sha2 crate | 0.10 |

### File Map

```
src-tauri/src/
  main.rs        (expanded)   — 28 Tauri commands, IPC entry points
  scanner.rs     (343 lines)  — vault scanning, issue detection
  parser.rs      (147 lines)  — Markdown image ref extraction
  models.rs      (44 lines)   — shared structs (ScanIssue, ScanResult, etc.)
  diagnostic_log.rs (new)     — misplaced fix verification JSONL diagnostics
  thumb_cache.rs (185 lines)  — 3-tier WebP thumbnail generation
  ops_log.rs     (166 lines)  — operation history persistence
  migrate.rs     (expanded)   — note migration + descendant attachments preprocessing
  fix_plan.rs    (87 lines)   — fix plan generation
  runtime_log.rs (71 lines)   — runtime logging
  startup_diag.rs(85 lines)   — startup diagnostics

src/
  App.tsx        (141 lines)  — app shell with tab routing
  types.ts       (69 lines)   — TypeScript type definitions
  main.tsx       (9 lines)    — React entry point

src/pages/
  ScanPage.tsx   (1180 lines) — main scan + issue management page
  GalleryPage.tsx(491 lines)  — attachment gallery with preview overlay
  StatsPage.tsx  (340 lines)  — vault statistics and charts
  MigratePage.tsx(expanded)   — migration + preprocessing workspace
  HelpPage.tsx   (46 lines)   — keyboard shortcuts and help

src/components/
  IssuesTable.tsx    (218 lines) — virtual scrolling issue table
  Toolbar.tsx        (182 lines) — vault config and action bar
  Sidebar.tsx        (165 lines) — category navigation and search
  GalleryCard.tsx    (159 lines) — gallery thumbnail/image card
  DetailPanel.tsx    (129 lines) — image detail sidebar
  VirtualGallery.tsx (125 lines) — virtualized gallery grid
  StatusBar.tsx      (128 lines) — expandable log drawer
  TitleBar.tsx       (105 lines) — custom title bar with window controls
  ContextMenu.tsx    (64 lines)  — right-click context menu
  ProgressBar.tsx    (53 lines)  — scan/thumbnail progress
  WorkLogPanel.tsx   (36 lines)  — work log display
  StatsCards.tsx     (39 lines)  — stats summary cards
  MigratePlanTable   (37 lines)  — migration plan table
  ConfirmDialog.tsx  (40 lines)  — confirmation modal

src/lib/
  i18n.ts        (862 lines) — Chinese/English translations
  filterUtils.ts (48 lines)  — dual-path filter (sync/Worker)
  export.ts      (50 lines)  — CSV/JSON export
  commands.ts    (17 lines)  — Tauri command wrappers
  storage.ts     (29 lines)  — localStorage helpers

src/__tests__/          — 9 test files (Vitest)
src/workers/            — Web Worker for large dataset filtering
```

Total: ~2,040 lines Rust, ~7,012 lines TypeScript/TSX

### 24 Tauri Commands

| Command | Purpose |
|---------|---------|
| `scan_vault` | Full vault scan → orphan/misplaced/broken issues |
| `scan_vault_incremental` | Incremental scan using ScanIndex (mtime cache) |
| `get_fix_plan` | Generate fix plan for selected issues |
| `apply_fixes` | Execute fix plan (move/delete) |
| `get_migrate_plan` | 生成迁移计划 |
| `apply_migration` | 执行迁移 |
| `generate_thumbnail` | 单张图片 → 三级 WebP 缩略图 |
| `generate_all_thumbnails` | 为 issue/scan 缓存并行批量生成缩略图 |
| `generate_all_thumbnails_all` | 为 Gallery all-cache 并行批量生成缩略图 |
| `clear_thumbnail_cache` | 清除 issue/scan 缩略图缓存 |
| `clear_thumbnail_cache_all` | 清除 Gallery all-cache 缩略图缓存 |
| `read_image_base64` | 以 base64 读取图片文件 |
| `open_file` | 用系统默认程序打开文件 |
| `open_file_parent` | 打开所在目录 |
| `rename_image` | 重命名图片并更新所有 Markdown 引用 |
| `backup_selected_files` | 将选中文件复制到备份目录 |
| `backup_selected_zip` | 将选中文件打包为 ZIP |
| `list_operation_history` | 获取操作历史 |
| `get_all_images` | 列出 vault 中全部图片附件 |
| `get_all_thumbnail_paths` | 为一组原图解析已有的 Gallery all-cache 缩略图路径 |
| `find_duplicates` | 基于 SHA-256 的重复图片检测（Rayon 并行） |
| `merge_duplicates` | 删除重复文件并把 Markdown 引用更新到保留文件 |
| `convert_images` | 批量转格式（WebP/JPEG）并更新 Markdown 引用 |
| `fix_broken_with_file` | 将拖入文件复制到 attachments 目录以修复断链 |

### 三种问题类型

| 类型 | 检测位置 | 判定条件 |
|------|----------|----------|
| **Orphan** | `scanner.rs` | 图片文件存在，但没有任何 `.md` 引用它 |
| **Misplaced** | `scanner.rs` | 图片不在预期的附件目录中 |
| **Broken** | `scanner.rs` | `.md` 引用了磁盘上不存在的图片 |

### 关键算法

1. **解析器预处理**（`parser.rs`）：在正则提取图片引用前，先剥离围栏/行内代码块，并跳过 `data:` URI 与 `http(s)://` 外链。

2. **增量扫描**（`scanner.rs`）：`ScanIndex` 缓存文件 mtime 与解析出的图片引用；重复扫描时仅重新解析变更文件。

3. **缩略图级联生成**（`thumb_cache.rs`）：三级缩略图（64/256/1024px WebP）；每一级都从更大的一级缩放，而不是每次都从原图解码；缓存文件名使用哈希。

4. **批量重命名**（`main.rs`）：`replace_image_refs_in_md()` 使用双正则，同时兼容 `![[wiki|alias]]` 与 `![alt](path)` 两种语法，并保留路径前缀和别名。

5. **双路径过滤**（`filterUtils.ts`）：少于 5000 条 → 同步过滤；大于等于 5000 条 → Web Worker 异步过滤。

6. **虚拟滚动**：`IssuesTable` 和 `VirtualGallery` 都使用 `@tanstack/react-virtual`，可渲染 10k+ 项目。

### i18n 系统

自定义 React Context 实现（无外部依赖）：
- `LangContext` + `useLang()` hook
- 200+ 个翻译键
- 语言：`zh-CN`、`en`
- 所有文案集中在 `src/lib/i18n.ts`

### 缓存

- issue/scan 缩略图缓存根目录：`.voyager-gallery-cache`
- Gallery/附件总览缩略图缓存根目录：`.voyager-gallery-cache-all`
- 为控制本地缓存体积，`ScanPage` 持久化时会剥离 `allImages`，因此 `App.tsx` 现在负责保留父层完整扫描结果，避免重新挂载时丢失 allImages
- 缓存版本历史：v1 → v2 → v3 → v4 → v5（每次增加字段）

---

## 开发环境配置

### 前置依赖

- Node.js 18+
- Rust 工具链（stable）
- Tauri v1 CLI：`cargo install tauri-cli`
- 平台相关依赖：参考 [Tauri v1 prerequisites](https://v1.tauri.app/v1/guides/getting-started/prerequisites)

### 常用命令

```bash
npm install              # 安装前端依赖
npm run dev              # 启动 Vite 开发服务器（端口 5174）
npm run build            # TypeScript 检查 + Vite 构建
npm run test             # Vitest
cargo tauri dev          # 完整开发模式（Rust + 前端）
cargo tauri build        # 生产构建
```

### 测试

`src/__tests__/` 当前共 10 个测试文件：
- `smoke.test.ts` — 基础导入检查
- `types-contract.test.ts` — 类型契约兼容性
- `cargo-custom-protocol.test.ts` — Cargo.toml feature 检查
- `scan-page.test.tsx` — ScanPage 组件测试
- `fix-preview.test.tsx` — 修复预览逻辑测试
- `migrate-page.test.tsx` — MigratePage 组件测试
- `app-gallery-persistence.test.tsx` — Gallery 在 Tab 切换后仍保留状态
- `gallery-page.test.tsx` — Gallery 预览一致性 + all-cache 相关行为
- `sidebar-layout.test.ts` — Sidebar overflow/scroll 样式保护测试
- `operation-history-panel.test.tsx` — fix 任务诊断入口按钮行为

运行方式：`npm test`

当前已知验证状态：
- `npm run build` 在主工作区可通过
- `npm test` 在主工作区可通过（Vitest 已排除 `.worktrees/**`）
- `cargo test --manifest-path src-tauri/Cargo.toml` 在主工作区可通过
- `npm run tauri:build` 在主工作区可通过

---

## 如何添加新功能

建议按以下清单执行：

1. **类型** —— 在 `src-tauri/src/models.rs`（Rust）与 `src/types.ts`（TypeScript）中同步新增/修改类型，保持前后端一致。

2. **后端** —— 在 `src-tauri/src/main.rs` 实现 Tauri 命令，并注册到 `generate_handler![]`；如果与扫描相关，还要更新 `scanner.rs`。

3. **前端** —— 在合适的页面（`src/pages/`）或组件（`src/components/`）中接入 UI。

4. **i18n** —— 在 `src/lib/i18n.ts` 中同时为 `zh-CN` 与 `en` 补充翻译键。

5. **测试** —— 在 `src/__tests__/` 中新增或更新测试；mock `@tauri-apps/api` 的 invoke 调用；mock 的 `ScanResult` 请记得带 `allImages: []`。

6. **文档** —— 同步更新 `README.md`（面向用户）、`CONTRIBUTING.md`（面向开发者）和本 `HANDOFF.md`。

### 添加新的问题类型

如果将来要在 orphan / misplaced / broken 之外再加第 4 类问题：

1. 在 `models.rs` 和 `types.ts` 中为 `IssueType` 增加新变体
2. 在 `scanner.rs` 中实现检测逻辑
3. 在 `Sidebar.tsx` 中添加筛选分类
4. 在 `ScanPage.tsx` 中补充该类型的颜色 / 图标展示
5. 在 `src/lib/i18n.ts` 中增加名称与说明文案
6. 更新测试 mock

### 添加新的 Tauri 命令

1. 在 `main.rs` 中编写 `#[tauri::command]` 函数
2. 加入 `generate_handler![]`
3. 前端通过 `invoke('command_name', { args })` 调用
4. 如果有复用价值，在 `src/lib/commands.ts` 中补一层 wrapper

---

## 建议的未来功能

以下是后续可能继续做的方向（此前列表中的 1–6 有一部分已在 Phase 10 实现）：

### 中优先级

1. **自动更新** —— 接入 Tauri updater plugin，支持无感更新。

2. **基于相似度的 broken 修复** —— 除了拖拽修复外，还可按文件名相似度推荐候选图片。

3. **扩展快捷键** —— 如 `Ctrl+S` 扫描、`Ctrl+1~5` 切换 Tab、方向键浏览 issue。

### 低优先级

4. **插件系统** —— 允许用户自定义 issue 检测器或修复脚本。

5. **多仓库管理** —— 在一个窗口中管理多个 Obsidian vault。

6. **附件使用报告** —— 导出“哪篇笔记引用了哪些附件”的详细报告。

7. **健康分趋势** —— 在统计页记录并展示健康分历史趋势。

---

## 已知问题

1. **前端 bundle 体积持续关注** —— 当前已通过页面级动态导入消除 Vite chunk-size warning，但后续如果继续扩大统计图表或总览页功能，仍应优先保持非首屏页面按需加载，避免主入口重新膨胀。

2. **超大 vault 性能** —— 对于 50k+ 图片的仓库，首次全量扫描仍可能较慢；增量扫描会改善后续体验。

---

## 关键设计决策

- **坚持使用 Tauri v1（不是 v2）**：更稳定、文档更成熟，且已满足本项目需求。
- **不引入外部 i18n 库**：自定义 Context 方案可减少依赖并控制 bundle 体积。
- **缩略图统一使用 WebP**：压缩率和质量平衡更好，现代 webview 全部支持。
- **并行处理采用 Rayon**：适合 CPU 密集型扫描、缩略图生成、哈希计算。
- **缓存版本逐步升级**：`ScanResult` 一旦有破坏性字段变化，就必须提升缓存 key 版本，避免反序列化错误。
- **`allImages` 不持久化进本地缓存**：完整图片列表可能很大，因此改为按需重新获取，并由 `App.tsx` 保留父层结果。
