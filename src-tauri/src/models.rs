use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateFile {
    pub abs_path: String,
    pub file_size: u64,
    pub ref_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateGroup {
    pub hash: String,
    pub files: Vec<DuplicateFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeSummary {
    pub updated_mds: usize,
    pub deleted_files: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertSummary {
    pub converted: usize,
    pub skipped: usize,
    pub saved_bytes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanIssue {
    pub id: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub md_path: Option<String>,
    pub image_path: String,
    pub reason: String,
    pub suggested_target: Option<String>,
    pub thumbnail_path: Option<String>,
    pub thumbnail_paths: Option<HashMap<String, String>>,
    pub file_size: Option<u64>,
    pub file_mtime: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ScanIndex {
    pub files: HashMap<String, u64>,
    pub md_refs: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentInfo {
    pub path: String,
    pub file_name: String,
    pub file_size: u64,
    pub file_mtime: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub total_md: usize,
    pub total_images: usize,
    pub issues: Vec<ScanIssue>,
    pub scan_index: ScanIndex,
    pub all_images: Vec<AttachmentInfo>,
}
