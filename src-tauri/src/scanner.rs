use crate::models::{ScanIndex, ScanIssue, ScanResult};
use crate::parser::extract_image_refs;
use crate::thumb_cache;
use anyhow::Result;
use rayon::prelude::*;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::UNIX_EPOCH;

/// Progress callback: (phase, current, total)
/// phase: "collecting" | "parsing" | "thumbnails"
pub type ProgressFn = Box<dyn Fn(&str, usize, usize) + Send + Sync>;

pub fn scan_vault_with_thumbs(
    root: &Path,
    generate_thumbs: bool,
    _thumb_size: u32,
    progress: Option<&ProgressFn>,
    prev_index: Option<&ScanIndex>,
) -> Result<ScanResult> {
    let mut result = scan_vault(root, progress, prev_index)?;

    if !generate_thumbs {
        return Ok(result);
    }

    let unique_paths: Vec<String> = {
        let mut seen = std::collections::HashSet::new();
        result
            .issues
            .iter()
            .filter(|i| i.r#type != "broken" && seen.insert(i.image_path.clone()))
            .map(|i| i.image_path.clone())
            .collect()
    };

    let total = unique_paths.len();
    let done = AtomicUsize::new(0);

    let results: Vec<(String, Option<thumb_cache::MultiThumbnailResult>)> = unique_paths
        .par_iter()
        .map(|path| {
            let multi = thumb_cache::generate_thumbnail_multi(path, thumb_cache::SIZES).ok();
            let completed = done.fetch_add(1, Ordering::Relaxed) + 1;
            if let Some(cb) = &progress {
                if completed % 50 == 0 || completed == total {
                    cb("thumbnails", completed, total);
                }
            }
            (path.clone(), multi)
        })
        .collect();

    let by_image_path: HashMap<String, Option<thumb_cache::MultiThumbnailResult>> =
        results.into_iter().collect();

    for issue in result.issues.iter_mut() {
        if let Some(Some(multi)) = by_image_path.get(&issue.image_path) {
            issue.thumbnail_path = multi.thumbnail_paths.get("small").cloned();
            issue.thumbnail_paths = Some(multi.thumbnail_paths.clone());
        }
    }

    Ok(result)
}

pub fn scan_vault(
    root: &Path,
    progress: Option<&ProgressFn>,
    prev_index: Option<&ScanIndex>,
) -> Result<ScanResult> {
    if !root.exists() {
        anyhow::bail!("vault root does not exist")
    }
    if root.symlink_metadata()?.file_type().is_symlink() {
        anyhow::bail!("vault root cannot be a symlink")
    }

    let mut md_files = Vec::new();
    let mut image_files = Vec::new();
    collect_files(root, md_files.as_mut(), image_files.as_mut())?;

    if let Some(cb) = &progress {
        cb("collecting", md_files.len(), image_files.len());
    }

    // --- Parallel MD parsing phase (Rayon) ---
    let md_total = md_files.len();
    let md_done = AtomicUsize::new(0);

    let parsed: Vec<(String, u64, Vec<String>)> = md_files
        .par_iter()
        .map(|md| {
            let md_key = md.to_string_lossy().to_string();
            let current_mtime = fs::metadata(md)
                .and_then(|m| m.modified())
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);

            let refs: Vec<String> = if let Some(prev) = prev_index {
                if let Some(&prev_mtime) = prev.files.get(&md_key) {
                    if prev_mtime == current_mtime {
                        if let Some(cached_refs) = prev.md_refs.get(&md_key) {
                            cached_refs.clone()
                        } else {
                            fs::read_to_string(md)
                                .map(|content| extract_image_refs(&content))
                                .unwrap_or_default()
                        }
                    } else {
                        fs::read_to_string(md)
                            .map(|content| extract_image_refs(&content))
                            .unwrap_or_default()
                    }
                } else {
                    fs::read_to_string(md)
                        .map(|content| extract_image_refs(&content))
                        .unwrap_or_default()
                }
            } else {
                fs::read_to_string(md)
                    .map(|content| extract_image_refs(&content))
                    .unwrap_or_default()
            };

            let completed = md_done.fetch_add(1, Ordering::Relaxed) + 1;
            if let Some(cb) = &progress {
                if completed % 100 == 0 || completed == md_total {
                    cb("parsing", completed, md_total);
                }
            }

            (md_key, current_mtime, refs)
        })
        .collect();

    // Sequential merge phase
    let mut referenced_filenames = HashSet::new();
    let mut references: Vec<(PathBuf, String)> = Vec::new();
    let mut new_md_refs: HashMap<String, Vec<String>> = HashMap::new();

    for (i, (md_key, _mtime, refs)) in parsed.iter().enumerate() {
        let md_path = &md_files[i];
        for name in refs {
            referenced_filenames.insert(name.clone());
            references.push((md_path.clone(), name.clone()));
        }
        new_md_refs.insert(md_key.clone(), refs.clone());
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
                    thumbnail_paths: None,
                    file_size: fs::metadata(img).map(|m| m.len()).ok(),
                    file_mtime: fs::metadata(img)
                        .and_then(|m| m.modified())
                        .ok()
                        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                        .map(|d| d.as_secs()),
                });
            }
        }
    }

    let mut broken_idx = 0usize;
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
                        thumbnail_paths: None,
                        file_size: fs::metadata(found).map(|m| m.len()).ok(),
                        file_mtime: fs::metadata(found)
                            .and_then(|m| m.modified())
                            .ok()
                            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                            .map(|d| d.as_secs()),
                    });
                }
            }
        } else {
            // Broken link: MD references an image that doesn't exist on disk
            // Skip broken detection for MD files inside .trash (Obsidian recycle bin)
            if !is_trash_markdown(md_path) {
                issues.push(ScanIssue {
                    id: format!("broken-{broken_idx}"),
                    r#type: "broken".to_string(),
                    md_path: Some(md_path.to_string_lossy().to_string()),
                    image_path: filename.clone(),
                    reason: "referenced image file does not exist on disk".to_string(),
                    suggested_target: None,
                    thumbnail_path: None,
                    thumbnail_paths: None,
                    file_size: None,
                    file_mtime: None,
                });
                broken_idx += 1;
            }
        }
    }

    // Build new ScanIndex — reuse mtimes from parallel parse phase
    let mut file_mtimes: HashMap<String, u64> = HashMap::new();
    for (md_key, mtime, _) in &parsed {
        file_mtimes.insert(md_key.clone(), *mtime);
    }
    for img in &image_files {
        let key = img.to_string_lossy().to_string();
        let mtime = fs::metadata(img)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);
        file_mtimes.insert(key, mtime);
    }

    let all_images: Vec<crate::models::AttachmentInfo> = image_files
        .iter()
        .map(|img| {
            let meta = fs::metadata(img).ok();
            crate::models::AttachmentInfo {
                path: img.to_string_lossy().to_string(),
                file_name: img
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string(),
                file_size: meta.as_ref().map(|m| m.len()).unwrap_or(0),
                file_mtime: meta
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0),
            }
        })
        .collect();

    Ok(ScanResult {
        total_md: md_files.len(),
        total_images: image_files.len(),
        issues,
        scan_index: ScanIndex {
            files: file_mtimes,
            md_refs: new_md_refs,
        },
        all_images,
    })
}

fn collect_files(
    root: &Path,
    md_files: &mut Vec<PathBuf>,
    image_files: &mut Vec<PathBuf>,
) -> Result<()> {
    for entry in fs::read_dir(root)? {
        let entry = entry?;
        let path = entry.path();
        let file_type = entry.file_type()?;

        if file_type.is_symlink() {
            continue;
        }

        if file_type.is_dir() {
            if should_skip_dir(&path) {
                continue;
            }
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

fn should_skip_dir(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| matches!(name, ".git" | "node_modules" | ".worktrees"))
        .unwrap_or(false)
}

fn path_has_attachments_segment(path: &Path) -> bool {
    path.components().any(|c| c.as_os_str() == "attachments")
}

fn is_trash_markdown(path: &Path) -> bool {
    let lower = path.to_string_lossy().to_ascii_lowercase();
    lower.contains("/.trash/")
        || lower.contains("\\.trash\\")
        || lower.contains("/trash/")
        || lower.contains("\\trash\\")
}

pub fn is_image_ext(path: &Path) -> bool {
    is_image(path)
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
    #[cfg(unix)]
    use std::os::unix::fs::symlink;
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

        let result = scan_vault(&root, None, None).unwrap();

        assert!(result.issues.iter().any(|i| i.r#type == "misplaced"));
        assert!(result.issues.iter().any(|i| i.r#type == "orphan"));

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn ignores_known_workspace_directories() {
        let root = temp_dir();
        let visible_dir = root.join("notes/attachments");
        let hidden_dir = root.join(".worktrees/tmp/attachments");

        fs::create_dir_all(&visible_dir).unwrap();
        fs::create_dir_all(&hidden_dir).unwrap();
        fs::write(visible_dir.join("visible.png"), b"v").unwrap();
        fs::write(hidden_dir.join("hidden.png"), b"h").unwrap();

        let result = scan_vault(&root, None, None).unwrap();

        assert_eq!(result.total_images, 1);
        assert!(result
            .all_images
            .iter()
            .all(|img| !img.path.contains(".worktrees")));
        fs::remove_dir_all(&root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn ignores_symlinked_directories() {
        let root = temp_dir();
        let external = temp_dir();
        let external_attachments = external.join("attachments");
        fs::create_dir_all(&external_attachments).unwrap();
        fs::write(external_attachments.join("hidden.png"), b"h").unwrap();
        symlink(&external_attachments, root.join("attachments")).unwrap();

        let result = scan_vault(&root, None, None).unwrap();

        assert_eq!(result.total_images, 0);
        fs::remove_dir_all(&root).unwrap();
        fs::remove_dir_all(&external).unwrap();
    }
}
