# Gemini Frontend Handoff (Obsidian Attachments Voyager)

## 目标
在不破坏当前功能交互的前提下，重做 UI 视觉层与布局层。

## 项目目录结构（核心）

```text
Obsidian-attachments-voyager/
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ pages/
│  │  ├─ ScanPage.tsx
│  │  └─ MigratePage.tsx
│  ├─ components/
│  │  ├─ StatsCards.tsx
│  │  ├─ IssuesTable.tsx
│  │  ├─ FixPreviewPanel.tsx
│  │  ├─ MigratePlanTable.tsx
│  │  └─ ConfirmDialog.tsx
│  └─ types.ts
├─ index.html
├─ vite.config.ts
└─ src-tauri/
   └─ tauri.conf.json
```


### 应用入口与页面
- `src/main.tsx`
- `src/App.tsx`
- `src/pages/ScanPage.tsx`
- `src/pages/MigratePage.tsx`

### 业务展示组件
- `src/components/StatsCards.tsx`
- `src/components/IssuesTable.tsx`
- `src/components/FixPreviewPanel.tsx`
- `src/components/MigratePlanTable.tsx`
- `src/components/ConfirmDialog.tsx`

### 类型与结构
- `src/types.ts`

### 构建与壳层相关（只读理解）
- `index.html`
- `vite.config.ts`
- `src-tauri/tauri.conf.json`

## 功能约束（必须保持）
1. `ScanPage`：
   - “选择目录”必须可点击并触发目录选择。
   - “开始扫描”必须保留加载态与错误提示。
   - 扫描结果必须继续驱动 `StatsCards`、`IssuesTable`、`FixPreviewPanel`。
2. `MigratePage`：
   - “预览迁移计划”必须能生成并显示预览行。
   - “执行迁移”必须有明确反馈。
3. `App`：
   - 必须显示作者文案：`GitHub: KanameMadoka520`。
4. 不可移除任何现有交互按钮与语义文本（可重新布局/美化）。

## 禁止事项
- 不要改动 Rust 后端逻辑。
- 不要把功能按钮变成纯装饰按钮。
- 不要删除错误提示、状态提示。
- 不要引入大型状态管理库。

## 给 Gemini 的提示词（可直接粘贴）

```text
你是资深 React + TypeScript + UX 工程师。请只重构 Obsidian Attachments Voyager 的前端视觉与布局，不破坏现有功能行为。

项目关键文件：
- src/main.tsx
- src/App.tsx
- src/pages/ScanPage.tsx
- src/pages/MigratePage.tsx
- src/components/StatsCards.tsx
- src/components/IssuesTable.tsx
- src/components/FixPreviewPanel.tsx
- src/components/MigratePlanTable.tsx
- src/components/ConfirmDialog.tsx
- src/types.ts

必须保持：
1) ScanPage 的“选择目录”“开始扫描”行为保持可用。
2) MigratePage 的“预览迁移计划”“执行迁移”行为保持可用。
3) 作者文案 `GitHub: KanameMadoka520` 仍可见。
4) 错误提示、加载状态、执行反馈仍可见。

设计要求：
- 现代简洁风格，信息层级清晰。
- 主操作按钮突出，输入区与结果区分组。
- 表格可读性提升（间距、对齐、空态提示）。
- 中文文案保留，交互语义不变。

交付要求：
- 给出完整修改后的代码。
- 列出修改文件清单。
- 简述每处改动如何保证不破坏功能。
- 提供最小验证步骤（点击路径）。
```

## 验收清单（给 Gemini）
- [ ] 所有原有按钮仍存在且可点击。
- [ ] ScanPage 目录选择、扫描结果展示可用。
- [ ] MigratePage 预览/执行反馈可用。
- [ ] 作者文案仍可见。
- [ ] 未引入与需求无关的新依赖。
