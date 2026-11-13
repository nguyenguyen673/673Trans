//! Self-update from GitHub Releases (nguyenguyen673/673Trans).
//!
//! Flow: `check_github_update` reads the latest release, compares its tag with the
//! running version; `install_github_update` downloads the release's .exe, swaps it
//! in place of the running exe (Windows lets a running exe be renamed, not
//! overwritten) and restarts the app. Needs no signing keys.
use crate::config::{get, set};
use crate::window::updater_window;
use log::{info, warn};
use serde::Serialize;
use tauri::Manager;

const REPO: &str = "nguyenguyen673/673Trans";

#[derive(Serialize, Clone)]
pub struct UpdateInfo {
    version: String,
    notes: String,
    url: String,
    size: u64,
    sha256: String,
}

fn parse_version(v: &str) -> Vec<u64> {
    v.trim_start_matches(|c| c == 'v' || c == 'V')
        .split('.')
        .map(|p| p.chars().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(0))
        .collect()
}

fn is_newer(latest: &str, current: &str) -> bool {
    let (a, b) = (parse_version(latest), parse_version(current));
    for i in 0..a.len().max(b.len()) {
        let (x, y) = (a.get(i).copied().unwrap_or(0), b.get(i).copied().unwrap_or(0));
        if x != y {
            return x > y;
        }
    }
    false
}

async fn latest_release(current: &str) -> Result<Option<UpdateInfo>, String> {
    let client = reqwest::Client::builder()
        .user_agent("673Trans-updater")
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;
    let response = client
        .get(format!("https://api.github.com/repos/{}/releases/latest", REPO))
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("Không kết nối được GitHub: {}", e))?;
    // 404 = the repo has no published release yet: nothing to update to
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }
    let release: serde_json::Value = response
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let tag = release["tag_name"].as_str().unwrap_or_default().to_string();
    if tag.is_empty() || !is_newer(&tag, current) {
        return Ok(None);
    }
    let asset = release["assets"]
        .as_array()
        .and_then(|list| {
            list.iter()
                .find(|a| a["name"].as_str().map_or(false, |n| n.to_lowercase().ends_with(".exe")))
        })
        .ok_or_else(|| "Bản phát hành mới không có file .exe".to_string())?;
    Ok(Some(UpdateInfo {
        version: tag.trim_start_matches('v').to_string(),
        notes: release["body"].as_str().unwrap_or_default().to_string(),
        url: asset["browser_download_url"].as_str().unwrap_or_default().to_string(),
        size: asset["size"].as_u64().unwrap_or(0),
        // GitHub publishes "sha256:<hex>" for every release asset
        sha256: asset["digest"]
            .as_str()
            .and_then(|d| d.strip_prefix("sha256:"))
            .unwrap_or_default()
            .to_lowercase(),
    }))
}

/// Startup check (when "check_update" is on): opens the updater window if a newer release exists.
pub fn check_update(app_handle: tauri::AppHandle) {
    // The old exe left behind by the last self-update
    if let Ok(exe) = std::env::current_exe() {
        let _ = std::fs::remove_file(exe.with_extension("exe.old"));
    }
    let enable = match get("check_update") {
        Some(v) => v.as_bool().unwrap_or(true),
        None => {
            set("check_update", true);
            true
        }
    };
    if !enable {
        return;
    }
    tauri::async_runtime::spawn(async move {
        let current = app_handle.package_info().version.to_string();
        match latest_release(&current).await {
            Ok(Some(info)) => {
                info!("New version available: {}", info.version);
                updater_window();
            }
            Ok(None) => {}
            Err(e) => warn!("Failed to check update: {}", e),
        }
    });
}

#[tauri::command(async)]
pub async fn check_github_update(app_handle: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    let current = app_handle.package_info().version.to_string();
    latest_release(&current).await
}

#[tauri::command(async)]
pub async fn install_github_update(app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    // Never trust the address coming from the UI: it must be a release asset of this repo,
    // and must be the one GitHub currently lists for the latest release.
    let prefix = format!("https://github.com/{}/releases/download/", REPO);
    if !url.starts_with(&prefix) || url.contains("..") {
        return Err("Địa chỉ tải không hợp lệ".to_string());
    }
    let current = app_handle.package_info().version.to_string();
    let info = latest_release(&current)
        .await?
        .ok_or_else(|| "Không có bản mới".to_string())?;
    if info.url != url {
        return Err("Địa chỉ tải không khớp với bản phát hành mới nhất".to_string());
    }
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let new_path = exe.with_extension("exe.new");
    let old_path = exe.with_extension("exe.old");

    let client = reqwest::Client::builder()
        .user_agent("673Trans-updater")
        .build()
        .map_err(|e| e.to_string())?;
    let mut res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;
    let total = res.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut data: Vec<u8> = Vec::with_capacity(total as usize);
    while let Some(chunk) = res.chunk().await.map_err(|e| e.to_string())? {
        downloaded += chunk.len() as u64;
        data.extend_from_slice(&chunk);
        let _ = app_handle.emit_all("update_progress", (downloaded, total));
    }
    // A real exe starts with "MZ"; anything else is an error page
    if data.len() < 1_000_000 || &data[..2] != b"MZ" {
        return Err("File tải về không phải bản cài hợp lệ".to_string());
    }
    // Integrity check against the SHA-256 GitHub lists for this asset
    if !info.sha256.is_empty() {
        use sha2::{Digest, Sha256};
        let got = Sha256::digest(&data)
            .iter()
            .map(|b| format!("{:02x}", b))
            .collect::<String>();
        if got != info.sha256 {
            return Err("Mã SHA-256 của file tải về không khớp, đã huỷ cập nhật".to_string());
        }
    } else {
        warn!("Release asset has no SHA-256 digest, skipping hash check");
    }
    std::fs::write(&new_path, &data).map_err(|e| e.to_string())?;

    let _ = std::fs::remove_file(&old_path);
    std::fs::rename(&exe, &old_path).map_err(|e| e.to_string())?;
    if let Err(e) = std::fs::rename(&new_path, &exe) {
        let _ = std::fs::rename(&old_path, &exe); // put the old one back
        return Err(e.to_string());
    }

    // Restart after this process exits (single-instance would block an immediate start)
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("cmd")
            .args(["/C", "ping -n 3 127.0.0.1 >nul & start \"\" \""])
            .raw_arg(format!("{}\"", exe.display()))
            .creation_flags(0x08000000)
            .spawn();
    }
    #[cfg(not(windows))]
    {
        let _ = std::process::Command::new(&exe).spawn();
    }
    app_handle.exit(0);
    Ok(())
}
