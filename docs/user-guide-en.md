# Obsidian Attachments Voyager — User Guide

> This guide helps you get started with Obsidian Attachments Voyager.

---

## Table of Contents

1. [Installation](#1-installation)
2. [Your First Scan](#2-your-first-scan)
3. [Understanding Results](#3-understanding-results)
4. [Fixing Issues](#4-fixing-issues)
5. [Backing Up Attachments](#5-backing-up-attachments)
6. [Migration & Preprocessing](#6-migration--preprocessing)
7. [Statistics](#7-statistics)
8. [Settings & Preferences](#8-settings--preferences)
9. [FAQ](#9-faq)

---

## 1. Installation

### Windows
- Download the `.msi` installer or portable `.exe`
- Run the installer or launch the portable exe directly
- All data is stored next to the exe (no AppData pollution)

### macOS
- Download the `.dmg` file
- Drag the `.app` into your Applications folder
- You may need to allow the app in System Preferences → Security & Privacy

### Linux
- Download the `.deb` package (Debian/Ubuntu) or the ELF binary
- WebKitGTK and other dependencies may be required (see README)

### Prerequisites
Open Obsidian's **Settings → Files & Links** and verify:
- Default location for new attachments: **In subfolder under current folder**
- Subfolder name: **attachments**

> This tool identifies correct attachment placement based on this convention.

---

## 2. Your First Scan

1. Enter your vault path in the toolbar input, or click **"Pick"** to browse
2. Check **"Thumbnails"** to generate image previews (recommended; first time will be slower)
3. Click **"Scan"** to begin
4. The progress bar shows three phases:
   - **Collecting files**: Traversing vault directories
   - **Parsing Markdown**: Reading all .md files to extract image references
   - **Generating thumbnails**: Creating preview images

> Subsequent scans use incremental mode, automatically skipping unchanged files for faster results.

---

## 3. Understanding Results

After scanning, the left sidebar shows two categories:

### Orphan Attachments
- Images in `attachments` directories not referenced by any Markdown file
- Usually leftover from deleted notes
- **Fix action**: Delete the file

### Misplaced Attachments
- Images referenced by a Markdown file but stored in the wrong `attachments` directory
- Example: Note at `folder-A/note.md` references an image at `folder-B/attachments/img.png`
- Correct location should be `folder-A/attachments/img.png`
- **Fix action**: Move file to the correct directory

### Interface Controls
- **Gallery view**: The center area shows thumbnail cards
- **Three display modes**: Thumbnails / Raw images / No images
- **Detail panel**: Click a card to see file details on the right
- **Search & filter**: The sidebar provides filename search, file type checkboxes, and size filters

---

## 4. Fixing Issues

### Selecting Files
| Action | Effect |
|--------|--------|
| Left click | Toggle single selection |
| Ctrl/Cmd + click | Toggle multi-select |
| Shift + click | Range select |
| "Select All" button | Select all in current category |

### Executing Fixes
1. Select the images you want to fix
2. Click the **"Fix"** button in the toolbar
3. A confirmation dialog appears, warning:
   - ⚠️ **This action cannot be undone**
   - Back up important images before proceeding
4. Click **"Confirm"** to proceed

### Fix Results
- **Orphan attachments** → Permanently deleted from disk (not sent to trash)
- **Misplaced attachments** → Moved to the correct `attachments` directory
- If a file with the same name exists at the target, it's automatically renamed (e.g., `image (1).png`)

> ⚠️ Fix operations are irreversible. Use the backup feature before fixing.

---

## 5. Backing Up Attachments

After selecting images, the toolbar shows a **"Backup ▾"** dropdown:

### Backup to Directory
1. Click "Backup to Directory"
2. Choose a destination folder
3. All selected images are copied there
4. Filename conflicts are auto-resolved

### Export as ZIP
1. Click "Export as ZIP"
2. Choose a save location and filename
3. All selected images are packed into a ZIP archive

> Backup operations only copy files — originals are not modified.

---

## 6. Migration & Preprocessing

This page now contains two folder-reorganization tools: linked note migration, and a preprocessing step for merging descendant `attachments` folders.

### Linked Note Migration

Migration moves a note and all its referenced attachments to a new location:

1. Switch to the **"Migration & Prep"** tab
2. Select the Markdown file to migrate
3. Choose the target directory
4. The tool automatically:
   - Moves all referenced attachments to `{target}/attachments/`
   - Then moves the note file itself
5. Conflict handling follows the same policy as fix operations

> Attachments are moved first, then the note — so if something goes wrong mid-way, the note remains at its original location.

### Preprocess: Merge Descendant attachments

If AI-assisted or manual folder cleanup has left old `attachments` folders scattered across nested subfolders, use the preprocessing tool first:

1. In the lower half of the **"Migration & Prep"** page, choose the parent folder you want to clean up
2. Click **"Preview Merge Plan"** to inspect the pending operations first
3. The tool recursively finds every descendant `attachments` directory inside that folder
4. Files from those directories are moved into one unified `attachments/` folder under the selected root
5. The old `attachments` folders are removed once they become empty
6. After preprocessing, return to the scan page, scan again, and use the existing scan + fix workflow to place attachments back into their correct note-level folders

> This step saves you from manually hunting for leftover empty `attachments` folders after large-scale folder reorganization.

---

## 7. Statistics

Switch to the **"Statistics"** tab for visual analytics:

| Chart | Description |
|-------|-------------|
| Overview cards | Total MDs, total images, orphan count, misplaced count |
| Issue type distribution | Pie chart: Orphan vs Misplaced ratio |
| File format distribution | Pie chart: png / jpg / gif / svg / webp / other |
| File size distribution | Bar chart: <100KB / 100KB–1MB / 1–5MB / >5MB |
| Top 10 directories | Horizontal bars: directories with the most issues |
| Time distribution | Bar chart: files grouped by modification month |
| Duplicate files | Table: files with the same name but different paths |

> Statistics are based on the latest scan results. Run a scan first.

---

## 8. Settings & Preferences

### Theme
Choose from four themes via the title bar:
- **Auto**: Follows your OS dark/light mode
- **Light**
- **Dark**
- **Parchment**: A warm, vintage aesthetic

### Language
Toggle between 中文 / English using the language button in the title bar.

### Thumbnail Cache
- The status bar has a **"Clear Thumbnail Cache"** button
- Clearing forces regeneration on the next scan (each image generates 3 size variants)
- Thumbnails are stored in `.voyager-gallery-cache/` at the vault root

### Data Storage
- All settings are stored in `voyager-data/` next to the executable
- Operation history is saved in `voyager-data/ops-history.json`
- To fully uninstall, simply delete the application folder

---

## 9. FAQ

**Q: Can I undo a fix operation?**
A: No. Fix operations (delete/move) are permanent. Use the backup feature to export important images before fixing.

**Q: Scanning is slow — how can I speed it up?**
A:
- Disable thumbnail generation for a faster scan
- Subsequent scans use incremental mode (skips unchanged files)
- Thumbnails are only slow the first time; cached versions load instantly after

**Q: Why do some images show "thumbnail load failed"?**
A: The thumbnail cache may be corrupted. Click "Clear Thumbnail Cache" in the status bar, then scan again.

**Q: Where is my data stored?**
A: Settings and operation history are in `voyager-data/` next to the exe (not in system AppData). Thumbnail caches are in `.voyager-gallery-cache/` at the vault root.

**Q: Can I manage multiple vaults?**
A: Yes. Enter a different vault path in the toolbar to switch. Your 8 most recent vaults are remembered.

**Q: Why is the thumbnail count 3x the actual image count?**
A: Each image generates 3 thumbnails at different sizes (64px / 256px / 1024px) for various display contexts. Thumbnail count ÷ 3 = actual image count.

---

> For development information, see [README.md](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).
