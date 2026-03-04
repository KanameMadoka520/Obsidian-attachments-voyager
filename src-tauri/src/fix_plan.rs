use crate::ops_log::{FixAction, OpsRecord};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplySummary {
    pub moved: usize,
    pub skipped: usize,
}

pub fn apply_fix_plan(plan: &[FixAction], dry_run: bool) -> Result<ApplySummary> {
    let mut moved = 0usize;
    let mut skipped = 0usize;

    if dry_run {
        return Ok(ApplySummary { moved, skipped });
    }

    let log_path = std::env::temp_dir().join("obsidian-attachments-voyager-ops.jsonl");
    let mut log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)?;

    for action in plan {
        if action.action != "move" {
            skipped += 1;
            continue;
        }

        let source = Path::new(&action.source);
        let target = Path::new(&action.target);

        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)?;
        }

        if source.exists() {
            fs::rename(source, target)?;
            moved += 1;

            let rec = OpsRecord {
                source: action.source.clone(),
                target: action.target.clone(),
                action: action.action.clone(),
                status: "moved".to_string(),
            };
            let line = serde_json::to_string(&rec)?;
            writeln!(log_file, "{line}")?;
        } else {
            skipped += 1;
        }
    }

    Ok(ApplySummary { moved, skipped })
}

#[cfg(test)]
mod tests {
    use super::apply_fix_plan;

    #[test]
    fn dry_run_does_not_move_files() {
        let temp = std::env::temp_dir().join("voyager-fix-plan-dry-run");
        let _ = std::fs::remove_dir_all(&temp);
        std::fs::create_dir_all(&temp).unwrap();

        let source = temp.join("src.png");
        let target = temp.join("attachments/dst.png");
        std::fs::write(&source, b"x").unwrap();

        let plan = vec![crate::ops_log::FixAction {
            source: source.to_string_lossy().to_string(),
            target: target.to_string_lossy().to_string(),
            action: "move".to_string(),
        }];

        let out = apply_fix_plan(&plan, true).unwrap();
        assert_eq!(out.moved, 0);
        assert!(source.exists());

        let _ = std::fs::remove_dir_all(&temp);
    }
}
