# In-App Feature Guidance Design

Date: 2026-03-05
Project: Obsidian Attachments Voyager

## Goal

Improve in-app discoverability by adding concise feature explanations throughout the UI while avoiding visual clutter. Existing explanations and tooltips should be preserved and not duplicated. The Help page should be expanded into a more complete usage guide.

## Design Summary

Use a layered guidance model:

1. Contextual short guidance inside key pages and panels
2. Preserve existing tooltips where they already explain a feature well
3. Expand the Help page into a structured usage center for new and returning users

This design avoids overloading every button with tooltip text while still making major workflows understandable where users need them.

## Scope

### In scope

- Add short explanatory copy to major pages and panels
- Add empty-state or workflow hints where helpful
- Expand Help page content significantly
- Add all new text to i18n for zh/en
- Reuse existing tooltip patterns where appropriate

### Out of scope

- Changing feature behavior or business logic
- Adding onboarding popups, tours, or external dependencies
- Rewriting existing page architecture beyond what is needed for guidance copy

## Existing Guidance To Keep

Do not duplicate these existing help surfaces unless wording consolidation is necessary:

- Sidebar tooltips for orphan / misplaced / broken
- Toolbar tooltip for thumbnail generation
- Toolbar tooltip for raw image mode
- Toolbar tooltip for fix action
- Existing broken-category hint banner
- Existing drag-to-fix hint in detail panel

## Guidance Placement Plan

### 1. Scan page

Add a page-level guidance block near the top of the main scan workspace explaining the primary workflow:

- choose vault
- start scan
- filter results
- inspect details
- repair / backup / export / deduplicate / convert

Add a short note near filtering/navigation surfaces explaining that the left sidebar is for narrowing the current result set by issue type, filename, type, and size.

Add an empty or low-state hint in the detail panel when nothing is selected, telling users that selecting one item reveals preview, path, reason, and available actions.

Add a short explanation near the status/log area clarifying the difference between runtime logs and operation history.

### 2. Gallery page

Add a short intro near the top stating that this page shows all attachments in the vault, not only problematic files.

Add a concise explanation for the three display modes and when generating thumbnails helps.

Add a note that clearing cache only removes generated thumbnails and does not delete original images.

### 3. Stats page

Add a short intro stating that all charts and the health score are based on the most recent scan result.

Add a concise explanation under or near the health score indicating that a higher score means fewer attachment problems.

Add a hint that users should re-run scan if they want refreshed statistics after large changes.

### 4. Migrate page

Add a short top-level explanation that this page is for moving a note and its related attachments together.

Clarify the difference between previewing a migration plan and executing it.

Encourage preview-before-execute behavior.

### 5. Help page

Expand Help page into a structured usage center with these sections:

1. What the app does
2. Before first use (Obsidian prerequisites)
3. How to use the scan page
4. How to use the migrate page
5. How to read stats and health score
6. How to use gallery page
7. Common workflows
   - clean orphan files
   - fix misplaced files
   - inspect and repair broken references
   - back up current problem files
   - find and merge duplicates
   - convert formats
8. Keyboard shortcuts
9. Notes and cautions

## Content Style

- Keep inline guidance to 1–3 short sentences per section
- Prefer workflow-oriented wording over technical implementation details
- Avoid repeating text already shown in tooltips
- Keep tone instructional and calm
- Make guidance useful for first-time users without slowing down frequent users

## UI Pattern

Prefer lightweight static guidance blocks or muted helper text over modal help.

Recommended pattern:

- section intro text beneath page title or above main content
- muted helper text near complex controls
- empty-state hints where nothing is selected or no data exists

Avoid adding a new question-mark icon everywhere.

## i18n Requirements

All new user-facing strings must be added to both zh and en translation maps and typed in the Translations interface.

## Verification Plan

After implementation, verify:

1. New guidance appears in scan, gallery, stats, migrate, and help areas
2. Existing tooltip behavior remains intact
3. No duplicate explanations appear where guidance already existed
4. English and Chinese render correctly
5. Layout remains readable and interactive controls are unaffected

## Acceptance Criteria

- Users can understand each major page’s purpose from within the app
- Help page becomes a practical usage reference rather than only prerequisite notes
- Existing explanations are preserved and unnecessary duplication is avoided
- No feature behavior changes are introduced
