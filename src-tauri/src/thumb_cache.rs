use anyhow::Result;
use image::imageops::FilterType;
use image::ImageFormat;
use serde::Serialize;
use std::collections::hash_map::DefaultHasher;
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

fn exe_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|x| x.to_path_buf()))
        .unwrap_or_else(|| std::env::temp_dir())
}

fn cache_dir() -> PathBuf {
    exe_dir().join(".voyager-gallery-cache")
}

fn hashed_name(path: &str) -> String {
    let mut hasher = DefaultHasher::new();
    path.hash(&mut hasher);
    format!("{:x}.png", hasher.finish())
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
    let thumb_path = root.join(filename);

    if thumb_path.exists() {
        return Ok(ThumbnailResult {
            original_path: original_path.to_string(),
            thumbnail_path: thumb_path.to_string_lossy().to_string(),
            generated: false,
        });
    }

    let img = image::open(original)?;
    let thumb = img.resize(max_edge, max_edge, FilterType::Triangle);
    thumb.save_with_format(&thumb_path, ImageFormat::Png)?;

    Ok(ThumbnailResult {
        original_path: original_path.to_string(),
        thumbnail_path: thumb_path.to_string_lossy().to_string(),
        generated: true,
    })
}
