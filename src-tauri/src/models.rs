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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub total_md: usize,
    pub total_images: usize,
    pub issues: Vec<ScanIssue>,
}
