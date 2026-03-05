// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::fs;
use std::path::Path;

pub mod migrate;
pub mod models;
pub mod ops_log;
pub mod parser;
pub mod runtime_log;
pub mod scanner;
pub mod startup_diag;
pub mod thumb_cache;

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
fn scan_vault(window: tauri::Window, root: String, generate_thumbs: Option<bool>, thumb_size: Option<u32>, prev_index: Option<models::ScanIndex>) -> Result<ScanResult, String> {
    let generate_thumbs = generate_thumbs.unwrap_or(true);
    let thumb_size = thumb_size.unwrap_or(256);

    append_runtime_log(
        "info",
        format!(
            "scan_vault root={root} generate_thumbs={generate_thumbs} thumb_size={thumb_size}"
        ),
    );

    let progress: scanner::ProgressFn = Box::new(move |phase: &str, current: usize, total: usize| {
        let _ = window.emit("scan-progress", serde_json::json!({
            "phase": phase,
            "current": current,
            "total": total,
        }));
    });

    scanner::scan_vault_with_thumbs(Path::new(&root), generate_thumbs, thumb_size, Some(&progress), prev_index.as_ref()).map_err(|e| e.to_string())
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

    let summary = migrate::migrate_note_with_assets(Path::new(&note_path), Path::new(&target_dir), policy.clone())
        .map_err(|e| e.to_string())?;

    let mut task = create_task("migration", policy);
    task.task_id = summary.task_id.clone();
    task.entries = summary.entries.clone();
    save_task(task);

    Ok(summary)
}

#[tauri::command]
fn fix_issues(issues: Vec<ScanIssue>, policy: Option<ConflictPolicy>) -> Result<FixSummary, String> {
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
fn open_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("无法找到该文件，请自行检查".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn open_file_parent(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    let Some(parent) = p.parent() else {
        return Err("无法找到该文件，请自行检查".to_string());
    };
    if !parent.exists() {
        return Err("无法找到该文件，请自行检查".to_string());
    }

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
    append_runtime_log("info", format!("clear_thumbnail_cache removed={removed} cache_dir={cache_dir}"));
    Ok(CacheClearSummary { removed, cache_dir: cache_dir })
}

fn get_storage_dir() -> std::path::PathBuf {
    let exe = std::env::current_exe().unwrap_or_default();
    let exe_dir = exe.parent().unwrap_or(Path::new("."));
    exe_dir.join("voyager-data")
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_local_storage(key: String) -> Result<Option<String>, String> {
    let dir = get_storage_dir();
    let file = dir.join(format!("{key}.json"));
    if !file.exists() {
        return Ok(None);
    }
    fs::read_to_string(&file).map(Some).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_local_storage(key: String, value: String) -> Result<(), String> {
    let dir = get_storage_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = dir.join(format!("{key}.json"));
    fs::write(&file, value).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_local_storage(key: String) -> Result<(), String> {
    let dir = get_storage_dir();
    let file = dir.join(format!("{key}.json"));
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

fn main() {
    let startup_report = startup_diag::collect_startup_report();
    startup_diag::write_startup_report(&startup_report);
    append_runtime_log("info", "application startup");
    load_from_disk();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_vault,
            clear_thumbnail_cache,
            execute_migration,
            fix_issues,
            list_operation_history,
            open_file,
            open_file_parent,
            get_runtime_logs,
            read_local_storage,
            write_local_storage,
            remove_local_storage,
            read_all_local_storage,
            write_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
