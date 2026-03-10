# Security Hardening Design

Date: 2026-03-07
Project: Obsidian Attachments Voyager

## Goal

Harden the Tauri command surface so frontend-provided paths are no longer treated as trusted authority. The immediate objective is to close the highest-risk local file access issues without materially degrading the current user experience for export, backup, scan, and gallery workflows.

## Context

Obsidian Attachments Voyager is a Tauri desktop app that scans and manipulates files inside an Obsidian vault. The frontend currently invokes Rust commands with raw path strings for operations such as export, backup, rename, duplicate merge, image conversion, broken-reference repair, local storage persistence, and file opening.

The current architecture assumes the frontend only sends legitimate paths produced by scan results or file dialogs. That assumption is not strong enough as a security boundary. In a Tauri application, the backend command layer must independently validate which paths can be read, written, deleted, renamed, or opened.

## Threat Model

### In scope

- A malicious or compromised frontend state invoking Tauri commands with crafted parameters.
- A future UI regression accidentally passing malformed paths into privileged backend commands.
- Path traversal via string parameters such as storage keys and file names.
- Vault escape through `..`, absolute paths, or symlink-resolved targets.
- Overly broad backend commands being repurposed as generic local file primitives.

### Out of scope

- Full operating-system sandboxing.
- Protection against a fully compromised local user account.
- Remote code execution not originating from this application’s own command surface.
- A complete redesign of every file workflow in one pass.

## Findings Summary

### High risk

1. `write_text_file` acts as an unrestricted arbitrary file write primitive.
   - File: `src-tauri/src/main.rs`
   - Risk: any frontend caller can write arbitrary content to an arbitrary path the user account can access.

### Medium risk

2. `read_local_storage`, `write_local_storage`, and `remove_local_storage` construct storage paths from unsanitized keys.
   - File: `src-tauri/src/main.rs`
   - Risk: path traversal outside `voyager-data` using crafted keys.

3. Multiple vault-related commands trust frontend-provided file paths without verifying they belong to the current vault.
   - File: `src-tauri/src/main.rs`
   - Affected commands: `rename_image`, `merge_duplicates`, `convert_images`, `fix_broken_with_file`, `open_file`, `open_file_parent`, `backup_selected_files`, `backup_selected_zip`.

4. Scan and duplicate flows do not yet define a strict symlink/resource policy.
   - Files: `src-tauri/src/scanner.rs`, `src-tauri/src/main.rs`
   - Risk: excessive resource consumption, unintended traversal into large or linked directory trees.

## Design Principles

### 1. Frontend input is intent, not authority

The frontend may suggest paths, but the backend must decide whether each path is allowed for the specific command.

### 2. Every command must declare its trust boundary

Commands fall into two main categories:

- **Vault-bound commands**: may only operate on files inside the selected vault.
- **Export-bound commands**: may read from the vault but may write to user-chosen destinations outside the vault.

### 3. File names and keys must not be treated as paths

Inputs such as `key` or `broken_image_name` are identifiers, not path fragments. They must be validated as basename-like values or key-like values before path construction.

### 4. Prefer narrow commands over generic file primitives

Commands with broad names like `write_text_file` tend to become unsafe because they are reusable outside their original intent. The backend should prefer purpose-built commands with explicit constraints.

### 5. Path validation must happen after normalization

String checks are not enough. Use normalized and, where possible, canonicalized paths to verify that a path remains inside its allowed root after resolution.

## Security Boundary Model

### Vault-bound source paths

These are paths to existing files that must remain inside the selected Obsidian vault. Commands in this category must reject any source path outside the canonical vault root.

Examples:
- images returned by scan results
- markdown files inside the vault
- duplicate candidates within the vault
- files being renamed or converted inside the vault

### Export-bound destination paths

These are user-selected save or backup destinations that may legitimately be outside the vault. The backend should still verify that they are structurally valid for the command.

Examples:
- report export target path
- backup destination directory
- backup ZIP target file

### Application-private storage paths

These must always remain inside the application storage directory.

Examples:
- `voyager-data/<key>.json`

## Per-Command Hardening Requirements

### `write_text_file`

Current issue:
- accepts arbitrary `path` and writes arbitrary `content`.

Required changes:
- stop treating it as a general-purpose write primitive.
- repurpose it as an export-focused command or add strong constraints to the existing command.
- allow only explicit export extensions such as `.json`, `.csv`, and `.md`.
- require the parent directory to exist.
- reject targets that are directories.
- reject obviously unsafe paths or invalid extensions.
- preserve current export UX from `ScanPage.tsx`.

Balanced-mode decision:
- keep the command available to current frontend export flow, but restrict it to report-export semantics rather than arbitrary file writing.

### `read_local_storage` / `write_local_storage` / `remove_local_storage`

Current issue:
- storage file paths are built from unvalidated keys.

Required changes:
- validate keys against a strict whitelist such as `[A-Za-z0-9_-]+`.
- reject empty keys and path separators.
- continue to derive storage paths only under `voyager-data`.
- optionally verify that the final path remains inside the storage root.

Balanced-mode decision:
- keep the existing API shape to avoid frontend churn, but enforce key validation and rooted path resolution.

### `rename_image`

Current issue:
- trusts `old_path` and frontend-provided `md_refs` without proving the file and markdown targets are inside the vault.

Required changes:
- verify `old_path` resolves inside `vault_root`.
- ensure the new file path remains within the same allowed directory.
- treat `md_refs` as advisory/performance data only, not authorization.
- refuse writes to markdown files outside the vault.

### `merge_duplicates`

Current issue:
- `keep`, `remove`, and `vault_path` are accepted without strict vault membership validation.

Required changes:
- verify `keep` is inside the vault.
- verify every `remove` path is inside the vault.
- ensure only regular image files are removed.
- only rewrite markdown files under the vault root.

### `convert_images`

Current issue:
- writes converted files, rewrites markdown, and deletes originals based on untrusted frontend path input.

Required changes:
- verify every source image is inside the vault.
- verify rewritten markdown files are inside the vault.
- ensure generated output remains alongside the original image rather than escaping elsewhere.
- preserve the original file if output write fails.

### `fix_broken_with_file`

Current issue:
- `broken_image_name` is joined directly into an attachments path.

Required changes:
- require `broken_image_name` to be a basename only.
- reject separators, `..`, and empty names.
- verify `md_path` is inside the provided vault.
- permit dropped source files outside the vault, but restrict the target path to `md_dir/attachments/<basename>` inside the vault.

### `open_file` / `open_file_parent`

Current issue:
- currently allow opening arbitrary local paths if they exist.

Required changes:
- restrict open targets to files inside the selected vault or to files already present in the active scan/gallery results.
- reject paths outside the vault by default.

Balanced-mode decision:
- prefer vault-root validation first, rather than introducing a more complex recent-result allowlist immediately.

### `backup_selected_files` / `backup_selected_zip`

Current issue:
- source file list is trusted without verifying that it belongs to the vault.

Required changes:
- require all source paths to be inside the vault.
- permit destination paths outside the vault because backup/export is a legitimate external-write flow.
- validate destination structure by command type:
  - directory backup requires a directory destination
  - ZIP backup requires a `.zip` file destination with a valid parent directory

## Shared Helper Design

The backend should gain a small set of reusable path-validation helpers in `src-tauri/src/main.rs` or a dedicated support module.

Suggested responsibilities:

- validate storage keys
- validate basename-only file names
- canonicalize existing paths
- validate that an existing path lies within a root
- validate destination parent directories
- validate allowed export extensions
- validate directory vs file expectations

The goal is not to introduce a large abstraction framework. The goal is to remove repeated ad hoc checks and keep each command’s security guardrails obvious.

## Resource and Traversal Policy

This is not the first implementation target, but the design should explicitly record it.

### Scan policy

- avoid following symlinks by default
- consider skipping obviously irrelevant heavy directories such as `.git`, `node_modules`, and `.worktrees`
- add resource-aware safeguards for very large scans

### Duplicate detection policy

- move from full-file `fs::read` hashing toward streaming hashes when practical
- avoid unnecessarily loading large files fully into memory

### Conversion policy

- bound concurrency if large-image conversions create excessive memory pressure
- never delete originals until output has been safely written

## Testing Strategy

### Unit-level backend tests

Add focused Rust tests for the highest-risk helpers and commands:

- storage key validation accepts normal keys and rejects traversal attempts
- export path validation accepts `.json/.csv/.md` and rejects unsupported extensions
- basename validation rejects separators and `..`

### Frontend regression tests

Add or update Vitest tests to confirm:

- exports still succeed through the frontend path chosen via dialog
- invalid backend rejections surface as user-visible errors instead of silent failure

### Manual verification

- export report still works for JSON, CSV, and Markdown.
- app local settings still read/write normally.
- malformed storage keys are rejected.
- attempted path-escape filenames are rejected.

## Acceptance Criteria

### Phase 1 acceptance

- `write_text_file` is no longer a generic arbitrary file write primitive.
- local storage keys can no longer traverse outside `voyager-data`.
- existing export and settings flows still work from the UI.

### Phase 2 acceptance

- vault-bound commands reject paths outside the selected vault.
- basename-only file-name arguments are enforced where appropriate.
- backup commands allow external destinations but not external sources.

### Phase 3 acceptance

- scan and duplicate flows define and enforce a safer traversal/resource policy.

## Recommended Implementation Order

1. Restrict `write_text_file` to export-safe usage.
2. Add strict local storage key validation.
3. Add basename validation for `fix_broken_with_file`.
4. Add vault-root validation for `rename_image`, `merge_duplicates`, and `convert_images`.
5. Restrict `open_file` and `open_file_parent` to vault paths.
6. Restrict backup commands to vault-bound sources.
7. Improve scan/resource policies.

## Notes for Future Engineers

The important architectural shift is this: backend commands should no longer accept raw frontend strings as sufficient proof that a file operation is allowed. Every file-touching command must define and enforce its own boundary.
