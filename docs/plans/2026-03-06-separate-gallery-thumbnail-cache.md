# Separate Gallery Thumbnail Cache Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Store attachment-overview thumbnails in `.voyager-gallery-cache-all` while keeping issue-scan thumbnails in `.voyager-gallery-cache`, with fully separated generation, reading, and clearing behavior.

**Architecture:** Refactor the Rust thumbnail cache module to support cache scopes and introduce Gallery-specific Tauri commands that target the `all` scope. Keep scan-page commands and behavior intact, update GalleryPage to use the new commands and new cache-path reads only, and cover the split with targeted regression tests.

**Tech Stack:** Rust 2021, Tauri v1.5 commands, React 19, TypeScript 5.9, Vitest

---

### Task 1: Add failing regression tests for Gallery-specific cache commands

**Files:**
- Modify: `src/__tests__/gallery-page.test.tsx`
- Test: `src/__tests__/gallery-page.test.tsx`

**Step 1: Write the failing test**

Extend `src/__tests__/gallery-page.test.tsx` with a test that asserts Gallery page invokes new all-cache commands:

```tsx
test('gallery uses dedicated all-cache commands for generation and clearing', async () => {
  // render GalleryPage with allImages
  // click generate thumbnails
  // confirm invoke called with 'generate_all_thumbnails_all'
  // click clear cache and confirm
  // confirm invoke called with 'clear_thumbnail_cache_all'
})
```

Use existing mock patterns from current tests. Keep the test focused on command names.

**Step 2: Run test to verify it fails**

Run: `npm test -- gallery-page.test.tsx`
Expected: FAIL because GalleryPage still calls `generate_all_thumbnails` and `clear_thumbnail_cache`.

**Step 3: Do not implement yet**

Stop after confirming the failure. This task only establishes the red state for Gallery command separation.

**Step 4: Commit test-only change**

```bash
git add src/__tests__/gallery-page.test.tsx
git commit -m "test: cover gallery-specific thumbnail cache commands"
```

### Task 2: Refactor Rust thumbnail cache module to support cache scopes

**Files:**
- Modify: `src-tauri/src/thumb_cache.rs`
- Test manually via later Tauri command tests/build

**Step 1: Write the minimal refactor design in code comments if needed**

No broad rewrite. Introduce a small internal enum or selector for cache scope:

```rust
enum CacheScope {
    Issue,
    All,
}
```

Add helpers that map scope to root folder names:
- `Issue` → `.voyager-gallery-cache`
- `All` → `.voyager-gallery-cache-all`

**Step 2: Implement minimal scope-aware helpers**

Refactor these internals to accept scope:
- cache root lookup
- size directory lookup
- root path string retrieval
- clear cache
- single-image thumbnail generation
- multi-size thumbnail generation

Keep the thumbnail sizes, hashing, and generation algorithm unchanged.

**Step 3: Preserve existing public behavior for issue cache**

Add wrapper functions that preserve existing callers:

```rust
pub fn clear_cache() -> Result<usize> { ...Issue... }
pub fn generate_thumbnail_multi(...) -> Result<...> { ...Issue... }
```

Then add new public functions for all-scope behavior, for example:

```rust
pub fn clear_cache_all() -> Result<usize> { ...All... }
pub fn generate_thumbnail_multi_all(...) -> Result<...> { ...All... }
pub fn cache_root_path_string_all() -> String { ...All... }
```

**Step 4: Run focused build check**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: PASS

**Step 5: Commit**

```bash
git add src-tauri/src/thumb_cache.rs
git commit -m "refactor: add separate thumbnail cache scopes"
```

### Task 3: Add Gallery-specific Tauri commands using all-cache scope

**Files:**
- Modify: `src-tauri/src/main.rs`
- Test: `src/__tests__/gallery-page.test.tsx`

**Step 1: Use the failing Gallery command test from Task 1**

No new test needed if Task 1 already asserts command names.

**Step 2: Implement minimal Tauri commands**

In `src-tauri/src/main.rs`, add:
- `generate_all_thumbnails_all`
- `clear_thumbnail_cache_all`

These should mirror the existing issue-cache commands, but call the new all-scope functions in `thumb_cache.rs`.

Examples of behavior to preserve:
- progress events still emitted during generation
- summary shapes remain consistent for frontend use

**Step 3: Register commands**

Add both commands to `generate_handler![]`.

**Step 4: Run frontend regression test**

Run: `npm test -- gallery-page.test.tsx`
Expected: still FAIL until GalleryPage is updated, but now failure should move from backend command absence to frontend wiring.

**Step 5: Run backend compile check**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: PASS

**Step 6: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "feat: add gallery-specific thumbnail cache commands"
```

### Task 4: Update GalleryPage to generate and clear only the all-cache namespace

**Files:**
- Modify: `src/pages/GalleryPage.tsx`
- Test: `src/__tests__/gallery-page.test.tsx`

**Step 1: Use the failing Gallery command test**

The test should currently fail because command names are still old.

**Step 2: Implement minimal frontend wiring**

In `src/pages/GalleryPage.tsx`:
- change thumbnail generation invoke to `generate_all_thumbnails_all`
- change clear-cache invoke to `clear_thumbnail_cache_all`
- keep the user-facing flow the same otherwise

Preserve the safe `unlisten` cleanup guard already added.

**Step 3: Run the Gallery test to verify it passes**

Run: `npm test -- gallery-page.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/GalleryPage.tsx src/__tests__/gallery-page.test.tsx
git commit -m "feat: route gallery thumbnail actions to all-cache"
```

### Task 5: Make Gallery thumbnail reading use only the all-cache paths

**Files:**
- Modify: `src/pages/GalleryPage.tsx`
- Possibly Modify: `src/types.ts` only if new shape is strictly required
- Test: `src/__tests__/gallery-page.test.tsx`

**Step 1: Write the failing test**

Add a regression test that demonstrates Gallery thumbnail mode must render using all-cache thumbnail paths, not issue-cache thumbnail paths.

If needed, create a focused helper test around `getThumbSrc` behavior or the rendered image source after generation state.

A practical minimal version:
- mock generated all-cache thumbnail paths returned through the Gallery flow
- assert the rendered image source contains `.voyager-gallery-cache-all`

**Step 2: Run test to verify it fails**

Run: `npm test -- gallery-page.test.tsx`
Expected: FAIL because Gallery still depends on `thumbnailPaths` already present on issue-style items or mixed cache assumptions.

**Step 3: Implement minimal read-path change**

Update GalleryPage so that its thumbnail-mode rendering uses only paths produced by the all-cache generation flow.

Preferred minimal approach:
- introduce a Gallery-local thumbnail-path resolver based on the all-cache root naming convention and existing hash convention, or
- consume all-cache-specific paths returned from the new command flow if you choose to thread them through state.

Do **not** add fallback reads from `.voyager-gallery-cache`.

**Step 4: Run Gallery test again**

Run: `npm test -- gallery-page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/GalleryPage.tsx src/__tests__/gallery-page.test.tsx
git commit -m "feat: read gallery thumbnails from all-cache only"
```

### Task 6: Verify issue-scan behavior remains unchanged

**Files:**
- Review: `src/pages/ScanPage.tsx`
- Test: `src/__tests__/scan-page.test.tsx`

**Step 1: Write or reuse a focused test**

Ensure no regression to scan-page thumbnail behavior. If existing tests do not cover this sufficiently, add a minimal assertion that scan-page rendering still uses issue-style thumbnail paths.

**Step 2: Run scan-page tests**

Run: `npm test -- scan-page.test.tsx`
Expected: PASS

**Step 3: Commit if test changed**

```bash
git add src/__tests__/scan-page.test.tsx
git commit -m "test: guard scan-page thumbnail cache behavior"
```

If no test changes were needed, skip the commit.

### Task 7: Update docs to reflect separate cache namespaces

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `HANDOFF.md`

**Step 1: Update README user-facing behavior**

Document:
- issue thumbnails use `.voyager-gallery-cache`
- attachment overview thumbnails use `.voyager-gallery-cache-all`
- clearing cache from Gallery affects only all-cache thumbnails

**Step 2: Update CONTRIBUTING developer notes**

Document:
- Rust cache-scope split
- Gallery vs Scan command separation
- where to update behavior if cache strategy changes again

**Step 3: Update HANDOFF current-state notes**

Add a short note that Gallery thumbnail cache has been split into its own namespace and why.

**Step 4: Run docs sanity check**

Manually re-read the changed sections for consistency and exact path names.

**Step 5: Commit**

```bash
git add README.md CONTRIBUTING.md HANDOFF.md
git commit -m "docs: document separate gallery thumbnail cache"
```

### Task 8: Final verification

**Files:**
- Review: `src-tauri/src/thumb_cache.rs`
- Review: `src-tauri/src/main.rs`
- Review: `src/pages/GalleryPage.tsx`
- Review: `src/pages/ScanPage.tsx`
- Review: `README.md`
- Review: `CONTRIBUTING.md`
- Review: `HANDOFF.md`
- Test: `src/__tests__/gallery-page.test.tsx`
- Test: `src/__tests__/scan-page.test.tsx`
- Test: `src/__tests__/app-gallery-persistence.test.tsx`

**Step 1: Run targeted frontend tests**

Run: `npm test -- gallery-page.test.tsx scan-page.test.tsx app-gallery-persistence.test.tsx`
Expected: PASS

**Step 2: Run full frontend test suite**

Run: `npm test`
Expected: PASS

**Step 3: Run frontend build**

Run: `npm run build`
Expected: PASS

**Step 4: Run backend compile check**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: PASS

**Step 5: Commit**

```bash
git add src-tauri/src/thumb_cache.rs src-tauri/src/main.rs src/pages/GalleryPage.tsx src/__tests__ README.md CONTRIBUTING.md HANDOFF.md
git commit -m "feat: separate gallery thumbnail cache"
```
