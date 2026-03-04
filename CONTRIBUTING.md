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
npm test                    # 运行全部 11 个测试
npx tsc -b --noEmit         # TypeScript 类型检查（不生成文件）
```

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
- 全局样式在 `src/index.css`（约 1270 行），使用 CSS 变量实现四套主题
- 与后端通信通过 `@tauri-apps/api` 的 `invoke()` 函数 + `listen()` 事件监听

#### 前端关键文件

| 文件 | 行数 | 职责 |
|------|------|------|
| `pages/ScanPage.tsx` | ~1008 | 扫描页主逻辑（扫描/修复/选择/过滤/导出/全屏/右键菜单） |
| `pages/StatsPage.tsx` | ~332 | 统计图表页（7 种 Recharts 可视化） |
| `pages/MigratePage.tsx` | - | 笔记迁移页 |
| `components/VirtualGallery.tsx` | - | 虚拟滚动画廊 |
| `components/ProgressBar.tsx` | ~50 | 扫描进度条（三阶段 + 不定进度动画） |
| `components/Toolbar.tsx` | - | 工具栏（扫描/修复/导出） |
| `components/Sidebar.tsx` | - | 侧边栏（分类/搜索/筛选） |
| `components/StatusBar.tsx` | - | 底部状态栏 + 日志抽屉 |

### 后端（`src-tauri/src/`）

- **Rust 2021 Edition** + **Tauri v1.5** + **Rayon 1.10**（多线程并行）
- `main.rs`（557 行）：所有 Tauri 命令注册（`#[tauri::command]`），包含 `window.emit()` 进度推送
- `scanner.rs`（240 行）：仓库扫描核心逻辑，Rayon `par_iter()` 并行缩略图生成
- `parser.rs`：Markdown 图片链接提取（wiki link + 标准 markdown）
- `models.rs`：`ScanIssue`、`ScanResult` 等数据结构（含 `file_mtime` 字段）
- `ops_log.rs`（182 行）：操作历史 JSON 持久化
- `thumb_cache.rs`（174 行）：三级 WebP 缩略图生成与缓存（哈希命名 + 一次打开多次缩放）

### 前后端通信

前端通过 `invoke('command_name', { params })` 调用后端 Rust 函数，返回 JSON 自动反序列化。所有命令定义在 `main.rs` 中。

关键命令：

| 命令 | 功能 |
|------|------|
| `scan_vault` | 扫描仓库，返回问题列表（接受 `window: tauri::Window` 参数推送进度） |
| `fix_issues` | 执行修复（移动/删除） |
| `undo_task` / `undo_entry` | 撤回操作 |
| `execute_migration` | 笔记迁移 |
| `open_file` / `open_file_parent` | 用系统程序打开文件/在文件管理器中显示 |
| `clear_thumbnail_cache` | 清除全部缩略图缓存 |
| `read_all_local_storage` | 读取本地设置（返回 `HashMap`，**不是数组**） |
| `write_local_storage` | 写入本地设置 |
| `read_local_storage` / `remove_local_storage` | 读取/删除单个设置 |
| `write_text_file` | 写入导出文件 |
| `get_runtime_logs` | 获取运行日志 |

### 数据存储

- **用户设置/缓存**：存储在 exe 同目录的 `voyager-data/` 文件夹，每个 key 一个 `.json` 文件
- **缩略图缓存**：存储在扫描仓库根目录的 `.voyager-gallery-cache/`
- **操作历史**：通过 `ops_log.rs` 以 JSON 持久化

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

### 主题兼容

- 所有颜色使用 CSS 变量（`var(--text-main)` 等），不要硬编码颜色值
- 全屏图片查看器是例外，保持黑底
- 新增 CSS 变量需要在 `:root`、`[data-theme="light"]`、`[data-theme="dark"]`、`[data-theme="parchment"]` 四个块中都定义

---

## 6. 测试

当前共 11 个前端测试用例，6 个测试文件：

| 文件 | 内容 |
|------|------|
| `smoke.test.ts` | App 渲染、品牌名显示 |
| `scan-page.test.tsx` | 目录选择、扫描、修复、全选 |
| `fix-preview.test.tsx` | 修复前确认对话框 |
| `migrate-page.test.tsx` | 迁移功能 |
| `types-contract.test.ts` | 类型定义验证 |
| `cargo-custom-protocol.test.ts` | Tauri 自定义协议配置 |

运行测试：
```bash
npm test
```

### 测试注意事项

- 测试环境是 jsdom，需要 mock **四个** Tauri API 模块：
  - `@tauri-apps/api/tauri` — `invoke` 和 `convertFileSrc`
  - `@tauri-apps/api/window` — `appWindow` 对象
  - `@tauri-apps/api/dialog` — `open` 和 `save` 函数
  - `@tauri-apps/api/event` — `listen` 函数（**Phase 6 新增，不 mock 会导致测试挂掉**）
- `invoke` mock 需要根据命令名返回不同数据，特别是 `read_all_local_storage` **必须返回 `{}`（对象）**，不能返回 `[]`（数组），否则 `initStorage` 解析失败
- `listen` mock 必须返回 `Promise.resolve(() => {})`（一个返回 unlisten 函数的 Promise）
- `window.matchMedia` 在 jsdom 中不存在，需要在 `beforeEach` 中 mock
- `ResizeObserver` 同样需要 mock
- `selectedIssueIds` 在 ScanPage 中是 `Set<string>` 类型（不是数组），VirtualGallery 的 props 也对应为 `Set<string>`

#### 测试 Mock 完整示例

```typescript
// 所有测试文件都需要以下四个 mock
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === 'read_all_local_storage') return Promise.resolve({})
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

---

## 8. 安全原则

本工具操作用户的本地文件，**数据安全是最高优先级**：

- **只读先行**：任何删除/移动操作必须先扫描预览，用户确认后才执行
- **永远可撤回**：所有修复操作记录在操作历史中，支持撤回（删除操作除外）
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
当前缓存键为 `voyager-cached-scan-result-v3`。**如果修改了 `ScanIssue`（Rust）或 `AuditIssue`（TypeScript）的数据结构，必须 bump 缓存版本号**（v3 → v4），否则旧缓存数据会导致新字段为 undefined。

版本历史：
- v1 → v2：添加 `fileSize` 字段
- v2 → v3：添加 `fileMtime` 字段

### 缩略图格式
缩略图使用 WebP 格式（不是 PNG），缓存文件扩展名为 `.webp`。如果之前有旧的 PNG 缓存，需要在设置中点击「清除缩略图缓存」让系统重新生成 WebP 版本。

---

感谢你的贡献！
