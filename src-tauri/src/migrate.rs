use crate::ops_log::{next_id, ConflictPolicy, EntryStatus, OperationEntry};
use crate::parser::extract_image_refs;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrateSummary {
    pub task_id: String,
    pub moved_notes: usize,
    pub moved_assets: usize,
    pub entries: Vec<OperationEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlattenPlanItem {
    pub source_path: String,
    pub target_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlattenAttachmentsPlan {
    pub root_dir: String,
    pub destination_dir: String,
    pub source_folders: Vec<String>,
    pub items: Vec<FlattenPlanItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlattenAttachmentsSummary {
    pub task_id: String,
    pub destination_dir: String,
    pub moved_files: usize,
    pub removed_folders: usize,
    pub skipped_files: usize,
    pub entries: Vec<OperationEntry>,
}

fn preview_flatten_attachments_with_policy(
    root_dir: &Path,
    policy: &ConflictPolicy,
) -> Result<FlattenAttachmentsPlan> {
    let canonical_root = validate_flatten_root(root_dir)?;
    let destination_dir = canonical_root.join("attachments");

    let mut source_dirs = Vec::new();
    collect_source_attachment_dirs(&canonical_root, &destination_dir, &mut source_dirs)?;
    source_dirs.sort();

    let mut reserved_targets = HashSet::new();
    let mut items = Vec::new();

    for source_dir in &source_dirs {
        let mut files = Vec::new();
        collect_regular_files_recursive(source_dir, &mut files)?;
        files.sort();

        for source_path in files {
            let file_name = source_path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("file");
            let raw_target = destination_dir.join(file_name);
            let resolved_target =
                resolve_target_with_reserved(&raw_target, policy, &reserved_targets)?;
            reserved_targets.insert(resolved_target.clone());

            items.push(FlattenPlanItem {
                source_path: source_path.to_string_lossy().to_string(),
                target_path: resolved_target.to_string_lossy().to_string(),
            });
        }
    }

    Ok(FlattenAttachmentsPlan {
        root_dir: canonical_root.to_string_lossy().to_string(),
        destination_dir: destination_dir.to_string_lossy().to_string(),
        source_folders: source_dirs
            .into_iter()
            .map(|path| path.to_string_lossy().to_string())
            .collect(),
        items,
    })
}

pub fn conflict_target(target: &Path, policy: &ConflictPolicy) -> Result<PathBuf> {
    if !target.exists() {
        return Ok(target.to_path_buf());
    }

    match policy {
        ConflictPolicy::OverwriteAll => {
            if target.is_file() {
                fs::remove_file(target)?;
            }
            Ok(target.to_path_buf())
        }
        ConflictPolicy::RenameAll => {
            let stem = target
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("file")
                .to_string();
            let ext = target.extension().and_then(|s| s.to_str()).unwrap_or("");
            let parent = target.parent().unwrap_or(Path::new("."));

            for i in 1..=9999 {
                let name = if ext.is_empty() {
                    format!("{stem} ({i})")
                } else {
                    format!("{stem} ({i}).{ext}")
                };
                let candidate = parent.join(name);
                if !candidate.exists() {
                    return Ok(candidate);
                }
            }

            anyhow::bail!("无法为重名文件生成可用的新文件名")
        }
        ConflictPolicy::PromptEach => {
            anyhow::bail!("CONFLICT:目标文件已存在，请选择冲突策略（覆盖/改名共存）")
        }
    }
}

pub fn migrate_note_with_assets(
    note_path: &Path,
    target_dir: &Path,
    policy: ConflictPolicy,
) -> Result<MigrateSummary> {
    let note_content = fs::read_to_string(note_path)?;
    let refs = extract_image_refs(&note_content);

    let task_id = next_id("task");
    let mut entries = Vec::new();

    let note_name = note_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("note.md");
    let note_target_raw = target_dir.join(note_name);
    let note_target = conflict_target(&note_target_raw, &policy)?;

    let mut moved_assets = 0usize;

    for filename in refs {
        let source_asset = note_path
            .parent()
            .unwrap_or(Path::new("."))
            .join("attachments")
            .join(&filename);
        let raw_target_asset = target_dir.join("attachments").join(&filename);

        if !source_asset.exists() {
            continue;
        }

        let target_asset = conflict_target(&raw_target_asset, &policy)?;
        if let Some(parent) = target_asset.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::rename(&source_asset, &target_asset)?;

        moved_assets += 1;
        entries.push(OperationEntry {
            entry_id: next_id("entry"),
            file_path: source_asset.to_string_lossy().to_string(),
            action: "move".to_string(),
            source: source_asset.to_string_lossy().to_string(),
            target: target_asset.to_string_lossy().to_string(),
            status: EntryStatus::Applied,
            message: None,
        });
    }

    fs::create_dir_all(target_dir)?;
    fs::rename(note_path, &note_target)?;

    entries.push(OperationEntry {
        entry_id: next_id("entry"),
        file_path: note_path.to_string_lossy().to_string(),
        action: "move".to_string(),
        source: note_path.to_string_lossy().to_string(),
        target: note_target.to_string_lossy().to_string(),
        status: EntryStatus::Applied,
        message: None,
    });

    Ok(MigrateSummary {
        task_id,
        moved_notes: 1,
        moved_assets,
        entries,
    })
}

fn is_attachments_dir(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.eq_ignore_ascii_case("attachments"))
        .unwrap_or(false)
}

fn should_skip_dir(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| {
            matches!(
                name,
                ".git" | "node_modules" | ".worktrees" | ".trash" | "trash"
            )
        })
        .unwrap_or(false)
}

fn validate_flatten_root(root_dir: &Path) -> Result<PathBuf> {
    if !root_dir.exists() {
        anyhow::bail!("选定目录不存在");
    }
    if !root_dir.is_dir() {
        anyhow::bail!("选定路径不是文件夹");
    }

    let canonical_root = root_dir.canonicalize()?;
    if is_attachments_dir(&canonical_root) {
        anyhow::bail!("请选择要整理的父级目录，而不是 attachments 文件夹本身");
    }

    Ok(canonical_root)
}

fn sorted_dir_entries(dir: &Path) -> Result<Vec<fs::DirEntry>> {
    let mut entries = fs::read_dir(dir)?.collect::<std::result::Result<Vec<_>, _>>()?;
    entries.sort_by_key(|entry| entry.path());
    Ok(entries)
}

fn collect_source_attachment_dirs(
    current: &Path,
    destination_dir: &Path,
    output: &mut Vec<PathBuf>,
) -> Result<()> {
    for entry in sorted_dir_entries(current)? {
        let file_type = entry.file_type()?;
        if file_type.is_symlink() {
            continue;
        }

        let path = entry.path();
        if !file_type.is_dir() {
            continue;
        }
        if should_skip_dir(&path) || path == destination_dir {
            continue;
        }
        if is_attachments_dir(&path) {
            output.push(path);
            continue;
        }
        collect_source_attachment_dirs(&path, destination_dir, output)?;
    }

    Ok(())
}

fn collect_regular_files_recursive(dir: &Path, output: &mut Vec<PathBuf>) -> Result<()> {
    for entry in sorted_dir_entries(dir)? {
        let file_type = entry.file_type()?;
        if file_type.is_symlink() {
            continue;
        }

        let path = entry.path();
        if file_type.is_dir() {
            collect_regular_files_recursive(&path, output)?;
            continue;
        }
        if file_type.is_file() {
            output.push(path);
        }
    }

    Ok(())
}

pub fn preview_flatten_attachments(
    root_dir: &Path,
    policy: ConflictPolicy,
) -> Result<FlattenAttachmentsPlan> {
    preview_flatten_attachments_with_policy(root_dir, &policy)
}

fn resolve_target_with_reserved(
    raw_target: &Path,
    policy: &ConflictPolicy,
    reserved: &HashSet<PathBuf>,
) -> Result<PathBuf> {
    if raw_target.exists() && raw_target.is_dir() {
        anyhow::bail!("目标路径被同名目录占用：{}", raw_target.display());
    }

    if !raw_target.exists() && !reserved.contains(raw_target) {
        return Ok(raw_target.to_path_buf());
    }

    match policy {
        ConflictPolicy::OverwriteAll => Ok(raw_target.to_path_buf()),
        ConflictPolicy::RenameAll => {
            let stem = raw_target
                .file_stem()
                .and_then(|name| name.to_str())
                .unwrap_or("file")
                .to_string();
            let ext = raw_target
                .extension()
                .and_then(|name| name.to_str())
                .unwrap_or("")
                .to_string();
            let parent = raw_target.parent().unwrap_or(Path::new("."));

            for i in 1..=9999 {
                let candidate_name = if ext.is_empty() {
                    format!("{stem} ({i})")
                } else {
                    format!("{stem} ({i}).{ext}")
                };
                let candidate = parent.join(candidate_name);
                if !candidate.exists() && !reserved.contains(&candidate) {
                    return Ok(candidate);
                }
            }

            anyhow::bail!("无法为重名文件生成可用的新文件名")
        }
        ConflictPolicy::PromptEach => {
            anyhow::bail!("CONFLICT:目标文件已存在，请选择冲突策略（覆盖/改名共存）")
        }
    }
}

fn remove_empty_dir_tree(dir: &Path) -> Result<bool> {
    for entry in sorted_dir_entries(dir)? {
        let file_type = entry.file_type()?;
        if file_type.is_symlink() {
            continue;
        }
        if file_type.is_dir() {
            let _ = remove_empty_dir_tree(&entry.path())?;
        }
    }

    if fs::read_dir(dir)?.next().is_none() {
        fs::remove_dir(dir)?;
        return Ok(true);
    }

    Ok(false)
}

pub fn flatten_attachments_into_root(
    root_dir: &Path,
    policy: ConflictPolicy,
) -> Result<FlattenAttachmentsSummary> {
    let plan = preview_flatten_attachments(root_dir, policy.clone())?;
    let destination_dir = PathBuf::from(&plan.destination_dir);
    fs::create_dir_all(&destination_dir)?;

    let task_id = next_id("task");
    let mut entries = Vec::new();
    let mut moved_files = 0usize;
    let mut skipped_files = 0usize;

    for item in &plan.items {
        let source_path = PathBuf::from(&item.source_path);
        let target_path = PathBuf::from(&item.target_path);

        if !source_path.exists() {
            skipped_files += 1;
            entries.push(OperationEntry {
                entry_id: next_id("entry"),
                file_path: source_path.to_string_lossy().to_string(),
                action: "move".to_string(),
                source: source_path.to_string_lossy().to_string(),
                target: target_path.to_string_lossy().to_string(),
                status: EntryStatus::Skipped,
                message: Some("源文件不存在，已跳过".to_string()),
            });
            continue;
        }

        if target_path.exists() {
            if target_path.is_dir() {
                anyhow::bail!("目标路径被同名目录占用：{}", target_path.display());
            }
            if matches!(policy, ConflictPolicy::OverwriteAll) {
                fs::remove_file(&target_path)?;
            }
        }

        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::rename(&source_path, &target_path)?;

        moved_files += 1;
        entries.push(OperationEntry {
            entry_id: next_id("entry"),
            file_path: source_path.to_string_lossy().to_string(),
            action: "move".to_string(),
            source: source_path.to_string_lossy().to_string(),
            target: target_path.to_string_lossy().to_string(),
            status: EntryStatus::Applied,
            message: None,
        });
    }

    let mut removed_folders = 0usize;
    for source_folder in &plan.source_folders {
        let folder_path = PathBuf::from(source_folder);
        if !folder_path.exists() {
            continue;
        }

        if remove_empty_dir_tree(&folder_path)? {
            removed_folders += 1;
            entries.push(OperationEntry {
                entry_id: next_id("entry"),
                file_path: source_folder.clone(),
                action: "delete-dir".to_string(),
                source: source_folder.clone(),
                target: source_folder.clone(),
                status: EntryStatus::Applied,
                message: Some("已删除空的 attachments 文件夹".to_string()),
            });
        } else {
            entries.push(OperationEntry {
                entry_id: next_id("entry"),
                file_path: source_folder.clone(),
                action: "delete-dir".to_string(),
                source: source_folder.clone(),
                target: source_folder.clone(),
                status: EntryStatus::Skipped,
                message: Some("目录未清空，未删除".to_string()),
            });
        }
    }

    Ok(FlattenAttachmentsSummary {
        task_id,
        destination_dir: plan.destination_dir,
        moved_files,
        removed_folders,
        skipped_files,
        entries,
    })
}

#[cfg(test)]
mod tests {
    use super::{flatten_attachments_into_root, preview_flatten_attachments};
    use crate::ops_log::ConflictPolicy;
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("voyager-migrate-tests-{nanos}"));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn preview_flatten_collects_nested_attachment_files() {
        let root = temp_dir();
        let dest = root.join("attachments");
        let nested_a = root.join("chapter-a/attachments");
        let nested_b = root.join("chapter-b/attachments");
        let trash_dir = root.join(".trash/note/attachments");
        fs::create_dir_all(&dest).unwrap();
        fs::create_dir_all(&nested_a).unwrap();
        fs::create_dir_all(&nested_b).unwrap();
        fs::create_dir_all(&trash_dir).unwrap();
        fs::write(dest.join("keep.png"), b"keep").unwrap();
        fs::write(nested_a.join("a.png"), b"a").unwrap();
        fs::write(nested_b.join("b.png"), b"b").unwrap();
        fs::write(trash_dir.join("trash.png"), b"trash").unwrap();

        let plan = preview_flatten_attachments(&root, ConflictPolicy::RenameAll).unwrap();
        let expected_source_suffix = Path::new("chapter-a").join("attachments").join("a.png");
        let expected_target_suffix = Path::new("attachments").join("a.png");
        let excluded_suffix = Path::new("attachments").join("keep.png");

        assert_eq!(plan.source_folders.len(), 2);
        assert_eq!(plan.items.len(), 2);
        assert!(plan
            .items
            .iter()
            .any(|item| Path::new(&item.source_path).ends_with(&expected_source_suffix)));
        assert!(plan
            .items
            .iter()
            .any(|item| Path::new(&item.target_path).ends_with(&expected_target_suffix)));
        assert!(plan
            .items
            .iter()
            .all(|item| !Path::new(&item.source_path).ends_with(&excluded_suffix)));
        assert!(plan
            .items
            .iter()
            .all(|item| !item.source_path.contains(".trash")));

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn flatten_moves_files_and_removes_empty_attachment_dirs() {
        let root = temp_dir();
        let nested_a = root.join("chapter-a/attachments");
        let nested_b = root.join("chapter-b/attachments");
        fs::create_dir_all(&nested_a).unwrap();
        fs::create_dir_all(&nested_b).unwrap();
        fs::write(nested_a.join("a.png"), b"a").unwrap();
        fs::write(nested_b.join("b.png"), b"b").unwrap();

        let summary = flatten_attachments_into_root(&root, ConflictPolicy::RenameAll).unwrap();

        assert_eq!(summary.moved_files, 2);
        assert_eq!(summary.removed_folders, 2);
        assert_eq!(summary.skipped_files, 0);
        assert!(root.join("attachments/a.png").exists());
        assert!(root.join("attachments/b.png").exists());
        assert!(!nested_a.exists());
        assert!(!nested_b.exists());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn flatten_rename_policy_preserves_same_name_files() {
        let root = temp_dir();
        let nested_a = root.join("chapter-a/attachments");
        let nested_b = root.join("chapter-b/attachments");
        fs::create_dir_all(&nested_a).unwrap();
        fs::create_dir_all(&nested_b).unwrap();
        fs::write(nested_a.join("shared.png"), b"one").unwrap();
        fs::write(nested_b.join("shared.png"), b"two").unwrap();

        let summary = flatten_attachments_into_root(&root, ConflictPolicy::RenameAll).unwrap();

        assert_eq!(summary.moved_files, 2);
        assert!(root.join("attachments/shared.png").exists());
        assert!(root.join("attachments/shared (1).png").exists());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn preview_flatten_applies_rename_policy_to_duplicate_targets() {
        let root = temp_dir();
        let nested_a = root.join("chapter-a/attachments");
        let nested_b = root.join("chapter-b/attachments");
        fs::create_dir_all(&nested_a).unwrap();
        fs::create_dir_all(&nested_b).unwrap();
        fs::write(nested_a.join("shared.png"), b"one").unwrap();
        fs::write(nested_b.join("shared.png"), b"two").unwrap();

        let plan = preview_flatten_attachments(&root, ConflictPolicy::RenameAll).unwrap();
        let targets: Vec<_> = plan
            .items
            .iter()
            .map(|item| item.target_path.as_str())
            .collect();

        assert!(targets.iter().any(|path| path.ends_with("shared.png")));
        assert!(targets.iter().any(|path| path.ends_with("shared (1).png")));

        fs::remove_dir_all(root).unwrap();
    }
}
