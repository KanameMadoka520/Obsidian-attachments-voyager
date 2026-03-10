# Obsidian Attachments Voyager (附件巡游者)

Obsidian Attachments Voyager 是一个跨平台桌面工具，专为 Obsidian 重度用户设计。它能扫描 Obsidian 仓库中的附件，精准识别**未引用图片（孤立附件 Orphan）**、**错位图片（Misplaced）**和**断链引用（Broken）**，并提供安全的批量修复、批量重命名并同步 MD 引用、附件总览画廊、统计图表、中英双语界面等功能。

技术栈：**Tauri v1.5 + React 19 + Rust 2021 + TypeScript 5.9 + Vite 7**

---

## 使用前提（非常重要）

本工具基于一套特定的 Obsidian 附件管理规范。请打开 Obsidian 的 **设置 -> 文件与链接**，确认以下设置：

| 设置项 | 必须值 |
|--------|--------|
| 附件默认存放路径 | 当前文件所在文件夹下指定的子文件夹 |
| 子文件夹名称 | `attachments` |
| 内部链接类型 | 基于当前笔记的相对路径（推荐） |
| 使用 Wiki 链接 | 开启 |
| 删除文件设置 | 移至 Obsidian 回收站（.trash 文件夹） |
| 始终更新内部链接 | 开启（强烈推荐） |

> 只要你的笔记在 `vault/folder/` 下，图片就应该在 `vault/folder/attachments/` 下。不符合此结构的图片会被识别为「错位」。
>
> 应用内的「说明」页面也展示了完整的 Obsidian 前提设置要求。

---

## 功能概览

### 用户指南

- [中文用户指南](docs/user-guide-zh.md)
- [English User Guide](docs/user-guide-en.md)

### 核心功能
- **附件问题扫描**：递归扫描仓库，识别三种问题类型——孤立附件（Orphan）、错位附件（Misplaced）、断链引用（Broken），Rayon 多线程并行解析 Markdown + 生成缩略图
- **断链检测**：识别 Markdown 中引用了磁盘上不存在的图片文件的情况，展示引用笔记路径而非图片路径（因为图片不存在）。自动跳过 `.trash` 回收站中的笔记
- **增量扫描**：记录文件 mtime 和 MD 引用索引（ScanIndex），后续扫描自动跳过未变化的 Markdown 文件，大幅提升重复扫描速度
- **实时进度**：扫描过程通过 Tauri Event 流式推送进度（收集文件 → 解析 Markdown → 生成缩略图），前端进度条实时显示百分比
- **批量修复**：一键移动错位图片到正确目录 + 删除孤立图片，支持冲突策略（覆盖/改名/逐个确认）。断链类型自动跳过
- **批量重命名并同步引用**：重命名图片文件后自动精确更新所有引用该图片的 Markdown 文件，支持 Wiki Link 和标准 Markdown 两种语法，保留路径前缀和别名后缀
- **操作历史**：所有修复、重命名、备份操作记录在操作历史中，持久化到 `voyager-data/ops-history.json`，重启后不丢失
- **统计图表**：独立统计 Tab 页，Recharts 可视化（饼图、柱状图、Top 10 目录排行、时间分布等 7 种图表），支持 Broken 类型统计
- **中英双语（i18n）**：支持中文/英文界面切换，200+ 翻译键值，基于 React Context 实现
- **一键备份**：选中图片后可复制到指定目录或打包为 ZIP 压缩文件；新增「备份全部问题附件」一键按钮（无需手动全选），备份操作记入操作历史
- **附件总览画廊**：独立 Tab 页展示仓库中全部附件图片（不仅是问题图片），含空间分析仪表盘（总数/总大小/格式分布饼图/大小分布柱状图），支持一键生成全部缩略图；最近一次完整扫描结果会在页面切换后保留，避免因为切换 Tab 丢失附件总览数据。附件总览页的缩略图缓存与问题扫描页分离，固定写入并读取 `.voyager-gallery-cache-all`。
- **图片去重合并**：SHA-256 哈希比对检测内容完全相同的重复图片，Rayon 并行计算哈希，展示重复组供用户手动选择保留项，合并时自动删除重复文件并更新所有 Markdown 引用
- **附件批量转格式**：将 BMP/PNG/GIF 等格式批量转为 WebP 或 JPEG，用 image crate + Rayon 并行编码，同时自动更新所有 MD 中的文件引用，支持自定义压缩质量（1-100）
- **仓库健康度评分**：统计页新增 0-100 综合健康评分，基于加权计算：孤立率 40% + 错位率 30% + 断链率 30%，颜色分级显示（绿/黄/红）
- **拖拽导入修复断链**：在详情面板选中断链 issue 后，可从系统资源管理器拖入图片文件到详情区域，自动复制到正确的 attachments 目录并修复引用
- **快捷键系统**：`Ctrl+F` 聚焦搜索框、`Delete` 删除选中（弹出确认）、`Ctrl+A` 全选、`Escape` 关闭弹窗/覆盖层

### 界面功能
- **五个 Tab 页**：附件问题扫描 / 联动迁移 / 统计 / 附件总览 / 说明
- **三栏布局**：左侧分类/筛选侧边栏 + 中间画廊 + 右侧详情面板
- **虚拟滚动画廊**：基于 `@tanstack/react-virtual`，万级图片流畅浏览（Set 集合 O(1) 选中判定 + 搜索 300ms 防抖）
- **左侧栏滚动支持**：当窗口较小或筛选项较多时，侧边栏支持纵向滚动，避免下方内容被裁切
- **缩略图系统**：Rayon 并行生成三级 WebP 缩略图（64px / 256px / 1024px），比 PNG 缓存体积减少 30-50%
- **全屏图片查看器**：问题扫描页和附件总览页都支持更一致的看图体验——OS 级全屏、滚轮缩放、拖拽平移、方向键切换、重置缩放、100% 原始尺寸
- **四套主题**：跟随系统 / 亮色 / 暗色 / 羊皮纸（Anthropic 风格）
- **筛选系统**：文件名搜索 + 文件类型过滤 + 文件大小过滤
- **右键菜单**：画廊卡片右键 -> 打开文件/目录、复制路径、全屏查看、重命名；断链类型特供打开引用笔记/笔记目录
- **导出报告**：JSON / CSV / Markdown 三种格式，导出当前筛选结果
- **日志抽屉**：底部状态栏展开查看运行日志和操作历史
- **自定义标题栏**：无系统边框，自定义拖拽区域 + 窗口控制按钮 + 语言切换
- **说明页面**：除了展示 Obsidian 前提设置外，还内置更完整的功能导览、常见流程说明和快捷键说明
- **上下文说明文案**：扫描页、统计页、附件总览页、侧边栏、详情面板、状态栏等关键区域内置简短说明，帮助新用户理解功能用途
- **断链提示**：切换到断链分类时自动显示操作提示，引导用户通过详情或右键打开引用笔记

### 数据存储
- 所有用户设置和缓存数据存储在 **exe 同目录的 `voyager-data/` 文件夹**中（不写入 C 盘 AppData）
- 操作历史持久化到 `voyager-data/ops-history.json`，应用重启后自动加载
- 缩略图缓存存储在 exe 同目录的 `.voyager-gallery-cache/` 中
- 附件总览页专用缩略图缓存存储在 exe 同目录的 `.voyager-gallery-cache-all/` 中

---

### 当前验证状态

截至当前工作区最新验证：

- `npm test`：通过（9 个测试文件 / 16 个用例）
- `npm run build`：通过（Vite 可能有 chunk size warning，非阻塞）
- `cargo test --manifest-path src-tauri/Cargo.toml`：通过（40 个测试）
- `npm run tauri:build`：通过（Windows 下成功产出 MSI 与 NSIS 安装包）

> 说明：Windows 与 Linux/Docker/WSL 之间切换开发时，`node_modules` 里的原生二进制（rollup）不兼容。切换平台后请在对应平台重新安装依赖（见下方 FAQ）。

---

## 快速开始

### 环境要求

| 依赖 | 最低版本 | 安装方式 |
|------|---------|---------|
| Node.js | 18.0+ | [nodejs.org](https://nodejs.org/) |
| npm | 8.0+ | 随 Node.js 一起安装 |
| Rust & Cargo | 1.70+ | [rustup.rs](https://rustup.rs/) |

**验证安装：**
```bash
node -v      # 应显示 v18.x 或更高
npm -v       # 应显示 8.x 或更高
rustc -V     # 应显示 rustc 1.70.0 或更高
cargo -V     # 应显示 cargo 1.70.0 或更高
```

### 各平台额外依赖

#### Windows
无需额外依赖。安装好 Node.js 和 Rust 即可。

> 注意：建议使用 PowerShell 或 Git Bash。不要在 CMD 中运行 Linux 风格的环境变量命令。

#### macOS
```bash
xcode-select --install   # 安装 Xcode Command Line Tools
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.0-dev \
  build-essential \
  curl wget file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### Linux (Fedora)
```bash
sudo dnf install -y \
  webkit2gtk4.0-devel \
  openssl-devel \
  curl wget file \
  gtk3-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel
```

#### Linux (Arch)
```bash
sudo pacman -S --needed \
  webkit2gtk \
  base-devel \
  curl wget file \
  openssl \
  gtk3 \
  libappindicator-gtk3 \
  librsvg
```

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/Obsidian-attachments-voyager.git
cd Obsidian-attachments-voyager

# 2. 安装前端依赖
npm install

# 3. 开发模式（边改边看）
npm run tauri:dev

# 4. 生产构建（打包成可执行文件）
npm run tauri:build
```

> 首次构建时 Rust 需要下载并编译约 100+ 个 crate，可能需要 5-15 分钟。后续构建会快很多（增量编译）。

---

## 构建产物位置

| 平台 | 路径 | 格式 |
|------|------|------|
| Windows | `src-tauri/target/release/obsidian-attachments-voyager.exe` | 绿色免安装版 |
| Windows | `src-tauri/target/release/bundle/nsis/` | NSIS 安装包 (.exe) |
| Windows | `src-tauri/target/release/bundle/msi/` | MSI 安装包 |
| macOS | `src-tauri/target/release/bundle/dmg/` | DMG 磁盘映像 |
| macOS | `src-tauri/target/release/bundle/macos/` | .app 应用包 |
| Linux | `src-tauri/target/release/obsidian-attachments-voyager` | ELF 二进制 |

---

## 选择操作说明

| 操作 | 效果 |
|------|------|
| 左键单击 | 单选 / 取消选中 |
| Ctrl/Cmd + 单击 | 多选切换 |
| Shift + 单击 | 区间选择 |
| 右键单击 | 打开上下文菜单 |

---

## 项目结构

```
Obsidian-attachments-voyager/
├── src/                           # 前端 React + TypeScript
│   ├── App.tsx                    # 根组件，LangContext 提供者，5 Tab 路由，主题/语言设置
│   ├── main.tsx                   # React 入口
│   ├── types.ts                   # 类型定义（IssueType 含 broken，AttachmentInfo 等）
│   ├── vite-env.d.ts              # Vite ?worker 导入类型声明
│   ├── index.css                  # 全局样式（约 1301 行，四套主题变量）
│   ├── components/                # UI 组件
│   │   ├── TitleBar.tsx           # 自定义标题栏（5 个 Tab + 语言切换 + 主题选择）
│   │   ├── Toolbar.tsx            # 工具栏（扫描/修复/导出/备份下拉菜单）
│   │   ├── Sidebar.tsx            # 侧边栏（3 分类：Orphan/Misplaced/Broken + 搜索/筛选）
│   │   ├── VirtualGallery.tsx     # 虚拟滚动画廊（readOnly + fillHeight props）
│   │   ├── GalleryCard.tsx        # 画廊卡片（broken 类型占位符 + readOnly 模式）
│   │   ├── DetailPanel.tsx        # 右侧详情面板（broken 展示 + 重命名按钮）
│   │   ├── StatusBar.tsx          # 底部状态栏 + 日志抽屉
│   │   ├── ContextMenu.tsx        # 右键上下文菜单
│   │   ├── ConfirmDialog.tsx      # 确认对话框
│   │   ├── ProgressBar.tsx        # 扫描进度条（三阶段进度 + 不定进度动画）
│   │   └── StatsCards.tsx         # 附件总览统计卡片（总数/总大小/筛选结果）
│   ├── pages/                     # 页面
│   │   ├── ScanPage.tsx           # 扫描页（主功能：扫描/修复/重命名/过滤/导出/备份/Web Worker）
│   │   ├── MigratePage.tsx        # 迁移页
│   │   ├── StatsPage.tsx          # 统计页（Recharts 可视化图表，含 Broken 统计）
│   │   ├── GalleryPage.tsx        # 附件总览页（全部附件画廊 + 空间分析 + 生成/清除缩略图）
│   │   └── HelpPage.tsx           # 说明页（Obsidian 前提设置要求）
│   ├── lib/                       # 工具库
│   │   ├── commands.ts            # Tauri IPC 命令封装
│   │   ├── storage.ts             # 本地存储（exe 同目录）
│   │   ├── export.ts              # 导出格式生成（含 Broken 类型）
│   │   ├── i18n.ts                # 中英双语翻译模块（200+ 键值，LangContext + useLang hook）
│   │   └── filterUtils.ts         # 过滤逻辑（主线程 + Web Worker 共享）
│   ├── workers/                   # Web Worker
│   │   └── filterWorker.ts        # 大数据集异步过滤（>5000 条时启用）
│   └── __tests__/                 # 前端测试（9 个测试文件，当前主工作区 16 个用例全部通过）
├── src-tauri/                     # 后端 Rust + Tauri
│   ├── src/
│   │   ├── main.rs                # Tauri 命令注册（24 个命令）+ 去重/转格式/断链修复命令
│   │   ├── scanner.rs             # 仓库扫描逻辑（Orphan/Misplaced/Broken 检测 + allImages 收集）
│   │   ├── parser.rs              # Markdown 链接解析（代码块预处理 + data URI 过滤）
│   │   ├── models.rs              # 数据结构（ScanIssue/ScanResult/ScanIndex/AttachmentInfo）
│   │   ├── migrate.rs             # 笔记迁移
│   │   ├── ops_log.rs             # 操作历史（JSON 持久化）
│   │   ├── runtime_log.rs         # 运行日志
│   │   ├── thumb_cache.rs         # 缩略图缓存（三级 WebP + 级联缩放）
│   │   ├── fix_plan.rs            # 修复计划
│   │   └── startup_diag.rs        # 启动诊断
│   ├── Cargo.toml                 # Rust 依赖（含 rayon、zip、image、regex）
│   └── tauri.conf.json            # Tauri 应用配置
├── scripts/
│   └── generate-icons.mjs         # SVG -> PNG/ICO 图标生成脚本（sharp + png-to-ico）
├── docs/
│   ├── plans/                     # 设计文档和实施计划
│   ├── user-guide-zh.md           # 中文用户指南
│   └── user-guide-en.md           # 英文用户指南
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 技术实现原理

本节详细介绍各核心功能的实现机制，帮助开发者理解内部工作方式。点击下方表格中的章节标题可直接跳转。

| 章节 | 内容 |
|------|------|
| [一、附件扫描](#一附件扫描如何找到笔记中引用了哪些图片) | 三阶段流程：递归收集 → 正则解析（Markdown + Wiki Link） → 交叉比对 |
| [二、Markdown 解析预处理](#二markdown-解析预处理代码块剥离与-data-uri-过滤) | 代码块剥离（围栏/行内）、data URI 过滤、HTTP 链接跳过 |
| [三、问题类型与检测逻辑](#三问题类型与检测逻辑) | Orphan / Misplaced / Broken 三种类型的判定规则与特殊处理 |
| [四、修复机制](#四修复机制移动和删除是怎么做的) | Orphan 删除、Misplaced 移动、Broken 跳过、三种冲突策略、操作记录 |
| [五、批量重命名并同步 MD 引用](#五批量重命名并同步-md-引用) | 物理重命名 + 双正则精确替换 Wiki Link / Markdown 语法中的文件名 |
| [六、笔记迁移](#六笔记迁移整篇笔记连带附件搬家) | 连带附件搬家，先移附件后移笔记的安全顺序 |
| [七、缩略图系统](#七缩略图系统rayon-并行--webp-格式) | 三级尺寸、级联缩放、哈希命名、Rayon 并行、WebP 格式 |
| [八、全部缩略图生成](#八全部缩略图生成) | 附件总览页独立的批量缩略图生成命令 |
| [九、虚拟滚动](#九虚拟滚动画廊万级图片不卡顿) | @tanstack/react-virtual 原理、自适应列数、overscan 预渲染、readOnly 模式 |
| [十、主题系统](#十主题系统四套主题的-css-变量方案) | CSS 变量方案、data-theme 属性切换、matchMedia 跟随系统 |
| [十一、前后端通信](#十一前后端通信tauri-ipc-机制) | Tauri IPC invoke 机制、serde camelCase 序列化、24 个命令清单 |
| [十二、本地存储](#十二本地存储替代-localstorage-的文件方案) | 替代 localStorage 的文件方案、内存缓存 + 异步写盘 |
| [十三、导出报告](#十三导出报告三种格式生成) | JSON/CSV/Markdown 三种格式、筛选后导出、Tauri save dialog |
| [十四、性能分析](#十四性能设计与瓶颈分析) | 当前优化措施 + 瓶颈分析 |
| [十五、Rayon 并行缩略图](#十五rayon-并行缩略图生成) | 多线程 par_iter + AtomicUsize 进度计数 |
| [十六、Tauri Event 进度流](#十六tauri-event-进度流) | 后端 window.emit → 前端 listen 实时进度推送 |
| [十七、统计图表页](#十七统计图表页recharts-可视化) | 7 种图表、Broken 统计、CSS 变量集成、useMemo 计算 |
| [十八、增量扫描](#十八增量扫描) | ScanIndex（mtime + mdRefs）、跳过未变化 MD 文件、缓存键 v5 |
| [十九、国际化（i18n）](#十九国际化i18n) | React Context 方案、200+ 翻译键、LangContext + useLang hook |
| [二十、操作历史持久化](#二十操作历史持久化) | JSON 文件持久化、启动加载、重启不丢失 |
| [二十一、图片缓存刷新](#二十一图片缓存刷新) | scanVersion 状态 + ?v= 查询参数、清除缓存后刷新 |
| [二十二、Rayon 并行 MD 解析](#二十二rayon-并行-md-解析) | par_iter 多线程读取+正则解析、AtomicUsize 进度、顺序合并 |
| [二十三、一键备份](#二十三一键备份复制到目录--zip-打包) | 两种备份模式、zip crate Deflate 压缩、冲突自动重命名 |
| [二十四、Web Worker 过滤](#二十四web-worker-过滤) | 双路架构（同步+异步）、5000 阈值自动切换、Vite ?worker 导入 |
| [二十五、应用图标生成](#二十五应用图标生成) | SVG 内联定义、sharp 批量转换、png-to-ico 生成 ICO |
| [二十六、附件总览画廊](#二十六附件总览画廊) | 全部附件只读展示、空间分析仪表盘、图片预览弹窗、适配器模式复用 VirtualGallery |
| [二十七、说明页面](#二十七说明页面) | Obsidian 前提设置展示、i18n 多语言 |

### 一、附件扫描：如何找到笔记中引用了哪些图片

扫描是本工具的核心功能，整个流程在 Rust 后端完成（`scanner.rs` + `parser.rs`），分为三个阶段：

#### 第一阶段：递归收集文件

从用户指定的仓库根目录开始，使用 `std::fs::read_dir()` 递归遍历所有子目录，将文件分为两类：

- **Markdown 文件**：扩展名为 `.md` 的文件，收集到 `md_files: Vec<PathBuf>`
- **图片文件**：扩展名为 `png/jpg/jpeg/webp/gif/bmp/svg` 且路径中包含 `attachments` 目录段的文件，收集到 `image_files: Vec<PathBuf>`

关键设计：只收集路径中包含 `attachments/` 的图片。这是因为 Obsidian 的规范要求附件放在 `attachments` 子文件夹中，不在此目录下的图片不属于本工具的管理范围。判断逻辑：

```rust
fn path_has_attachments_segment(path: &Path) -> bool {
    path.components().any(|c| c.as_os_str() == "attachments")
}
```

#### 第二阶段：解析 Markdown 中的图片引用

逐个读取每个 `.md` 文件的全部文本内容（`fs::read_to_string`），然后经过**代码块预处理**（详见第二章）后用两个正则表达式提取图片引用：

```rust
// 标准 Markdown 图片语法：![alt](path)
let markdown_re = Regex::new(r"!\[[^\]]*\]\(([^)]+)\)").unwrap();

// Obsidian Wiki Link 语法：![[filename]]
let wikilink_re = Regex::new(r"!\[\[([^\]]+)\]\]").unwrap();
```

提取到的路径还需要经过 `normalize_filename()` 标准化处理：

1. **去除别名**：`![[image.png|400]]` 中 `|400` 是 Obsidian 的图片宽度设置，取 `|` 之前的部分
2. **去除查询参数**：去掉 `?` 后面的内容
3. **统一路径分隔符**：`\` 替换为 `/`
4. **提取纯文件名**：从 `attachments/subfolder/image.png` 中提取出 `image.png`
5. **跳过外部链接**：以 `http://` 或 `https://` 开头的引用直接跳过
6. **跳过 data URI**：以 `data:` 开头的内联图片（如 `data:image/png;base64,...`）直接跳过

所有提取到的文件名汇入 `referenced_filenames: HashSet<String>` 用于快速查找，同时保留 `references: Vec<(PathBuf, String)>` 记录每个引用来自哪个 Markdown 文件。

#### 第三阶段：交叉比对，识别三种问题

详见第三章「问题类型与检测逻辑」。

#### 全部附件信息收集

扫描完成后，`scanner.rs` 还会构建 `all_images: Vec<AttachmentInfo>`，包含仓库中全部图片附件的路径、文件名、文件大小和修改时间。此数据供「附件总览」页面展示全部附件画廊。

#### 文件大小与修改时间获取

在创建每个 `ScanIssue` 和 `AttachmentInfo` 时，通过 `std::fs::metadata(path)` 获取文件字节大小（`.len()`）和修改时间（`.modified()` → Unix 秒数）。使用 `.ok()` 和 `.unwrap_or()` 将错误转为默认值，确保单个文件的 metadata 读取失败不会阻断整个扫描流程。

---

### 二、Markdown 解析预处理：代码块剥离与 data URI 过滤

`parser.rs` 在执行正则提取图片引用之前，会先对 Markdown 文本进行预处理，避免错误识别代码片段中的图片语法。

#### 代码块剥离（`strip_code` 函数）

1. **围栏代码块**：检测 `` ``` `` 或 `~~~` 围栏开始/结束标记，跳过围栏内所有行。支持嵌套计数（关闭围栏的反引号数必须 >= 开启围栏的数量）
2. **行内代码**：逐字符扫描，遇到 `` ` `` 时跳过到下一个 `` ` ``，剥离行内代码内容

这样就避免了类似以下代码片段被误识别为图片引用：

```python
# 这段 Markdown 代码块中的图片语法不会被提取
img = f"![](data:image/png;base64,{base64_img})"
```

#### data URI 过滤

标准 Markdown 语法 `![alt](data:image/png;base64,...)` 中的 data URI 不是文件引用，预处理后的正则匹配阶段会跳过所有 `data:` 开头的路径。

#### HTTP/HTTPS 链接跳过

外部链接（如 `![alt](https://example.com/image.png)`）不属于本地附件管理范围，直接跳过。

#### 测试覆盖

`parser.rs` 包含 3 个单元测试，验证：
- 基本的 Markdown 和 Wiki Link 语法提取
- 代码块内的图片引用被正确忽略
- data URI 被正确跳过

---

### 三、问题类型与检测逻辑

扫描完成后，`scanner.rs` 通过交叉比对识别三种问题类型：

#### Orphan（孤立附件）

**判定规则**：遍历所有图片文件，如果某张图片的文件名不在 `referenced_filenames` 集合中，说明没有任何笔记引用它，标记为孤立附件。

```rust
for img in image_files {
    if !referenced_filenames.contains(filename) {
        // → Orphan：没有任何 Markdown 文件引用此图片
    }
}
```

**修复操作**：删除文件（不可逆）。

#### Misplaced（错位附件）

**判定规则**：遍历所有引用关系 `(md_path, filename)`，对于每个引用：

1. 通过文件名在 `by_filename: HashMap<String, Vec<PathBuf>>` 中查找图片的实际位置
2. 计算图片的**期望位置**：`{笔记所在目录}/attachments/{文件名}`
3. 如果实际位置 ≠ 期望位置，标记为错位附件

```rust
let expected = md_path.parent().join("attachments").join(filename);
if actual_path != expected {
    // → Misplaced：图片不在引用它的笔记旁边的 attachments/ 中
}
```

**特殊处理**：如果引用图片的 Markdown 文件本身在 `.trash/` 或 `trash/` 目录中（Obsidian 回收站），会在 reason 中标注「Markdown 文档已在 trash 中」，供用户判断是否要删除。

**修复操作**：移动文件到正确位置。

#### Broken（断链引用）

**判定规则**：在遍历引用关系时，如果某个被引用的文件名在 `by_filename` 索引中找不到对应的物理文件，说明 Markdown 引用了一个磁盘上不存在的图片。

```rust
if !by_filename.contains_key(filename) {
    // → Broken：MD 引用了磁盘上不存在的图片文件
}
```

**特殊处理**：
- **自动跳过 `.trash` 中的笔记**：Obsidian 回收站里的笔记引用缺失图片是正常的（用户删除了笔记），不生成 Broken issue
- **`image_path` 存裸文件名**：因为文件不存在没有真实路径，`image_path` 字段存的是被引用的文件名（如 `foo.png`），而非路径
- **`md_path` 存引用笔记路径**：用于定位哪篇笔记引用了缺失的图片
- **缩略图跳过**：在缩略图生成阶段自动过滤掉 `broken` 类型的 issue（文件不存在，无法生成缩略图）

**前端展示**：
- 画廊卡片显示占位符（⚠ + 缺失文件名），不显示图片
- 详情面板显示「缺失文件名」和引用笔记路径
- 右键菜单隐藏「打开文件」「全屏查看」（文件不存在），提供「打开引用笔记」「打开笔记目录」
- 切换到 Broken 分类时自动显示操作提示

**修复操作**：无法自动修复，修复时自动跳过。需要用户手动补充缺失的图片文件。

#### 问题类型定义（TypeScript）

```typescript
export type IssueType = 'orphan' | 'misplaced' | 'broken' | 'multi_ref_conflict' | 'target_conflict'
```

其中 `multi_ref_conflict` 和 `target_conflict` 为预留类型，当前版本未使用。

---

### 四、修复机制：移动和删除是怎么做的

修复操作在 `main.rs` 的 `fix_issues()` 函数中实现，根据问题类型执行不同操作：

#### Orphan（孤立附件）→ 删除

直接调用 `std::fs::remove_file(source)` 删除文件。这是**不可逆操作**——删除后文件不进回收站，直接从磁盘移除。因此 UI 上会明确提示用户，删除操作无法自动撤回。

#### Misplaced（错位附件）→ 移动

将图片从当前错误位置移动到正确位置（`{引用笔记目录}/attachments/{文件名}`）：

1. 先用 `fs::create_dir_all(target.parent())` 确保目标目录存在
2. 再用 `fs::rename(source, target)` 执行原子移动

`fs::rename` 在同一文件系统内是原子操作（O(1) 时间复杂度），不会复制文件内容，只是修改目录项指针。

#### Broken（断链引用）→ 跳过

`fix_issues` 中的 `match issue.r#type.as_str()` 只处理 `"orphan"` 和 `"misplaced"` 两种类型，所有其他类型（包括 `"broken"`）进入 `_ => skipped += 1` 分支直接跳过。

#### 冲突处理

当目标位置已存在同名文件时，提供三种冲突策略（`ConflictPolicy`）：

| 策略 | 行为 |
|------|------|
| `OverwriteAll` | 删除目标文件后覆盖移动 |
| `RenameAll` | 自动重命名为 `filename (1).png`、`filename (2).png`... 直到找到不冲突的名字 |
| `PromptEach` | 跳过该文件，标记为 Skipped，等待用户逐个确认 |

默认策略是 `RenameAll`（最安全，不会丢失任何文件）。

#### 操作记录

每次修复操作都会创建一个 `OperationTask`，其中包含所有 `OperationEntry`（每个文件一条记录）。每条记录保存：

```
entry_id:   唯一标识
action:     "move" 或 "delete"
source:     原始路径
target:     目标路径
status:     Applied / Skipped / Failed
message:    可选的说明信息
```

操作历史通过 `ops_log.rs` 持久化到 `{exe_dir}/voyager-data/ops-history.json`，应用启动时自动加载。最多保留 200 条任务记录。操作历史为只读记录，用于审计和追溯，不支持撤回操作。

> 注意：修复操作执行后无法撤回。UI 中的确认对话框会显示 "执行后无法恢复" 并提醒用户提前备份。

---

### 五、批量重命名并同步 MD 引用

`main.rs` 中的 `rename_image` 命令实现了图片重命名并自动更新所有引用该图片的 Markdown 文件。

#### 整体流程

```
1. 校验新文件名（无路径分隔符、非空、目标不存在）
2. fs::rename(old_path, new_path) 重命名物理文件
3. 利用前端传入的 md_refs（来自 ScanIndex）反向查找引用旧文件名的 MD 列表
4. 对每个 MD 文件：读取内容 → replace_image_refs_in_md() → 写回
5. 记录 ops_log 操作历史
```

#### 命令签名

```rust
#[tauri::command]
fn rename_image(
    old_path: String,
    new_name: String,
    vault_root: String,
    md_refs: HashMap<String, Vec<String>>,  // 来自前端的 ScanIndex.mdRefs
) -> Result<RenameSummary, String>
```

#### 双正则精确替换（`replace_image_refs_in_md` 函数）

文件名替换使用两个正则表达式，分别匹配 Wiki Link 和标准 Markdown 语法：

```rust
// 模式 1: ![[path/old_name|alias]] → ![[path/new_name|alias]]
let wiki_pattern = format!(
    r"(!\[\[(?:[^\]]*[/\\])?){}((?:\|[^\]]*)?)\]\]",
    regex::escape(old_name)
);

// 模式 2: ![alt](path/old_name) → ![alt](path/new_name)
let md_pattern = format!(
    r"(!\[[^\]]*\]\((?:[^)]*[/\\])?){}(\))",
    regex::escape(old_name)
);
```

关键设计：
- `regex::escape(old_name)` 处理文件名中的特殊字符（如 `image (1).png` 中的括号）
- 保留路径前缀（如 `./attachments/`）和别名后缀（如 `|200`）
- 捕获组 `$1` 和 `$2` 分别保留前缀和后缀，只替换中间的文件名部分
- **不需要先修复路径**：parser 提取的是裸文件名，与路径前缀无关

#### 反向查找引用

利用前端传入的 `md_refs: HashMap<String, Vec<String>>`（来自 `ScanIndex.mdRefs`），直接查找哪些 MD 文件引用了旧文件名，无需全盘扫描。只有引用列表中包含旧文件名的 MD 文件才会被读取和更新。

#### 前端交互

- 右键菜单新增「重命名」选项（仅 Orphan/Misplaced 类型，Broken 排除）
- 重命名对话框：输入新文件名 → 利用 `result.scanIndex.mdRefs` 预览受影响的 MD 文件数量 → 确认后调用 `invoke('rename_image', ...)` → 自动重新扫描
- 详情面板提供「重命名」按钮

---

### 六、笔记迁移：整篇笔记连带附件搬家

迁移功能（`migrate.rs`）将一篇笔记及其引用的所有附件移动到新目录：

1. **解析引用**：读取笔记内容，用 `extract_image_refs()` 提取所有图片引用
2. **移动附件**：对每个引用的图片，从 `{笔记目录}/attachments/{文件名}` 移动到 `{目标目录}/attachments/{文件名}`
3. **移动笔记**：最后移动 `.md` 文件本身到目标目录
4. **冲突处理**：与修复操作共享同一套 `ConflictPolicy`（覆盖/改名/逐个确认）
5. **记录操作**：所有移动操作记入 `OperationTask`，持久化到操作历史

移动顺序很重要：先移附件，最后移笔记。这样如果中途出错，笔记文件仍在原位，用户可以重试。

---

### 七、缩略图系统：Rayon 并行 + WebP 格式

缩略图生成在 `thumb_cache.rs` 中实现，使用 Rust 的 `image` crate + `rayon` 并行库。

#### 三级尺寸

| 级别 | 尺寸 | 用途 |
|------|------|------|
| `tiny` | 64px | 保留给未来极小展示场景 |
| `small` | 256px | 画廊卡片展示 |
| `medium` | 1024px | 详情面板预览和全屏查看前的快速加载 |

#### 生成流程

```
1. 计算原始图片路径的哈希值 → 作为缓存文件名（如 a3f2b1c9.webp）
2. 检查 .voyager-gallery-cache/{tiny,small,medium}/ 下是否已有缓存
3. 如果全部命中 → 直接返回缓存路径，不做任何 I/O
4. 如果有缺失 → 用 image::open() 打开原图（只打开一次）
5. 对每个缺失尺寸调用 image.resize(max_edge, max_edge, FilterType::Triangle)
6. 保存为 WebP 格式到对应的尺寸目录（比 PNG 体积小 30-50%）
```

关键优化：
- **级联缩放**：`generate_thumbnail_multi()` 先生成 medium(1024px)，再从 medium 缩放出 small(256px)，再从 small 缩放出 tiny(64px)。每级从上一级缩放而非从原图解码，大幅减少计算量。
- **Rayon 并行生成**：`scanner.rs` 中通过 `rayon::par_iter()` 对所有待生成缩略图的图片进行多线程并行处理，充分利用多核 CPU。使用 `AtomicUsize` 线程安全计数器追踪进度，每处理 50 张图片向前端推送一次进度更新。
- **WebP 格式**：相比 PNG，WebP 在相同视觉质量下体积更小，大幅减少缓存磁盘占用。缩略图文件使用 `.webp` 扩展名。
- **Broken 类型跳过**：缩略图生成阶段自动过滤掉 `broken` 类型的 issue（`i.r#type != "broken"`），因为文件不存在无法生成缩略图。

#### 哈希命名

使用 Rust 标准库的 `DefaultHasher` 对原始路径字符串计算哈希，输出为十六进制字符串 + `.webp` 扩展名。这样：
- 避免文件名中的特殊字符和路径分隔符问题
- 不同路径的图片不会冲突（哈希碰撞概率极低）
- 同一张图片无论扫描多少次，缓存文件名始终一致

#### 缓存存储位置

缩略图缓存存储在 `{exe 所在目录}/.voyager-gallery-cache/` 下，按尺寸分子目录：

```
.voyager-gallery-cache/
├── tiny/       # 64px 缩略图
├── small/      # 256px 缩略图
└── medium/     # 1024px 缩略图
```

用户可以在扫描页的状态栏或附件总览页一键清除全部缩略图缓存。

---

### 八、全部缩略图生成

附件总览画廊页提供独立的「生成全部缩略图」功能，与扫描页的缩略图生成分离。

#### 后端命令

```rust
#[tauri::command]
fn generate_all_thumbnails(window: tauri::Window, paths: Vec<String>) -> Result<ThumbGenSummary, String>
```

接受所有图片路径列表，使用 Rayon `par_iter()` 并行生成，通过 `window.emit("scan-progress")` 推送进度。返回 `ThumbGenSummary { generated, skipped, total }`，其中 `generated` 是实际新生成的数量，`skipped` 是已有缓存或失败的数量。

#### 前端交互

附件总览页的「生成全部缩略图」按钮调用此命令，传入 `allImages.map(img => img.path)`。按钮上方显示说明文字：已有 lazy load 等优化算法，直接查看原图也可以，不生成缩略图可节约磁盘空间，但浏览原图需要一定的电脑性能。

---

### 九、虚拟滚动画廊：万级图片不卡顿

画廊使用 `@tanstack/react-virtual` 实现虚拟滚动（`VirtualGallery.tsx`），核心原理：

#### 只渲染可见区域

假设仓库有 10,000 张图片，每行显示 5 张，共 2,000 行。但屏幕一次只能显示约 3-4 行。虚拟滚动的做法是：

1. 计算容器的可视高度和滚动位置
2. 只创建当前可见的 3-4 行对应的 DOM 节点（约 15-20 个 `<GalleryCard>`）
3. 额外预渲染上下各 3 行（`overscan: 3`）作为缓冲，减少快速滚动时的白屏
4. 滚动时动态销毁离开视口的行，创建进入视口的新行

这样无论图片总数是 100 还是 100,000，DOM 中始终只有约 30-50 个卡片节点。

#### 自适应列数

通过 `ResizeObserver` 监听容器宽度变化，动态计算列数：

```typescript
const MIN_CARD_WIDTH = 170  // 卡片最小宽度
const columnCount = Math.max(1, Math.floor(containerWidth / MIN_CARD_WIDTH))
```

窗口缩小时自动减少列数，放大时增加列数，保证卡片不会过小或溢出。

#### 布局方式

每行使用 CSS Grid 布局（`gridTemplateColumns: repeat(N, 1fr)`），行本身使用绝对定位（`position: absolute; top: virtualRow.start`），由 `@tanstack/react-virtual` 计算每行的精确位置。

#### readOnly 模式

`VirtualGallery.tsx` 支持 `readOnly?: boolean` 和 `fillHeight?: boolean` props：
- `readOnly` 模式下隐藏复选框，点击不触发选择，保留图片预览——用于附件总览画廊
- `fillHeight` 模式下画廊高度自适应容器

---

### 十、主题系统：四套主题的 CSS 变量方案

主题切换不依赖任何 CSS-in-JS 库，纯 CSS 变量实现：

#### 原理

在 `index.css` 中定义四套 CSS 变量：

```css
:root { --bg-main: #1e1e2e; --text-main: #cdd6f4; ... }           /* 默认/暗色 */
[data-theme="light"] { --bg-main: #ffffff; --text-main: #1e1e2e; ... }
[data-theme="dark"] { --bg-main: #1e1e2e; --text-main: #cdd6f4; ... }
[data-theme="parchment"] { --bg-main: #f5f0e8; --text-main: #3d3929; ... }
```

所有组件样式只引用变量（如 `background: var(--bg-main)`），切换主题时只需修改 `<html>` 元素的 `data-theme` 属性，整个界面瞬间切换。

#### 跟随系统（auto）

通过 `window.matchMedia('(prefers-color-scheme: dark)')` 监听操作系统的深色/浅色模式偏好。当用户选择「跟随系统」时：
- 系统深色模式 → 应用暗色主题
- 系统浅色模式 → 应用亮色主题
- 监听 `change` 事件实时响应系统主题切换

---

### 十一、前后端通信：Tauri IPC 机制

前端（React）和后端（Rust）之间通过 Tauri 的 IPC（进程间通信）机制交互：

#### 调用方式

前端使用 `@tauri-apps/api/tauri` 的 `invoke()` 函数：

```typescript
const result = await invoke<ScanResult>('scan_vault', {
  root: '/path/to/vault',
  generateThumbs: true,
  thumbSize: 256,
  prevIndex: previousScanIndex,  // 增量扫描：传入上次的 ScanIndex，首次传 null
})
```

后端用 `#[tauri::command]` 宏标记函数，Tauri 框架自动处理 JSON 序列化/反序列化：

```rust
#[tauri::command]
fn scan_vault(root: String, generate_thumbs: Option<bool>) -> Result<ScanResult, String> {
    // Rust 结构体自动序列化为 JSON 返回给前端
}
```

#### 数据序列化

Rust 端所有数据结构都标注了 `#[serde(rename_all = "camelCase")]`，确保 Rust 的 `snake_case` 字段名（如 `file_size`）自动转换为前端的 `camelCase`（如 `fileSize`），前后端类型无缝对应。

#### 全部 Tauri 命令清单（21 个）

| 命令 | 参数 | 返回值 | 功能 |
|------|------|--------|------|
| `scan_vault` | `root, window, generate_thumbs?, thumb_size?, prev_index?` | `ScanResult`（含 `scanIndex` + `allImages`） | 扫描仓库 + 增量扫描 + 通过 Event 推送进度 |
| `fix_issues` | `issues: Vec<ScanIssue>, policy?` | `FixSummary` | 执行修复（移动/删除/跳过 Broken） |
| `rename_image` | `old_path, new_name, vault_root, md_refs` | `RenameSummary` | 重命名图片 + 同步更新 MD 引用 |
| `generate_all_thumbnails` | `window, paths: Vec<String>` | `ThumbGenSummary` | 批量生成全部图片缩略图（Rayon 并行） |
| `find_duplicates` | `window, vault_path` | `Vec<DuplicateGroup>` | SHA-256 哈希查找重复图片，Rayon 并行 |
| `merge_duplicates` | `keep, remove, vault_path` | `MergeSummary` | 合并重复图片：删除 remove 列表，更新 MD 引用指向 keep |
| `convert_images` | `window, paths, target_format, quality, vault_path` | `ConvertSummary` | 批量转格式（WebP/JPEG）+ 更新 MD 引用 + 删除原文件 |
| `fix_broken_with_file` | `dropped_file_path, broken_image_name, md_path, vault_path` | `String`（新文件路径） | 拖拽图片修复断链引用 |
| `list_operation_history` | 无 | `Vec<OperationTask>` | 获取操作历史列表（只读） |
| `execute_migration` | `note_path, target_dir, policy?` | `MigrateSummary` | 笔记 + 附件迁移 |
| `open_file` | `path` | `()` | 用系统默认程序打开文件 |
| `open_file_parent` | `path` | `()` | 在文件管理器中打开文件所在目录 |
| `get_runtime_logs` | `limit?` | `Vec<RuntimeLogLine>` | 获取运行日志（默认 200 条） |
| `clear_thumbnail_cache` | 无 | `CacheClearSummary` | 清除全部缩略图缓存 |
| `write_text_file` | `path, content` | `()` | 写入导出文件 |
| `read_all_local_storage` | 无 | `HashMap<String, String>` | 批量读取 voyager-data/*.json |
| `write_local_storage` | `key, value` | `()` | 写入 voyager-data/{key}.json |
| `read_local_storage` | `key` | `Option<String>` | 读取单个 key |
| `remove_local_storage` | `key` | `()` | 删除单个 key 文件 |
| `backup_selected_files` | `paths, dest` | `BackupSummary` | 将选中图片复制到指定目录 |
| `backup_selected_zip` | `paths, dest` | `BackupSummary` | 将选中图片打包为 ZIP 文件 |

#### Tauri Event（非命令，单向推送）

| Event 名称 | 数据格式 | 触发方 | 用途 |
|------------|---------|--------|------|
| `scan-progress` | `{ phase, current, total }` | 后端 `window.emit()` | 扫描/缩略图生成进度 |
| `duplicate-progress` | `{ current, total }` | 后端 `window.emit()` | 重复文件查找进度 |
| `convert-progress` | `{ current, total }` | 后端 `window.emit()` | 格式转换进度 |

---

### 十二、本地存储：替代 localStorage 的文件方案

#### 为什么不用 localStorage

Tauri 基于 WebView 渲染前端，WebView 的 `localStorage` 数据存储在操作系统的 AppData 目录中（Windows 下是 `C:\Users\xxx\AppData\...`）。这带来两个问题：
1. 用户不知道数据存在哪里，卸载后可能残留
2. 绿色版（免安装版）用户希望所有数据跟着 exe 走

#### 实现方案

后端提供四个 Rust 命令操作 `{exe_dir}/voyager-data/` 目录：

| 命令 | 功能 | 文件操作 |
|------|------|---------|
| `read_all_local_storage` | 启动时批量读取所有设置 | 遍历目录中的 `.json` 文件 |
| `write_local_storage` | 写入单个设置 | `fs::write("{key}.json", value)` |
| `read_local_storage` | 读取单个设置 | `fs::read_to_string("{key}.json")` |
| `remove_local_storage` | 删除单个设置 | `fs::remove_file("{key}.json")` |

前端的 `storage.ts` 模块维护一个**内存缓存**（`Map<string, string>`），启动时一次性加载所有数据，之后 `getItem()` 直接读内存（同步，零延迟），`setItem()` 写内存的同时异步调用后端写文件（不阻塞 UI）。

#### 存储键注册表

| 键名 | 用途 |
|------|------|
| `voyager-ui-settings-v1` | UI 设置（主题/语言/冲突策略/字号/缩放） |
| `voyager-cached-scan-result-v5` | 上次扫描结果缓存 |
| `voyager-recent-vaults-v1` | 最近使用的仓库路径 |
| `voyager-last-vault-v1` | 上次使用的仓库路径 |
| `voyager-display-mode-v1` | 显示模式偏好（缩略/原图/无图） |

---

### 十三、导出报告：三种格式生成

导出功能在 `src/lib/export.ts` 中实现，纯前端生成，不需要后端参与内容计算：

| 格式 | 实现 | 适用场景 |
|------|------|---------|
| **JSON** | `JSON.stringify(issues, null, 2)` | 程序化处理、二次开发 |
| **CSV** | 手动拼接表头 + 逐行转义（双引号内的双引号用 `""` 转义） | Excel 打开分析 |
| **Markdown** | 表格格式，带中文表头（类型/图片路径/大小/原因/建议目标） | 粘贴到 Obsidian 笔记中 |

导出的是**当前筛选后的结果**（不是全量扫描结果），用户可以先筛选出需要的子集再导出。支持 Broken 类型的导出。

保存路径通过 Tauri 的 `save` 对话框让用户选择，文件内容通过后端 `write_text_file` 命令写入磁盘（前端 WebView 无法直接写本地文件）。

---

### 十四、性能设计与瓶颈分析

#### 当前的性能优化措施

| 环节 | 优化措施 | 效果 |
|------|---------|------|
| 文件遍历 | Rust 原生 `fs::read_dir` 递归 | 比 Node.js 快 5-10 倍 |
| MD 并行解析 | Rayon `par_iter()` 多线程读取+正则解析 | 充分利用多核 CPU |
| 增量扫描 | ScanIndex 记录 mtime + MD 引用，跳过未变化文件 | 重复扫描速度大幅提升 |
| 正则匹配 | Rust `regex` crate 编译优化 | 单文件微秒级解析 |
| 代码块预处理 | 剥离围栏和行内代码，避免误匹配 | 提高准确性 |
| 引用查找 | `HashSet<String>` O(1) 查找 | 万级文件名查找无压力 |
| 文件名索引 | `HashMap<String, Vec<PathBuf>>` | 按文件名快速定位图片位置 |
| 缩略图并行 | Rayon `par_iter()` 多线程生成 | CPU 多核并行，速度提升 N 倍 |
| 缩略图格式 | WebP 替代 PNG | 缓存体积减少 30-50% |
| 级联缩放 | medium→small→tiny 每级从上一级缩放 | 避免三次从原图解码 |
| 缩略图缓存 | 哈希命名磁盘缓存 | 首次慢，后续秒开 |
| 画廊渲染 | 虚拟滚动（只渲染可见行） | 万级图片 DOM 节点 < 50 |
| 选中判定 | `Set<string>` 替代 `string[]` | `.has()` O(1) 替代 `.includes()` O(n) |
| 搜索防抖 | 300ms `setTimeout` + `useRef` | 快速输入时不频繁触发过滤 |
| 本地存储 | 内存缓存 + 异步写盘 | 读取零延迟，写入不阻塞 UI |
| 文件移动 | `fs::rename` 原子操作 | 同文件系统 O(1)，不复制内容 |
| 图片缓存刷新 | scanVersion + `?v=` 查询参数 | 清除缓存后不显示陈旧图片 |
| Web Worker 过滤 | >5000 条时自动切换 Worker 异步过滤 | 大数据集不阻塞 UI 主线程 |
| 重命名引用查找 | 利用 ScanIndex.mdRefs 反向查找 | 无需全盘扫描 MD 文件 |

---

### 十五、Rayon 并行缩略图生成

缩略图生成是整个扫描过程中最耗时的环节（每张图片需要解码 + 三次缩放），使用 Rayon 实现多线程并行：

#### 并行架构

```rust
// scanner.rs 中的并行缩略图生成
let done = AtomicUsize::new(0);

let results: Vec<_> = unique_paths
    .par_iter()          // Rayon 自动将任务分配到线程池
    .map(|path| {
        let multi = thumb_cache::generate_thumbnail_multi(path, SIZES).ok();
        let completed = done.fetch_add(1, Ordering::Relaxed) + 1;
        if completed % 50 == 0 || completed == total {
            cb("thumbnails", completed, total);  // 进度回调
        }
        (path.clone(), multi)
    })
    .collect();
```

- `par_iter()` 将图片列表均匀分配到 Rayon 线程池的所有线程
- `AtomicUsize` 原子计数器确保多线程下进度计数不会竞争
- `Ordering::Relaxed` 是最宽松的内存序，足够用于进度计数（无需严格顺序保证）
- 每 50 张图片或最后一张图片时向前端推送进度

#### 去重优化

同一张图片可能被多个 Markdown 文件引用，导致多个 `ScanIssue` 指向同一路径。在生成缩略图前，先通过 `HashSet` 去重，并过滤掉 Broken 类型：

```rust
let unique_paths: Vec<String> = {
    let mut seen = HashSet::new();
    result.issues.iter()
        .filter(|i| i.r#type != "broken" && seen.insert(i.image_path.clone()))
        .map(|i| i.image_path.clone())
        .collect()
};
```

---

### 十六、Tauri Event 进度流

通过 Tauri Event 系统实现后端到前端的实时进度推送。

#### 后端：`window.emit()`

```rust
#[tauri::command]
fn scan_vault(root: String, window: tauri::Window, ...) -> Result<ScanResult, String> {
    let progress: ProgressFn = Box::new(move |phase, current, total| {
        let _ = window.emit("scan-progress", serde_json::json!({
            "phase": phase, "current": current, "total": total,
        }));
    });
    scanner::scan_vault_with_thumbs(&root_path, generate_thumbs, thumb_size, Some(&progress))
}
```

`ProgressFn` 类型签名：`Box<dyn Fn(&str, usize, usize) + Send + Sync>`
- `Send + Sync`：因为 Rayon 并行中多线程需要共享这个回调
- `window.emit()` 是线程安全的，可以从任意线程调用

#### 三阶段进度

| 阶段 | phase 值 | 前端显示 | 触发频率 |
|------|---------|---------|---------|
| 收集文件 | `collecting` | "收集文件中..." | 每个目录一次 |
| 解析 Markdown | `parsing` | "解析 Markdown..." | 每 100 个文件一次 |
| 生成缩略图 | `thumbnails` | "生成缩略图..." | 每 50 张图片一次 |

---

### 十七、统计图表页：Recharts 可视化

独立的「统计」Tab 页（`StatsPage.tsx`，332 行），基于 Recharts 库（^3.7.0）实现 7 种可视化图表。

#### 数据来源

StatsPage 接收 `ScanResult` 作为 props，所有图表数据通过 `useMemo` 从 `result.issues` 计算而来，无需额外的后端接口。

#### 7 种图表

| 图表 | 类型 | 数据说明 |
|------|------|---------|
| 概览卡片 | 数字卡片 | 总 MD 数、总图片数、Orphan 数、Misplaced 数、Broken 数 |
| 问题类型分布 | PieChart | Orphan vs Misplaced vs Broken 占比 |
| 文件格式分布 | PieChart | png/jpg/gif/svg/webp/other 占比 |
| 文件大小分布 | BarChart | <100KB / 100KB-1MB / 1-5MB / >5MB 四档 |
| 目录 Top 10 | BarChart (横向) | 问题最多的前 10 个目录 |
| 时间分布 | BarChart | 按文件修改时间（fileMtime）按月分组 |
| 重复文件 | 表格 | 同名但不同路径的文件列表 |

#### 主题集成

Recharts 图表颜色通过 CSS 变量实现主题适配：

```typescript
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
const textColor = getCSSVar('--text-main')
```

---

### 十八、增量扫描

增量扫描机制大幅提升重复扫描速度。

#### ScanIndex 类型

```typescript
interface ScanIndex {
  files: Record<string, number>    // 文件路径 → mtime（修改时间戳）
  mdRefs: Record<string, string[]> // MD 文件路径 → 引用的图片文件名列表
}
```

#### 工作原理

1. 首次扫描：全量扫描所有文件，返回 `ScanResult`（包含 `scanIndex`）
2. 后续扫描：前端将上次的 `scanIndex` 作为 `prevIndex` 参数传给 `scan_vault`
3. 后端比对每个 MD 文件的 mtime，未变化的文件直接复用 `prevIndex.mdRefs` 中的引用数据
4. 图片分类（Orphan/Misplaced/Broken 判定）仍然全量执行，确保准确性

#### 缓存键

扫描结果缓存键为 **`voyager-cached-scan-result-v5`**。

版本历史：
- v1 → v2：添加 `fileSize` 字段
- v2 → v3：添加 `fileMtime` 字段
- v3 → v4：添加 `scanIndex` 字段
- v4 → v5：添加 `allImages` 字段 + `broken` 类型

---

### 十九、国际化（i18n）

中英双语支持，基于 React Context，无外部依赖。

#### 架构

- **翻译模块**：`src/lib/i18n.ts`，包含 200+ 翻译键值（zh/en 两套）
- **Context**：`LangContext` 提供当前语言，`useLang()` hook 获取翻译对象
- **类型**：`Lang = 'zh' | 'en'`，存储在 `UiSettings.lang` 中
- **切换入口**：`TitleBar.tsx` 中的语言切换按钮
- **导出函数**：`export.ts` 中的导出函数接受 `lang` 参数，生成对应语言的报告

#### 翻译键分组

| 分组 | 键数 | 示例 |
|------|------|------|
| TitleBar（Tab + 主题 + 窗口控制） | ~15 | `tabScan`, `tabGallery`, `tabHelp`, `themeAuto` |
| Sidebar（分类 + 搜索 + 筛选） | ~10 | `sidebarBrokenTooltip`, `sidebarFileType` |
| Toolbar（操作按钮） | ~15 | `toolbarFix`, `toolbarBackup`, `toolbarExport` |
| ScanPage（扫描/修复/重命名/备份） | ~35 | `scanCtxRename`, `scanRenameDone`, `scanBackupDone` |
| DetailPanel（详情面板） | ~15 | `detailRename`, `detailOpenRefNote`, `detailMissingFilename` |
| GalleryCard（画廊卡片） | ~7 | `galleryBrokenPlaceholder`, `galleryNoThumb` |
| StatsPage（统计页） | ~20 | `statsOrphanMisplacedBroken`, `statsIssueTypeDist` |
| GalleryPage（附件总览） | ~15 | `galleryGenerateThumbs`, `galleryClearCacheDesc`, `galleryStatsTotal` |
| HelpPage（说明页） | ~15 | `helpSettingAttachPath`, `helpSettingDeleteDesc` |
| Export（导出报告） | ~8 | `exportTypeBroken`, `exportColType` |
| 其他（确认对话框 / 迁移 / 日志） | ~40 | `confirmOk`, `brokenHint`, `statusHistory` |

---

### 二十、操作历史持久化

操作历史从纯内存存储升级为 JSON 文件持久化。

- **存储路径**：`{exe_dir}/voyager-data/ops-history.json`
- **加载时机**：应用启动时 `ops_log.rs` 自动从文件加载历史记录（`load_from_disk()`）
- **保存时机**：每次操作执行后自动写入文件（`save_task()`）
- **容量限制**：最多 200 条任务记录
- **操作类型**：`fix`（修复）、`migration`（迁移）、`backup`（目录备份）、`backup-zip`（ZIP 备份）、`rename`（重命名）
- **操作历史为只读**：不再支持撤回操作，历史记录仅用于审计和追溯

---

### 二十一、图片缓存刷新

解决了清除缩略图缓存后重新扫描时图片仍显示旧缓存的问题。

#### 实现方案

- `ScanPage` 和 `GalleryPage` 维护 `scanVersion` 状态（数字，每次扫描完成或清除缓存后递增）
- 所有图片/缩略图的 `src` URL 后追加 `?v={scanVersion}` 查询参数
- 浏览器/WebView 将带不同 `?v=` 的 URL 视为不同资源，强制重新加载
- `fileSrc` 和 `getThumbSrc` 用 `useCallback` 包裹，依赖 `scanVersion`，确保子组件正确重渲染

---

### 二十二、Rayon 并行 MD 解析

将 Markdown 文件的读取和引用解析从顺序 `for` 循环升级为 Rayon `par_iter()` 多线程并行，大幅缩短大仓库（数千个 MD 文件）的扫描耗时。

#### 并行架构

```rust
let md_total = md_files.len();
let md_done = AtomicUsize::new(0);

let parsed: Vec<(String, u64, Vec<String>)> = md_files
    .par_iter()
    .map(|md| {
        let md_key = md.to_string_lossy().to_string();
        let current_mtime = fs::metadata(md)...;

        // 增量扫描：mtime 未变化 → 复用上次缓存的引用列表
        let refs = if let Some(prev) = prev_index {
            if prev.files.get(&md_key) == Some(&current_mtime) {
                prev.md_refs.get(&md_key).cloned().unwrap_or_default()
            } else {
                fs::read_to_string(md).map(|c| extract_image_refs(&c)).unwrap_or_default()
            }
        } else {
            fs::read_to_string(md).map(|c| extract_image_refs(&c)).unwrap_or_default()
        };

        let completed = md_done.fetch_add(1, Ordering::Relaxed) + 1;
        if completed % 100 == 0 || completed == md_total {
            cb("parsing", completed, md_total);
        }
        (md_key, current_mtime, refs)
    })
    .collect();
```

#### 关键设计点

1. **每个线程独立返回元组** `(md_key, mtime, refs)`，避免共享可变状态
2. **`AtomicUsize` + `Ordering::Relaxed`** 实现无锁进度计数
3. **`unwrap_or_default()`** 替代 `?`：并行环境中单个文件读取失败不应中断整个扫描
4. **增量优化复用**：即使在并行环境中，mtime 对比逻辑依然有效

#### 顺序合并阶段

`collect()` 完成后，单线程顺序遍历 `parsed` 结果，合并到 `referenced_filenames`、`references`、`new_md_refs` 三个集合。ScanIndex 构建阶段复用 `parsed` 中已获取的 mtime，避免重复 `fs::metadata()` 调用。

---

### 二十三、一键备份（复制到目录 / ZIP 打包）

两种备份模式，用户选中图片后可一键导出。

#### 后端实现

**1. `backup_selected_files` — 复制到目录**

- `fs::create_dir_all()` 确保目标目录存在（含多层嵌套）
- 文件名冲突检测基于 `target.exists()`，自增后缀 `(1)`, `(2)`, ...
- 不存在的源文件标记为 `Skipped`，不中断其他文件

**2. `backup_selected_zip` — ZIP 打包**

- 使用 `zip` crate（v0.6），Deflate 压缩
- ZIP 内文件名冲突通过 `HashSet<String>` 检测
- `fs::read()` 将文件一次性读入内存再写入 ZIP
- 每个操作记录到 `ops_log` 操作历史

#### 前端交互

- Toolbar 下拉菜单提供两个选项：「备份到目录」和「打包为 ZIP」
- 仅在有选中文件时显示备份按钮
- `'directory'` 模式使用 `dialog.open({ directory: true })`，`'zip'` 模式使用 `dialog.save()`

---

### 二十四、Web Worker 过滤

引入 Web Worker 实现大数据集的异步过滤，避免 > 5000 条结果时 UI 卡顿。

#### 双路架构

```
用户输入搜索/筛选条件
    ↓
allIssues.length < 5000?
    ├── 是 → useMemo 同步过滤（零延迟，主线程执行）
    └── 否 → postMessage → Worker 线程过滤 → onmessage 回调更新状态
```

#### 共享过滤逻辑（`src/lib/filterUtils.ts`）

主线程和 Worker 共享同一个 `filterIssues()` 函数，避免逻辑重复。过滤链：搜索过滤 → 文件类型过滤 → 文件大小过滤。

`extGroupMap` 使用 `Record<string, string>` 而非 `Map`，因为 `Map` 不能通过 `postMessage` 的结构化克隆序列化。

#### Vite `?worker` 类型声明

```typescript
// src/vite-env.d.ts
declare module '*?worker' {
  const workerConstructor: new () => Worker
  export default workerConstructor
}
```

#### 测试兼容

jsdom 环境没有 `Worker`，创建包裹在 `try/catch` 中，失败时自动回退到同步路径。

---

### 二十五、应用图标生成

通过代码生成方式替代了 Tauri 默认占位图标。

- SVG 设计：蓝色渐变圆底 + 白色罗盘针 + 中心图片符号
- `scripts/generate-icons.mjs`：使用 `sharp` 转换为 14 种 PNG 尺寸 + `png-to-ico` 生成 Windows ICO
- 运行 `npm run generate-icons` 重新生成所有图标

---

### 二十六、附件总览画廊

独立的「附件总览」Tab 页（`GalleryPage.tsx`），展示仓库中**全部**附件图片（不仅是有问题的图片）。

#### 数据来源

扫描时后端返回的 `ScanResult.allImages: AttachmentInfo[]` 包含仓库中全部图片附件信息。每个 `AttachmentInfo` 包含：

```typescript
interface AttachmentInfo {
  path: string       // 图片完整路径
  fileName: string   // 文件名
  fileSize: number   // 文件大小（字节）
  fileMtime: number  // 修改时间（Unix 秒）
}
```

#### 适配器模式

`GalleryPage` 将 `AttachmentInfo[]` 通过 `toDisplayItem()` 适配为 `AuditIssue[]` 格式，从而复用 `VirtualGallery` 组件进行虚拟滚动画廊展示，设置 `readOnly` prop 隐藏选中/操作相关的 UI。

#### 空间分析仪表盘

页面顶部的 `StatsCards` 组件显示三个统计卡片：
- **附件总数**：`allImages.length`
- **总大小**：所有图片文件大小之和，自动格式化为 KB/MB/GB
- **筛选结果**：当应用了搜索或过滤时，显示筛选后的数量

侧边栏还内嵌两个迷你图表（Recharts）：
- **格式分布饼图**：png/jpg/gif/svg/webp/bmp/other 占比
- **大小分布柱状图**：<100KB / 100KB-1MB / 1-5MB / >5MB 四档

#### 缩略图管理

- **生成全部缩略图**按钮：调用 `generate_all_thumbnails` 命令为所有附件生成缩略图
- **清除缩略图缓存**按钮：调用 `clear_thumbnail_cache` 命令，清除后通过 `scanVersion` 刷新图片显示
- 提示文字说明 lazy load 优化已存在，不生成缩略图也可浏览

#### 缓存策略

缓存 `ScanResult` 时**剔除 `allImages` 字段**以控制存储体积（全部附件数据可能很大），`allImages` 每次扫描重新生成。加载缓存时 `allImages` 为 `undefined`，`GalleryPage` 检测到则显示「请先扫描」提示。

#### 图片预览弹窗

点击画廊卡片或图片区域会打开预览弹窗（Lightbox），功能包括：

- **图片大图预览**：优先使用 medium 缩略图，无缩略图时使用原图
- **文件信息**：显示完整路径和文件大小（自动格式化为 B/KB/MB）
- **左右切换**：弹窗左右箭头按钮或键盘方向键切换上一张/下一张
- **快捷操作**：「打开文件」用系统程序打开、「打开目录」在文件管理器中显示
- **关闭方式**：ESC 键、点击背景遮罩、或点击「取消」按钮

相比 ScanPage 的预览弹窗（含缩放/拖拽/全屏），Gallery 版本更简洁，保持只读浏览的定位。

#### Web Worker 过滤

与 `ScanPage` 共享同一套 Web Worker 过滤架构，当附件数量 > 5000 时自动切换到异步过滤。

---

### 二十七、说明页面

独立的「说明」Tab 页（`HelpPage.tsx`），展示 Obsidian 前提设置要求。

#### 内容

展示 5 个必须的 Obsidian 设置：

1. **附件默认存放路径** → 当前文件所在文件夹下指定的子文件夹
2. **子文件夹名称** → attachments
3. **笔记的内部链接类型** → 基于当前笔记的相对路径
4. **使用 Wiki 链接** → 开启
5. **删除文件设置** → 移至 Obsidian 回收站（.trash 文件夹）

每个设置包含设置名、推荐值和说明描述，全部文字通过 i18n 翻译，支持中英文。

---

## 常见问题

### `npm run tauri:build` 报错 `failed to get cargo metadata`
Linux 环境下终端可能没加载 cargo 的 PATH。执行：
```bash
PATH=$HOME/.cargo/bin:$PATH npm run tauri:build
```
> Windows/macOS 本地开发不需要这一步。

### Docker/WSL 中 `node_modules` 的 rollup 二进制不兼容
如果在 Windows 和 Linux (Docker/WSL) 之间切换开发环境，会遇到 rollup 原生二进制不匹配：
```bash
rm -rf node_modules && npm install
```
每次切换平台后都需要重新安装。

### 打包时图标报错
确保 `src-tauri/icons/` 目录下有有效的图片文件（32x32.png、128x128.png、icon.ico、icon.icns）。如果只是测试，可以用任意合规尺寸的 PNG 填充。

### 为什么用 Tauri v1 而不是 v2？
Tauri v2 要求 `glib-2.0 >= 2.70`，而很多 Linux 环境（如 Debian Bullseye 容器）的 glib 版本较低。为保证最大兼容性，本项目锁定 Tauri v1.5.0。**请不要升级 Tauri 版本。**

---

## npm 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（仅前端） |
| `npm run build` | TypeScript 编译 + Vite 打包（仅前端） |
| `npm test` | 运行 Vitest 测试（9 个文件，当前主工作区 16 个用例全部通过） |
| `npm run tauri:dev` | 启动 Tauri 开发模式（前端 + 后端热重载） |
| `npm run tauri:build` | 生产构建，输出可执行文件/安装包 |
| `npm run generate-icons` | 从内联 SVG 重新生成所有应用图标（PNG/ICO） |

---

## 许可证

MIT License
