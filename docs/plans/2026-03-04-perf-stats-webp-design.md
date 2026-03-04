# 性能优化 + 统计图表 + WebP 缩略图 设计文档

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让上万张图片的仓库扫描流畅不卡顿，新增统计图表 Tab 页，缩略图改用 WebP 格式减少体积。

**Architecture:** 后端 Rayon 并行 + Tauri Event 流式进度 + 增量扫描；前端 Recharts 图表 + 防抖/Set 优化；缩略图 PNG→WebP。

**Tech Stack:** Rayon 1.10, Recharts, Tauri Event API

---

## 模块 A：后端性能优化

### A1. 并行缩略图（Rayon）
- `Cargo.toml` 新增 `rayon = "1.10"`
- `scanner.rs` 中 `scan_vault_with_thumbs` 的缩略图生成改为 `par_iter()`
- 使用 `AtomicUsize` 计数已完成数量，配合进度推送

### A2. WebP 缩略图
- `thumb_cache.rs`：`ImageFormat::Png` → `ImageFormat::WebP`
- 哈希文件名 `.png` → `.webp`
- 旧 PNG 缓存通过 `clear_cache` 清除（已有功能）

### A3. Tauri Event 流式进度
- `scan_vault` 命令接收 `tauri::Window` 参数
- 三阶段推送：collecting → parsing → thumbnails
- 前端 `listen('scan-progress', ...)` 监听并更新进度条

### A4. ScanIssue 新增 file_mtime 字段
- `models.rs`：`file_mtime: Option<u64>`（Unix 秒时间戳）
- `scanner.rs`：`fs::metadata().modified()` 获取
- 前端类型同步：`AuditIssue.fileMtime?: number`

### A5. 增量扫描
- 前端缓存 `lastScanTimestamp`
- 后端接收 `last_scan_time: Option<u64>` 参数
- 只重新读取 mtime > last_scan_time 的 Markdown 文件
- 未变化文件复用上次引用关系

## 模块 B：前端性能优化

### B1. 搜索防抖
- `searchText` 输入 300ms debounce
- 使用自定义 `useDebounce` hook 或 `setTimeout`

### B2. 选择状态 Set 化
- `selectedIssueIds` 从 `string[]` 改为 `Set<string>`
- `includes()` O(n) → `has()` O(1)

### B3. 进度条 UI
- Toolbar 下方新增进度条组件 `ProgressBar.tsx`
- 三阶段进度：文件收集 → Markdown 解析 → 缩略图生成
- 显示：`扫描中... 3,247/10,000 张图片 (32%)`

## 模块 C：统计图表

### C1. 新 Tab 页
- TitleBar 新增「统计」Tab
- `App.tsx` 新增 `activeTab: 'scan' | 'migrate' | 'stats'`
- 新页面 `src/pages/StatsPage.tsx`

### C2. 图表内容（Recharts）
1. 仓库总览卡片：总 MD / 总图片 / 问题数 / Orphan 数 / Misplaced 数
2. Orphan vs Misplaced 饼图
3. 文件类型分布饼图（按扩展名）
4. 文件大小分布柱状图（<100KB / 100KB-1MB / 1-5MB / >5MB）
5. 问题目录 Top 10 横向柱状图
6. 文件时间分布柱状图（按月分组）
7. 重复文件检测表格（同名+同大小）

### C3. 数据流
- StatsPage 接收 `ScanResult` 作为 prop（从 App 或 ScanPage 传递）
- 所有统计在前端 JS 中计算（纯 useMemo）
- 无需额外后端命令

### C4. 主题适配
- Recharts 颜色从 CSS 变量读取（`getComputedStyle` 获取 `--primary-color` 等）
- 图表背景透明，文字颜色用 `var(--text-main)`

## 缓存版本
- 扫描结果缓存键从 `v2` bump 到 `v3`（新增 fileMtime 字段）
