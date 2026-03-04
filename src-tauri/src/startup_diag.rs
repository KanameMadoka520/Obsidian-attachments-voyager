use std::env;
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

fn build_mode() -> &'static str {
    if cfg!(debug_assertions) {
        "debug"
    } else {
        "release"
    }
}

fn probe_candidates(current_exe: &Path, current_dir: &Path) -> Vec<PathBuf> {
    let exe_dir = current_exe.parent().unwrap_or(current_dir);

    vec![
        exe_dir.join("resources"),
        exe_dir.join("dist"),
        exe_dir.join("dist").join("index.html"),
        current_dir.join("resources"),
        current_dir.join("dist"),
        current_dir.join("dist").join("index.html"),
    ]
}

fn format_report(mode: &str, current_exe: &Path, current_dir: &Path, probes: &[PathBuf]) -> String {
    let mut lines = vec![
        "[obsidian-attachments-voyager startup diagnostics]".to_string(),
        format!("mode={mode}"),
        format!("current_exe={}", current_exe.display()),
        format!("current_dir={}", current_dir.display()),
    ];

    for probe in probes {
        lines.push(format!(
            "probe={} exists={}",
            probe.display(),
            probe.exists()
        ));
    }

    lines.join("\n")
}

fn diagnostics_file_path() -> PathBuf {
    let dir = env::temp_dir().join("obsidian-attachments-voyager");
    if !dir.exists() {
        let _ = create_dir_all(&dir);
    }
    dir.join("startup-diagnostics.log")
}

pub fn collect_startup_report() -> String {
    let current_exe = env::current_exe().unwrap_or_else(|_| PathBuf::from("<unavailable>"));
    let current_dir = env::current_dir().unwrap_or_else(|_| PathBuf::from("<unavailable>"));
    let probes = probe_candidates(&current_exe, &current_dir);

    format_report(build_mode(), &current_exe, &current_dir, &probes)
}

pub fn write_startup_report(report: &str) {
    let path = diagnostics_file_path();
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{}\n---", report);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn report_contains_mode_and_paths() {
        let exe = PathBuf::from("C:/app/app.exe");
        let cwd = PathBuf::from("C:/app");
        let probes = vec![PathBuf::from("C:/app/resources"), PathBuf::from("C:/app/dist/index.html")];

        let report = format_report("release", &exe, &cwd, &probes);

        assert!(report.contains("mode=release"));
        assert!(report.contains("current_exe=C:/app/app.exe"));
        assert!(report.contains("probe=C:/app/resources"));
    }
}
