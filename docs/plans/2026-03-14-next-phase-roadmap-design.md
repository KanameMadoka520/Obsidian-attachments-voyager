# Next Phase Roadmap Design

Date: 2026-03-14
Project: Obsidian Attachments Voyager

## Goal

Move the project from:

- "can detect and batch-fix common attachment problems"

to:

- "can explain why a vault is unhealthy, predict what a fix will do, and verify whether a fix actually worked"

The next phase should prioritize **correctness**, **diagnosability**, and **operator trust** over adding broad new feature surface.

## Why this phase matters

The project already has strong breadth:

- scan
- fix
- rename
- backup
- dedup
- convert
- gallery
- stats
- migration
- preprocessing

What is now missing is deeper reliability in the most error-prone flows:

- `Misplaced` files that remain `Misplaced` after a fix
- ambiguous references when multiple files share the same basename
- users not knowing whether a repair actually succeeded
- difficult bug reports that only say "I clicked fix but the issue is still there"

This phase is about making the tool behave more like a vault-governance system than a one-shot cleanup utility.

## Product direction

### Primary theme

**Explainability first.**

Every destructive or semi-destructive operation should answer all three questions:

1. What do we think is wrong?
2. What exactly will we do?
3. After doing it, did it truly fix the problem?

### Engineering theme

**Path-aware, post-verified operations.**

The current system already introduced first-pass verification and diagnostics for `Misplaced` repairs.
The next phase should expand that into a coherent architecture:

- path-aware reference resolution
- root-cause classification
- dry-run repair planning
- post-operation verification
- user-visible result explanations

## Recommended implementation order

### Phase A — Path-aware reference model

This is the highest-value foundational change.

#### Current limitation

The parser and scan pipeline mostly collapse image references to a **basename-only** representation.

That is simple and fast, but loses critical information:

- whether the user wrote `![[img.png]]` or `![[attachments/img.png]]`
- whether the link was Markdown or Wiki format
- whether the reference included a relative path prefix
- which absolute target path that reference resolves to from the note's location
- whether two same-name files are actually distinguishable by path

This is the root cause of many subtle issues:

- false `Misplaced`
- false `Broken`
- false `Orphan`
- incorrect conflict handling
- fixes that look successful but remain semantically wrong

#### Design goal

Introduce a richer parsed reference model that preserves both:

- the **original reference text**
- the **resolved candidate meaning**

#### Recommended data model

Add a new backend-side struct roughly like:

```rust
pub struct ParsedImageRef {
    pub raw: String,
    pub syntax: RefSyntax,              // Wiki or Markdown
    pub md_path: String,
    pub normalized_ref: String,         // normalized slash form
    pub basename: String,               // last path segment
    pub relative_path: Option<String>,  // attachments/img.png
    pub alias: Option<String>,
    pub candidate_paths: Vec<String>,   // absolute vault candidates
}
```

And:

```rust
pub enum RefSyntax {
    Wiki,
    Markdown,
}
```

#### Implementation notes

- Keep the existing `extract_image_refs()` temporarily for compatibility.
- Add a parallel richer API such as `extract_image_ref_details(md_path, content)`.
- Compute candidate paths relative to the note directory.
- Normalize separators and trim query/alias components.
- Preserve basename extraction for compatibility, but stop treating basename as the only truth.

#### Acceptance criteria

- The parser can distinguish `![[img.png]]` from `![[attachments/img.png]]`.
- The scanner has enough information to reason about same-name images in different folders.
- Existing flows still compile while old basename-only consumers are incrementally migrated.

### Phase B — Root-cause classification

Once references are path-aware, issue types should gain a second dimension: **cause**.

#### Current limitation

Users currently see only:

- `orphan`
- `misplaced`
- `broken`

That is not enough to answer why a problem exists.

#### Design goal

Add a root-cause enum for diagnostics and UI rendering.

Suggested first pass:

```rust
pub enum IssueCause {
    WrongDirectory,
    AmbiguousBasenameMatch,
    RelativePathMismatch,
    MissingDiskFile,
    PostFixRenameConflict,
    TrashReference,
    UnsupportedReferencePattern,
    VaultConfigMismatch,
}
```

#### Example outcomes

- `Misplaced / WrongDirectory`
- `Misplaced / AmbiguousBasenameMatch`
- `Broken / MissingDiskFile`
- `Broken / RelativePathMismatch`

#### Acceptance criteria

- Every new `Misplaced` and `Broken` issue gets a machine-readable cause.
- Cause appears in diagnostics and can later appear in UI badges, filters, and stats.

### Phase C — Fix dry-run / execution plan

This is the most important user-facing trust feature after path-aware parsing.

#### Current limitation

The current scan page fix flow tells users what category they selected, but not the exact fully-resolved consequences of execution.

This is especially dangerous when:

- rename-on-conflict kicks in
- multiple same-name files exist
- some entries will still remain unhealthy after repair

#### Design goal

Introduce a **true dry-run plan** for fix operations.

The plan should include per-entry fields like:

- source path
- intended target path
- resolved target path after conflict policy
- expected verification outcome
- risk notes

Suggested result shape:

```rust
pub struct FixPlanEntry {
    pub issue_id: String,
    pub action: String,
    pub source_path: String,
    pub suggested_target: Option<String>,
    pub resolved_target: Option<String>,
    pub expected_post_status: String,
    pub warnings: Vec<String>,
}
```

#### UX recommendation

Before destructive execution, users should be able to open a preview panel that clearly shows:

- what will move
- what will delete
- what will rename-to-coexist
- what may still remain problematic

#### Acceptance criteria

- The dry-run path uses the same resolution rules as the real execution path.
- Preview and execution no longer drift apart.

### Phase D — Repair result report UI

The project now has operation history and first-pass diagnostics, but users still need a dedicated post-fix summary.

#### Design goal

After `fix_issues`, show a real result report rather than only a short status message.

Recommended sections:

- totals:
  - moved
  - deleted
  - skipped
  - verified fixed
  - still misplaced
  - became broken
  - verification skipped
- table:
  - file path
  - action
  - final verification status
  - reason
  - open diagnostic

#### UX recommendation

This should be a task-level modal, drawer, or dedicated result card immediately after the operation completes.

Do not force users to infer success from a single summary line.

#### Acceptance criteria

- A failed or partially successful fix is visibly distinguishable from a fully successful one.
- Users can open diagnostics directly from the result report.

### Phase E — Diagnostic package export

This is a support and debugging multiplier.

#### Design goal

Allow exporting a task-scoped diagnostic package, for example:

- `misplaced-fix-{taskId}.jsonl`
- scan snapshot summary
- conflict policy
- platform/runtime info
- app version
- relevant markdown paths

#### Packaging format

Start simple:

- a ZIP file
- human-readable `README.txt`
- structured JSON / JSONL payloads

#### Why it matters

It transforms vague bug reports like:

- "I clicked fix and it is still misplaced"

into reproducible investigation inputs.

#### Acceptance criteria

- Users can export a diagnostic package from the task history UI.
- The package contains enough context for offline debugging.

### Phase F — Vault config validation

This is the highest-value preventive feature after path-aware parsing.

#### Current limitation

The app assumes a specific Obsidian file-and-link setup, but enforcement is mostly documentation-based.

When vault config differs from tool assumptions, repair logic may behave "wrong" even when the code is doing exactly what it was designed to do.

#### Design goal

Add vault configuration validation before or during scan:

- verify `.obsidian` settings when present
- compare actual vault configuration to Voyager expectations
- surface warnings before repair

#### Suggested checks

- default attachment folder mode
- attachment subfolder name
- wiki link setting
- relative link update behavior

#### Acceptance criteria

- Users receive a clear warning when vault config does not match tool assumptions.
- Warnings are visible before running destructive repair actions.

### Phase G — Health trends and recurrent hotspots

This is lower priority than correctness work, but valuable once the core logic is more trustworthy.

#### Design goal

Move the stats page from "current snapshot" toward "governance trends."

Suggested additions:

- historical health score trend
- issue count trend over time
- directories that repeatedly generate new `Misplaced`
- repair success rate by issue cause

#### Acceptance criteria

- Stats can answer whether the vault is improving, not just how it looks right now.

## Recommended technical decomposition

### Backend track

1. parser: introduce path-aware reference extraction
2. scanner: migrate `Broken` / `Misplaced` classification to use richer refs
3. fix engine: add dry-run planning
4. fix engine: unify execution and verification result types
5. diagnostics: extend task package export
6. config validator: read and validate `.obsidian` settings

### Frontend track

1. show root-cause metadata in details/history
2. add fix preview panel
3. add post-fix result report
4. add diagnostic export action
5. expose vault config warnings near scan controls
6. expand stats with trends after correctness work lands

## Testing strategy

### Required new fixtures

Create small vault fixtures for:

- same-name files in multiple folders
- relative-path wiki links
- markdown links with explicit attachment paths
- wrong-directory but same-basename matches
- fix causes rename-on-conflict
- fix that changes `Misplaced` into `Broken`
- vault config mismatch cases

### Test layers

#### Parser tests

- path normalization
- alias preservation
- syntax distinction
- candidate path derivation

#### Scanner tests

- same-name disambiguation
- correct `IssueCause` assignment
- no regressions in simple vaults

#### Fix engine tests

- dry-run equals execution resolution
- verification statuses are correct
- diagnostics are written with stable fields

#### Frontend tests

- result report renders verification states
- diagnostic actions call correct commands
- preview invalidates on input/policy changes
- config warnings render correctly

## Risks

### 1. Complexity growth

Path-aware parsing will increase model complexity across parser, scanner, fix, export, and stats.

Mitigation:

- preserve old basename-only helpers temporarily
- migrate one issue type at a time

### 2. Performance regressions

Richer parsing and candidate resolution could increase scan cost.

Mitigation:

- keep incremental scan index
- cache parsed references
- reuse normalized note-relative resolution

### 3. User confusion during transition

If causes/statuses appear before UI wording is polished, users may see too many new states at once.

Mitigation:

- gate new machine-readable states behind clear human-readable descriptions
- prefer explanation over jargon

## Immediate recommendation

If only one substantial track should be started next, start with:

### Path-aware reference parsing

If only one smaller, high-impact user-facing improvement should be started next without deep parser refactoring, start with:

### Fix dry-run preview + task result report

## Proposed next implementation slice

The most pragmatic next slice after the current diagnostics work is:

1. Add `ParsedImageRef` backend model
2. Introduce richer parser API alongside current basename API
3. Use the richer API only for `Misplaced` classification first
4. Add `IssueCause::WrongDirectory | AmbiguousBasenameMatch | RelativePathMismatch`
5. Add task-level result report UI for `fix_issues`

This keeps scope tight while directly improving the area where users currently feel the most confusion.
