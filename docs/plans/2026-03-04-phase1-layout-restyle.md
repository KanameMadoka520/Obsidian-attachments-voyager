# Phase 1: Three-Panel Layout + Custom Title Bar + De-Webification

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the single-column web-page layout into a three-panel desktop app (sidebar + gallery + detail panel) with custom title bar and tightened styling.

**Architecture:** Replace App.tsx header/main/footer with a full-viewport flex layout. Extract sidebar, detail panel, and status bar as new components. Restyle index.css to remove card-stacking and use panel dividers. Tauri `decorations: false` enables custom title bar with drag region.

**Tech Stack:** React 19, Tauri v1 window API (`@tauri-apps/api/window`), CSS custom properties, existing `@tanstack/react-virtual`.

---

### Task 1: Tauri — Disable system decorations

**Files:**
- Modify: `src-tauri/tauri.conf.json:60-68` (windows array)

**Step 1: Update tauri.conf.json window config**

Change the windows entry to:
```json
{
  "fullscreen": false,
  "height": 700,
  "resizable": true,
  "title": "Obsidian Attachments Voyager",
  "width": 1000,
  "decorations": false,
  "transparent": false,
  "minWidth": 800,
  "minHeight": 500
}
```

**Step 2: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: disable system decorations for custom title bar"
```

---

### Task 2: Create TitleBar component

**Files:**
- Create: `src/components/TitleBar.tsx`
- Modify: `src/index.css` (add title-bar styles)

**Step 1: Write TitleBar.tsx**

```tsx
import { appWindow } from '@tauri-apps/api/window'
import { useState, useEffect } from 'react'

interface TitleBarProps {
  activeTab: 'scan' | 'migrate'
  onTabChange: (tab: 'scan' | 'migrate') => void
}

function TitleBar({ activeTab, onTabChange }: TitleBarProps) {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    const check = () => {
      appWindow.isMaximized().then(setMaximized).catch(() => {})
    }
    check()
    const unlisten = appWindow.onResized(() => { check() })
    return () => { unlisten.then((fn) => fn()) }
  }, [])

  return (
    <div className="title-bar" data-tauri-drag-region>
      <div className="title-bar-left">
        <span className="title-bar-brand">Voyager</span>
        <nav className="title-bar-nav">
          <button
            type="button"
            className={`title-bar-tab ${activeTab === 'scan' ? 'active' : ''}`}
            onClick={() => onTabChange('scan')}
          >
            附件扫描
          </button>
          <button
            type="button"
            className={`title-bar-tab ${activeTab === 'migrate' ? 'active' : ''}`}
            onClick={() => onTabChange('migrate')}
          >
            联动迁移
          </button>
        </nav>
      </div>
      <div className="title-bar-controls">
        <button type="button" className="title-bar-btn" onClick={() => appWindow.minimize()} aria-label="最小化">─</button>
        <button type="button" className="title-bar-btn" onClick={() => appWindow.toggleMaximize()} aria-label={maximized ? '还原' : '最大化'}>{maximized ? '⧉' : '□'}</button>
        <button type="button" className="title-bar-btn title-bar-close" onClick={() => appWindow.close()} aria-label="关闭">✕</button>
      </div>
    </div>
  )
}

export default TitleBar
```

**Step 2: Add title-bar CSS to index.css**

Append to `src/index.css`:
```css
/* ─── Title Bar ─── */
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  padding: 0 4px 0 12px;
  background: var(--panel-bg);
  border-bottom: 1px solid var(--border-color);
  user-select: none;
  flex-shrink: 0;
}

.title-bar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-bar-brand {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--primary-color);
}

.title-bar-nav {
  display: flex;
  gap: 2px;
}

.title-bar-tab {
  background: transparent;
  border: none;
  padding: 6px 14px;
  font-size: 0.78rem;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.title-bar-tab:hover {
  background: var(--bg-color);
  color: var(--text-main);
}

.title-bar-tab.active {
  background: var(--bg-color);
  color: var(--text-main);
  font-weight: 600;
}

.title-bar-controls {
  display: flex;
}

.title-bar-btn {
  width: 46px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background 0.1s;
}

.title-bar-btn:hover {
  background: var(--border-color);
  color: var(--text-main);
}

.title-bar-close:hover {
  background: var(--danger-color);
  color: #fff;
}
```

**Step 3: Run TypeScript check**

Run: `npx tsc -b --noEmit`
Expected: no errors

**Step 4: Commit**

```bash
git add src/components/TitleBar.tsx src/index.css
git commit -m "feat: add TitleBar component with drag region and window controls"
```

---

### Task 3: Create Sidebar component

**Files:**
- Create: `src/components/Sidebar.tsx`
- Modify: `src/index.css` (add sidebar styles)

**Step 1: Write Sidebar.tsx**

```tsx
interface SidebarProps {
  category: 'orphan' | 'misplaced'
  onCategoryChange: (cat: 'orphan' | 'misplaced') => void
  orphanCount: number
  misplacedCount: number
  searchText: string
  onSearchChange: (text: string) => void
}

function Sidebar({
  category,
  onCategoryChange,
  orphanCount,
  misplacedCount,
  searchText,
  onSearchChange,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-heading">分类</div>
        <button
          type="button"
          className={`sidebar-item ${category === 'orphan' ? 'active' : ''}`}
          onClick={() => onCategoryChange('orphan')}
        >
          <span>Orphan</span>
          <span className="sidebar-badge">{orphanCount}</span>
        </button>
        <button
          type="button"
          className={`sidebar-item ${category === 'misplaced' ? 'active' : ''}`}
          onClick={() => onCategoryChange('misplaced')}
        >
          <span>Misplaced</span>
          <span className="sidebar-badge">{misplacedCount}</span>
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-heading">搜索</div>
        <input
          type="text"
          className="sidebar-search"
          placeholder="文件名 / 路径..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </aside>
  )
}

export default Sidebar
```

**Step 2: Add sidebar CSS to index.css**

```css
/* ─── Sidebar ─── */
.sidebar {
  width: 200px;
  flex-shrink: 0;
  background: var(--panel-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 8px 0;
}

.sidebar-section {
  padding: 4px 8px;
}

.sidebar-heading {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  padding: 8px 8px 4px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 10px;
  font-size: 0.82rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-main);
  cursor: pointer;
  transition: background 0.12s;
  text-align: left;
}

.sidebar-item:hover {
  background: var(--bg-color);
}

.sidebar-item.active {
  background: var(--primary-color);
  color: #fff;
}

.sidebar-badge {
  font-size: 0.72rem;
  min-width: 22px;
  text-align: center;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(0,0,0,0.08);
}

.sidebar-item.active .sidebar-badge {
  background: rgba(255,255,255,0.25);
}

.sidebar-search {
  width: 100%;
  padding: 6px 8px;
  font-size: 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-color);
  color: var(--text-main);
  outline: none;
  transition: border-color 0.15s;
}

.sidebar-search:focus {
  border-color: var(--primary-color);
}
```

**Step 3: TypeScript check + Commit**

```bash
npx tsc -b --noEmit
git add src/components/Sidebar.tsx src/index.css
git commit -m "feat: add Sidebar component with category nav and search"
```

---

### Task 4: Create DetailPanel component

**Files:**
- Create: `src/components/DetailPanel.tsx`
- Modify: `src/index.css` (add detail-panel styles)

**Step 1: Write DetailPanel.tsx**

```tsx
import type { AuditIssue } from '../types'

interface DetailPanelProps {
  issue: AuditIssue | null
  selectedCount: number
  toFilePreviewSrc: (path: string) => string
  getThumbSrc: (issue: AuditIssue, size: 'tiny' | 'small' | 'medium') => string
  onOpenFile?: (path: string) => void
  onOpenFolder?: (path: string) => void
  onFullscreen?: (issue: AuditIssue) => void
}

function basename(path: string) {
  const normalized = path.split('\\').join('/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || path
}

function DetailPanel({
  issue,
  selectedCount,
  toFilePreviewSrc,
  getThumbSrc,
  onOpenFile,
  onOpenFolder,
  onFullscreen,
}: DetailPanelProps) {
  if (!issue && selectedCount <= 1) return null

  if (!issue && selectedCount > 1) {
    return (
      <aside className="detail-panel">
        <div className="detail-panel-inner">
          <div className="detail-multi-select">
            已选择 {selectedCount} 张图片
          </div>
        </div>
      </aside>
    )
  }

  if (!issue) return null

  const previewSrc = getThumbSrc(issue, 'medium') || getThumbSrc(issue, 'small') || toFilePreviewSrc(issue.imagePath)

  return (
    <aside className="detail-panel">
      <div className="detail-panel-inner">
        <div className="detail-preview">
          <img src={previewSrc} alt="" draggable={false} onError={(e) => { e.currentTarget.style.display = 'none' }} />
        </div>
        <div className="detail-attrs">
          <div className="detail-row">
            <span className="detail-label">文件名</span>
            <span className="detail-value">{basename(issue.imagePath)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">路径</span>
            <span className="detail-value detail-value-path">{issue.imagePath}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">类型</span>
            <span className="detail-value">{issue.type}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">原因</span>
            <span className="detail-value">{issue.reason}</span>
          </div>
          {issue.suggestedTarget && (
            <div className="detail-row">
              <span className="detail-label">建议目标</span>
              <span className="detail-value detail-value-path">{issue.suggestedTarget}</span>
            </div>
          )}
          {issue.mdPath && (
            <div className="detail-row">
              <span className="detail-label">引用笔记</span>
              <span className="detail-value detail-value-path">{issue.mdPath}</span>
            </div>
          )}
        </div>
        <div className="detail-actions">
          <button type="button" className="btn btn-sm" onClick={() => onOpenFile?.(issue.imagePath)}>打开文件</button>
          <button type="button" className="btn btn-sm" onClick={() => onOpenFolder?.(issue.imagePath)}>打开目录</button>
          <button type="button" className="btn btn-sm" onClick={() => onFullscreen?.(issue)}>全屏查看</button>
        </div>
      </div>
    </aside>
  )
}

export default DetailPanel
```

**Step 2: Add detail-panel CSS to index.css**

```css
/* ─── Detail Panel ─── */
.detail-panel {
  width: 280px;
  flex-shrink: 0;
  background: var(--panel-bg);
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
}

.detail-panel-inner {
  padding: 12px;
}

.detail-preview {
  width: 100%;
  aspect-ratio: 1;
  background: var(--bg-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
  display: grid;
  place-items: center;
}

.detail-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.detail-attrs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.detail-label {
  font-size: 0.68rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 0.8rem;
  color: var(--text-main);
}

.detail-value-path {
  word-break: break-all;
  font-size: 0.75rem;
  font-family: monospace;
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-multi-select {
  padding: 24px 12px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 0.78rem;
  border: 1px solid var(--border-color);
  background: transparent;
  border-radius: 4px;
  color: var(--text-main);
  cursor: pointer;
  transition: background 0.12s;
}

.btn-sm:hover {
  background: var(--bg-color);
}
```

**Step 3: TypeScript check + Commit**

```bash
npx tsc -b --noEmit
git add src/components/DetailPanel.tsx src/index.css
git commit -m "feat: add DetailPanel component with image attributes and actions"
```

---

### Task 5: Create StatusBar component with log drawer

**Files:**
- Create: `src/components/StatusBar.tsx`
- Modify: `src/index.css` (add status-bar styles)

**Step 1: Write StatusBar.tsx**

```tsx
import { useState } from 'react'
import type { RuntimeLogLine } from '../types'

interface StatusBarProps {
  orphanCount: number
  misplacedCount: number
  selectedCount: number
  totalCount: number
  logs: RuntimeLogLine[]
  scanning: boolean
}

function StatusBar({ orphanCount, misplacedCount, selectedCount, totalCount, logs, scanning }: StatusBarProps) {
  const [expanded, setExpanded] = useState(false)
  const latest = logs.length > 0 ? logs[logs.length - 1] : null

  return (
    <div className={`status-bar ${expanded ? 'expanded' : ''}`}>
      <div className="status-bar-summary" onClick={() => setExpanded(!expanded)}>
        <div className="status-bar-left">
          {scanning && <span className="status-indicator scanning" />}
          <span>Orphan: {orphanCount}</span>
          <span className="status-sep">|</span>
          <span>Misplaced: {misplacedCount}</span>
          <span className="status-sep">|</span>
          <span>已选: {selectedCount}/{totalCount}</span>
        </div>
        <div className="status-bar-right">
          {latest && (
            <span className={`status-log-line level-${latest.level}`}>
              {latest.message}
            </span>
          )}
          <span className="status-toggle">{expanded ? '▼' : '▲'}</span>
        </div>
      </div>
      {expanded && (
        <div className="status-bar-drawer">
          {logs.length === 0 ? (
            <div className="status-empty">暂无日志</div>
          ) : (
            logs.slice().reverse().map((log, i) => (
              <div key={i} className={`status-log-entry level-${log.level}`}>
                <span className="status-log-time">{log.timestamp}</span>
                <span className="status-log-level">{log.level.toUpperCase()}</span>
                <span className="status-log-msg">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default StatusBar
```

**Step 2: Add status-bar CSS to index.css**

```css
/* ─── Status Bar ─── */
.status-bar {
  flex-shrink: 0;
  background: var(--panel-bg);
  border-top: 1px solid var(--border-color);
  font-size: 0.75rem;
}

.status-bar-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 26px;
  padding: 0 12px;
  cursor: pointer;
  user-select: none;
}

.status-bar-left {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
}

.status-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  overflow: hidden;
}

.status-sep {
  opacity: 0.3;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success-color);
}

.status-indicator.scanning {
  background: var(--primary-color);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-toggle {
  font-size: 0.6rem;
  opacity: 0.5;
}

.status-log-line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

.status-bar-drawer {
  max-height: 200px;
  overflow-y: auto;
  border-top: 1px solid var(--border-color);
  padding: 4px 0;
  font-family: monospace;
}

.status-log-entry {
  display: flex;
  gap: 8px;
  padding: 2px 12px;
  font-size: 0.72rem;
  line-height: 1.6;
}

.status-log-time {
  color: var(--text-muted);
  opacity: 0.6;
  flex-shrink: 0;
}

.status-log-level {
  min-width: 38px;
  flex-shrink: 0;
  font-weight: 600;
}

.level-info { color: var(--text-muted); }
.level-warn { color: #e8a838; }
.level-error { color: var(--danger-color); }

.status-empty {
  padding: 12px;
  text-align: center;
  color: var(--text-muted);
}
```

**Step 3: TypeScript check + Commit**

```bash
npx tsc -b --noEmit
git add src/components/StatusBar.tsx src/index.css
git commit -m "feat: add StatusBar with expandable log drawer"
```

---

### Task 6: Create Toolbar component

**Files:**
- Create: `src/components/Toolbar.tsx`
- Modify: `src/index.css` (add toolbar styles)

**Step 1: Write Toolbar.tsx**

This consolidates vault path, scan button, display mode, and action buttons into one toolbar row.

```tsx
import type { GalleryDisplayMode } from '../types'

interface ToolbarProps {
  vaultPath: string
  onVaultPathChange: (path: string) => void
  recentVaults: string[]
  onPickDirectory: () => void
  onScan: () => void
  scanning: boolean
  fixing: boolean
  displayMode: GalleryDisplayMode
  onDisplayModeChange: (mode: GalleryDisplayMode) => void
  hasResult: boolean
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onFix: () => void
  onExport?: () => void
  generateThumbs: boolean
  onGenerateThumbsChange: (v: boolean) => void
}

function Toolbar({
  vaultPath, onVaultPathChange, recentVaults, onPickDirectory,
  onScan, scanning, fixing,
  displayMode, onDisplayModeChange,
  hasResult, selectedCount, totalCount,
  onSelectAll, onClearSelection, onFix, onExport,
  generateThumbs, onGenerateThumbsChange,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <div className="toolbar-group toolbar-path">
          <input
            type="text"
            className="toolbar-input"
            list="recent-vaults-tb"
            value={vaultPath}
            onChange={(e) => onVaultPathChange(e.target.value)}
            placeholder="仓库路径..."
            aria-label="仓库路径"
          />
          <datalist id="recent-vaults-tb">
            {recentVaults.map((p) => <option key={p} value={p} />)}
          </datalist>
          <button type="button" className="btn-sm" onClick={onPickDirectory}>选择</button>
          <button type="button" className="btn-sm btn-sm-primary" onClick={onScan} disabled={scanning || fixing}>
            {scanning ? '扫描中...' : '扫描'}
          </button>
        </div>

        <div className="toolbar-sep" />

        <label className="toolbar-check">
          <input type="checkbox" checked={generateThumbs} onChange={(e) => onGenerateThumbsChange(e.target.checked)} disabled={scanning || fixing} />
          <span>缩略图</span>
        </label>

        {hasResult && (
          <>
            <div className="toolbar-sep" />
            <div className="toolbar-group">
              {(['thumbnail', 'rawImage', 'noImage'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`toolbar-mode ${displayMode === m ? 'active' : ''}`}
                  onClick={() => onDisplayModeChange(m)}
                >
                  {{ thumbnail: '缩略', rawImage: '原图', noImage: '无图' }[m]}
                </button>
              ))}
            </div>

            <div className="toolbar-sep" />

            <div className="toolbar-group">
              <button type="button" className="btn-sm" onClick={onSelectAll}>全选</button>
              <button type="button" className="btn-sm" onClick={onClearSelection}>清空</button>
              <button type="button" className="btn-sm btn-sm-danger" onClick={onFix} disabled={fixing}>
                修复{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </button>
            </div>

            {onExport && (
              <>
                <div className="toolbar-sep" />
                <button type="button" className="btn-sm" onClick={onExport}>导出</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Toolbar
```

**Step 2: Add toolbar CSS to index.css**

```css
/* ─── Toolbar ─── */
.toolbar {
  flex-shrink: 0;
  background: var(--panel-bg);
  border-bottom: 1px solid var(--border-color);
  padding: 4px 10px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 3px;
}

.toolbar-path {
  flex: 1;
  min-width: 0;
}

.toolbar-input {
  flex: 1;
  min-width: 0;
  padding: 3px 8px;
  font-size: 0.78rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-color);
  color: var(--text-main);
  outline: none;
}

.toolbar-input:focus {
  border-color: var(--primary-color);
}

.toolbar-sep {
  width: 1px;
  height: 18px;
  background: var(--border-color);
  margin: 0 4px;
  flex-shrink: 0;
}

.toolbar-check {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
}

.toolbar-mode {
  padding: 3px 10px;
  font-size: 0.72rem;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s;
}

.toolbar-mode:first-child { border-radius: 4px 0 0 4px; }
.toolbar-mode:last-child { border-radius: 0 4px 4px 0; border-left: none; }
.toolbar-mode:not(:first-child):not(:last-child) { border-left: none; }

.toolbar-mode.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

.btn-sm-primary {
  background: var(--primary-color);
  color: #fff;
  border-color: var(--primary-color);
}

.btn-sm-primary:hover {
  background: var(--primary-hover);
}

.btn-sm-danger {
  background: var(--danger-color);
  color: #fff;
  border-color: var(--danger-color);
}
```

**Step 3: TypeScript check + Commit**

```bash
npx tsc -b --noEmit
git add src/components/Toolbar.tsx src/index.css
git commit -m "feat: add Toolbar component consolidating vault config and actions"
```

---

### Task 7: Rewrite App.tsx with three-panel layout

**Files:**
- Modify: `src/App.tsx` (complete rewrite)
- Modify: `src/index.css` (replace app-container, remove old header/footer/nav styles)

**Step 1: Rewrite App.tsx**

Replace the entire App.tsx with the new three-panel layout. The old header/nav/settings-bar/footer are replaced by TitleBar + Toolbar. Settings (font scale, zoom scale, conflict policy) move into a settings popover or are simplified.

The new structure is:
```
<div class="app-shell">
  <TitleBar />
  <div class="app-body">
    {activeTab === 'scan' ? <ScanPage /> : <MigratePage />}
  </div>
</div>
```

ScanPage itself will own the Toolbar + Sidebar + Gallery + DetailPanel + StatusBar layout. This gives each page full control over its panel arrangement.

```tsx
import { useState, useMemo } from 'react'
import TitleBar from './components/TitleBar'
import ScanPage from './pages/ScanPage'
import MigratePage from './pages/MigratePage'
import type { ConflictPolicy } from './types'

const SETTINGS_KEY = 'voyager-ui-settings-v1'

interface UiSettings {
  fontScale: number
  zoomScale: number
  conflictPolicy: ConflictPolicy
}

const defaultSettings: UiSettings = { fontScale: 1, zoomScale: 1, conflictPolicy: 'renameAll' }

function loadSettings(): UiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings
    return { ...defaultSettings, ...JSON.parse(raw) }
  } catch {
    return defaultSettings
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'migrate'>('scan')
  const [settings, setSettings] = useState<UiSettings>(loadSettings)

  const updateSettings = (patch: Partial<UiSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      return next
    })
  }

  const rootStyle = useMemo(() => ({
    '--app-font-scale': settings.fontScale,
    '--app-zoom-scale': settings.zoomScale,
  } as React.CSSProperties), [settings.fontScale, settings.zoomScale])

  return (
    <div className="app-shell" style={rootStyle}>
      <TitleBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="app-body">
        {activeTab === 'scan' ? (
          <ScanPage conflictPolicy={settings.conflictPolicy} />
        ) : (
          <MigratePage conflictPolicy={settings.conflictPolicy} />
        )}
      </div>
    </div>
  )
}

export default App
```

**Step 2: Replace app layout CSS in index.css**

Remove the old `.app-container`, `.app-header`, `.nav-tabs`, `.tab-btn`, `.main-content`, `.app-footer` classes. Replace with:

```css
/* ─── App Shell ─── */
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  font-size: calc(0.875rem * var(--app-font-scale, 1));
  zoom: var(--app-zoom-scale, 1);
}

.app-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
```

**Step 3: TypeScript check + Run tests**

```bash
npx tsc -b --noEmit
npx vitest run
```

Expected: all tests pass (ScanPage and MigratePage still receive conflictPolicy prop).

**Step 4: Commit**

```bash
git add src/App.tsx src/index.css
git commit -m "feat: rewrite App.tsx with three-panel shell layout"
```

---

### Task 8: Restructure ScanPage to use new components

**Files:**
- Modify: `src/pages/ScanPage.tsx` (major restructure)

**Step 1: Restructure ScanPage layout**

Replace the current `<div className="page-wrapper">` containing stacked cards with:

```tsx
<div className="scan-layout">
  <Toolbar ... />
  <div className="scan-panels">
    <Sidebar ... />
    <main className="scan-gallery">
      {/* stale warning, display mode hint, VirtualGallery, preview/fullscreen overlays */}
    </main>
    <DetailPanel ... />
  </div>
  <StatusBar ... />
</div>
```

Key changes:
- Move vault path input, scan button, display mode, actions into `<Toolbar>`
- Move orphan/misplaced tabs into `<Sidebar>` as category buttons
- Add search state, pass to Sidebar, filter issues by search text
- Remove old cards (explanation, stats as separate cards) — stats go to StatusBar
- Remove old IssuesTable tabs and WorkLogPanel/OperationHistoryPanel (logs → StatusBar drawer)
- Keep IssuesTable as a toggleable view mode option (gallery vs list) later — for now, gallery is primary
- Detail panel shows when single issue clicked/selected
- Track `focusedIssue` (last clicked) separately from `selectedIssueIds`

Add scan-layout CSS:
```css
/* ─── Scan Layout ─── */
.scan-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.scan-panels {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.scan-gallery {
  flex: 1;
  overflow: auto;
  background: var(--bg-color);
  padding: 8px;
}
```

**Step 2: TypeScript check + Run tests**

```bash
npx tsc -b --noEmit
npx vitest run
```

Fix any test breakages from changed UI structure (update selectors/queries as needed).

**Step 3: Commit**

```bash
git add src/pages/ScanPage.tsx src/index.css
git commit -m "feat: restructure ScanPage with Toolbar/Sidebar/DetailPanel/StatusBar"
```

---

### Task 9: De-webification — global style cleanup

**Files:**
- Modify: `src/index.css`

**Step 1: Overhaul global styles**

Apply these changes throughout index.css:

1. **Custom scrollbar** (append to index.css):
```css
/* ─── Custom Scrollbar ─── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.5); }
```

2. **Font stack** — update `body` rule:
```css
body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  /* ... existing */
}
```

3. **Reduce card border-radius** — change `.card` from `border-radius: var(--radius)` to `border-radius: 4px`

4. **Tighten padding** — change `.card` padding from `20px` to `10px 12px`

5. **Focus outline** — add global rule:
```css
:focus-visible {
  outline: 1.5px solid var(--primary-color);
  outline-offset: 1px;
}

:focus:not(:focus-visible) {
  outline: none;
}
```

6. **Remove old `.app-header`, `.nav-tabs`, `.tab-btn`, `.main-content`, `.app-footer`** if not already done in Task 7.

**Step 2: Visual check + Commit**

```bash
npx tsc -b --noEmit
npx vitest run
git add src/index.css
git commit -m "style: de-webification — custom scrollbar, tight spacing, system fonts"
```

---

### Task 10: Update tests for new layout structure

**Files:**
- Modify: `src/__tests__/scan-page.test.tsx`
- Modify: `src/__tests__/fix-preview.test.tsx`

**Step 1: Update test mocks and selectors**

The tests currently find elements by label text like `'仓库路径'` and button names. With the new Toolbar component, the aria-label is preserved on the input (`aria-label="仓库路径"`), so most queries should still work. But the `'选择目录'` button text changed to `'选择'` and `'开始扫描'` changed to `'扫描'`.

Update all `screen.getByRole('button', { name: '开始扫描' })` → `screen.getByRole('button', { name: '扫描' })` (or match new text).

Also add mock for `@tauri-apps/api/window`:
```tsx
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

**Step 2: Run tests, fix remaining breakages**

```bash
npx vitest run
```

Fix any remaining selector/structure issues until all tests pass.

**Step 3: Commit**

```bash
git add src/__tests__/
git commit -m "test: update tests for new three-panel layout structure"
```

---

## Summary

After completing all 10 tasks, the app will have:
- Custom title bar with window controls (no system chrome)
- Three-panel layout: Sidebar (200px) + Gallery (flex) + Detail Panel (280px)
- Consolidated toolbar (vault path + scan + display mode + actions)
- Status bar with expandable log drawer
- Tighter spacing, custom scrollbar, system fonts — desktop app feel
- All existing functionality preserved (scan, fix, gallery, zoom, fullscreen, etc.)

This is the foundation for Phase 2 (themes), Phase 3 (search/filter), Phase 4 (batch ops), Phase 5 (export).
