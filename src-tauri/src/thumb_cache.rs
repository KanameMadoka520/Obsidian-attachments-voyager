use anyhow::Result;
use image::imageops::FilterType;
use image::{DynamicImage, ImageFormat};
use serde::Serialize;
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThumbnailResult {
    pub original_path: String,
    pub thumbnail_path: String,
    pub generated: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MultiThumbnailResult {
    pub original_path: String,
    pub thumbnail_paths: HashMap<String, String>,
    pub generated_count: usize,
}

pub const SIZES: &[(&str, u32)] = &[("tiny", 64), ("small", 256), ("medium", 1024)];

fn exe_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|x| x.to_path_buf()))
        .unwrap_or_else(|| std::env::temp_dir())
}

fn cache_dir() -> PathBuf {
    exe_dir().join(".voyager-gallery-cache")
}

fn cache_dir_for_size(label: &str) -> PathBuf {
    cache_dir().join(label)
}

fn hashed_name(path: &str) -> String {
    let mut hasher = DefaultHasher::new();
    path.hash(&mut hasher);
    format!("{:x}.webp", hasher.finish())
}

pub fn cache_root_path_string() -> String {
    cache_dir().to_string_lossy().to_string()
}

pub fn clear_cache() -> Result<usize> {
    let root = cache_dir();
    if !root.exists() {
        return Ok(0);
    }

    let mut count = 0usize;

    // Clear subdirectories (tiny/small/medium)
    for (label, _) in SIZES {
        let dir = root.join(label);
        if dir.exists() && dir.is_dir() {
            for entry in fs::read_dir(&dir)? {
                let entry = entry?;
                if entry.path().is_file() {
                    fs::remove_file(entry.path())?;
                    count += 1;
                }
            }
        }
    }

    // Also clean legacy flat files in root
    for entry in fs::read_dir(&root)? {
        let entry = entry?;
        if entry.path().is_file() {
            fs::remove_file(entry.path())?;
            count += 1;
        }
    }

    Ok(count)
}

pub fn generate_thumbnail(original_path: &str, max_edge: u32) -> Result<ThumbnailResult> {
    let original = Path::new(original_path);
    if !original.exists() {
        anyhow::bail!("无法找到该文件，请自行检查");
    }

    let root = cache_dir();
    fs::create_dir_all(&root)?;

    let filename = hashed_name(original_path);
    let thumb_path = root.join(&filename);

    if thumb_path.exists() {
        return Ok(ThumbnailResult {
            original_path: original_path.to_string(),
            thumbnail_path: thumb_path.to_string_lossy().to_string(),
            generated: false,
        });
    }

    let img = image::open(original)?;
    let thumb = img.resize(max_edge, max_edge, FilterType::Triangle);
    thumb.save_with_format(&thumb_path, ImageFormat::WebP)?;

    Ok(ThumbnailResult {
        original_path: original_path.to_string(),
        thumbnail_path: thumb_path.to_string_lossy().to_string(),
        generated: true,
    })
}

pub fn generate_thumbnail_multi(original_path: &str, sizes: &[(&str, u32)]) -> Result<MultiThumbnailResult> {
    let original = Path::new(original_path);
    if !original.exists() {
        anyhow::bail!("无法找到该文件，请自行检查");
    }

    let filename = hashed_name(original_path);

    // Check if all sizes already cached
    let mut all_cached = true;
    let mut paths: HashMap<String, String> = HashMap::new();

    for (label, _) in sizes {
        let dir = cache_dir_for_size(label);
        let thumb_path = dir.join(&filename);
        if thumb_path.exists() {
            paths.insert(label.to_string(), thumb_path.to_string_lossy().to_string());
        } else {
            all_cached = false;
        }
    }

    if all_cached && paths.len() == sizes.len() {
        return Ok(MultiThumbnailResult {
            original_path: original_path.to_string(),
            thumbnail_paths: paths,
            generated_count: 0,
        });
    }

    // Open image once; cascade from largest to smallest so each smaller
    // thumbnail is resized from the previous larger one, not the original.
    let img = image::open(original)?;
    let mut generated_count = 0usize;

    // Process sizes from largest to smallest for cascade resizing
    let mut sizes_desc: Vec<(&str, u32)> = sizes.to_vec();
    sizes_desc.sort_by(|a, b| b.1.cmp(&a.1));

    let mut prev_thumb: Option<DynamicImage> = None;

    for (label, max_edge) in &sizes_desc {
        let dir = cache_dir_for_size(label);
        let thumb_path = dir.join(&filename);

        if thumb_path.exists() {
            paths.insert(label.to_string(), thumb_path.to_string_lossy().to_string());
            // Load existing thumb to maintain the cascade chain
            prev_thumb = Some(image::open(&thumb_path)?);
            continue;
        }

        fs::create_dir_all(&dir)?;
        let source = prev_thumb.as_ref().unwrap_or(&img);
        let thumb = source.resize(*max_edge, *max_edge, FilterType::Triangle);
        thumb.save_with_format(&thumb_path, ImageFormat::WebP)?;
        paths.insert(label.to_string(), thumb_path.to_string_lossy().to_string());
        prev_thumb = Some(thumb);
        generated_count += 1;
    }

    Ok(MultiThumbnailResult {
        original_path: original_path.to_string(),
        thumbnail_paths: paths,
        generated_count,
    })
}
