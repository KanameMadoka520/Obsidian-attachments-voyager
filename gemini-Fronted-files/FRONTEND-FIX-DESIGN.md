# Obsidian Attachments Voyager 前端功能修复与UI交接设计（2026-03-03）

## 1. 目标

在保持最小改动的前提下，先修复核心可用性问题，再为后续 Gemini 前端重设计提供可执行交接。

本次明确目标：
1. 修复 `ScanPage` 的“选择目录”按钮（弹系统目录选择框并回填路径）。
2. 打通“开始扫描”到 Rust `scan_vault` 的真实调用链并展示结果。
3. 修复 `MigratePage` 的“预览迁移计划”“执行迁移”按钮，使其具备可验证行为。
4. 在 UI 中显示作者信息：`GitHub: KanameMadoka520`。

## 2. 范围边界

### 包含
- 目录选择功能接入（Tauri dialog）。
- 扫描动作接入（Tauri invoke）。
- 迁移页按钮最小可用行为与反馈。
- 作者信息展示。

### 不包含
- 大规模视觉重构。
- 新增复杂状态管理或架构调整。
- 与当前故障无关的扩展功能。

## 3. 技术方案

### 3.1 ScanPage 目录选择
- 文件：`src/pages/ScanPage.tsx`
- 使用：`@tauri-apps/api/dialog` 的 `open({ directory: true })`
- 行为：
  - 取消选择：保持当前输入值。
  - 选择成功：写入 `vaultPath`。

### 3.2 ScanPage 扫描流程
- 文件：`src/pages/ScanPage.tsx`
- 使用：`@tauri-apps/api/tauri` 的 `invoke('scan_vault', { root: vaultPath })`
- 状态：`loading` / `error` / `result`
- 现有组件接入真实数据：
  - `StatsCards`
  - `IssuesTable`
  - `FixPreviewPanel`

### 3.3 MigratePage 两个按钮修复
- 文件：`src/pages/MigratePage.tsx`
- 预览按钮：基于 `notePath` 与 `targetDir` 生成可见预览项。
- 执行按钮：执行动作后给出明确反馈（成功/失败/后端未接入说明）。
- 原则：先保证“可验证、可反馈”，不做超出需求的复杂化。

### 3.4 作者信息
- 文件：`src/App.tsx`
- 显示文案：`GitHub: KanameMadoka520`
- 位置：全局可见、但不干扰当前主流程。

## 4. 验收标准

1. `ScanPage` 点击“选择目录”后弹系统目录选择窗口，选择后输入框更新。
2. 点击“开始扫描”后显示加载态并展示真实扫描结果。
3. `MigratePage`：
   - “预览迁移计划”后表格有可见变化；
   - “执行迁移”后有明确反馈。
4. UI 上可见作者信息 `GitHub: KanameMadoka520`。
5. `npm run tauri:build` 成功。

## 5. 交给 Gemini 的后续前端设计约束（功能修复后再执行）

- 只改视觉层与布局，不破坏现有交互行为。
- 必须保留按钮语义与事件绑定。
- 不得移除错误提示、加载状态、成功反馈。
- 提交内容需包含变更文件列表与运行截图验证。
