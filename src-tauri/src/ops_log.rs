use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ConflictPolicy {
    PromptEach,
    OverwriteAll,
    RenameAll,
}

impl Default for ConflictPolicy {
    fn default() -> Self {
        Self::RenameAll
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum EntryStatus {
    Applied,
    Failed,
    Skipped,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum TaskStatus {
    Applied,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationEntry {
    pub entry_id: String,
    pub file_path: String,
    pub action: String,
    pub source: String,
    pub target: String,
    pub status: EntryStatus,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationTask {
    pub task_id: String,
    pub task_type: String,
    pub created_at: String,
    pub policy: ConflictPolicy,
    pub status: TaskStatus,
    pub entries: Vec<OperationEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixAction {
    pub source: String,
    pub target: String,
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpsRecord {
    pub source: String,
    pub target: String,
    pub action: String,
    pub status: String,
}

static TASKS: OnceLock<Mutex<Vec<OperationTask>>> = OnceLock::new();
static ID_COUNTER: AtomicU64 = AtomicU64::new(1);

fn tasks() -> &'static Mutex<Vec<OperationTask>> {
    TASKS.get_or_init(|| Mutex::new(Vec::new()))
}

fn ops_history_path() -> std::path::PathBuf {
    let exe = std::env::current_exe().unwrap_or_default();
    let exe_dir = exe.parent().unwrap_or(std::path::Path::new("."));
    exe_dir.join("voyager-data").join("ops-history.json")
}

pub fn load_from_disk() {
    let path = ops_history_path();
    if !path.exists() { return; }
    let Ok(content) = std::fs::read_to_string(&path) else { return };
    let Ok(tasks_from_disk) = serde_json::from_str::<Vec<OperationTask>>(&content) else { return };
    if let Ok(mut guard) = tasks().lock() {
        *guard = tasks_from_disk;
        if guard.len() > 200 {
            let keep_from = guard.len().saturating_sub(200);
            guard.drain(0..keep_from);
        }
    }
}

fn save_to_disk(guard: &[OperationTask]) {
    let path = ops_history_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string(guard) {
        let _ = std::fs::write(&path, json);
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

pub fn next_id(prefix: &str) -> String {
    let n = ID_COUNTER.fetch_add(1, Ordering::SeqCst);
    format!("{prefix}-{}-{n}", now_secs())
}

pub fn create_task(task_type: &str, policy: ConflictPolicy) -> OperationTask {
    OperationTask {
        task_id: next_id("task"),
        task_type: task_type.to_string(),
        created_at: now_secs().to_string(),
        policy,
        status: TaskStatus::Applied,
        entries: Vec::new(),
    }
}

pub fn save_task(task: OperationTask) {
    if let Ok(mut guard) = tasks().lock() {
        guard.push(task);
        if guard.len() > 200 {
            let keep_from = guard.len().saturating_sub(200);
            guard.drain(0..keep_from);
        }
        save_to_disk(&guard);
    }
}

pub fn list_tasks() -> Vec<OperationTask> {
    let Ok(guard) = tasks().lock() else {
        return Vec::new();
    };
    guard.clone()
}

pub fn get_task(task_id: &str) -> Option<OperationTask> {
    let Ok(guard) = tasks().lock() else {
        return None;
    };
    guard.iter().find(|t| t.task_id == task_id).cloned()
}

#[cfg(test)]
mod tests {
    use super::ConflictPolicy;

    #[test]
    fn default_conflict_policy_is_rename_all() {
        let policy = ConflictPolicy::default();
        assert!(matches!(policy, ConflictPolicy::RenameAll));
    }
}
