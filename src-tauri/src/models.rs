use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
pub struct ScanResult {
    pub total_md: usize,
    pub total_images: usize,
    pub issues: Vec<ScanIssue>,
    pub scan_index: ScanIndex,
}
