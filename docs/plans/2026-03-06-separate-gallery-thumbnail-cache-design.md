# Separate Gallery Thumbnail Cache Design

Date: 2026-03-06
Project: Obsidian Attachments Voyager

## Goal

Split thumbnail cache storage into two independent namespaces so the attachment overview page uses its own dedicated cache directory: `.voyager-gallery-cache-all`, while issue-scan thumbnails continue using `.voyager-gallery-cache`.

## Problem

The project currently uses a single thumbnail cache root for both issue-scan images and attachment-overview images. This makes it hard to reason about generation, reading, and clearing behavior on the Gallery page, and makes troubleshooting Gallery thumbnail failures ambiguous.

## Design Summary

Introduce a cache-scope concept in the Rust thumbnail cache module.

- `issue` scope → `.voyager-gallery-cache`
- `all` scope → `.voyager-gallery-cache-all`

The scan page will keep using the existing issue-scope cache behavior. The gallery page will generate, read, and clear thumbnails exclusively from the all-scope cache.

## Scope

### In scope

- Add a thumbnail cache scope/namespace abstraction in Rust
- Keep issue thumbnails and gallery thumbnails fully separated
- Add Gallery-specific Tauri commands for generation and clearing that target the `all` cache scope
- Update Gallery page to use the new commands and to read only the `all` cache namespace
- Update tests and docs

### Out of scope

- Cache migration from old directories
- Mixed fallback reads between issue and all caches
- Changes to thumbnail hashing algorithm
- Changes to thumbnail image sizes or generation algorithm

## Architecture

### 1. Thumbnail cache scopes

The Rust thumbnail cache module should stop assuming a single hardcoded root. Instead, it should derive cache roots from a scope enum or equivalent internal selector.

Proposed mapping:

- Issue scope → `.voyager-gallery-cache`
- All scope → `.voyager-gallery-cache-all`

All size subdirectories (`tiny`, `small`, `medium`) remain unchanged under each root.

### 2. Rust cache API

Refactor internal helpers in `src-tauri/src/thumb_cache.rs` to accept a cache scope parameter for:

- cache root lookup
- size directory lookup
- root path string retrieval
- clear cache
- single-image thumbnail generation
- multi-size thumbnail generation

This keeps the generation algorithm unchanged while changing only where files are stored.

### 3. Tauri commands

Preserve existing commands for issue-scan behavior:

- `generate_all_thumbnails`
- `clear_thumbnail_cache`

Add Gallery-specific commands that target the `all` cache scope:

- `generate_all_thumbnails_all`
- `clear_thumbnail_cache_all`

This keeps scan-page compatibility intact and makes frontend intent explicit.

### 4. Frontend reading behavior

#### ScanPage

No change in cache semantics. It continues to rely on issue-scope thumbnail paths.

#### GalleryPage

Gallery page must use only the all-scope cache namespace for:

- bulk thumbnail generation
- cache clearing
- rendering thumbnail-mode images

The page should not read from `.voyager-gallery-cache` anymore.

## Data Flow

### Gallery generation flow

1. User clicks “Generate All Thumbnails” on Gallery page
2. Frontend invokes `generate_all_thumbnails_all`
3. Rust generates thumbnails into `.voyager-gallery-cache-all/{tiny|small|medium}`
4. Frontend refreshes display version / bust key
5. Gallery thumbnail mode reads from the all-scope cache paths only

### Gallery clear flow

1. User clicks “Clear Thumbnail Cache” on Gallery page
2. Frontend invokes `clear_thumbnail_cache_all`
3. Rust deletes files only under `.voyager-gallery-cache-all`
4. Frontend bumps display version and shows completion feedback

### Scan page flow

Unchanged. It continues to use the issue-scope cache and existing commands.

## Testing Strategy

### Backend / command expectations

- Issue commands still clear and generate under `.voyager-gallery-cache`
- Gallery commands clear and generate under `.voyager-gallery-cache-all`
- Clearing one cache root does not affect the other

### Frontend regression expectations

- Gallery page invokes `generate_all_thumbnails_all`
- Gallery page invokes `clear_thumbnail_cache_all`
- Gallery thumbnail rendering uses all-scope cache paths
- Scan page behavior remains unchanged

## Acceptance Criteria

- Gallery thumbnails are stored under `.voyager-gallery-cache-all`
- Scan-page thumbnails remain under `.voyager-gallery-cache`
- Gallery page no longer depends on issue thumbnail cache paths
- Gallery cache clearing only affects `.voyager-gallery-cache-all`
- Existing scan-page thumbnail behavior remains intact
