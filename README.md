# Obsidian Attachments Voyager (附件巡游者)

Obsidian Attachments Voyager 是一个跨平台桌面工具，专为 Obsidian 重度用户设计。它能扫描 Obsidian 仓库中的附件，精准识别**未引用图片（孤立附件 Orphan）**与**错位图片（Misplaced）**，并提供安全的批量修复功能。

技术栈：**Tauri v1.5 + React 19 + Rust 2021 + TypeScript 5.9 + Vite 7**

---

## 使用前提（非常重要）

本工具基于一套特定的 Obsidian 附件管理规范。请打开 Obsidian 的 **设置 -> 文件与链接**，确认以下设置：

| 设置项 | 必须值 |
|--------|--------|
| 附件默认存放路径 | 当前文件所在文件夹下指定的子文件夹 |
| 子文件夹名称 | `attachments` |
| 内部链接类型 | 基于当前笔记的相对路径（推荐） |
| 始终更新内部链接 | 开启（强烈推荐） |

> 只要你的笔记在 `vault/folder/` 下，图片就应该在 `vault/folder/attachments/` 下。不符合此结构的图片会被识别为「错位」。

---

## 功能概览

### 核心功能
- **附件扫描**：递归扫描仓库，识别孤立附件和错位附件，支持 Rayon 多线程并行处理
- **增量扫描**：记录文件 mtime 和 MD 引用索引（ScanIndex），后续扫描自动跳过未变化的 Markdown 文件，大幅提升重复扫描速度
- **实时进度**：扫描过程通过 Tauri Event 流式推送进度（收集文件 → 解析 Markdown → 生成缩略图），前端进度条实时显示百分比
- **批量修复**：一键移动错位图片到正确目录 + 删除孤立图片，支持冲突策略（覆盖/改名/逐个确认）
- **操作历史**：所有修复操作记录在操作历史中，持久化到 `voyager-data/ops-history.json`，重启后不丢失
- **统计图表**：独立统计 Tab 页，Recharts 可视化（饼图、柱状图、Top 10 目录排行、时间分布等 7 种图表）
- **中英双语（i18n）**：支持中文/英文界面切换，150+ 翻译键值，基于 React Context 实现

### 界面功能
- **三栏布局**：左侧分类/筛选侧边栏 + 中间画廊 + 右侧详情面板
- **虚拟滚动画廊**：基于 `@tanstack/react-virtual`，万级图片流畅浏览（Set 集合 O(1) 选中判定 + 搜索 300ms 防抖）
- **缩略图系统**：Rayon 并行生成三级 WebP 缩略图（64px / 256px / 1024px），比 PNG 缓存体积减少 30-50%
- **全屏图片查看器**：OS 级全屏 + 滚轮缩放 + 拖拽平移 + 方向键切换
- **四套主题**：跟随系统 / 亮色 / 暗色 / 羊皮纸（Anthropic 风格）
- **筛选系统**：文件名搜索 + 文件类型过滤 + 文件大小过滤
- **右键菜单**：画廊卡片右键 -> 打开文件/目录、复制路径、全屏查看
- **导出报告**：JSON / CSV / Markdown 三种格式，导出当前筛选结果
- **日志抽屉**：底部状态栏展开查看运行日志和操作历史
- **自定义标题栏**：无系统边框，自定义拖拽区域 + 窗口控制按钮 + 语言切换

### 数据存储
- 所有用户设置和缓存数据存储在 **exe 同目录的 `voyager-data/` 文件夹**中（不写入 C 盘 AppData）
- 操作历史持久化到 `voyager-data/ops-history.json`，应用重启后自动加载
- 缩略图缓存存储在仓库根目录的 `.voyager-gallery-cache/` 中

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
│   ├── App.tsx                    # 根组件，设置管理，主题切换
│   ├── main.tsx                   # React 入口
│   ├── types.ts                   # 类型定义
│   ├── index.css                  # 全局样式（约 1301 行，四套主题变量）
│   ├── components/                # UI 组件
│   │   ├── TitleBar.tsx           # 自定义标题栏
│   │   ├── Toolbar.tsx            # 工具栏（扫描/修复/导出）
│   │   ├── Sidebar.tsx            # 侧边栏（分类/搜索/筛选）
│   │   ├── VirtualGallery.tsx     # 虚拟滚动画廊
│   │   ├── GalleryCard.tsx        # 画廊卡片
│   │   ├── DetailPanel.tsx        # 右侧详情面板
│   │   ├── StatusBar.tsx          # 底部状态栏 + 日志抽屉
│   │   ├── ContextMenu.tsx        # 右键上下文菜单
│   │   ├── ConfirmDialog.tsx      # 确认对话框
│   │   └── ...
│   │   ├── ProgressBar.tsx         # 扫描进度条（三阶段进度 + 不定进度动画）
│   │   └── ...
│   ├── pages/                     # 页面
│   │   ├── ScanPage.tsx           # 扫描页（主功能）
│   │   ├── MigratePage.tsx        # 迁移页
│   │   └── StatsPage.tsx          # 统计页（Recharts 可视化图表）
│   ├── lib/                       # 工具库
│   │   ├── commands.ts            # Tauri IPC 命令封装
│   │   ├── storage.ts             # 本地存储（exe 同目录）
│   │   ├── export.ts              # 导出格式生成
│   │   └── i18n.ts                # 中英双语翻译模块（150+ 键值，LangContext + useLang hook）
│   └── __tests__/                 # 前端测试（11 个用例）
├── src-tauri/                     # 后端 Rust + Tauri
│   ├── src/
│   │   ├── main.rs                # Tauri 命令注册
│   │   ├── scanner.rs             # 仓库扫描逻辑
│   │   ├── parser.rs              # Markdown 链接解析
│   │   ├── models.rs              # 数据结构
│   │   ├── migrate.rs             # 笔记迁移
│   │   ├── ops_log.rs             # 操作历史（JSON 持久化）
│   │   ├── runtime_log.rs         # 运行日志
│   │   ├── thumb_cache.rs         # 缩略图缓存
│   │   └── startup_diag.rs        # 启动诊断
│   ├── Cargo.toml                 # Rust 依赖
│   └── tauri.conf.json            # Tauri 应用配置
├── docs/plans/                    # 设计文档和实施计划
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
| [二、修复机制](#二修复机制移动和删除是怎么做的) | Orphan 删除、Misplaced 移动、三种冲突策略、操作记录 |
| [三、笔记迁移](#三笔记迁移整篇笔记连带附件搬家) | 连带附件搬家，先移附件后移笔记的安全顺序 |
| [四、缩略图系统](#四缩略图系统rayon-并行--webp-格式) | 三级尺寸、级联缩放、哈希命名、Rayon 并行、WebP 格式 |
| [五、虚拟滚动](#五虚拟滚动画廊万级图片不卡顿) | @tanstack/react-virtual 原理、自适应列数、overscan 预渲染 |
| [六、主题系统](#六主题系统四套主题的-css-变量方案) | CSS 变量方案、data-theme 属性切换、matchMedia 跟随系统 |
| [七、前后端通信](#七前后端通信tauri-ipc-机制) | Tauri IPC invoke 机制、serde camelCase 序列化 |
| [八、本地存储](#八本地存储替代-localstorage-的文件方案) | 替代 localStorage 的文件方案、内存缓存 + 异步写盘 |
| [九、导出报告](#九导出报告三种格式生成) | JSON/CSV/Markdown 三种格式、筛选后导出、Tauri save dialog |
| [十、性能分析](#十性能设计与瓶颈分析) | 当前优化措施 + 瓶颈分析 |
| [十一、Rayon 并行缩略图](#十一rayon-并行缩略图生成) | 多线程 par_iter + AtomicUsize 进度计数 |
| [十二、Tauri Event 进度流](#十二tauri-event-进度流) | 后端 window.emit → 前端 listen 实时进度推送 |
| [十三、统计图表页](#十三统计图表页recharts-可视化) | 7 种图表、CSS 变量集成、useMemo 计算 |
| [十四、增量扫描](#十四增量扫描) | ScanIndex（mtime + mdRefs）、跳过未变化 MD 文件、缓存键 v4 |
| [十五、国际化（i18n）](#十五国际化i18n) | React Context 方案、150+ 翻译键、LangContext + useLang hook |
| [十六、操作历史持久化](#十六操作历史持久化) | JSON 文件持久化、启动加载、重启不丢失 |
| [十七、图片缓存刷新](#十七图片缓存刷新) | scanVersion 状态 + ?v= 查询参数、清除缓存后刷新 |

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

逐个读取每个 `.md` 文件的全部文本内容（`fs::read_to_string`），然后用两个正则表达式提取图片引用：

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

所有提取到的文件名汇入 `referenced_filenames: HashSet<String>` 用于快速查找，同时保留 `references: Vec<(PathBuf, String)>` 记录每个引用来自哪个 Markdown 文件。

#### 第三阶段：交叉比对，识别问题

**孤立附件（Orphan）检测**：遍历所有图片文件，如果某张图片的文件名不在 `referenced_filenames` 集合中，说明没有任何笔记引用它，标记为孤立附件。

```rust
for img in image_files {
    if !referenced_filenames.contains(filename) {
        // → Orphan：没有任何 Markdown 文件引用此图片
    }
}
```

**错位附件（Misplaced）检测**：遍历所有引用关系 `(md_path, filename)`，对于每个引用：

1. 通过文件名在 `by_filename: HashMap<String, Vec<PathBuf>>` 中查找图片的实际位置
2. 计算图片的**期望位置**：`{笔记所在目录}/attachments/{文件名}`
3. 如果实际位置 ≠ 期望位置，标记为错位附件

```rust
let expected = md_path.parent().join("attachments").join(filename);
if actual_path != expected {
    // → Misplaced：图片不在引用它的笔记旁边的 attachments/ 中
}
```

额外检测：如果引用图片的 Markdown 文件本身在 `.trash/` 或 `trash/` 目录中（Obsidian 回收站），会在 reason 中标注「Markdown 文档已在 trash 中」，供用户判断是否要删除。

#### 文件大小获取

在创建每个 `ScanIssue` 时，通过 `std::fs::metadata(path).map(|m| m.len()).ok()` 获取文件字节大小。使用 `ok()` 将 `Result` 转为 `Option`，这样即使某个文件的 metadata 读取失败（权限问题等），也不会阻断整个扫描流程。

---

### 二、修复机制：移动和删除是怎么做的

修复操作在 `main.rs` 的 `fix_issues()` 函数中实现，根据问题类型执行不同操作：

#### Orphan（孤立附件）→ 删除

直接调用 `std::fs::remove_file(source)` 删除文件。这是**不可逆操作**——删除后文件不进回收站，直接从磁盘移除。因此 UI 上会明确提示用户，删除操作无法自动撤回。

#### Misplaced（错位附件）→ 移动

将图片从当前错误位置移动到正确位置（`{引用笔记目录}/attachments/{文件名}`）：

1. 先用 `fs::create_dir_all(target.parent())` 确保目标目录存在
2. 再用 `fs::rename(source, target)` 执行原子移动

`fs::rename` 在同一文件系统内是原子操作（O(1) 时间复杂度），不会复制文件内容，只是修改目录项指针。

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

### 三、笔记迁移：整篇笔记连带附件搬家

迁移功能（`migrate.rs`）将一篇笔记及其引用的所有附件移动到新目录：

1. **解析引用**：读取笔记内容，用 `extract_image_refs()` 提取所有图片引用
2. **移动附件**：对每个引用的图片，从 `{笔记目录}/attachments/{文件名}` 移动到 `{目标目录}/attachments/{文件名}`
3. **移动笔记**：最后移动 `.md` 文件本身到目标目录
4. **冲突处理**：与修复操作共享同一套 `ConflictPolicy`（覆盖/改名/逐个确认）
5. **记录操作**：所有移动操作记入 `OperationTask`，持久化到操作历史

移动顺序很重要：先移附件，最后移笔记。这样如果中途出错，笔记文件仍在原位，用户可以重试。

---

### 四、缩略图系统：Rayon 并行 + WebP 格式

缩略图生成在 `thumb_cache.rs` 中实现，使用 Rust 的 `image` crate + `rayon` 并行库。

#### 三级尺寸

| 级别 | 尺寸 | 用途 |
|------|------|------|
| `tiny` | 64px | 保留给未来极小展示场景 |
| `small` | 256px | 画廊卡片展示 |
| `medium` | 1024px | 详情面板预览和全屏查看前的快速加载 |

#### 生成流程

```
1. 计算原始图片路径的哈希值 → 作为缓存文件名（如 `a3f2b1c9.webp`）
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

用户可以在日志抽屉的操作历史 Tab 中一键清除全部缩略图缓存。

---

### 五、虚拟滚动画廊：万级图片不卡顿

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

---

### 六、主题系统：四套主题的 CSS 变量方案

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

### 七、前后端通信：Tauri IPC 机制

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

---

### 八、本地存储：替代 localStorage 的文件方案

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

```
启动流程：
App.tsx mount → initStorage() → invoke('read_all_local_storage')
                                    → 后端遍历 voyager-data/*.json
                                    → 返回 {key: value, ...}
                                    → 写入内存 Map
                                    → ready = true → 渲染 UI
```

---

### 九、导出报告：三种格式生成

导出功能在 `src/lib/export.ts` 中实现，纯前端生成，不需要后端参与内容计算：

| 格式 | 实现 | 适用场景 |
|------|------|---------|
| **JSON** | `JSON.stringify(issues, null, 2)` | 程序化处理、二次开发 |
| **CSV** | 手动拼接表头 + 逐行转义（双引号内的双引号用 `""` 转义） | Excel 打开分析 |
| **Markdown** | 表格格式，带中文表头（类型/图片路径/大小/原因/建议目标） | 粘贴到 Obsidian 笔记中 |

导出的是**当前筛选后的结果**（不是全量扫描结果），用户可以先筛选出需要的子集再导出。

保存路径通过 Tauri 的 `save` 对话框让用户选择，文件内容通过后端 `write_text_file` 命令写入磁盘（前端 WebView 无法直接写本地文件）。

---

### 十、性能设计与瓶颈分析

#### 当前的性能优化措施

| 环节 | 优化措施 | 效果 |
|------|---------|------|
| 文件遍历 | Rust 原生 `fs::read_dir` 递归 | 比 Node.js 快 5-10 倍 |
| 增量扫描 | ScanIndex 记录 mtime + MD 引用，跳过未变化文件 | 重复扫描速度大幅提升 |
| 正则匹配 | Rust `regex` crate 编译优化 | 单文件微秒级解析 |
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

#### 预计性能瓶颈

**1. 大仓库扫描阶段** ✅ 已优化

- **瓶颈点**：`fs::read_to_string()` 逐个读取每个 Markdown 文件
- **Phase 7 已实施的优化**：
  - ✅ 增量扫描（ScanIndex 记录文件 mtime + MD 引用，跳过未变化的 Markdown 文件）
  - ✅ 图片分类仍全量执行，确保准确性
- **剩余优化方向**：
  - 使用 `rayon` 并行读取（多线程 I/O）
  - 内存映射（`mmap`）替代 `read_to_string`

**2. 缩略图首次生成** ✅ 已优化

- **瓶颈点**：`image::open()` 解码原图 + `resize()` 缩放
- **Phase 6 已实施的优化**：
  - ✅ Rayon `par_iter()` 并行生成（多核 CPU 线性加速）
  - ✅ WebP 格式替代 PNG（缓存体积减少 30-50%）
  - ✅ 进度回调 + 前端进度条显示
- ✅ 级联缩放：medium→small→tiny，每级从上一级缩放（Phase 7 实施）

**3. 前端筛选性能** ✅ 已优化

- **瓶颈点**：每次筛选条件变化时，对全量 issues 数组执行 `.filter()` 链
- **Phase 6 已实施的优化**：
  - ✅ 搜索输入 300ms 防抖（`useRef` + `setTimeout`）
  - ✅ `selectedIssueIds` 从 `string[]` 改为 `Set<string>`，`.has()` O(1) 替代 `.includes()` O(n)
  - ✅ `useMemo` 缓存中间结果
- **剩余优化方向**：超大数据集（>50,000）可考虑 Web Worker 离线过滤

**4. 操作历史** ✅ 已优化

- **Phase 7 已实施的优化**：
  - ✅ 操作历史持久化到 `voyager-data/ops-history.json`，应用重启后自动加载
  - ✅ 限制最多保留 200 条任务记录，超出后丢弃最旧的

**5. 跨文件系统移动**

- **瓶颈点**：`fs::rename()` 在跨文件系统时退化为复制+删除
- **原因**：Linux 下如果仓库和目标在不同挂载点，`rename` 会失败
- **影响场景**：罕见，但在使用外部硬盘或网络挂载时可能遇到
- **可能的优化方向**：检测到跨文件系统时改用 `fs::copy` + `fs::remove_file`

---

### 十一、Rayon 并行缩略图生成

缩略图生成是整个扫描过程中最耗时的环节（每张图片需要解码 + 三次缩放），Phase 6 引入 Rayon 实现多线程并行：

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

同一张图片可能被多个 Markdown 文件引用，导致多个 `ScanIssue` 指向同一路径。在生成缩略图前，先通过 `HashSet` 去重：

```rust
let unique_paths: Vec<String> = {
    let mut seen = HashSet::new();
    result.issues.iter()
        .filter(|i| seen.insert(i.image_path.clone()))
        .map(|i| i.image_path.clone())
        .collect()
};
```

这样每张物理图片只生成一次缩略图，生成后的结果通过路径映射回所有引用它的 issue。

---

### 十二、Tauri Event 进度流

Phase 6 通过 Tauri Event 系统实现后端到前端的实时进度推送，替代了之前的"扫描中请等待"的无反馈体验。

#### 后端：`window.emit()`

```rust
// main.rs 中的 scan_vault 命令
#[tauri::command]
fn scan_vault(root: String, window: tauri::Window, ...) -> Result<ScanResult, String> {
    let progress: ProgressFn = Box::new(move |phase, current, total| {
        let _ = window.emit("scan-progress", serde_json::json!({
            "phase": phase,
            "current": current,
            "total": total,
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

#### 前端：`listen()` + `unlisten()`

```typescript
// ScanPage.tsx 中的 runScan
const unlisten = await listen<ScanProgress>('scan-progress', (event) => {
  setScanProgress(event.payload)
})
try {
  const result = await invoke<ScanResult>('scan_vault', { ... })
  // 处理结果
} finally {
  unlisten()  // 扫描结束后必须取消监听，避免内存泄漏
}
```

#### ProgressBar 组件

`ProgressBar.tsx`（50 行）支持两种显示模式：
- **不定进度**：扫描刚开始，尚未收到第一条进度消息时，显示动画条纹
- **确定进度**：收到进度数据后，显示 `{label} {current}/{total} ({percent}%)` 和对应宽度的填充条

---

### 十三、统计图表页：Recharts 可视化

Phase 6 新增独立的「统计」Tab 页（`StatsPage.tsx`，332 行），基于 Recharts 库（^3.7.0）实现 7 种可视化图表。

#### 数据来源

StatsPage 接收 `ScanResult` 作为 props，所有图表数据通过 `useMemo` 从 `result.issues` 计算而来，无需额外的后端接口。

#### 7 种图表

| 图表 | 类型 | 数据说明 |
|------|------|---------|
| 概览卡片 | 数字卡片 | 总 MD 数、总图片数、Orphan 数、Misplaced 数 |
| 问题类型分布 | PieChart | Orphan vs Misplaced 占比 |
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
// 用于 Recharts 的 tick、grid、label 颜色
const textColor = getCSSVar('--text-main')
```

#### fileMtime 字段

为支持时间分布图表，Phase 6 在后端 `ScanIssue` 中新增 `file_mtime: Option<u64>` 字段，通过 `fs::metadata().modified()` 获取文件修改时间的 Unix 秒数。前端类型 `AuditIssue` 对应添加 `fileMtime?: number`。

---

### 十四、增量扫描

Phase 7 引入增量扫描机制，大幅提升重复扫描速度。

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
4. 图片分类（Orphan/Misplaced 判定）仍然全量执行，确保准确性

#### 缓存键

扫描结果缓存键为 **`voyager-cached-scan-result-v4`**（v3 → v4，因新增 `scanIndex` 字段）。

---

### 十五、国际化（i18n）

Phase 7 实现中英双语支持，基于 React Context，无外部依赖。

#### 架构

- **翻译模块**：`src/lib/i18n.ts`，包含 150+ 翻译键值（zh/en 两套）
- **Context**：`LangContext` 提供当前语言，`useLang()` hook 获取翻译函数
- **类型**：`Lang = 'zh' | 'en'`，存储在 `UiSettings.lang` 中
- **切换入口**：`TitleBar.tsx` 中的语言切换按钮
- **影响范围**：16 个文件更新，覆盖所有 UI 文本
- **导出函数**：`export.ts` 中的导出函数接受 `lang` 参数，生成对应语言的报告

---

### 十六、操作历史持久化

Phase 7 将操作历史从纯内存存储升级为 JSON 文件持久化。

- **存储路径**：`{exe_dir}/voyager-data/ops-history.json`
- **加载时机**：应用启动时 `ops_log.rs` 自动从文件加载历史记录
- **保存时机**：每次操作执行后自动写入文件
- **容量限制**：最多 200 条任务记录
- **操作历史为只读**：不再支持撤回操作，历史记录仅用于审计和追溯

---

### 十七、图片缓存刷新

Phase 7 解决了清除缩略图缓存后重新扫描时图片仍显示旧缓存的问题。

#### 实现方案

- `ScanPage` 维护 `scanVersion` 状态（数字，每次扫描完成后递增）
- 所有图片/缩略图的 `src` URL 后追加 `?v={scanVersion}` 查询参数
- 浏览器/WebView 将带不同 `?v=` 的 URL 视为不同资源，强制重新加载
- 测试中图片 `src` 断言应使用 `.toContain()` 而非精确匹配，因为 URL 末尾有 `?v=N`

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
| `npm test` | 运行 Vitest 测试（11 个用例，6 个文件） |
| `npm run tauri:dev` | 启动 Tauri 开发模式（前端 + 后端热重载） |
| `npm run tauri:build` | 生产构建，输出可执行文件/安装包 |

---

## 许可证

MIT License
