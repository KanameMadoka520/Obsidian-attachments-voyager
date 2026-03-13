// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir;

pub mod migrate;
pub mod models;
pub mod ops_log;
pub mod parser;
pub mod runtime_log;
pub mod scanner;
pub mod startup_diag;
pub mod thumb_cache;

use migrate::conflict_target;
use models::{ScanIssue, ScanResult};
use ops_log::{
    create_task, list_tasks, load_from_disk, save_task, ConflictPolicy, EntryStatus,
    OperationEntry, TaskStatus,
};
use runtime_log::{append_runtime_log, list_runtime_logs, RuntimeLogLine};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FixSummary {
    task_id: String,
    moved: usize,
    deleted: usize,
    skipped: usize,
    entries: Vec<OperationEntry>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CacheClearSummary {
    removed: usize,
    cache_dir: String,
}

#[tauri::command]
fn scan_vault(
    window: tauri::Window,
    root: String,
    generate_thumbs: Option<bool>,
    thumb_size: Option<u32>,
    prev_index: Option<models::ScanIndex>,
) -> Result<ScanResult, String> {
    let generate_thumbs = generate_thumbs.unwrap_or(true);
    let thumb_size = thumb_size.unwrap_or(256);

    append_runtime_log(
        "info",
        format!("scan_vault root={root} generate_thumbs={generate_thumbs} thumb_size={thumb_size}"),
    );

    let progress: scanner::ProgressFn =
        Box::new(move |phase: &str, current: usize, total: usize| {
            let _ = window.emit(
                "scan-progress",
                serde_json::json!({
                    "phase": phase,
                    "current": current,
                    "total": total,
                }),
            );
        });

    scanner::scan_vault_with_thumbs(
        Path::new(&root),
        generate_thumbs,
        thumb_size,
        Some(&progress),
        prev_index.as_ref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn execute_migration(
    note_path: String,
    target_dir: String,
    policy: Option<ConflictPolicy>,
) -> Result<migrate::MigrateSummary, String> {
    let policy = policy.unwrap_or_default();
    append_runtime_log(
        "info",
        format!("execute_migration note={note_path} target={target_dir}"),
    );

    let summary = migrate::migrate_note_with_assets(
        Path::new(&note_path),
        Path::new(&target_dir),
        policy.clone(),
    )
    .map_err(|e| e.to_string())?;

    let mut task = create_task("migration", policy);
    task.task_id = summary.task_id.clone();
    task.entries = summary.entries.clone();
    save_task(task);

    Ok(summary)
}

#[tauri::command]
fn preview_flatten_attachments(
    root_dir: String,
    policy: Option<ConflictPolicy>,
) -> Result<migrate::FlattenAttachmentsPlan, String> {
    let policy = policy.unwrap_or_default();
    append_runtime_log(
        "info",
        format!("preview_flatten_attachments root={root_dir}"),
    );
    migrate::preview_flatten_attachments(Path::new(&root_dir), policy).map_err(|e| e.to_string())
}

#[tauri::command]
fn flatten_attachments(
    root_dir: String,
    policy: Option<ConflictPolicy>,
) -> Result<migrate::FlattenAttachmentsSummary, String> {
    let policy = policy.unwrap_or_default();
    append_runtime_log("info", format!("flatten_attachments root={root_dir}"));

    let summary = migrate::flatten_attachments_into_root(Path::new(&root_dir), policy.clone())
        .map_err(|e| e.to_string())?;

    let mut task = create_task("flatten-attachments", policy);
    task.task_id = summary.task_id.clone();
    task.entries = summary.entries.clone();
    save_task(task);

    Ok(summary)
}

#[tauri::command]
fn fix_issues(
    issues: Vec<ScanIssue>,
    policy: Option<ConflictPolicy>,
) -> Result<FixSummary, String> {
    let policy = policy.unwrap_or_default();
    let mut task = create_task("fix", policy);

    let mut moved = 0usize;
    let mut deleted = 0usize;
    let mut skipped = 0usize;

    for issue in issues {
        match issue.r#type.as_str() {
            "misplaced" => {
                let source = Path::new(&issue.image_path);
                let Some(target_path) = issue.suggested_target.as_deref() else {
                    skipped += 1;
                    continue;
                };
                let target = Path::new(target_path);

                if !source.exists() {
                    skipped += 1;
                    task.entries.push(OperationEntry {
                        entry_id: ops_log::next_id("entry"),
                        file_path: issue.image_path.clone(),
                        action: "move".to_string(),
                        source: issue.image_path.clone(),
                        target: target_path.to_string(),
                        status: EntryStatus::Skipped,
                        message: Some("无法找到该文件，请自行检查".to_string()),
                    });
                    continue;
                }

                if issue.reason.contains("trash") {
                    if issue.suggested_target.as_deref() == Some("__DELETE__") {
                        fs::remove_file(source).map_err(|e| e.to_string())?;
                        deleted += 1;
                        task.entries.push(OperationEntry {
                            entry_id: ops_log::next_id("entry"),
                            file_path: issue.image_path.clone(),
                            action: "delete".to_string(),
                            source: issue.image_path.clone(),
                            target: issue.image_path.clone(),
                            status: EntryStatus::Applied,
                            message: Some("trash 引用：按选择执行删除".to_string()),
                        });
                        continue;
                    }
                }

                if target.exists() {
                    match task.policy {
                        ConflictPolicy::OverwriteAll => {
                            if target.is_file() {
                                fs::remove_file(target).map_err(|e| e.to_string())?;
                            }
                        }
                        ConflictPolicy::RenameAll => {
                            let mut i = 1usize;
                            let mut candidate = target.to_path_buf();
                            while candidate.exists() {
                                let stem = target
                                    .file_stem()
                                    .and_then(|s| s.to_str())
                                    .unwrap_or("file");
                                let ext = target.extension().and_then(|s| s.to_str()).unwrap_or("");
                                let parent = target.parent().unwrap_or(Path::new("."));
                                let name = if ext.is_empty() {
                                    format!("{stem} ({i})")
                                } else {
                                    format!("{stem} ({i}).{ext}")
                                };
                                candidate = parent.join(name);
                                i += 1;
                            }
                            if let Some(parent) = candidate.parent() {
                                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                            }
                            fs::rename(source, &candidate).map_err(|e| e.to_string())?;
                            moved += 1;
                            task.entries.push(OperationEntry {
                                entry_id: ops_log::next_id("entry"),
                                file_path: issue.image_path.clone(),
                                action: "move".to_string(),
                                source: issue.image_path.clone(),
                                target: candidate.to_string_lossy().to_string(),
                                status: EntryStatus::Applied,
                                message: None,
                            });
                            continue;
                        }
                        ConflictPolicy::PromptEach => {
                            skipped += 1;
                            task.entries.push(OperationEntry {
                                entry_id: ops_log::next_id("entry"),
                                file_path: issue.image_path.clone(),
                                action: "move".to_string(),
                                source: issue.image_path.clone(),
                                target: target_path.to_string(),
                                status: EntryStatus::Skipped,
                                message: Some("冲突：请在前端选择处理方式".to_string()),
                            });
                            continue;
                        }
                    }
                }

                if let Some(parent) = target.parent() {
                    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                fs::rename(source, target).map_err(|e| e.to_string())?;
                moved += 1;
                task.entries.push(OperationEntry {
                    entry_id: ops_log::next_id("entry"),
                    file_path: issue.image_path.clone(),
                    action: "move".to_string(),
                    source: issue.image_path.clone(),
                    target: target_path.to_string(),
                    status: EntryStatus::Applied,
                    message: None,
                });
            }
            "orphan" => {
                let source = Path::new(&issue.image_path);
                if !source.exists() {
                    skipped += 1;
                    task.entries.push(OperationEntry {
                        entry_id: ops_log::next_id("entry"),
                        file_path: issue.image_path.clone(),
                        action: "delete".to_string(),
                        source: issue.image_path.clone(),
                        target: issue.image_path.clone(),
                        status: EntryStatus::Skipped,
                        message: Some("无法找到该文件，请自行检查".to_string()),
                    });
                    continue;
                }
                fs::remove_file(source).map_err(|e| e.to_string())?;
                deleted += 1;
                task.entries.push(OperationEntry {
                    entry_id: ops_log::next_id("entry"),
                    file_path: issue.image_path.clone(),
                    action: "delete".to_string(),
                    source: issue.image_path.clone(),
                    target: issue.image_path.clone(),
                    status: EntryStatus::Applied,
                    message: None,
                });
            }
            _ => skipped += 1,
        }
    }

    task.status = TaskStatus::Applied;
    save_task(task.clone());

    append_runtime_log(
        "info",
        format!("fix_issues done moved={moved} deleted={deleted} skipped={skipped}"),
    );

    Ok(FixSummary {
        task_id: task.task_id,
        moved,
        deleted,
        skipped,
        entries: task.entries,
    })
}

#[tauri::command]
fn list_operation_history() -> Vec<ops_log::OperationTask> {
    list_tasks()
}

#[tauri::command]
fn open_file(path: String, vault_path: String) -> Result<(), String> {
    let validated = validate_open_path(Path::new(&path), Path::new(&vault_path))?;

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&validated)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(&validated)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn open_file_parent(path: String, vault_path: String) -> Result<(), String> {
    let validated = validate_open_path(Path::new(&path), Path::new(&vault_path))?;
    let Some(parent) = validated.parent() else {
        return Err("无法找到该文件，请自行检查".to_string());
    };

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(parent)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn get_runtime_logs(limit: Option<usize>) -> Vec<RuntimeLogLine> {
    list_runtime_logs(limit.unwrap_or(200))
}

#[tauri::command]
fn clear_thumbnail_cache() -> Result<CacheClearSummary, String> {
    let removed = thumb_cache::clear_cache().map_err(|e| e.to_string())?;
    let cache_dir = thumb_cache::cache_root_path_string();
    append_runtime_log(
        "info",
        format!("clear_thumbnail_cache removed={removed} cache_dir={cache_dir}"),
    );
    Ok(CacheClearSummary {
        removed,
        cache_dir: cache_dir,
    })
}

#[tauri::command]
fn clear_thumbnail_cache_all() -> Result<CacheClearSummary, String> {
    let removed = thumb_cache::clear_cache_all().map_err(|e| e.to_string())?;
    let cache_dir = thumb_cache::cache_root_path_string_all();
    append_runtime_log(
        "info",
        format!("clear_thumbnail_cache_all removed={removed} cache_dir={cache_dir}"),
    );
    Ok(CacheClearSummary {
        removed,
        cache_dir: cache_dir,
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ThumbGenSummary {
    generated: usize,
    skipped: usize,
    total: usize,
}

fn run_thumbnail_generation<F>(
    window: tauri::Window,
    paths: Vec<String>,
    generate: F,
    command_name: &str,
) -> Result<ThumbGenSummary, String>
where
    F: Fn(&str) -> Result<thumb_cache::MultiThumbnailResult, String> + Sync,
{
    use rayon::prelude::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    let total = paths.len();
    let generated = AtomicUsize::new(0);
    let skipped = AtomicUsize::new(0);
    let done = AtomicUsize::new(0);

    paths.par_iter().for_each(|path| {
        match generate(path) {
            Ok(result) => {
                if result.generated_count > 0 {
                    generated.fetch_add(1, Ordering::Relaxed);
                } else {
                    skipped.fetch_add(1, Ordering::Relaxed);
                }
            }
            Err(_) => {
                skipped.fetch_add(1, Ordering::Relaxed);
            }
        }
        let completed = done.fetch_add(1, Ordering::Relaxed) + 1;
        if completed % 50 == 0 || completed == total {
            let _ = window.emit(
                "scan-progress",
                serde_json::json!({
                    "phase": "thumbnails",
                    "current": completed,
                    "total": total,
                }),
            );
        }
    });

    let gen = generated.load(Ordering::Relaxed);
    let skip = skipped.load(Ordering::Relaxed);
    append_runtime_log(
        "info",
        format!("{command_name}: generated={gen} skipped={skip} total={total}"),
    );

    Ok(ThumbGenSummary {
        generated: gen,
        skipped: skip,
        total,
    })
}

#[tauri::command]
fn generate_all_thumbnails(
    window: tauri::Window,
    paths: Vec<String>,
) -> Result<ThumbGenSummary, String> {
    run_thumbnail_generation(
        window,
        paths,
        |path| {
            thumb_cache::generate_thumbnail_multi(path, thumb_cache::SIZES)
                .map_err(|e| e.to_string())
        },
        "generate_all_thumbnails",
    )
}

#[tauri::command]
fn generate_all_thumbnails_all(
    window: tauri::Window,
    paths: Vec<String>,
) -> Result<ThumbGenSummary, String> {
    run_thumbnail_generation(
        window,
        paths,
        |path| {
            thumb_cache::generate_thumbnail_multi_all(path, thumb_cache::SIZES)
                .map_err(|e| e.to_string())
        },
        "generate_all_thumbnails_all",
    )
}

#[tauri::command]
fn get_all_thumbnail_paths(
    paths: Vec<String>,
) -> std::collections::HashMap<String, std::collections::HashMap<String, String>> {
    thumb_cache::get_thumbnail_paths_all(&paths, thumb_cache::SIZES)
}

fn get_storage_dir() -> std::path::PathBuf {
    let exe = std::env::current_exe().unwrap_or_default();
    let exe_dir = exe.parent().unwrap_or(Path::new("."));
    exe_dir.join("voyager-data")
}

fn is_valid_storage_key(key: &str) -> bool {
    !key.is_empty()
        && key
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
}

fn storage_file_path(dir: &Path, key: &str) -> Result<PathBuf, String> {
    if !is_valid_storage_key(key) {
        return Err("Invalid storage key".to_string());
    }
    Ok(dir.join(format!("{key}.json")))
}

fn is_allowed_export_extension(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|ext| ext.to_str()).map(|ext| ext.to_ascii_lowercase()),
        Some(ext) if matches!(ext.as_str(), "json" | "csv" | "md")
    )
}

fn validate_export_target(path: &Path) -> Result<(), String> {
    if path.as_os_str().is_empty() {
        return Err("Invalid export path".to_string());
    }
    if path.exists() && path.is_dir() {
        return Err("Export target must be a file".to_string());
    }
    if !is_allowed_export_extension(path) {
        return Err("Export target must use .json, .csv, or .md".to_string());
    }
    let Some(parent) = path.parent() else {
        return Err("Export target must have an existing parent directory".to_string());
    };
    if !parent.exists() || !parent.is_dir() {
        return Err("Export target parent directory does not exist".to_string());
    }
    Ok(())
}

fn validate_basename(name: &str, error_message: &str) -> Result<(), String> {
    if name.trim().is_empty()
        || name == "."
        || name == ".."
        || name.contains('/')
        || name.contains('\\')
    {
        return Err(error_message.to_string());
    }
    Ok(())
}

fn canonicalize_existing_path(path: &Path, missing_message: &str) -> Result<PathBuf, String> {
    if !path.exists() {
        return Err(missing_message.to_string());
    }
    path.canonicalize().map_err(|e| e.to_string())
}

fn ensure_path_within_root(path: &Path, root: &Path, error_message: &str) -> Result<(), String> {
    let canonical_path = canonicalize_existing_path(path, error_message)?;
    let canonical_root = canonicalize_existing_path(root, error_message)?;
    if !canonical_path.starts_with(&canonical_root) {
        return Err(error_message.to_string());
    }
    Ok(())
}

fn validate_open_path(path: &Path, vault: &Path) -> Result<PathBuf, String> {
    let vault_path = canonicalize_existing_path(vault, "Vault path does not exist")?;
    let target_path = canonicalize_existing_path(path, "Open target must stay inside vault")?;
    if !target_path.starts_with(&vault_path) {
        return Err("Open target must stay inside vault".to_string());
    }
    Ok(target_path)
}

#[cfg(test)]
fn validate_open_path_for_tests(path: String, vault_path: String) -> Result<PathBuf, String> {
    validate_open_path(Path::new(&path), Path::new(&vault_path))
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    let target = Path::new(&path);
    validate_export_target(target)?;
    fs::write(target, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_local_storage(key: String) -> Result<Option<String>, String> {
    let dir = get_storage_dir();
    let file = storage_file_path(&dir, &key)?;
    if !file.exists() {
        return Ok(None);
    }
    fs::read_to_string(&file)
        .map(Some)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn write_local_storage(key: String, value: String) -> Result<(), String> {
    let dir = get_storage_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = storage_file_path(&dir, &key)?;
    fs::write(&file, value).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_local_storage(key: String) -> Result<(), String> {
    let dir = get_storage_dir();
    let file = storage_file_path(&dir, &key)?;
    if file.exists() {
        fs::remove_file(&file).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn read_all_local_storage() -> Result<std::collections::HashMap<String, String>, String> {
    let dir = get_storage_dir();
    let mut map = std::collections::HashMap::new();
    if !dir.exists() {
        return Ok(map);
    }
    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                if let Ok(content) = fs::read_to_string(&path) {
                    map.insert(stem.to_string(), content);
                }
            }
        }
    }
    Ok(map)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupSummary {
    copied: usize,
    skipped: usize,
    dest: String,
}

#[tauri::command]
fn backup_selected_files(
    paths: Vec<String>,
    dest: String,
    vault_path: String,
) -> Result<BackupSummary, String> {
    let vault = Path::new(&vault_path);
    ensure_path_within_root(vault, vault, "Vault path does not exist")?;

    let dest_path = std::path::Path::new(&dest);
    fs::create_dir_all(dest_path).map_err(|e| e.to_string())?;

    let mut task = ops_log::create_task("backup", ops_log::ConflictPolicy::RenameAll);
    let mut copied = 0usize;
    let mut skipped = 0usize;

    for source_str in &paths {
        let source = std::path::Path::new(source_str);
        ensure_path_within_root(source, vault, "Backup source must stay inside vault")?;
        if !source.exists() {
            skipped += 1;
            task.entries.push(ops_log::OperationEntry {
                entry_id: ops_log::next_id("entry"),
                file_path: source_str.clone(),
                action: "copy".to_string(),
                source: source_str.clone(),
                target: dest.clone(),
                status: ops_log::EntryStatus::Skipped,
                message: Some("Source file not found".to_string()),
            });
            continue;
        }

        let file_name = source
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");
        let raw_target = dest_path.join(file_name);
        let target =
            conflict_target(&raw_target, &ConflictPolicy::RenameAll).map_err(|e| e.to_string())?;

        match fs::copy(source, &target) {
            Ok(_) => {
                copied += 1;
                task.entries.push(ops_log::OperationEntry {
                    entry_id: ops_log::next_id("entry"),
                    file_path: source_str.clone(),
                    action: "copy".to_string(),
                    source: source_str.clone(),
                    target: target.to_string_lossy().to_string(),
                    status: ops_log::EntryStatus::Applied,
                    message: None,
                });
            }
            Err(e) => {
                skipped += 1;
                task.entries.push(ops_log::OperationEntry {
                    entry_id: ops_log::next_id("entry"),
                    file_path: source_str.clone(),
                    action: "copy".to_string(),
                    source: source_str.clone(),
                    target: target.to_string_lossy().to_string(),
                    status: ops_log::EntryStatus::Failed,
                    message: Some(e.to_string()),
                });
            }
        }
    }

    ops_log::save_task(task);
    append_runtime_log(
        "info",
        format!("backup_selected_files: copied={copied} skipped={skipped}"),
    );

    Ok(BackupSummary {
        copied,
        skipped,
        dest,
    })
}

#[tauri::command]
fn backup_selected_zip(
    paths: Vec<String>,
    dest: String,
    vault_path: String,
) -> Result<BackupSummary, String> {
    let vault = Path::new(&vault_path);
    ensure_path_within_root(vault, vault, "Vault path does not exist")?;

    let file = fs::File::create(&dest).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options =
        zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    let mut task = ops_log::create_task("backup-zip", ops_log::ConflictPolicy::RenameAll);
    let mut copied = 0usize;
    let mut skipped = 0usize;
    let mut names_used = std::collections::HashSet::new();

    for source_str in &paths {
        let source = std::path::Path::new(source_str);
        ensure_path_within_root(source, vault, "Backup source must stay inside vault")?;
        if !source.exists() {
            skipped += 1;
            task.entries.push(ops_log::OperationEntry {
                entry_id: ops_log::next_id("entry"),
                file_path: source_str.clone(),
                action: "copy".to_string(),
                source: source_str.clone(),
                target: dest.clone(),
                status: ops_log::EntryStatus::Skipped,
                message: Some("Source file not found".to_string()),
            });
            continue;
        }

        let base_name = source
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        // Deduplicate names within zip
        let mut zip_name = base_name.clone();
        if names_used.contains(&zip_name) {
            let stem = std::path::Path::new(&base_name)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("file");
            let ext = std::path::Path::new(&base_name)
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("");
            let mut i = 1;
            loop {
                zip_name = if ext.is_empty() {
                    format!("{stem} ({i})")
                } else {
                    format!("{stem} ({i}).{ext}")
                };
                if !names_used.contains(&zip_name) {
                    break;
                }
                i += 1;
            }
        }
        names_used.insert(zip_name.clone());

        match fs::File::open(source) {
            Ok(file) => {
                if let Err(e) = zip.start_file(&zip_name, options) {
                    skipped += 1;
                    task.entries.push(ops_log::OperationEntry {
                        entry_id: ops_log::next_id("entry"),
                        file_path: source_str.clone(),
                        action: "copy".to_string(),
                        source: source_str.clone(),
                        target: format!("{}:{}", dest, zip_name),
                        status: ops_log::EntryStatus::Failed,
                        message: Some(e.to_string()),
                    });
                    continue;
                }
                if let Err(e) = std::io::copy(&mut std::io::BufReader::new(file), &mut zip) {
                    skipped += 1;
                    task.entries.push(ops_log::OperationEntry {
                        entry_id: ops_log::next_id("entry"),
                        file_path: source_str.clone(),
                        action: "copy".to_string(),
                        source: source_str.clone(),
                        target: format!("{}:{}", dest, zip_name),
                        status: ops_log::EntryStatus::Failed,
                        message: Some(e.to_string()),
                    });
                    continue;
                }
                copied += 1;
                task.entries.push(ops_log::OperationEntry {
                    entry_id: ops_log::next_id("entry"),
                    file_path: source_str.clone(),
                    action: "copy".to_string(),
                    source: source_str.clone(),
                    target: format!("{}:{}", dest, zip_name),
                    status: ops_log::EntryStatus::Applied,
                    message: None,
                });
            }
            Err(e) => {
                skipped += 1;
                task.entries.push(ops_log::OperationEntry {
                    entry_id: ops_log::next_id("entry"),
                    file_path: source_str.clone(),
                    action: "copy".to_string(),
                    source: source_str.clone(),
                    target: dest.clone(),
                    status: ops_log::EntryStatus::Failed,
                    message: Some(e.to_string()),
                });
            }
        }
    }

    zip.finish().map_err(|e| e.to_string())?;
    ops_log::save_task(task);
    append_runtime_log(
        "info",
        format!("backup_selected_zip: copied={copied} skipped={skipped}"),
    );

    Ok(BackupSummary {
        copied,
        skipped,
        dest,
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RenameSummary {
    old_path: String,
    new_path: String,
    md_updated: usize,
    md_files: Vec<String>,
}

fn replace_image_refs_in_md(content: &str, old_name: &str, new_name: &str) -> String {
    use regex::Regex;

    // Pattern 1: ![[path/old_name|alias]] → ![[path/new_name|alias]]
    let wiki_pattern = format!(
        r"(!\[\[(?:[^\]]*[/\\])?){}((?:\|[^\]]*)?)\]\]",
        regex::escape(old_name)
    );
    let wiki_re = Regex::new(&wiki_pattern).unwrap();
    let result = wiki_re.replace_all(content, format!("${{1}}{}${{2}}]]", new_name));

    // Pattern 2: ![alt](path/old_name) → ![alt](path/new_name)
    let md_pattern = format!(
        r"(!\[[^\]]*\]\((?:[^)]*[/\\])?){}(\))",
        regex::escape(old_name)
    );
    let md_re = Regex::new(&md_pattern).unwrap();
    let result = md_re.replace_all(&result, format!("${{1}}{}${{2}}", new_name));

    result.into_owned()
}

#[tauri::command]
fn rename_image(
    old_path: String,
    new_name: String,
    vault_root: String,
    md_refs: std::collections::HashMap<String, Vec<String>>,
) -> Result<RenameSummary, String> {
    validate_basename(&new_name, "Invalid filename")?;

    let vault = Path::new(&vault_root);
    ensure_path_within_root(vault, vault, "Vault path does not exist")?;

    let old = Path::new(&old_path);
    ensure_path_within_root(old, vault, "Source image must stay inside vault")?;

    let old_filename = old
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Cannot read filename")?
        .to_string();

    let new_path = old.parent().unwrap_or(Path::new(".")).join(&new_name);
    if new_path.exists() {
        return Err("Target filename already exists".to_string());
    }

    for md_path_str in md_refs.keys() {
        let md_path = Path::new(md_path_str);
        ensure_path_within_root(md_path, vault, "Markdown path must stay inside vault")?;
    }

    // Rename physical file
    fs::rename(old, &new_path).map_err(|e| e.to_string())?;

    // Find and update MD files that reference old filename using md_refs
    let mut md_files_updated = Vec::new();
    for (md_path_str, refs) in &md_refs {
        if refs.iter().any(|r| r == &old_filename) {
            let md_path = Path::new(md_path_str);
            if !md_path.exists() {
                continue;
            }
            match fs::read_to_string(md_path) {
                Ok(content) => {
                    let updated = replace_image_refs_in_md(&content, &old_filename, &new_name);
                    if updated != content {
                        if let Err(e) = fs::write(md_path, &updated) {
                            append_runtime_log(
                                "warn",
                                format!("rename_image: failed to write {}: {}", md_path_str, e),
                            );
                            continue;
                        }
                        md_files_updated.push(md_path_str.clone());
                    }
                }
                Err(e) => {
                    append_runtime_log(
                        "warn",
                        format!("rename_image: failed to read {}: {}", md_path_str, e),
                    );
                }
            }
        }
    }

    // Log operation
    let mut task = create_task("rename", ConflictPolicy::RenameAll);
    task.entries.push(OperationEntry {
        entry_id: ops_log::next_id("entry"),
        file_path: old_path.clone(),
        action: "rename".to_string(),
        source: old_path.clone(),
        target: new_path.to_string_lossy().to_string(),
        status: EntryStatus::Applied,
        message: Some(format!("Updated {} MD files", md_files_updated.len())),
    });
    save_task(task);

    append_runtime_log(
        "info",
        format!(
            "rename_image: {} -> {}, updated {} MD files",
            old_filename,
            new_name,
            md_files_updated.len()
        ),
    );

    Ok(RenameSummary {
        old_path,
        new_path: new_path.to_string_lossy().to_string(),
        md_updated: md_files_updated.len(),
        md_files: md_files_updated,
    })
}

fn hash_file_sha256(path: &Path) -> std::io::Result<(String, u64)> {
    use sha2::{Digest, Sha256};
    use std::io::Read;

    let mut file = fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    let mut total = 0u64;

    loop {
        let read = file.read(&mut buf)?;
        if read == 0 {
            break;
        }
        hasher.update(&buf[..read]);
        total += read as u64;
    }

    Ok((format!("{:x}", hasher.finalize()), total))
}

fn duplicate_hash_candidates(paths: &[PathBuf]) -> Vec<PathBuf> {
    let mut by_size: std::collections::HashMap<u64, Vec<PathBuf>> =
        std::collections::HashMap::new();
    for path in paths {
        let Ok(size) = fs::metadata(path).map(|m| m.len()) else {
            continue;
        };
        by_size.entry(size).or_default().push(path.clone());
    }

    by_size
        .into_iter()
        .filter(|(_, files)| files.len() >= 2)
        .flat_map(|(_, files)| files)
        .collect()
}

fn temp_output_path(target: &Path) -> PathBuf {
    let file_name = target
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("output");
    let pid = std::process::id();
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    target.with_file_name(format!(".{file_name}.tmp-{pid}-{nanos}"))
}

fn write_atomic_output(target: &Path, data: &[u8]) -> Result<(), String> {
    let temp_path = temp_output_path(target);
    fs::write(&temp_path, data).map_err(|e| e.to_string())?;
    if let Err(err) = fs::rename(&temp_path, target) {
        let _ = fs::remove_file(&temp_path);
        return Err(err.to_string());
    }
    Ok(())
}

fn prepare_md_updates(
    md_files: &[PathBuf],
    old_filename: &str,
    new_name: &str,
) -> Result<Vec<(PathBuf, String)>, String> {
    let mut updates = Vec::new();
    for md in md_files {
        let content = fs::read_to_string(md).map_err(|e| e.to_string())?;
        let updated = replace_image_refs_in_md(&content, old_filename, new_name);
        if updated != content {
            updates.push((md.clone(), updated));
        }
    }
    Ok(updates)
}

fn apply_md_updates(updates: &[(PathBuf, String)]) -> Result<usize, String> {
    apply_md_updates_with_writer(updates, |path, content| {
        fs::write(path, content).map_err(|e| e.to_string())
    })
}

fn recommended_convert_parallelism(total_paths: usize) -> usize {
    let available = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1);
    total_paths.max(1).min(available).min(4)
}

fn apply_md_updates_with_writer<F>(
    updates: &[(PathBuf, String)],
    mut writer: F,
) -> Result<usize, String>
where
    F: FnMut(&PathBuf, &String) -> Result<(), String>,
{
    let mut applied: Vec<(PathBuf, String)> = Vec::new();
    for (path, content) in updates {
        let original = fs::read_to_string(path).map_err(|e| e.to_string())?;
        if let Err(err) = writer(path, content) {
            for (applied_path, original_content) in applied.iter().rev() {
                let _ = fs::write(applied_path, original_content);
            }
            return Err(err);
        }
        applied.push((path.clone(), original));
    }
    Ok(updates.len())
}

fn find_duplicates_impl(
    vault_path: String,
    progress_window: Option<&tauri::Window>,
) -> Result<Vec<models::DuplicateGroup>, String> {
    use rayon::prelude::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    append_runtime_log("info", format!("find_duplicates vault={vault_path}"));

    let vault = Path::new(&vault_path);
    ensure_path_within_root(vault, vault, "Vault path does not exist")?;

    // Collect all image files under vault
    let mut image_files = Vec::new();
    collect_images_recursive(vault, &mut image_files);
    let hash_candidates = duplicate_hash_candidates(&image_files);

    let total = hash_candidates.len();
    let done = AtomicUsize::new(0);

    // Hash all files in parallel
    let hashed: Vec<Option<(String, String, u64)>> = hash_candidates
        .par_iter()
        .map(|path| {
            let completed = done.fetch_add(1, Ordering::Relaxed) + 1;
            if completed % 100 == 0 || completed == total {
                if let Some(window) = progress_window {
                    let _ = window.emit(
                        "duplicate-progress",
                        serde_json::json!({
                            "current": completed, "total": total
                        }),
                    );
                }
            }
            let (hash, size) = hash_file_sha256(path).ok()?;
            Some((hash, path.to_string_lossy().to_string(), size))
        })
        .collect();

    // Build md_refs for ref counting
    let mut md_refs: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for entry in walkdir::WalkDir::new(vault)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.path().extension().and_then(|s| s.to_str()) == Some("md") {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                for name in parser::extract_image_refs(&content) {
                    *md_refs.entry(name).or_default() += 1;
                }
            }
        }
    }

    // Group by hash
    let mut groups: std::collections::HashMap<String, Vec<models::DuplicateFile>> =
        std::collections::HashMap::new();
    for item in hashed.into_iter().flatten() {
        let (hash, abs_path, file_size) = item;
        let filename = Path::new(&abs_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        let ref_count = md_refs.get(&filename).copied().unwrap_or(0);
        groups.entry(hash).or_default().push(models::DuplicateFile {
            abs_path,
            file_size,
            ref_count,
        });
    }

    let result: Vec<models::DuplicateGroup> = groups
        .into_iter()
        .filter(|(_, files)| files.len() >= 2)
        .map(|(hash, files)| models::DuplicateGroup { hash, files })
        .collect();

    append_runtime_log(
        "info",
        format!("find_duplicates: found {} duplicate groups", result.len()),
    );
    Ok(result)
}

#[cfg(test)]
fn find_duplicates_for_tests(vault_path: String) -> Result<Vec<models::DuplicateGroup>, String> {
    find_duplicates_impl(vault_path, None)
}

#[tauri::command]
fn find_duplicates(
    window: tauri::Window,
    vault_path: String,
) -> Result<Vec<models::DuplicateGroup>, String> {
    find_duplicates_impl(vault_path, Some(&window))
}

fn collect_images_recursive(dir: &Path, out: &mut Vec<std::path::PathBuf>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_images_recursive(&path, out);
        } else if scanner::is_image_ext(&path) {
            out.push(path);
        }
    }
}

#[tauri::command]
fn merge_duplicates(
    keep: String,
    remove: Vec<String>,
    vault_path: String,
) -> Result<models::MergeSummary, String> {
    append_runtime_log(
        "info",
        format!("merge_duplicates keep={keep} remove={} files", remove.len()),
    );

    let vault = Path::new(&vault_path);
    ensure_path_within_root(vault, vault, "Vault path does not exist")?;

    let keep_path = Path::new(&keep);
    ensure_path_within_root(keep_path, vault, "Keep file must stay inside vault")?;
    let keep_filename = keep_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Cannot read keep filename")?
        .to_string();

    let mut total_updated_mds = 0usize;
    let mut deleted_files = 0usize;

    let root = Path::new(&vault_path);
    for rm_path_str in &remove {
        let rm_path = Path::new(rm_path_str);
        ensure_path_within_root(rm_path, vault, "Remove file must stay inside vault")?;
        let rm_filename = rm_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        // Update all MD refs from rm_filename to keep_filename
        if rm_filename != keep_filename {
            for entry in walkdir::WalkDir::new(root)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if entry.path().extension().and_then(|s| s.to_str()) != Some("md") {
                    continue;
                }
                if let Ok(content) = fs::read_to_string(entry.path()) {
                    let updated = replace_image_refs_in_md(&content, &rm_filename, &keep_filename);
                    if updated != content {
                        if fs::write(entry.path(), &updated).is_ok() {
                            total_updated_mds += 1;
                        }
                    }
                }
            }
        }

        // Delete the duplicate file
        if rm_path.exists() {
            fs::remove_file(rm_path).map_err(|e| e.to_string())?;
            deleted_files += 1;
        }
    }

    let mut task = create_task("merge-duplicates", ConflictPolicy::RenameAll);
    task.entries.push(OperationEntry {
        entry_id: ops_log::next_id("entry"),
        file_path: keep.clone(),
        action: "merge".to_string(),
        source: format!("{} duplicates", remove.len()),
        target: keep,
        status: EntryStatus::Applied,
        message: Some(format!(
            "Updated {} MDs, deleted {} files",
            total_updated_mds, deleted_files
        )),
    });
    save_task(task);

    append_runtime_log(
        "info",
        format!("merge_duplicates: updated_mds={total_updated_mds} deleted={deleted_files}"),
    );
    Ok(models::MergeSummary {
        updated_mds: total_updated_mds,
        deleted_files,
    })
}

#[cfg(test)]
fn convert_images_for_tests(
    paths: Vec<String>,
    target_format: String,
    quality: u8,
    vault_path: String,
) -> Result<models::ConvertSummary, String> {
    convert_images_impl(paths, target_format, quality, vault_path, None)
}

fn convert_images_impl(
    paths: Vec<String>,
    target_format: String,
    quality: u8,
    vault_path: String,
    progress_window: Option<&tauri::Window>,
) -> Result<models::ConvertSummary, String> {
    use rayon::prelude::*;
    use std::sync::atomic::{AtomicI64, AtomicUsize, Ordering};

    append_runtime_log(
        "info",
        format!(
            "convert_images: {} files to {} q={}",
            paths.len(),
            target_format,
            quality
        ),
    );

    let target_ext = match target_format.as_str() {
        "webp" => "webp",
        "jpeg" | "jpg" => "jpg",
        _ => return Err(format!("Unsupported target format: {target_format}")),
    };

    let vault = Path::new(&vault_path);
    ensure_path_within_root(vault, vault, "Vault path does not exist")?;

    for path_str in &paths {
        let src_path = Path::new(path_str);
        ensure_path_within_root(src_path, vault, "Source image must stay inside vault")?;
    }

    let total = paths.len();
    let converted = AtomicUsize::new(0);
    let skipped = AtomicUsize::new(0);
    let saved_bytes = AtomicI64::new(0);
    let done = AtomicUsize::new(0);
    let parallelism = recommended_convert_parallelism(total);

    // Collect all MD files for ref update
    let root = Path::new(&vault_path);
    let md_files: Vec<std::path::PathBuf> = walkdir::WalkDir::new(root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some("md"))
        .map(|e| e.path().to_path_buf())
        .collect();

    let pool = rayon::ThreadPoolBuilder::new()
        .num_threads(parallelism)
        .build()
        .map_err(|e| e.to_string())?;

    pool.install(|| {
        paths.par_iter().for_each(|path_str| {
            let result = (|| -> std::result::Result<(), String> {
                let src_path = Path::new(path_str);
                if !src_path.exists() {
                    return Err("not found".into());
                }

                let current_ext = src_path
                    .extension()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_ascii_lowercase();
                if current_ext == target_ext || (target_ext == "jpg" && current_ext == "jpeg") {
                    return Err("already target format".into());
                }

                let old_size = fs::metadata(src_path).map(|m| m.len()).unwrap_or(0) as i64;

                // Read and decode image
                let img = image::open(src_path).map_err(|e| e.to_string())?;

                // Build new path
                let stem = src_path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("image");
                let new_name = format!("{stem}.{target_ext}");
                let new_path = src_path.parent().unwrap_or(Path::new(".")).join(&new_name);
                if new_path.exists() {
                    return Err("target already exists".into());
                }

                let old_filename = src_path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                let md_updates = prepare_md_updates(&md_files, old_filename, &new_name)?;

                // Encode to target format
                let mut buf = std::io::Cursor::new(Vec::new());
                match target_ext {
                    "webp" => {
                        img.write_to(&mut buf, image::ImageFormat::WebP)
                            .map_err(|e| e.to_string())?;
                    }
                    "jpg" => {
                        let encoder =
                            image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, quality);
                        img.write_with_encoder(encoder).map_err(|e| e.to_string())?;
                    }
                    _ => unreachable!(),
                }

                let new_data = buf.into_inner();
                let new_size = new_data.len() as i64;
                write_atomic_output(&new_path, &new_data)?;

                if let Err(err) = apply_md_updates(&md_updates) {
                    let _ = fs::remove_file(&new_path);
                    return Err(err);
                }

                // Delete original (only if new file was written successfully and name differs)
                if new_path != src_path {
                    let _ = fs::remove_file(src_path);
                }

                converted.fetch_add(1, Ordering::Relaxed);
                saved_bytes.fetch_add(old_size - new_size, Ordering::Relaxed);
                Ok(())
            })();

            if result.is_err() {
                skipped.fetch_add(1, Ordering::Relaxed);
            }

            let completed = done.fetch_add(1, Ordering::Relaxed) + 1;
            if completed % 20 == 0 || completed == total {
                if let Some(window) = progress_window {
                    let _ = window.emit(
                        "convert-progress",
                        serde_json::json!({
                            "current": completed, "total": total
                        }),
                    );
                }
            }
        });
    });

    let conv = converted.load(Ordering::Relaxed);
    let skip = skipped.load(Ordering::Relaxed);
    let saved = saved_bytes.load(Ordering::Relaxed);

    let mut task = create_task("convert", ConflictPolicy::RenameAll);
    task.entries.push(OperationEntry {
        entry_id: ops_log::next_id("entry"),
        file_path: format!("{} files", total),
        action: "convert".to_string(),
        source: format!("{total} images"),
        target: target_format,
        status: EntryStatus::Applied,
        message: Some(format!(
            "Converted {conv}, skipped {skip}, saved {saved} bytes"
        )),
    });
    save_task(task);

    append_runtime_log(
        "info",
        format!("convert_images: converted={conv} skipped={skip} saved_bytes={saved}"),
    );
    Ok(models::ConvertSummary {
        converted: conv,
        skipped: skip,
        saved_bytes: saved,
    })
}

#[tauri::command]
fn convert_images(
    window: tauri::Window,
    paths: Vec<String>,
    target_format: String,
    quality: u8,
    vault_path: String,
) -> Result<models::ConvertSummary, String> {
    convert_images_impl(paths, target_format, quality, vault_path, Some(&window))
}

#[tauri::command]
fn fix_broken_with_file(
    dropped_file_path: String,
    broken_image_name: String,
    md_path: String,
    vault_path: String,
) -> Result<String, String> {
    append_runtime_log("info", format!("fix_broken_with_file: file={dropped_file_path} broken={broken_image_name} md={md_path}"));

    validate_basename(&broken_image_name, "Invalid broken image name")?;

    let src = Path::new(&dropped_file_path);
    if !src.exists() {
        return Err("Dropped file does not exist".to_string());
    }

    let vault = Path::new(&vault_path);
    ensure_path_within_root(vault, vault, "Vault path does not exist")?;

    let md = Path::new(&md_path);
    ensure_path_within_root(md, vault, "Markdown path must stay inside vault")?;

    // Determine target directory: md_dir/attachments/
    let attachments_dir = md.parent().unwrap_or(Path::new(".")).join("attachments");
    fs::create_dir_all(&attachments_dir).map_err(|e| e.to_string())?;

    let target = attachments_dir.join(&broken_image_name);
    fs::copy(src, &target).map_err(|e| e.to_string())?;

    let mut task = create_task("fix-broken", ConflictPolicy::RenameAll);
    task.entries.push(OperationEntry {
        entry_id: ops_log::next_id("entry"),
        file_path: dropped_file_path.clone(),
        action: "copy".to_string(),
        source: dropped_file_path,
        target: target.to_string_lossy().to_string(),
        status: EntryStatus::Applied,
        message: Some(format!("Fixed broken ref in {}", md_path)),
    });
    save_task(task);

    Ok(target.to_string_lossy().to_string())
}

fn main() {
    let startup_report = startup_diag::collect_startup_report();
    startup_diag::write_startup_report(&startup_report);
    append_runtime_log("info", "application startup");
    load_from_disk();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_vault,
            clear_thumbnail_cache,
            clear_thumbnail_cache_all,
            execute_migration,
            preview_flatten_attachments,
            flatten_attachments,
            fix_issues,
            list_operation_history,
            open_file,
            open_file_parent,
            get_runtime_logs,
            read_local_storage,
            write_local_storage,
            remove_local_storage,
            read_all_local_storage,
            write_text_file,
            backup_selected_files,
            backup_selected_zip,
            rename_image,
            generate_all_thumbnails,
            generate_all_thumbnails_all,
            get_all_thumbnail_paths,
            find_duplicates,
            merge_duplicates,
            convert_images,
            fix_broken_with_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{
        is_allowed_export_extension, is_valid_storage_key, storage_file_path,
        validate_export_target, write_local_storage, write_text_file,
    };
    use std::fs;
    use std::path::Path;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir() -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("voyager-main-tests-{nanos}"));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn storage_keys_reject_path_traversal() {
        assert!(is_valid_storage_key("theme_mode"));
        assert!(!is_valid_storage_key("../escape"));
        assert!(!is_valid_storage_key("nested/key"));
        assert!(!is_valid_storage_key(""));
    }

    #[test]
    fn storage_file_path_rejects_invalid_keys() {
        let dir = temp_dir();
        let err = storage_file_path(&dir, "../escape").unwrap_err();
        assert_eq!(err, "Invalid storage key");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn export_targets_only_allow_supported_extensions() {
        assert!(is_allowed_export_extension(Path::new("report.json")));
        assert!(is_allowed_export_extension(Path::new("report.csv")));
        assert!(is_allowed_export_extension(Path::new("report.md")));
        assert!(!is_allowed_export_extension(Path::new("report.txt")));
    }

    #[test]
    fn validate_export_target_rejects_unsupported_extensions() {
        let dir = temp_dir();
        let path = dir.join("report.txt");
        let err = validate_export_target(&path).unwrap_err();
        assert!(err.contains(".json, .csv, or .md"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn write_text_file_rejects_unsupported_extensions() {
        let dir = temp_dir();
        let path = dir.join("report.txt");
        let err = write_text_file(path.to_string_lossy().to_string(), "x".into()).unwrap_err();
        assert!(err.contains(".json, .csv, or .md"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn write_text_file_allows_supported_export_extensions() {
        let dir = temp_dir();
        let path = dir.join("report.json");
        write_text_file(path.to_string_lossy().to_string(), "{}".into()).unwrap();
        let content = fs::read_to_string(&path).unwrap();
        assert_eq!(content, "{}");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn write_local_storage_rejects_invalid_key() {
        let err = write_local_storage("../escape".into(), "{}".into()).unwrap_err();
        assert_eq!(err, "Invalid storage key");
    }

    #[test]
    fn fix_broken_with_file_rejects_path_like_image_name() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let md_dir = vault.join("notes");
        let md_path = md_dir.join("note.md");
        let dropped = dir.join("drop.png");
        fs::create_dir_all(&md_dir).unwrap();
        fs::write(&md_path, "# note").unwrap();
        fs::write(&dropped, b"img").unwrap();

        let err = super::fix_broken_with_file(
            dropped.to_string_lossy().to_string(),
            "../escape.png".into(),
            md_path.to_string_lossy().to_string(),
            vault.to_string_lossy().to_string(),
        )
        .unwrap_err();

        assert!(err.contains("Invalid broken image name"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn fix_broken_with_file_rejects_md_path_outside_vault() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let outside = dir.join("outside");
        let md_dir = outside.join("notes");
        let md_path = md_dir.join("note.md");
        let dropped = dir.join("drop.png");
        fs::create_dir_all(&md_dir).unwrap();
        fs::create_dir_all(&vault).unwrap();
        fs::write(&md_path, "# note").unwrap();
        fs::write(&dropped, b"img").unwrap();

        let err = super::fix_broken_with_file(
            dropped.to_string_lossy().to_string(),
            "fixed.png".into(),
            md_path.to_string_lossy().to_string(),
            vault.to_string_lossy().to_string(),
        )
        .unwrap_err();

        assert!(err.contains("Markdown path must stay inside vault"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn fix_broken_with_file_copies_into_note_attachments() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let md_dir = vault.join("notes");
        let md_path = md_dir.join("note.md");
        let dropped = dir.join("drop.png");
        fs::create_dir_all(&md_dir).unwrap();
        fs::write(&md_path, "# note").unwrap();
        fs::write(&dropped, b"img").unwrap();

        let target = super::fix_broken_with_file(
            dropped.to_string_lossy().to_string(),
            "fixed.png".into(),
            md_path.to_string_lossy().to_string(),
            vault.to_string_lossy().to_string(),
        )
        .unwrap();

        let expected = md_dir.join("attachments").join("fixed.png");
        assert_eq!(Path::new(&target), expected.as_path());
        assert_eq!(fs::read(expected).unwrap(), b"img");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rename_image_rejects_source_outside_vault() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let outside = dir.join("outside");
        let image_dir = outside.join("attachments");
        let old_path = image_dir.join("old.png");
        fs::create_dir_all(&vault).unwrap();
        fs::create_dir_all(&image_dir).unwrap();
        fs::write(&old_path, b"img").unwrap();

        let err = super::rename_image(
            old_path.to_string_lossy().to_string(),
            "new.png".into(),
            vault.to_string_lossy().to_string(),
            std::collections::HashMap::new(),
        )
        .unwrap_err();

        assert!(err.contains("Source image must stay inside vault"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rename_image_rejects_md_refs_outside_vault() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let inside_dir = vault.join("attachments");
        let outside_dir = dir.join("outside");
        let old_path = inside_dir.join("old.png");
        let outside_md = outside_dir.join("note.md");
        fs::create_dir_all(&inside_dir).unwrap();
        fs::create_dir_all(&outside_dir).unwrap();
        fs::write(&old_path, b"img").unwrap();
        fs::write(&outside_md, "![[old.png]]").unwrap();

        let mut md_refs = std::collections::HashMap::new();
        md_refs.insert(
            outside_md.to_string_lossy().to_string(),
            vec!["old.png".to_string()],
        );

        let err = super::rename_image(
            old_path.to_string_lossy().to_string(),
            "new.png".into(),
            vault.to_string_lossy().to_string(),
            md_refs,
        )
        .unwrap_err();

        assert!(err.contains("Markdown path must stay inside vault"));
        assert!(old_path.exists());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rename_image_renames_file_and_updates_vault_md() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let image_dir = vault.join("attachments");
        let notes_dir = vault.join("notes");
        let old_path = image_dir.join("old.png");
        let note_path = notes_dir.join("note.md");
        fs::create_dir_all(&image_dir).unwrap();
        fs::create_dir_all(&notes_dir).unwrap();
        fs::write(&old_path, b"img").unwrap();
        fs::write(&note_path, "![[old.png]]").unwrap();

        let mut md_refs = std::collections::HashMap::new();
        md_refs.insert(
            note_path.to_string_lossy().to_string(),
            vec!["old.png".to_string()],
        );

        let summary = super::rename_image(
            old_path.to_string_lossy().to_string(),
            "new.png".into(),
            vault.to_string_lossy().to_string(),
            md_refs,
        )
        .unwrap();

        let new_path = image_dir.join("new.png");
        assert_eq!(Path::new(&summary.new_path), new_path.as_path());
        assert!(!old_path.exists());
        assert!(new_path.exists());
        assert_eq!(fs::read_to_string(note_path).unwrap(), "![[new.png]]");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn merge_duplicates_rejects_keep_outside_vault() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let outside = dir.join("outside");
        let keep = outside.join("keep.png");
        let remove = vault.join("attachments").join("dup.png");
        fs::create_dir_all(vault.join("attachments")).unwrap();
        fs::create_dir_all(&outside).unwrap();
        fs::write(&keep, b"keep").unwrap();
        fs::write(&remove, b"dup").unwrap();

        let err = super::merge_duplicates(
            keep.to_string_lossy().to_string(),
            vec![remove.to_string_lossy().to_string()],
            vault.to_string_lossy().to_string(),
        )
        .unwrap_err();

        assert!(err.contains("Keep file must stay inside vault"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn merge_duplicates_rejects_remove_outside_vault() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let attachments = vault.join("attachments");
        let outside = dir.join("outside");
        let keep = attachments.join("keep.png");
        let remove = outside.join("dup.png");
        fs::create_dir_all(&attachments).unwrap();
        fs::create_dir_all(&outside).unwrap();
        fs::write(&keep, b"keep").unwrap();
        fs::write(&remove, b"dup").unwrap();

        let err = super::merge_duplicates(
            keep.to_string_lossy().to_string(),
            vec![remove.to_string_lossy().to_string()],
            vault.to_string_lossy().to_string(),
        )
        .unwrap_err();

        assert!(err.contains("Remove file must stay inside vault"));
        assert!(remove.exists());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn merge_duplicates_updates_vault_md_and_deletes_duplicate() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let attachments = vault.join("attachments");
        let notes = vault.join("notes");
        let keep = attachments.join("keep.png");
        let remove = attachments.join("dup.png");
        let md = notes.join("note.md");
        fs::create_dir_all(&attachments).unwrap();
        fs::create_dir_all(&notes).unwrap();
        fs::write(&keep, b"keep").unwrap();
        fs::write(&remove, b"dup").unwrap();
        fs::write(&md, "![[dup.png]]").unwrap();

        let summary = super::merge_duplicates(
            keep.to_string_lossy().to_string(),
            vec![remove.to_string_lossy().to_string()],
            vault.to_string_lossy().to_string(),
        )
        .unwrap();

        assert_eq!(summary.deleted_files, 1);
        assert_eq!(summary.updated_mds, 1);
        assert!(!remove.exists());
        assert_eq!(fs::read_to_string(md).unwrap(), "![[keep.png]]");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn convert_images_rejects_source_outside_vault() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let outside = dir.join("outside");
        let src = outside.join("image.png");
        fs::create_dir_all(&vault).unwrap();
        fs::create_dir_all(&outside).unwrap();
        fs::write(&src, b"not-a-real-image").unwrap();

        let err = super::convert_images_for_tests(
            vec![src.to_string_lossy().to_string()],
            "webp".into(),
            80,
            vault.to_string_lossy().to_string(),
        )
        .unwrap_err();

        assert!(err.contains("Source image must stay inside vault"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn convert_images_rejects_missing_vault() {
        let dir = temp_dir();
        let vault = dir.join("missing-vault");

        let err = super::convert_images_for_tests(
            Vec::new(),
            "webp".into(),
            80,
            vault.to_string_lossy().to_string(),
        )
        .unwrap_err();

        assert!(err.contains("Vault path does not exist"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn open_file_rejects_path_outside_vault() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let outside = dir.join("outside");
        let file = outside.join("note.md");
        fs::create_dir_all(&vault).unwrap();
        fs::create_dir_all(&outside).unwrap();
        fs::write(&file, "hello").unwrap();

        let err = super::validate_open_path_for_tests(
            file.to_string_lossy().to_string(),
            vault.to_string_lossy().to_string(),
        )
        .unwrap_err();

        assert!(err.contains("Open target must stay inside vault"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn open_file_parent_rejects_path_outside_vault() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let outside = dir.join("outside");
        let file = outside.join("note.md");
        fs::create_dir_all(&vault).unwrap();
        fs::create_dir_all(&outside).unwrap();
        fs::write(&file, "hello").unwrap();

        let err = super::validate_open_path_for_tests(
            file.to_string_lossy().to_string(),
            vault.to_string_lossy().to_string(),
        )
        .unwrap_err();

        assert!(err.contains("Open target must stay inside vault"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn open_file_allows_path_inside_vault() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let notes = vault.join("notes");
        let file = notes.join("note.md");
        fs::create_dir_all(&notes).unwrap();
        fs::write(&file, "hello").unwrap();

        let validated = super::validate_open_path_for_tests(
            file.to_string_lossy().to_string(),
            vault.to_string_lossy().to_string(),
        )
        .unwrap();

        assert_eq!(validated, file.canonicalize().unwrap());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn backup_selected_files_rejects_source_outside_vault() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let outside = dir.join("outside");
        let source = outside.join("image.png");
        let dest = dir.join("backup-dir");
        fs::create_dir_all(&vault).unwrap();
        fs::create_dir_all(&outside).unwrap();
        fs::write(&source, b"img").unwrap();

        let err = super::backup_selected_files(
            vec![source.to_string_lossy().to_string()],
            dest.to_string_lossy().to_string(),
            vault.to_string_lossy().to_string(),
        )
        .unwrap_err();

        assert!(err.contains("Backup source must stay inside vault"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn backup_selected_zip_rejects_source_outside_vault() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let outside = dir.join("outside");
        let source = outside.join("image.png");
        let dest = dir.join("backup.zip");
        fs::create_dir_all(&vault).unwrap();
        fs::create_dir_all(&outside).unwrap();
        fs::write(&source, b"img").unwrap();

        let err = super::backup_selected_zip(
            vec![source.to_string_lossy().to_string()],
            dest.to_string_lossy().to_string(),
            vault.to_string_lossy().to_string(),
        )
        .unwrap_err();

        assert!(err.contains("Backup source must stay inside vault"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn backup_selected_files_allows_vault_source_and_external_dest() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let attachments = vault.join("attachments");
        let source = attachments.join("image.png");
        let dest = dir.join("external-backup");
        fs::create_dir_all(&attachments).unwrap();
        fs::write(&source, b"img").unwrap();

        let summary = super::backup_selected_files(
            vec![source.to_string_lossy().to_string()],
            dest.to_string_lossy().to_string(),
            vault.to_string_lossy().to_string(),
        )
        .unwrap();

        assert_eq!(summary.copied, 1);
        assert!(dest.join("image.png").exists());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn find_duplicates_rejects_missing_vault() {
        let dir = temp_dir();
        let vault = dir.join("missing-vault");

        let err =
            super::find_duplicates_for_tests(vault.to_string_lossy().to_string()).unwrap_err();

        assert!(err.contains("Vault path does not exist"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn hash_file_sha256_matches_known_bytes() {
        use sha2::{Digest, Sha256};

        let dir = temp_dir();
        let path = dir.join("data.bin");
        let data = b"voyager-duplicate-hash";
        fs::write(&path, data).unwrap();

        let (hash, size) = super::hash_file_sha256(&path).unwrap();
        let expected = format!("{:x}", Sha256::digest(data));

        assert_eq!(size, data.len() as u64);
        assert_eq!(hash, expected);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn convert_images_skips_when_target_exists() {
        let dir = temp_dir();
        let vault = dir.join("vault");
        let attachments = vault.join("attachments");
        let src = attachments.join("image.png");
        let existing = attachments.join("image.webp");
        fs::create_dir_all(&attachments).unwrap();
        fs::write(&src, b"not-a-real-image").unwrap();
        fs::write(&existing, b"existing-target").unwrap();

        let summary = super::convert_images_for_tests(
            vec![src.to_string_lossy().to_string()],
            "webp".into(),
            80,
            vault.to_string_lossy().to_string(),
        )
        .unwrap();

        assert_eq!(summary.converted, 0);
        assert_eq!(summary.skipped, 1);
        assert!(src.exists());
        assert_eq!(fs::read(&existing).unwrap(), b"existing-target");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn write_atomic_output_replaces_target_without_leaving_temp_file() {
        let dir = temp_dir();
        let target = dir.join("image.webp");
        fs::write(&target, b"old").unwrap();

        super::write_atomic_output(&target, b"new").unwrap();

        assert_eq!(fs::read(&target).unwrap(), b"new");
        let leftovers: Vec<_> = fs::read_dir(&dir)
            .unwrap()
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.file_name().to_string_lossy().to_string())
            .filter(|name| name.contains(".tmp-"))
            .collect();
        assert!(leftovers.is_empty());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn prepare_md_updates_fails_when_markdown_cannot_be_read() {
        let dir = temp_dir();
        let missing = dir.join("missing.md");

        let err = super::prepare_md_updates(&[missing], "old.png", "new.webp").unwrap_err();

        assert!(!err.is_empty());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn apply_md_updates_with_writer_rolls_back_partial_writes() {
        let dir = temp_dir();
        let first = dir.join("first.md");
        let second = dir.join("second.md");
        fs::write(&first, "![[old.png]]").unwrap();
        fs::write(&second, "![[old.png]]").unwrap();

        let updates = vec![
            (first.clone(), "![[new.webp]]".to_string()),
            (second.clone(), "![[new.webp]]".to_string()),
        ];
        let mut writes = 0usize;

        let err = super::apply_md_updates_with_writer(&updates, |path, content| {
            writes += 1;
            if writes == 2 {
                return Err("forced failure".to_string());
            }
            fs::write(path, content).map_err(|e| e.to_string())
        })
        .unwrap_err();

        assert_eq!(err, "forced failure");
        assert_eq!(fs::read_to_string(&first).unwrap(), "![[old.png]]");
        assert_eq!(fs::read_to_string(&second).unwrap(), "![[old.png]]");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn recommended_convert_parallelism_is_capped() {
        assert_eq!(super::recommended_convert_parallelism(0), 1);
        assert_eq!(super::recommended_convert_parallelism(1), 1);
        assert!(super::recommended_convert_parallelism(100) <= 4);
    }

    #[test]
    fn duplicate_hash_candidates_only_keeps_repeated_sizes() {
        let dir = temp_dir();
        let a = dir.join("a.png");
        let b = dir.join("b.png");
        let c = dir.join("c.png");
        fs::write(&a, b"same-size-a").unwrap();
        fs::write(&b, b"same-size-b").unwrap();
        fs::write(&c, b"x").unwrap();

        let candidates = super::duplicate_hash_candidates(&vec![a.clone(), b.clone(), c.clone()]);

        assert_eq!(candidates.len(), 2);
        assert!(candidates.contains(&a));
        assert!(candidates.contains(&b));
        assert!(!candidates.contains(&c));
        fs::remove_dir_all(dir).unwrap();
    }
}
