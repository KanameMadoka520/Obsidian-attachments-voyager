use crate::models::{ScanIssue, ScanResult};
use crate::parser::extract_image_refs;
use crate::thumb_cache;
use anyhow::Result;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

pub fn scan_vault_with_thumbs(root: &Path, generate_thumbs: bool, thumb_size: u32) -> Result<ScanResult> {
    let mut result = scan_vault(root)?;

    if !generate_thumbs {
        return Ok(result);
    }

    let mut by_image_path: HashMap<String, Option<String>> = HashMap::new();

    for issue in result.issues.iter() {
        if by_image_path.contains_key(&issue.image_path) {
            continue;
        }

        let thumb = thumb_cache::generate_thumbnail(&issue.image_path, thumb_size)
            .ok()
            .map(|gen| gen.thumbnail_path);
        by_image_path.insert(issue.image_path.clone(), thumb);
    }

    for issue in result.issues.iter_mut() {
        if let Some(p) = by_image_path.get(&issue.image_path) {
            issue.thumbnail_path = p.clone();
        }
    }

    Ok(result)
}

pub fn scan_vault(root: &Path) -> Result<ScanResult> {
    let mut md_files = Vec::new();
    let mut image_files = Vec::new();
    collect_files(root, &mut md_files, &mut image_files)?;

    let mut referenced_filenames = HashSet::new();
    let mut references: Vec<(PathBuf, String)> = Vec::new();

    for md in &md_files {
        let content = fs::read_to_string(md)?;
        for name in extract_image_refs(&content) {
            referenced_filenames.insert(name.clone());
            references.push((md.clone(), name));
        }
    }

    let mut by_filename: HashMap<String, Vec<PathBuf>> = HashMap::new();
    for img in &image_files {
        if let Some(name) = img.file_name().and_then(|n| n.to_str()) {
            by_filename
                .entry(name.to_string())
                .or_default()
                .push(img.clone());
        }
    }

    let mut issues = Vec::new();

    for (idx, img) in image_files.iter().enumerate() {
        if let Some(name) = img.file_name().and_then(|n| n.to_str()) {
            if !referenced_filenames.contains(name) {
                issues.push(ScanIssue {
                    id: format!("orphan-{idx}"),
                    r#type: "orphan".to_string(),
                    md_path: None,
                    image_path: img.to_string_lossy().to_string(),
                    reason: "image exists under attachments but is not referenced".to_string(),
                    suggested_target: None,
                    thumbnail_path: None,
                });
            }
        }
    }

    for (idx, (md_path, filename)) in references.iter().enumerate() {
        if let Some(candidates) = by_filename.get(filename) {
            if let Some(found) = candidates.first() {
                let expected = md_path
                    .parent()
                    .unwrap_or(root)
                    .join("attachments")
                    .join(filename);
                if *found != expected {
                    let reason = if is_trash_markdown(md_path) {
                        "Markdown 文档已在 trash 中".to_string()
                    } else {
                        "referenced image is not in md_dir/attachments".to_string()
                    };
                    issues.push(ScanIssue {
                        id: format!("misplaced-{idx}"),
                        r#type: "misplaced".to_string(),
                        md_path: Some(md_path.to_string_lossy().to_string()),
                        image_path: found.to_string_lossy().to_string(),
                        reason,
                        suggested_target: Some(expected.to_string_lossy().to_string()),
                        thumbnail_path: None,
                    });
                }
            }
        }
    }

    Ok(ScanResult {
        total_md: md_files.len(),
        total_images: image_files.len(),
        issues,
    })
}

fn collect_files(root: &Path, md_files: &mut Vec<PathBuf>, image_files: &mut Vec<PathBuf>) -> Result<()> {
    for entry in fs::read_dir(root)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            collect_files(&path, md_files, image_files)?;
            continue;
        }

        if path.extension().and_then(|s| s.to_str()) == Some("md") {
            md_files.push(path.clone());
            continue;
        }

        if is_image(&path) && path_has_attachments_segment(&path) {
            image_files.push(path);
        }
    }

    Ok(())
}

fn path_has_attachments_segment(path: &Path) -> bool {
    path.components().any(|c| c.as_os_str() == "attachments")
}

fn is_trash_markdown(path: &Path) -> bool {
    let lower = path.to_string_lossy().to_ascii_lowercase();
    lower.contains("/.trash/") || lower.contains("\\.trash\\") || lower.contains("/trash/") || lower.contains("\\trash\\")
}

fn is_image(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|s| s.to_str()).map(|s| s.to_ascii_lowercase()),
        Some(ext) if matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp" | "svg")
    )
}

#[cfg(test)]
mod tests {
    use super::scan_vault;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("voyager-scanner-{nanos}"));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn detects_orphan_and_misplaced_images() {
        let root = temp_dir();
        let note_dir = root.join("notes");
        let wrong_dir = root.join("other/attachments");
        let right_dir = note_dir.join("attachments");

        fs::create_dir_all(&note_dir).unwrap();
        fs::create_dir_all(&wrong_dir).unwrap();
        fs::create_dir_all(&right_dir).unwrap();

        fs::write(note_dir.join("note.md"), "![[x.png]]\n").unwrap();
        fs::write(wrong_dir.join("x.png"), b"x").unwrap();
        fs::write(right_dir.join("orphan.png"), b"o").unwrap();

        let result = scan_vault(&root).unwrap();

        assert!(result.issues.iter().any(|i| i.r#type == "misplaced"));
        assert!(result.issues.iter().any(|i| i.r#type == "orphan"));

        fs::remove_dir_all(&root).unwrap();
    }
}
