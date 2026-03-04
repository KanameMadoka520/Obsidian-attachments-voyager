# UI Overhaul & New Features Design

## Goal
Transform the app from a web-page look into a professional asset-manager-style desktop application (Eagle/Bridge/Billfish inspired), adding batch operations, search/filter, log viewer, export, and multi-theme support.

## Layout: Three-Panel

```
┌─────────────────────────────────────────────────────────────┐
│  Toolbar (vault path, scan, display mode, export, settings) │
├──────────┬──────────────────────────────┬───────────────────┤
│ Sidebar  │  Main Gallery               │  Detail Panel     │
│ (200px)  │  (flex: 1, virtual scroll)  │  (280px)         │
│          │                              │                  │
│ Category │  Image grid                  │  Preview image   │
│ Filter   │                              │  File attributes │
│ Search   │                              │  Actions         │
├──────────┴──────────────────────────────┴───────────────────┤
│ Status bar ▲  Stats summary | Latest log line              │
│ ┌─ Log drawer (expandable) ──────────────────────────────┐ │
│ │ Colored log entries + operation history + undo          │ │
│ └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- Sidebar: 200px fixed, collapsible
- Detail panel: 280px, shown when image selected, hidden otherwise (gallery takes full width)
- Remove max-width: 1200px constraint, use full-width flex
- Toolbar merges vault config, display mode, actions into one row
- Status bar always visible, log drawer pull-up (VS Code Terminal style)

## Features

### Search & Filter (Sidebar)
- Real-time search box: filter by filename/path keyword
- Category: Orphan / Misplaced toggle (replaces tab buttons)
- File type checkboxes: .png / .jpg / .gif / .svg / other
- File size range: preset intervals (<100KB / 100KB-1MB / >1MB)

### Batch Operations
- **Floating toolbar**: appears when ≥1 image selected, at gallery bottom: "Delete(N) | Move(N) | Export | Deselect"
- **Right-click context menu**: Open file, Open directory, Copy path, Mark delete, Fullscreen view

### Export Report
- Toolbar export dropdown → JSON / CSV / Markdown
- Exports currently filtered issue list (not all)
- Markdown format suitable for Obsidian notes

### Log Drawer (Bottom)
- Status bar: one-line summary with stats + latest log
- Click/drag to expand full log panel
- Color-coded: INFO white, WARN yellow, ERROR red
- Operation history and undo integrated here

### Detail Panel (Right)
- Single selection: preview + full attributes + action buttons
- Multi selection: "N selected" + batch action buttons
- No selection: panel collapses, gallery takes full width

## Themes

Four themes with manual switch (default: follow system):

| Theme | Background | Panel | Accent | Reference |
|-------|-----------|-------|--------|-----------|
| Follow System | auto | auto | auto | — |
| Light | #f5f5f7 | #ffffff | #7b61ff purple | Current default |
| Dark | #1a1a1e | #252528 | #8a73ff purple | Eagle/Lightroom |
| Parchment | #f5f0e8 | #faf6ef | #b5845a brown-gold | Claude/Anthropic |

### Parchment Theme Variables
```css
--bg-color: #f5f0e8;
--panel-bg: #faf6ef;
--text-main: #3d3229;
--text-muted: #8c7a6b;
--border-color: #e5ddd2;
--primary-color: #b5845a;
--primary-hover: #a07348;
--danger-color: #c44e3d;
--success-color: #6b8f5e;
--shadow: 0 4px 12px rgba(139, 119, 92, 0.08);
```

## De-Webification

1. **Custom title bar**: `decorations: false` in Tauri config + custom drag region merged into toolbar
2. **Custom scrollbar**: 6px wide, rounded, semi-transparent
3. **Panel-based layout**: replace card stacking with panel dividers (straight lines, subtle borders)
4. **System font stack**: `system-ui, -apple-system, "Segoe UI"` — no web-typical fonts
5. **Tighter spacing**: reduce padding from 24px to 8-12px, increase information density
6. **Focus styles**: thin outline instead of browser default thick blue ring

## Animations
- Sidebar/detail panel expand/collapse: `width` + `opacity` 200ms
- Log drawer pull-up: `height` 200ms
- Batch toolbar: slide in from bottom `translateY`
- Context menu: fade + scale entrance
- Gallery card hover: `translateY(-2px)` + shadow
- Theme switch: `transition: background-color 0.3s, color 0.3s` global

## Implementation Phases

| Phase | Content | Complexity |
|-------|---------|-----------|
| Phase 1 | Three-panel layout + custom title bar + de-webification styles | High |
| Phase 2 | Four-theme system + theme switcher | Medium |
| Phase 3 | Search/filter + detail panel | Medium |
| Phase 4 | Batch toolbar + right-click context menu | Medium |
| Phase 5 | Log drawer + export report | Low |

Each phase is independently deliverable. Phase 1 is the foundation.
