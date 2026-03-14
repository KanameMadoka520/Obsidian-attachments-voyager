use serde::Serialize;
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub fn diagnostics_dir_path() -> PathBuf {
    if let Ok(path) = std::env::var("VOYAGER_DIAGNOSTICS_DIR") {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }

    let exe = std::env::current_exe().unwrap_or_default();
    let exe_dir = exe.parent().unwrap_or(Path::new("."));
    exe_dir.join("voyager-data").join("diagnostics")
}

fn diagnostics_dir() -> PathBuf {
    diagnostics_dir_path()
}

fn now_ts() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

pub fn append_jsonl<T: Serialize>(file_name: &str, value: &T) {
    let dir = diagnostics_dir();
    let _ = create_dir_all(&dir);
    let path = dir.join(file_name);

    let Ok(json) = serde_json::to_string(value) else {
        return;
    };

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{json}");
    }
}

fn valid_task_id(task_id: &str) -> bool {
    !task_id.trim().is_empty()
        && task_id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
}

pub fn misplaced_fix_task_file_path(task_id: &str) -> Option<PathBuf> {
    if !valid_task_id(task_id) {
        return None;
    }
    Some(diagnostics_dir().join(format!("misplaced-fix-{task_id}.jsonl")))
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MisplacedFixDiagnosticRecord {
    pub timestamp: u64,
    pub task_id: String,
    pub entry_id: String,
    pub md_path: Option<String>,
    pub image_path_before: String,
    pub source_path: String,
    pub expected_target: String,
    pub resolved_target: String,
    pub reference_filename: String,
    pub conflict_policy: String,
    pub source_exists_before: bool,
    pub target_exists_before: bool,
    pub source_exists_after: bool,
    pub target_exists_after: bool,
    pub verification_status: String,
    pub verification_reason: String,
    pub residual_issue_type: Option<String>,
    pub residual_issue_path: Option<String>,
    pub residual_issue_reason: Option<String>,
}

impl MisplacedFixDiagnosticRecord {
    pub fn new(
        task_id: String,
        entry_id: String,
        md_path: Option<String>,
        image_path_before: String,
        source_path: String,
        expected_target: String,
        resolved_target: String,
        reference_filename: String,
        conflict_policy: String,
        source_exists_before: bool,
        target_exists_before: bool,
        source_exists_after: bool,
        target_exists_after: bool,
        verification_status: String,
        verification_reason: String,
        residual_issue_type: Option<String>,
        residual_issue_path: Option<String>,
        residual_issue_reason: Option<String>,
    ) -> Self {
        Self {
            timestamp: now_ts(),
            task_id,
            entry_id,
            md_path,
            image_path_before,
            source_path,
            expected_target,
            resolved_target,
            reference_filename,
            conflict_policy,
            source_exists_before,
            target_exists_before,
            source_exists_after,
            target_exists_after,
            verification_status,
            verification_reason,
            residual_issue_type,
            residual_issue_path,
            residual_issue_reason,
        }
    }
}

pub fn append_misplaced_fix_record(task_id: &str, value: &MisplacedFixDiagnosticRecord) {
    append_jsonl("misplaced-fix.jsonl", value);
    if let Some(path) = misplaced_fix_task_file_path(task_id) {
        let Ok(json) = serde_json::to_string(value) else {
            return;
        };
        if let Some(parent) = path.parent() {
            let _ = create_dir_all(parent);
        }
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
            let _ = writeln!(file, "{json}");
        }
    }
}
