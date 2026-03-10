# Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the highest-risk local file access vulnerabilities from the Tauri command layer, starting with unrestricted export writes and storage-key path traversal, then extend the same boundary model to other vault-related commands.

**Architecture:** Keep the existing frontend workflows intact where possible, but move trust boundaries into the Rust backend. Introduce small path-validation helpers in `src-tauri/src/main.rs`, use them to constrain export destinations and storage keys first, then expand the same helper set to vault-bound commands that currently trust frontend-provided paths.

**Tech Stack:** Rust 2021, Tauri v1.5, React 19, TypeScript 5.9, Vitest

---

### Task 1: Add failing backend tests for storage key validation and export path restrictions

**Files:**
- Modify: `src-tauri/src/main.rs`
- Test: `src-tauri/src/main.rs` (unit tests in the same file unless a dedicated test module is introduced)

**Step 1: Write the failing tests**

Add focused Rust tests that express the new security rules:

```rust
#[test]
fn storage_keys_reject_path_traversal() {
    assert!(is_valid_storage_key("theme_mode"));
    assert!(!is_valid_storage_key("../escape"));
    assert!(!is_valid_storage_key("nested/key"));
    assert!(!is_valid_storage_key(""));
}

#[test]
fn export_targets_only_allow_supported_extensions() {
    assert!(is_allowed_export_extension(Path::new("report.json")));
    assert!(is_allowed_export_extension(Path::new("report.csv")));
    assert!(is_allowed_export_extension(Path::new("report.md")));
    assert!(!is_allowed_export_extension(Path::new("report.txt")));
}
```

If helper names differ, keep the test intent the same.

**Step 2: Run test to verify it fails**

Run: `cargo test --manifest-path src-tauri/Cargo.toml main`
Expected: FAIL because the helpers do not exist yet or current validation is too permissive.

**Step 3: Do not implement beyond the minimal red-state setup**

Stop after the tests clearly express the desired behavior.

**Step 4: Commit test-only change**

```bash
git add src-tauri/src/main.rs
git commit -m "test: define security validation rules for storage and export"
```

### Task 2: Implement minimal helper functions for storage keys and export path validation

**Files:**
- Modify: `src-tauri/src/main.rs`
- Test: `src-tauri/src/main.rs`

**Step 1: Add small security helpers**

Implement the minimum helper set needed for the first fixes. Keep them local and explicit rather than over-abstracted.

Suggested responsibilities:

- `is_valid_storage_key(key: &str) -> bool`
- `storage_file_path(dir: &Path, key: &str) -> Result<PathBuf, String>`
- `is_allowed_export_extension(path: &Path) -> bool`
- `validate_export_target(path: &Path) -> Result<(), String>`

Constraints to encode:

- storage keys allow only `[A-Za-z0-9_-]`
- storage keys cannot be empty
- export files must use `.json`, `.csv`, or `.md`
- export targets must have an existing parent directory
- export targets must not be directories

**Step 2: Keep helper semantics narrow**

Do not yet generalize for all future vault commands. Only implement what Task 3 needs.

**Step 3: Run Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml main`
Expected: PASS

**Step 4: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "refactor: add backend path validation helpers"
```

### Task 3: Harden `write_text_file` without breaking report export UX

**Files:**
- Modify: `src-tauri/src/main.rs`
- Review: `src/pages/ScanPage.tsx:543-560`
- Test: `src-tauri/src/main.rs`

**Step 1: Add or extend the failing test**

Add a focused command-level test for the current export semantics:

```rust
#[test]
fn write_text_file_rejects_unsupported_extensions() {
    let path = temp_dir().join("report.txt");
    let err = write_text_file(path.to_string_lossy().to_string(), "x".into()).unwrap_err();
    assert!(err.contains("export"));
}
```

Also add a positive test for a supported extension when the parent directory exists.

**Step 2: Run focused test to verify the red state**

Run: `cargo test --manifest-path src-tauri/Cargo.toml write_text_file`
Expected: FAIL under current unrestricted behavior.

**Step 3: Implement minimal hardening**

Update `write_text_file` so it:

- validates the target path with the new export helper
- writes only if validation passes
- returns clear user-facing errors for invalid paths or unsupported extensions

Do not rename the command yet unless the frontend also changes in this same step. Preserve current command wiring if that avoids churn.

**Step 4: Run backend tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml write_text_file`
Expected: PASS

**Step 5: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "fix: restrict export writes to safe target files"
```

### Task 4: Harden storage commands against key-based path traversal

**Files:**
- Modify: `src-tauri/src/main.rs`
- Review: `src/lib/storage.ts` if command expectations need confirmation
- Test: `src-tauri/src/main.rs`

**Step 1: Add failing tests for each command path**

Add tests that prove invalid keys are rejected by:

- `read_local_storage`
- `write_local_storage`
- `remove_local_storage`

Example pattern:

```rust
#[test]
fn write_local_storage_rejects_invalid_key() {
    let err = write_local_storage("../escape".into(), "{}".into()).unwrap_err();
    assert!(err.contains("Invalid storage key"));
}
```

**Step 2: Run focused tests and confirm they fail**

Run: `cargo test --manifest-path src-tauri/Cargo.toml storage`
Expected: FAIL because invalid keys are currently accepted.

**Step 3: Implement minimal command changes**

Update the three storage commands to:

- construct the target path only through `storage_file_path(...)`
- reject invalid keys before any read/write/delete
- preserve behavior for valid existing keys

**Step 4: Run focused tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml storage`
Expected: PASS

**Step 5: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "fix: prevent storage key path traversal"
```

### Task 5: Add frontend coverage for export error handling if needed

**Files:**
- Modify: `src/__tests__/scan-page.test.tsx` only if needed
- Review: `src/pages/ScanPage.tsx:543-560`

**Step 1: Decide whether frontend coverage is missing**

If existing tests do not cover export failure handling, add a small Vitest regression that mocks an export rejection and verifies a user-visible error is shown.

**Step 2: Run focused test**

Run: `npm test -- scan-page.test.tsx`
Expected: PASS

**Step 3: Commit if test changed**

```bash
git add src/__tests__/scan-page.test.tsx
git commit -m "test: cover export validation errors"
```

If no frontend test change was needed, skip the commit.

### Task 6: Document the first-phase security hardening in project docs

**Files:**
- Modify: `HANDOFF.md`
- Modify: `CONTRIBUTING.md`
- Optionally Modify: `README.md` only if user-facing export restrictions need mention

**Step 1: Update handoff notes**

Record that:

- export writing is now restricted to report-like file extensions
- storage keys are validated and can no longer contain path separators
- further command boundary hardening is still pending for vault-bound operations

**Step 2: Update contributing guidance**

Add a short backend safety note instructing future changes to validate frontend-provided paths in Tauri commands.

**Step 3: Run docs sanity review**

Read the updated sections and ensure they match the implementation exactly.

**Step 4: Commit**

```bash
git add HANDOFF.md CONTRIBUTING.md README.md
git commit -m "docs: record backend command hardening rules"
```

### Task 7: Extend the same helper model to basename and vault-bound validation

**Files:**
- Modify: `src-tauri/src/main.rs`
- Review: `src/pages/ScanPage.tsx`
- Test: backend unit tests in `src-tauri/src/main.rs`

**Step 1: Write failing tests**

Add tests for:

- basename-only validation for `broken_image_name`
- vault-root containment checks for existing paths

**Step 2: Run tests to confirm the red state**

Run: `cargo test --manifest-path src-tauri/Cargo.toml validation`
Expected: FAIL

**Step 3: Implement minimal helpers**

Add helpers such as:

- `validate_basename(...)`
- `canonicalize_existing_within_root(...)`

Keep the API small and focused.

**Step 4: Run tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml validation`
Expected: PASS

**Step 5: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "refactor: add basename and vault path validation helpers"
```

### Task 8: Harden `fix_broken_with_file`

**Files:**
- Modify: `src-tauri/src/main.rs:1072-1106`
- Test: backend unit tests in `src-tauri/src/main.rs`

**Step 1: Write failing tests**

Add tests that prove:

- path separators in `broken_image_name` are rejected
- `md_path` must resolve inside `vault_path`
- valid dropped files can still be copied into `md_dir/attachments`

**Step 2: Run focused test**

Run: `cargo test --manifest-path src-tauri/Cargo.toml fix_broken_with_file`
Expected: FAIL

**Step 3: Implement minimal command hardening**

- validate `broken_image_name` as basename-only
- validate `md_path` inside `vault_path`
- ensure final target remains under the intended attachments directory

**Step 4: Run tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml fix_broken_with_file`
Expected: PASS

**Step 5: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "fix: constrain broken image repair targets"
```

### Task 9: Harden `rename_image`, `merge_duplicates`, and `convert_images`

**Files:**
- Modify: `src-tauri/src/main.rs`
- Test: backend unit tests in `src-tauri/src/main.rs`

**Step 1: Add focused failing tests per command**

Cover these rules:

- `rename_image` rejects `old_path` outside `vault_root`
- `merge_duplicates` rejects `keep/remove` paths outside `vault_path`
- `convert_images` rejects source images outside `vault_path`

**Step 2: Run targeted tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml rename_image`
Run: `cargo test --manifest-path src-tauri/Cargo.toml merge_duplicates`
Run: `cargo test --manifest-path src-tauri/Cargo.toml convert_images`
Expected: FAIL until command guards are added.

**Step 3: Implement minimal command guards**

Add root-containment checks before any read/write/delete side effect.

**Step 4: Run targeted tests again**

Expected: PASS

**Step 5: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "fix: enforce vault boundaries for file mutation commands"
```

### Task 10: Harden `open_file`, `open_file_parent`, and backup source validation

**Files:**
- Modify: `src-tauri/src/main.rs`
- Test: backend unit tests in `src-tauri/src/main.rs`

**Step 1: Write failing tests**

Cover:

- `open_file` rejects paths outside the allowed vault
- `open_file_parent` rejects files outside the allowed vault
- backup commands reject source paths outside the vault
- backup destination validation still permits external user-chosen destinations of the correct type

**Step 2: Run targeted tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml open_file`
Run: `cargo test --manifest-path src-tauri/Cargo.toml backup`
Expected: FAIL

**Step 3: Implement minimal guards**

Preserve the external-destination backup UX while ensuring sources remain vault-bound.

**Step 4: Run targeted tests**

Expected: PASS

**Step 5: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "fix: constrain file opening and backup sources to vault paths"
```

### Task 11: Verify build and targeted frontend/backend regressions

**Files:**
- Review only unless fixes require touch-ups

**Step 1: Run Rust test suite or focused backend groups**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS

**Step 2: Run frontend security-adjacent tests**

Run: `npm test -- scan-page.test.tsx`
Expected: PASS

**Step 3: Run build check**

Run: `npm run build`
Expected: PASS

**Step 4: Commit final verification-only touch-ups if any**

```bash
git add <touched files>
git commit -m "test: verify backend security hardening"
```

If no files changed during verification, skip this commit.
