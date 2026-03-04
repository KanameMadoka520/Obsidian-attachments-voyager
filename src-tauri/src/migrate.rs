use crate::ops_log::{next_id, ConflictPolicy, EntryStatus, OperationEntry};
use crate::parser::extract_image_refs;
use anyhow::Result;
use serde::{Deserialize, Serialize};
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

fn conflict_target(target: &Path, policy: &ConflictPolicy) -> Result<PathBuf> {
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
        ConflictPolicy::PromptEach => anyhow::bail!(
            "CONFLICT:目标文件已存在，请选择冲突策略（覆盖/改名共存）"
        ),
    }
}

pub fn migrate_note_with_assets(note_path: &Path, target_dir: &Path, policy: ConflictPolicy) -> Result<MigrateSummary> {
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
