# Wry Linux Patch Notes

> Last updated: 2026-03-13

## Why this file exists

`src-tauri/Cargo.toml` uses:

```toml
[patch.crates-io]
wry = { path = "vendor/wry" }
```

The vendored `wry` copy exists to make Linux builds reproducible in the project itself rather than relying on local Cargo cache edits.

## What problem it fixes

On Debian 12 with the current Tauri v1.5 dependency set, the upstream `wry 0.24.11` Linux WebKitGTK implementation failed during Rust compilation.

The failure showed up in `wry/src/webview/webkitgtk/mod.rs` as missing trait methods on `webkit2gtk::Settings`, for example:

- `set_enable_webgl`
- `set_enable_webaudio`
- `set_user_agent`

The concrete fix is a Linux-side explicit import of `webkit2gtk::traits::SettingsExt`.

## What was changed in the vendored copy

Current local changes are intentionally minimal:

1. Add `use webkit2gtk::traits::SettingsExt;` in:
   - `src-tauri/vendor/wry/src/webview/webkitgtk/mod.rs`
2. Silence one non-actionable warning on the Linux web context trait:
   - `#[allow(dead_code)]` on `WebContextExt` in
     `src-tauri/vendor/wry/src/webview/webkitgtk/web_context.rs`

No project-specific behavior should be added to vendored `wry` beyond build compatibility fixes.

## When to keep it

Keep the vendored patch if all of the following are true:

- the project is still on Tauri v1.x / `tauri-runtime-wry` that resolves to `wry 0.24.11`
- Linux builds are part of your supported workflow
- upstream resolution has not been verified in this repository

## When it can be removed

You can remove the patch only after all of these steps pass:

1. Remove the `[patch.crates-io]` override from `src-tauri/Cargo.toml`
2. Delete `src-tauri/vendor/wry/`
3. Run:

```bash
cargo update -p wry
cargo fmt --manifest-path src-tauri/Cargo.toml --all --check
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture
npm run tauri:build
```

4. Verify Linux packaging still succeeds for the project-supported targets
   - `.deb`
   - `.rpm`
   - `.AppImage`

If any Linux compile error returns in `wry` / WebKitGTK, restore the patch.

## Upgrade guidance

If you need to update `wry`:

1. Diff the current vendored copy against the target upstream version
2. Re-apply only the smallest Linux compatibility delta
3. Avoid mixing unrelated edits into vendored third-party code
4. Re-run the full validation set:
   - `npm test`
   - `npm run build`
   - `cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture`
   - `npm run tauri:build`

## Current verified state

At the time of writing, the repository validates with the vendored patch in place:

- `npm test` passes
- `npm run build` passes
- `cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture` passes
- `npm run tauri:build` produces Linux bundles in this environment
