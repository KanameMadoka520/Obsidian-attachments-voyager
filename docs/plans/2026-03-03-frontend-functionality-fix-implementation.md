# Frontend Functionality Repair and Gemini Handoff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Repair essential app workflows (folder selection, scan flow, migrate preview/execute feedback, author attribution) and prepare a clean Gemini UI redesign handoff without breaking functionality.

**Architecture:** Keep changes minimal and localized to current React pages/components. Wire Tauri dialog/invoke on the existing pages, add explicit loading/error/feedback states, and preserve current component tree. After functionality is stable, generate a focused Gemini handoff prompt + file list.

**Tech Stack:** React 19, TypeScript, Vite, Tauri v1 API (`@tauri-apps/api/dialog`, `@tauri-apps/api/tauri`), Vitest

---

### Task 1: Fix ScanPage directory picker and scan invocation

**Files:**
- Modify: `src/pages/ScanPage.tsx`
- Test: `src/__tests__/scan-page.test.tsx`

**Step 1: Write the failing test**

Add/extend tests to assert:
- Clicking “选择目录” triggers directory dialog and fills input.
- Clicking “开始扫描” calls `invoke('scan_vault', { root })`.
- Success updates downstream UI; failure shows error text.

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/scan-page.test.tsx`
Expected: FAIL because button currently has no click handler and scan is not invoked.

**Step 3: Write minimal implementation**

Implement in `ScanPage.tsx`:
- `pickVaultDirectory` with `open({ directory: true, multiple: false })`
- `handleScan` with `invoke('scan_vault', { root: vaultPath })`
- local states: `loading`, `error`, `result`
- bind `onClick` for both buttons and render status text

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/scan-page.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/pages/ScanPage.tsx src/__tests__/scan-page.test.tsx
git commit -m "fix: wire folder picker and scan action in ScanPage"
```

---

### Task 2: Make MigratePage preview/execute buttons functional

**Files:**
- Modify: `src/pages/MigratePage.tsx`
- Test: `src/__tests__/migrate-page.test.tsx`

**Step 1: Write the failing test**

Add/extend tests to assert:
- Preview button generates visible rows when inputs are valid.
- Execute button shows explicit feedback state.
- Invalid input blocks actions with user-facing validation message.

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/migrate-page.test.tsx`
Expected: FAIL because current buttons are no-op.

**Step 3: Write minimal implementation**

Implement in `MigratePage.tsx`:
- validate `notePath` + `targetDir`
- preview action fills `previewItems`
- execute action sets explicit status message (and avoids fake backend claims)

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/migrate-page.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/pages/MigratePage.tsx src/__tests__/migrate-page.test.tsx
git commit -m "fix: enable migrate preview and execute feedback"
```

---

### Task 3: Add author attribution in global UI

**Files:**
- Modify: `src/App.tsx`
- Test: `src/__tests__/smoke.test.ts`

**Step 1: Write the failing test**

Add assertion for visible text `GitHub: KanameMadoka520`.

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/smoke.test.ts`
Expected: FAIL because author text not present.

**Step 3: Write minimal implementation**

Add a small footer block in `App.tsx` with required author text.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/smoke.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/App.tsx src/__tests__/smoke.test.ts
git commit -m "chore: show project author attribution in app layout"
```

---

### Task 4: Prepare Gemini frontend redesign handoff artifacts

**Files:**
- Create: `GEMINI-FRONTEND-HANDOFF.md` (project root)
- Modify: `README.md` (optional short pointer)

**Step 1: Write failing review checklist (manual)**

Checklist must fail before writing doc if missing:
- file map of UI entry points
- non-breaking constraints
- ready-to-paste Gemini prompt
- acceptance criteria

**Step 2: Create handoff doc**

Include:
- where UI is defined (`src/App.tsx`, `src/pages/*.tsx`, `src/components/*.tsx`, `src/main.tsx`, `index.html`, `src/types.ts`)
- exactly what Gemini can change vs cannot change
- complete prompt template for Gemini

**Step 3: Verify completeness**

Manual verify all checklist items present.

**Step 4: Commit**

```bash
git add GEMINI-FRONTEND-HANDOFF.md README.md
git commit -m "docs: add gemini frontend redesign handoff guide"
```

---

### Task 5: Verification before completion

**Files:**
- Verify only

**Step 1: Run targeted frontend tests**

Run:
- `npm run test -- src/__tests__/scan-page.test.tsx`
- `npm run test -- src/__tests__/migrate-page.test.tsx`
- `npm run test -- src/__tests__/smoke.test.ts`

Expected: all PASS.

**Step 2: Build app package**

Run: `npm run tauri:build`
Expected: build succeeds.

**Step 3: Manual runtime checks (Windows)**

Checklist:
- [ ] 选择目录弹窗可打开并回填路径
- [ ] 开始扫描可执行并显示结果/错误
- [ ] 预览迁移计划有可见输出
- [ ] 执行迁移有明确反馈
- [ ] 可见作者信息 `GitHub: KanameMadoka520`

**Step 4: Optional review checkpoint**

Invoke `superpowers:requesting-code-review` before final handoff.
