# Selective Fix UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add clear fix-behavior explanation and selectable issue fixing (default none selected, all/manual/Ctrl+Shift multi-select) so only chosen issues are fixed.

**Architecture:** Keep selection state in `ScanPage` and render controlled selection UI in `IssuesTable`. Use row index + anchor index to support standard desktop multi-select semantics (single/Ctrl/Shift). Keep existing fix backend call and filter payload to selected issues only.

**Tech Stack:** React 19 + TypeScript, existing Tauri invoke flow (`fix_issues`)

---

### Task 1: Add failing tests for selectable fix behavior

**Files:**
- Modify: `src/__tests__/scan-page.test.tsx`

**Step 1: Write the failing test**

Add tests asserting:
- default no selected rows after scan result render
- click behavior: single/Ctrl/Shift selection
- execute fix with empty selection shows warning
- execute fix sends only selected issues

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/scan-page.test.tsx`
Expected: FAIL because selection UI/logic not implemented yet.

**Step 3: Write minimal implementation**

No implementation in this task.

**Step 4: Run test to verify it still fails for expected reason**

Run: `npm run test -- src/__tests__/scan-page.test.tsx`
Expected: FAIL with missing selection UI/handlers.

**Step 5: Commit**

```bash
git add src/__tests__/scan-page.test.tsx
git commit -m "test: define selectable fix behavior in scan page"
```

---

### Task 2: Implement selection controls in issue table and scan page

**Files:**
- Modify: `src/components/IssuesTable.tsx`
- Modify: `src/pages/ScanPage.tsx`

**Step 1: Write the failing test**

Use Task 1 tests as failing baseline.

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/scan-page.test.tsx`
Expected: FAIL before implementation.

**Step 3: Write minimal implementation**

Implement:
- `selectedIssueIds` + `anchorIndex` state in `ScanPage`
- handlers for row select:
  - plain click: single select
  - Ctrl click: toggle row
  - Shift click: select range from anchor
- add `全选` / `清空选择` controls
- pass selected rows + handlers to `IssuesTable`
- add row checkbox + selected highlight in `IssuesTable`
- `runFixes` filters to selected issues only
- if no selected rows, show user-facing warning

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/scan-page.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/pages/ScanPage.tsx src/components/IssuesTable.tsx src/__tests__/scan-page.test.tsx
git commit -m "feat: support selectable issue fixing with ctrl-shift multi-select"
```

---

### Task 3: Add explicit fix behavior explanation text

**Files:**
- Modify: `src/pages/ScanPage.tsx`

**Step 1: Write the failing test**

Add assertions for explanation text containing:
- orphan handling behavior
- misplaced handling behavior

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/scan-page.test.tsx`
Expected: FAIL before text is added.

**Step 3: Write minimal implementation**

Add explanatory section in Scan page:
- orphan: delete unreferenced file
- misplaced: move to suggested target (with conflict policy)

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/scan-page.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/pages/ScanPage.tsx src/__tests__/scan-page.test.tsx
git commit -m "feat: document orphan and misplaced fix behavior in scan page"
```

---

### Task 4: Final verification

**Files:**
- Verify only

**Step 1: Build verification**

Run: `npm run tauri:build`
Expected: PASS.

**Step 2: Manual interaction verification**

Checklist:
- [ ] default none selected
- [ ] 全选 / 清空 works
- [ ] single / Ctrl / Shift selection works
- [ ] no-selection fix warns user
- [ ] selected-only fix works
- [ ] explanation text visible and clear

**Step 3: Optional code review**

Invoke `superpowers:requesting-code-review` if needed.
