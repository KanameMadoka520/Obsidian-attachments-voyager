# In-App Feature Guidance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add concise in-app feature guidance across the main pages and expand the Help page so users can understand what each area does and how to use major workflows.

**Architecture:** Reuse the existing React + i18n structure and add lightweight guidance blocks directly inside existing page/component layouts. Preserve existing tooltips and hints, avoid duplicate explanations, and keep all new copy in the shared translation system.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Vitest, custom i18n in `src/lib/i18n.ts`

---

### Task 1: Add translation keys for new guidance copy

**Files:**
- Modify: `src/lib/i18n.ts`

**Step 1: Add failing type usage targets in the translation interface**

Add new `Translations` keys for:
- scan page overview
- scan sidebar/filter guidance
- detail panel empty guidance
- status bar guidance
- gallery page overview
- gallery controls guidance
- stats page overview
- stats health score explanation
- migrate page overview
- help page expanded sections and workflow text

**Step 2: Run TypeScript-aware tests or build to verify missing keys fail**

Run: `npm run test -- scan-page.test.tsx migrate-page.test.tsx`
Expected: Existing tests may fail or TypeScript may complain once components start referencing missing keys in later tasks.

**Step 3: Add minimal zh/en translation entries**

Update both language objects and the `Translations` interface in `src/lib/i18n.ts` with concise copy matching the approved design.

Guidelines:
- Keep inline guidance to 1–3 short sentences
- Reuse existing terminology like scan / orphan / misplaced / broken
- Do not reword existing tooltip strings unless necessary

**Step 4: Run targeted tests**

Run: `npm run test -- scan-page.test.tsx migrate-page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat: add i18n strings for in-app guidance"
```

### Task 2: Add scan page guidance and detail panel empty-state help

**Files:**
- Modify: `src/pages/ScanPage.tsx`
- Modify: `src/components/DetailPanel.tsx`
- Test: `src/__tests__/scan-page.test.tsx`

**Step 1: Write failing tests for scan guidance visibility**

Add tests that render `ScanPage` and assert:
- a scan workflow guidance block appears after scanning UI is visible
- a detail-panel empty-state guidance message appears when no item is selected and `selectedCount` is not greater than 1

Example assertions to add:

```tsx
expect(screen.getByText('选择仓库后开始扫描')).toBeInTheDocument()
expect(screen.getByText('选中一个问题后，可在这里查看详情和执行操作')).toBeInTheDocument()
```

Use the actual final Chinese strings you add to i18n.

**Step 2: Run tests to verify they fail**

Run: `npm run test -- scan-page.test.tsx`
Expected: FAIL because the new guidance text is not rendered yet.

**Step 3: Implement minimal scan page guidance**

In `src/pages/ScanPage.tsx`:
- add a muted guidance block near the top of the scan workspace, under toolbar/progress/error area and before the main panels
- explain the workflow: choose vault → scan → filter → inspect → act
- add a short note near the status bar section or above it clarifying logs vs operation history if layout allows without clutter

In `src/components/DetailPanel.tsx`:
- replace the current `return null` for the no-selection state with a lightweight empty-state panel
- include a concise sentence saying that selecting one issue shows preview, path, reason, and available actions
- preserve the existing multi-select state behavior

**Step 4: Run tests to verify they pass**

Run: `npm run test -- scan-page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/ScanPage.tsx src/components/DetailPanel.tsx src/__tests__/scan-page.test.tsx
git commit -m "feat: add scan page guidance"
```

### Task 3: Add sidebar/filter and status bar guidance without duplicating existing tooltips

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/StatusBar.tsx`
- Test: `src/__tests__/scan-page.test.tsx`

**Step 1: Write failing tests for filter and status guidance**

Add assertions that the scan UI includes:
- a short filter/sidebar helper text
- a short status/log/history helper text when the drawer is expanded or always-visible summary guidance if you choose that implementation

**Step 2: Run tests to verify they fail**

Run: `npm run test -- scan-page.test.tsx`
Expected: FAIL because those helper texts do not exist yet.

**Step 3: Implement minimal guidance blocks**

In `src/components/Sidebar.tsx`:
- add a muted helper paragraph near the top of the sidebar
- explain that the sidebar narrows the current result set by category, filename, type, and size
- do not alter the existing orphan/misplaced/broken tooltips

In `src/components/StatusBar.tsx`:
- add a short helper line inside the expanded drawer or adjacent to tabs
- clarify that logs show runtime activity and history shows completed operations
- preserve all existing interactions

**Step 4: Run tests to verify they pass**

Run: `npm run test -- scan-page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/Sidebar.tsx src/components/StatusBar.tsx src/__tests__/scan-page.test.tsx
git commit -m "feat: explain filters and status areas"
```

### Task 4: Add gallery page guidance

**Files:**
- Modify: `src/pages/GalleryPage.tsx`
- Optional Modify: `src/__tests__/scan-page.test.tsx` or create `src/__tests__/gallery-page.test.tsx`

**Step 1: Write a failing test for gallery guidance**

If creating a new test file, use a minimal `ScanResult` with `allImages` populated and assert:
- top-level gallery overview text appears
- controls guidance mentions that the page shows all attachments, not just problem files

Example structure:

```tsx
render(<GalleryPage result={mockResult} />)
expect(screen.getByText('这里展示仓库中的全部附件')).toBeInTheDocument()
```

**Step 2: Run the test to verify it fails**

Run: `npm run test -- gallery-page.test.tsx`
Expected: FAIL because the guidance block is not rendered yet.

**Step 3: Implement minimal gallery guidance**

In `src/pages/GalleryPage.tsx`:
- add an overview block near the top header explaining this page shows all vault attachments
- add a short helper line near controls describing display modes, thumbnail generation, and cache clearing
- avoid repeating the existing button titles/tooltips verbatim

**Step 4: Run the gallery test**

Run: `npm run test -- gallery-page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/GalleryPage.tsx src/__tests__/gallery-page.test.tsx
git commit -m "feat: add gallery page guidance"
```

### Task 5: Add stats page guidance

**Files:**
- Modify: `src/pages/StatsPage.tsx`
- Create or Modify test: `src/__tests__/stats-page.test.tsx`

**Step 1: Write a failing test for stats guidance**

Create a test that renders `StatsPage` with a minimal `ScanResult` and asserts:
- overview text states stats come from the latest scan
- health score section includes a short explanatory sentence when data exists

**Step 2: Run the test to verify it fails**

Run: `npm run test -- stats-page.test.tsx`
Expected: FAIL because the text is not present yet.

**Step 3: Implement minimal stats guidance**

In `src/pages/StatsPage.tsx`:
- add a page intro near the top of the page
- add a short health-score explanation near the score block
- add a note encouraging users to re-scan if they want refreshed metrics

**Step 4: Run the test to verify it passes**

Run: `npm run test -- stats-page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/StatsPage.tsx src/__tests__/stats-page.test.tsx
git commit -m "feat: add stats page guidance"
```

### Task 6: Add migrate page guidance beyond the existing brief explanation

**Files:**
- Modify: `src/pages/MigratePage.tsx`
- Modify: `src/__tests__/migrate-page.test.tsx`

**Step 1: Write failing tests for migrate guidance**

Add assertions that `MigratePage` shows:
- a short top-level explanation that this page is for moving a note together with related attachments
- a concise preview-vs-execute instruction

**Step 2: Run tests to verify they fail**

Run: `npm run test -- migrate-page.test.tsx`
Expected: FAIL because the additional guidance text is not rendered yet.

**Step 3: Implement minimal migrate guidance**

In `src/pages/MigratePage.tsx`:
- keep the existing explanation section
- add a more explicit overview near the top of the card or above the form
- add a helper line near the action buttons clarifying preview first, then execute

**Step 4: Run tests to verify they pass**

Run: `npm run test -- migrate-page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/MigratePage.tsx src/__tests__/migrate-page.test.tsx
git commit -m "feat: clarify migrate workflow"
```

### Task 7: Expand Help page into a real usage center

**Files:**
- Modify: `src/pages/HelpPage.tsx`
- Modify: `src/lib/i18n.ts`
- Create test: `src/__tests__/help-page.test.tsx`

**Step 1: Write a failing test for expanded Help content**

Create a test that renders `HelpPage` and asserts the presence of section headings for:
- app overview
- first use
- scan page
- migrate page
- stats page
- gallery page
- common workflows
- keyboard shortcuts

**Step 2: Run the test to verify it fails**

Run: `npm run test -- help-page.test.tsx`
Expected: FAIL because the Help page currently only contains prerequisite settings.

**Step 3: Implement the expanded Help page**

In `src/pages/HelpPage.tsx`:
- keep the prerequisite settings section
- add structured sections for the approved guidance plan
- keep content readable and scannable using the existing card/section style where possible
- use lists for common workflows and shortcuts

In `src/lib/i18n.ts`:
- add the corresponding zh/en section headings and body copy

**Step 4: Run the test to verify it passes**

Run: `npm run test -- help-page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/HelpPage.tsx src/lib/i18n.ts src/__tests__/help-page.test.tsx
git commit -m "feat: expand help page into usage guide"
```

### Task 8: Run verification suite and do a final review for duplication/clutter

**Files:**
- Review: `src/pages/ScanPage.tsx`
- Review: `src/components/DetailPanel.tsx`
- Review: `src/components/Sidebar.tsx`
- Review: `src/components/StatusBar.tsx`
- Review: `src/pages/GalleryPage.tsx`
- Review: `src/pages/StatsPage.tsx`
- Review: `src/pages/MigratePage.tsx`
- Review: `src/pages/HelpPage.tsx`
- Review: `src/lib/i18n.ts`
- Test: `src/__tests__/scan-page.test.tsx`
- Test: `src/__tests__/migrate-page.test.tsx`
- Test: `src/__tests__/gallery-page.test.tsx`
- Test: `src/__tests__/stats-page.test.tsx`
- Test: `src/__tests__/help-page.test.tsx`

**Step 1: Run targeted tests together**

Run: `npm run test -- scan-page.test.tsx migrate-page.test.tsx gallery-page.test.tsx stats-page.test.tsx help-page.test.tsx`
Expected: PASS

**Step 2: Run full frontend test suite**

Run: `npm test`
Expected: PASS (known warning about `unlisten is not a function` may still appear if unchanged)

**Step 3: Run build verification**

Run: `npm run build`
Expected: build completes successfully

**Step 4: Manually review for duplicate explanations**

Checklist:
- existing tooltips still exist
- no page repeats the same sentence in two nearby places
- new text is short and muted
- no layout is pushed into unusable spacing

**Step 5: Commit**

```bash
git add src/pages src/components src/lib/i18n.ts src/__tests__
git commit -m "feat: add contextual feature guidance"
```
