# Expanded UX + Ops Reliability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver all requested UX/ops capabilities in one release: global font+zoom controls with persistence, principle explanations, dual logs, dual-layer undo, conflict policy controls, open-file actions, and recent vault path persistence.

**Architecture:** Use a unified backend operation engine to execute migration/fix with consistent records and reversible entries. Frontend adds global settings state in App, shared controls, logs/history panels, and conflict-resolution UI while preserving Gemini-finalized layout classes. Operations emit both UI-readable history and filesystem log lines.

**Tech Stack:** React + TypeScript (Vite), Tauri v1 commands, Rust filesystem ops, JSONL logging, localStorage persistence

---

### Task 1: Define backend operation models and conflict policy contracts

**Files:**
- Modify: `src-tauri/src/ops_log.rs`
- Modify: `src-tauri/src/models.rs`
- Test: `src-tauri/src/ops_log.rs` (unit tests)

**Step 1: Write the failing test**

Add tests for:
- `ConflictPolicy` default is `RenameAll`
- operation entry can transition to `undone`
- task summary serializes with camelCase fields

**Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test ops_log -- --nocapture`
Expected: FAIL because types/status/policy do not exist yet.

**Step 3: Write minimal implementation**

Implement in `ops_log.rs`:
- `ConflictPolicy` enum: `PromptEach`, `OverwriteAll`, `RenameAll`
- `OperationTask`, `OperationEntry`, undo status fields
- serde rename rules for frontend compatibility

**Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test ops_log -- --nocapture`
Expected: PASS.

**Step 5: Commit**

```bash
git add src-tauri/src/ops_log.rs src-tauri/src/models.rs
git commit -m "feat: add unified operation and conflict policy models"
```

---

### Task 2: Add filesystem log writer with exe-adjacent priority

**Files:**
- Create: `src-tauri/src/runtime_log.rs`
- Modify: `src-tauri/src/main.rs`
- Test: `src-tauri/src/runtime_log.rs`

**Step 1: Write the failing test**

Add tests for:
- log path resolver picks executable directory first when writable
- fallback path used when not writable

**Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test runtime_log -- --nocapture`
Expected: FAIL before module exists.

**Step 3: Write minimal implementation**

Implement:
- append log line API (`append_runtime_log`)
- best-effort path strategy: exe dir → temp fallback
- structured line format with timestamp/task/action/message

Wire calls in command handlers in `main.rs`.

**Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test runtime_log -- --nocapture`
Expected: PASS.

**Step 5: Commit**

```bash
git add src-tauri/src/runtime_log.rs src-tauri/src/main.rs
git commit -m "feat: add runtime logging with exe-directory output"
```

---

### Task 3: Implement conflict-safe migration with policy options

**Files:**
- Modify: `src-tauri/src/migrate.rs`
- Modify: `src-tauri/src/main.rs`
- Test: `src-tauri/src/migrate.rs`

**Step 1: Write the failing test**

Add tests:
- collision with `RenameAll` creates renamed target
- collision with `OverwriteAll` replaces target
- no-file-found produces structured error message

**Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test migrate -- --nocapture`
Expected: FAIL because policy logic not implemented.

**Step 3: Write minimal implementation**

Implement in migration path:
- accept policy argument
- perform rename-overwrite strategy
- return task/entry records for undo

Expose command signature:
- `execute_migration(note_path, target_dir, policy)`

**Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test migrate -- --nocapture`
Expected: PASS.

**Step 5: Commit**

```bash
git add src-tauri/src/migrate.rs src-tauri/src/main.rs
git commit -m "feat: support migration conflict policies and structured records"
```

---

### Task 4: Implement fix_issues operation records and undo support

**Files:**
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/src/scanner.rs` (only if needed for stable IDs)
- Modify: `src-tauri/src/ops_log.rs`
- Test: `src-tauri/src/main.rs` command-level tests or focused unit helpers

**Step 1: Write the failing test**

Test expected behaviors:
- `fix_issues` creates task + entry records
- orphan delete and misplaced move entries are reversible
- missing file yields message: `无法找到该文件，请自行检查`

**Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test fix_issues -- --nocapture`
Expected: FAIL because undo-aware records missing.

**Step 3: Write minimal implementation**

Implement:
- record creation per entry
- save enough metadata to reverse action
- return summary + taskId

**Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test fix_issues -- --nocapture`
Expected: PASS.

**Step 5: Commit**

```bash
git add src-tauri/src/main.rs src-tauri/src/ops_log.rs src-tauri/src/scanner.rs
git commit -m "feat: add reversible fix_issues operation tracking"
```

---

### Task 5: Add history APIs and dual-layer undo rules

**Files:**
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/src/ops_log.rs`
- Test: `src-tauri/src/ops_log.rs` or command helper tests

**Step 1: Write the failing test**

Add tests for:
- `undo_entry` marks one entry undone
- `undo_task` skips previously undone entries
- missing target returns required warning text

**Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test undo -- --nocapture`
Expected: FAIL before handlers exist.

**Step 3: Write minimal implementation**

Add commands:
- `list_operation_history()`
- `undo_entry(entry_id)`
- `undo_task(task_id)`

Ensure rule compliance with user constraints.

**Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test undo -- --nocapture`
Expected: PASS.

**Step 5: Commit**

```bash
git add src-tauri/src/main.rs src-tauri/src/ops_log.rs
git commit -m "feat: add task-level and entry-level undo with skip rules"
```

---

### Task 6: Add open file and open parent directory commands

**Files:**
- Modify: `src-tauri/src/main.rs`
- Test: command helper tests (path validation)

**Step 1: Write the failing test**

Tests for:
- open file command validates existence
- open parent command validates parent path
- returns readable error when not found

**Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test open_file -- --nocapture`
Expected: FAIL before commands exist.

**Step 3: Write minimal implementation**

Add commands:
- `open_file(path)`
- `open_file_parent(path)`

Use Tauri APIs or platform-safe open strategy.

**Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test open_file -- --nocapture`
Expected: PASS.

**Step 5: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "feat: add file and folder open commands for scan results"
```

---

### Task 7: Frontend global settings (font/zoom/persistence/reset)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Create: `src/lib/uiSettings.ts`
- Test: `src/__tests__/app-settings.test.tsx`

**Step 1: Write the failing test**

Test:
- changing scale updates CSS variables
- localStorage persistence works
- reset button restores defaults

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/app-settings.test.tsx`
Expected: FAIL before settings controls exist.

**Step 3: Write minimal implementation**

Implement App-level settings bar and CSS variable application:
- font scale
- zoom scale
- reset defaults

Persist under one storage key.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/app-settings.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/App.tsx src/index.css src/lib/uiSettings.ts src/__tests__/app-settings.test.tsx
git commit -m "feat: add global font and zoom controls with persistence"
```

---

### Task 8: Frontend explanations, log window, history + undo UI

**Files:**
- Modify: `src/pages/ScanPage.tsx`
- Modify: `src/pages/MigratePage.tsx`
- Create: `src/components/WorkLogPanel.tsx`
- Create: `src/components/OperationHistoryPanel.tsx`
- Test: `src/__tests__/scan-page.test.tsx`, `src/__tests__/migrate-page.test.tsx`

**Step 1: Write the failing test**

Add tests for:
- explanation panels visible/toggleable
- history panel can trigger undo_entry and undo_task
- missing-file undo message shown

**Step 2: Run test to verify it fails**

Run:
- `npm run test -- src/__tests__/scan-page.test.tsx`
- `npm run test -- src/__tests__/migrate-page.test.tsx`

Expected: FAIL before new panels/hooks exist.

**Step 3: Write minimal implementation**

Implement:
- explanation sections for scan/migrate principles
- runtime log panel rendering
- operation history panel with task/entry undo buttons
- user alerts for failure messages

**Step 4: Run test to verify it passes**

Run same tests; expected PASS.

**Step 5: Commit**

```bash
git add src/pages/ScanPage.tsx src/pages/MigratePage.tsx src/components/WorkLogPanel.tsx src/components/OperationHistoryPanel.tsx src/__tests__/scan-page.test.tsx src/__tests__/migrate-page.test.tsx
git commit -m "feat: add principles, logs, and dual-layer undo UI"
```

---

### Task 9: Recent vault paths + scan result open actions + conflict prompt UI

**Files:**
- Modify: `src/pages/ScanPage.tsx`
- Modify: `src/pages/MigratePage.tsx`
- Modify: `src/components/IssuesTable.tsx`
- Create (optional): `src/components/ConflictResolutionDialog.tsx`
- Test: `src/__tests__/scan-page.test.tsx`, `src/__tests__/migrate-page.test.tsx`

**Step 1: Write the failing test**

Add tests for:
- selecting path stores recent list
- list renders deduplicated recent paths
- open file/open folder buttons invoke backend commands
- conflict mode controls affect command payload policy

**Step 2: Run test to verify it fails**

Run targeted tests; expected FAIL.

**Step 3: Write minimal implementation**

Implement:
- recent vault path persistence and selection
- issue row actions: open file/open parent
- conflict controls with default rename-all

**Step 4: Run test to verify it passes**

Run tests; expected PASS.

**Step 5: Commit**

```bash
git add src/pages/ScanPage.tsx src/pages/MigratePage.tsx src/components/IssuesTable.tsx src/components/ConflictResolutionDialog.tsx src/__tests__/scan-page.test.tsx src/__tests__/migrate-page.test.tsx
git commit -m "feat: add recent paths, file open actions, and conflict control UI"
```

---

### Task 10: End-to-end verification before handoff

**Files:**
- Verify only

**Step 1: Run frontend tests**

Run: `npm test`
Expected: PASS.

**Step 2: Run Rust tests**

Run: `cd src-tauri && cargo test`
Expected: PASS.

**Step 3: Build app package**

Run: `npm run tauri:build`
Expected: PASS.

**Step 4: Manual acceptance checklist (Windows exe)**

- [ ] 字体/缩放全局生效，重启后持久化，恢复默认可用
- [ ] Scan/Migrate 都有工作原理说明
- [ ] UI 日志窗口有内容
- [ ] exe 同目录出现日志文件
- [ ] 冲突默认改名共存，可切换三模式
- [ ] 可任务级撤回，可文件级撤回
- [ ] 任务撤回会跳过已单独撤回条目
- [ ] 文件缺失时显示“无法找到该文件，请自行检查”
- [ ] 问题列表可打开文件/目录
- [ ] 最近仓库路径可复用

**Step 5: Final review checkpoint**

Invoke `superpowers:requesting-code-review` before declaring completion.
