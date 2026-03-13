use serde::Serialize;
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeLogLine {
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

static RUNTIME_LOGS: OnceLock<Mutex<Vec<RuntimeLogLine>>> = OnceLock::new();

fn logs() -> &'static Mutex<Vec<RuntimeLogLine>> {
    RUNTIME_LOGS.get_or_init(|| Mutex::new(Vec::new()))
}

fn now_ts() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{secs}")
}

fn runtime_log_path() -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            return dir.join("voyager-runtime.log");
        }
    }

    std::env::temp_dir().join("voyager-runtime.log")
}

pub fn append_runtime_log(level: &str, message: impl Into<String>) {
    let line = RuntimeLogLine {
        timestamp: now_ts(),
        level: level.to_string(),
        message: message.into(),
    };

    if let Ok(mut guard) = logs().lock() {
        guard.push(line.clone());
        if guard.len() > 500 {
            let keep_from = guard.len().saturating_sub(500);
            guard.drain(0..keep_from);
        }
    }

    let path = runtime_log_path();
    if let Some(parent) = path.parent() {
        let _ = create_dir_all(parent);
    }
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(f, "[{}] {} {}", line.timestamp, line.level, line.message);
    }
}

pub fn list_runtime_logs(limit: usize) -> Vec<RuntimeLogLine> {
    let Ok(guard) = logs().lock() else {
        return Vec::new();
    };

    let count = if limit == 0 {
        guard.len()
    } else {
        guard.len().min(limit)
    };
    guard
        .iter()
        .rev()
        .take(count)
        .cloned()
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect()
}
