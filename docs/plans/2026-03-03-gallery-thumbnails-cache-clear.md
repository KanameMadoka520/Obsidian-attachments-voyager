# Gallery Thumbnail Pre-generation + Cache Clear Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the ScanPage gallery reliably display images by pre-generating 256px thumbnails during scan (optional toggle, default ON), storing them in an exe-adjacent cache folder, and providing a gallery-area button to clear cached thumbnails.

**Architecture:** Extend the `scan_vault` Tauri command to accept thumbnail generation options and return `thumbnailPath` per issue. Use the existing Rust `thumb_cache` module to generate and persist thumbnails under `.voyager-gallery-cache` next to the executable. Update the React gallery to render thumbnails via `convertFileSrc(thumbnailPath)` with an explicit fallback placeholder when unavailable. Expose a `clear_thumbnail_cache` Tauri command and add a gallery-area button to invoke it.

**Tech Stack:** Tauri v1 (Rust), React + Vite, Vitest + Testing Library

---

## Notes about environment constraints

- **Docker limitation:** `npm run tauri:build` may fail due to missing system dependencies in the container.
- When the plan requires release/build verification, **pause and ask the human to run** the build on a proper host environment and paste outputs/logs.

---

### Task 1: Add TS type support for `thumbnailPath`

**Files:**
- Modify: `src/types.ts`
- Test: `src/__tests__/types-contract.test.ts`

**Step 1: Write the failing test**

Update `src/__tests__/types-contract.test.ts` to ensure `AuditIssue` supports `thumbnailPath`:

```ts
import { describe, it, expect } from 'vitest'
import type { AuditIssue } from '../types'

describe('types contract', () => {
  it('supports orphan and misplaced issue types', () => {
    const t: AuditIssue['type'][] = ['orphan', 'misplaced']
    expect(t).toEqual(['orphan', 'misplaced'])
  })

  it('supports optional thumbnailPath for gallery rendering', () => {
    const issue: AuditIssue = {
      id: '1',
      type: 'orphan',
      imagePath: '/a.png',
      reason: 'unused',
      thumbnailPath: '/thumb.png',
    }
    expect(issue.thumbnailPath).toBe('/thumb.png')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/types-contract.test.ts`
Expected: FAIL with TS error because `thumbnailPath` does not exist on `AuditIssue`.

**Step 3: Write minimal implementation**

Update `src/types.ts`:

```ts
export interface AuditIssue {
  // ...existing fields...
  thumbnailPath?: string
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/types-contract.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/types.ts src/__tests__/types-contract.test.ts
git commit -m "feat: add thumbnailPath to issue types"
```

---

### Task 2: Extend Rust models to include optional `thumbnailPath`

**Files:**
- Modify: `src-tauri/src/models.rs`
- Test: `src/__tests__/scan-page.test.tsx` (mock payload includes thumbnailPath)

**Step 1: Write the failing test**

Adjust `src/__tests__/scan-page.test.tsx` mock to include `thumbnailPath` in issues returned by `scan_vault`:

```ts
issues: [
  { id: '1', type: 'orphan', imagePath: '/a.png', reason: 'unused', thumbnailPath: '/t/a.png' },
  { id: '2', type: 'misplaced', imagePath: '/b.png', reason: 'wrong dir', thumbnailPath: '/t/b.png' },
],
```

No assertion needed yet; this is a contract smoke-check that should typecheck once TS types are updated (Task 1).

**Step 2: Run scan page tests**

Run: `npm test -- src/__tests__/scan-page.test.tsx`
Expected: PASS after Task 1; this step ensures test suite tolerates the new field.

**Step 3: Implement Rust model change**

Update `src-tauri/src/models.rs`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanIssue {
    // existing fields...
    pub thumbnail_path: Option<String>,
}
```

**Step 4: Verify Rust compiles (host dependent)**

Run (if Rust toolchain available here): `cd src-tauri && cargo check`
Expected: PASS.

**Step 5: Commit**

```bash
git add src-tauri/src/models.rs src/__tests__/scan-page.test.tsx
git commit -m "feat: add thumbnailPath to ScanIssue model"
```

---

### Task 3: Extend `scan_vault` command signature to accept thumbnail options

**Files:**
- Modify: `src-tauri/src/main.rs`
- Modify: `src/lib/commands.ts`
- Modify: `src/pages/ScanPage.tsx`
- Test: `src/__tests__/scan-page.test.tsx`

**Step 1: Write the failing test**

In `src/__tests__/scan-page.test.tsx`, update the expected invocation:

From:
```ts
expect(invokeMock).toHaveBeenCalledWith('scan_vault', { root: 'D:/vault' })
```
To:
```ts
expect(invokeMock).toHaveBeenCalledWith('scan_vault', {
  root: 'D:/vault',
  generateThumbs: true,
  thumbSize: 256,
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/scan-page.test.tsx`
Expected: FAIL because ScanPage still calls old args.

**Step 3: Write minimal implementation (frontend call path)**

- Update `src/lib/commands.ts` `scanVault()` to accept options and pass them through.
- Update `ScanPage.tsx` state to include `generateThumbs` with default `true` and render a checkbox near the scan button.
- Ensure the checkbox is disabled while loading/fixing.

**Step 4: Update Rust command signature**

In `src-tauri/src/main.rs`, update command signature:

```rust
#[tauri::command]
fn scan_vault(root: String, generate_thumbs: Option<bool>, thumb_size: Option<u32>) -> Result<ScanResult, String> { ... }
```

Use defaults:
- `generate_thumbs.unwrap_or(true)`
- `thumb_size.unwrap_or(256)`

**Step 5: Run test to verify it passes**

Run: `npm test -- src/__tests__/scan-page.test.tsx`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/lib/commands.ts src/pages/ScanPage.tsx src/__tests__/scan-page.test.tsx src-tauri/src/main.rs
git commit -m "feat: add scan options for gallery thumbnails"
```

---

### Task 4: Pre-generate thumbnails after scan and return `thumbnailPath` per issue

**Files:**
- Modify: `src-tauri/src/scanner.rs`
- Modify: `src-tauri/src/main.rs`
- Use existing: `src-tauri/src/thumb_cache.rs`
- Test: `src-tauri/src/thumb_cache.rs` (add unit tests for hashed naming and clear cache)

**Step 1: Write a failing Rust test for cache clear behavior**

In `src-tauri/src/thumb_cache.rs`, add a test-only helper to allow overriding the cache dir (so tests don’t write into real exe dir). Then write a failing test that:
- writes two dummy files into the test cache dir
- calls `clear_cache()`
- asserts removed count == 2

Expected initially: FAIL because cache dir is not injectable.

**Step 2: Implement minimal testability hooks**

Add an internal function used by production code:
- `fn cache_dir_with_base(base: &Path) -> PathBuf`

And for tests:
- `#[cfg(test)] fn set_cache_base_for_test(...)` OR pass base path explicitly to `clear_cache_in(base)`.

Keep production behavior unchanged (still exe-adjacent).

**Step 3: Implement thumbnail generation wiring**

Add a new scanner wrapper function (or extend existing) that:
- calls existing `scan_vault(root)` logic to get issues
- if generateThumbs:
  - generates thumbnails for each issue.image_path
  - sets `issue.thumbnail_path = Some(result.thumbnail_path)` on success
  - leaves it None on failure

**Step 4: Update `scan_vault` command to call the new wrapper**

In `main.rs`, call the new function with options.

**Step 5: Run Rust tests**

Run: `cd src-tauri && cargo test thumb_cache -- --nocapture`
Expected: PASS.

**Step 6: Commit**

```bash
git add src-tauri/src/thumb_cache.rs src-tauri/src/scanner.rs src-tauri/src/main.rs
git commit -m "feat: generate gallery thumbnails during scan"
```

---

### Task 5: Render thumbnails in the gallery and show a clear fallback placeholder

**Files:**
- Modify: `src/pages/ScanPage.tsx`
- Test: `src/__tests__/scan-page.test.tsx`

**Step 1: Write the failing test**

Update `scan-page.test.tsx` scan payload to include `thumbnailPath`, then assert that the gallery renders an `img` with `alt` equal to the imagePath (existing behavior) and that its `src` was derived from thumbnailPath.

Because `convertFileSrc` is used in production, mock `@tauri-apps/api/tauri` to provide a deterministic `convertFileSrc` implementation in tests.

Expected: FAIL because gallery uses `imagePath` directly today.

**Step 2: Implement minimal UI change**

In `ScanPage.tsx` gallery map:
- add `toThumbPreviewSrc(issue)` helper:
  - if `issue.thumbnailPath` -> `convertFileSrc(normalizedThumbPath)`
  - else -> empty string
- render a placeholder element when no thumbnailPath or image load fails

**Step 3: Run test to verify it passes**

Run: `npm test -- src/__tests__/scan-page.test.tsx`
Expected: PASS.

**Step 4: Commit**

```bash
git add src/pages/ScanPage.tsx src/__tests__/scan-page.test.tsx
git commit -m "fix: render gallery thumbnails from cached preview paths"
```

---

### Task 6: Expose `clear_thumbnail_cache` command and add gallery-area button

**Files:**
- Modify: `src-tauri/src/main.rs`
- Modify: `src/pages/ScanPage.tsx`
- Modify: `src/lib/commands.ts`
- Test: `src/__tests__/scan-page.test.tsx`

**Step 1: Write the failing test**

In `scan-page.test.tsx`:
- after scan completes, find and click the gallery-area button `清除缩略图缓存`
- assert `invoke` was called with `clear_thumbnail_cache`

Expected: FAIL because button/command don’t exist.

**Step 2: Implement Rust command**

Add:
- `#[tauri::command] fn clear_thumbnail_cache() -> Result<CacheClearSummary, String>`
  - calls `thumb_cache::clear_cache()`
  - returns removed count + cache dir string (use existing `cache_root_path_string()`)

Register in `invoke_handler!`.

**Step 3: Implement frontend command wrapper and UI button**

- Add `clearThumbnailCache()` to `src/lib/commands.ts`.
- Add a button in the gallery header area (near gallery tabs) that:
  - confirms
  - invokes clear
  - shows a status message (reuse existing `error/message` mechanism) including removed count.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/scan-page.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src-tauri/src/main.rs src/lib/commands.ts src/pages/ScanPage.tsx src/__tests__/scan-page.test.tsx
git commit -m "feat: add clear thumbnail cache button in gallery"
```

---

### Task 7: Remove bottom FixPreviewPanel usage and ensure backup warning stays early

**Files:**
- Modify: `src/pages/ScanPage.tsx`
- Potentially modify: `src/components/FixPreviewPanel.tsx` (only if still imported/used)
- Test: `src/__tests__/fix-preview.test.tsx` (adjust if it depends on old UI)

**Step 1: Update failing test (if any)**

Run: `npm test -- src/__tests__/fix-preview.test.tsx`
Expected: Identify whether test references removed panel.

**Step 2: Implement minimal UI removal**

- Remove rendering/import of `FixPreviewPanel` in ScanPage.
- Keep the existing “执行修复说明” card (already early) as the main backup warning.

**Step 3: Re-run tests**

Run: `npm test`
Expected: PASS.

**Step 4: Commit**

```bash
git add src/pages/ScanPage.tsx src/components/FixPreviewPanel.tsx src/__tests__/fix-preview.test.tsx
git commit -m "refactor: remove redundant fix preview panel"
```

---

### Task 8: Update README and CONTRIBUTING with thumbnail/cache behavior and current safety notes

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Step 1: Update README**

Add sections:
- Gallery thumbnails (default ON, slows scan)
- Cache location `.voyager-gallery-cache` next to executable
- Gallery area clear-cache button
- Selection shortcuts (click/Ctrl/Shift)
- Trash delete option behavior and irreversibility warning
- Operation history + deletion undo limitations

**Step 2: Update CONTRIBUTING**

- Document the new command args and `thumbnailPath` field.
- Clarify deletion is currently permanent (`fs::remove_file`) so contributors must treat it carefully.

**Step 3: Commit**

```bash
git add README.md CONTRIBUTING.md
git commit -m "docs: document gallery thumbnails and cache management"
```

---

### Task 9: Verification checkpoint (host-assisted)

**Step 1: Local automated tests in container**

Run: `npm test`
Expected: PASS.

**Step 2: Rust unit tests (if possible in container)**

Run: `cd src-tauri && cargo test`
Expected: PASS.

**Step 3: Host build verification (human-run)**

Ask human to run on a proper host:
- `npm run tauri:dev` and verify gallery thumbnails appear after scan.
- `npm run tauri:build` (optional) and verify behavior in packaged app.

Evidence requested from human:
- Screenshot of gallery showing thumbnails.
- Confirm cache folder created next to executable.
- Output of clear-cache button (removed count).

---

## Execution options

Plan saved to `docs/plans/2026-03-03-gallery-thumbnails-cache-clear.md`.

Two execution options:

1) **Subagent-Driven (this session)** — dispatch a fresh subagent per task, review between tasks, faster iteration.

2) **Parallel Session (separate)** — open a new session with executing-plans and run tasks with checkpoints.

Which approach do you want?
