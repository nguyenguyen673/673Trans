//! Backup to the user's own Google Drive.
//!
//! - OAuth 2.0 "installed app" flow with PKCE: the system browser opens Google's consent page,
//!   Google redirects to a one-shot server on 127.0.0.1, we swap the code for tokens.
//! - Scope `drive.appdata`: the app can only see its own hidden app-data folder, never the
//!   user's other files.
//! - The OAuth client id/secret are the user's own (created in Google Cloud Console), nothing
//!   is shipped inside the app and nothing goes through any third-party server.
use crate::backup::{build_archive, restore_archive};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::RngCore;
use serde_json::Value;
use tauri::Manager;
use sha2::{Digest, Sha256};
use std::time::Duration;
use tiny_http::{Response, Server};

const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const SCOPE: &str = "https://www.googleapis.com/auth/drive.appdata";
const FILES_URL: &str = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_URL: &str = "https://www.googleapis.com/upload/drive/v3/files";

fn random_token(len: usize) -> String {
    let mut bytes = vec![0u8; len];
    rand::thread_rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn enc(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(b as char),
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}

fn query_param(url: &str, key: &str) -> Option<String> {
    let query = url.split_once('?')?.1;
    for pair in query.split('&') {
        if let Some((k, v)) = pair.split_once('=') {
            if k == key {
                // decode %XX and +
                let bytes = v.replace('+', " ").into_bytes();
                let mut out = Vec::new();
                let mut i = 0;
                while i < bytes.len() {
                    if bytes[i] == b'%' && i + 2 < bytes.len() {
                        if let Ok(h) = u8::from_str_radix(&String::from_utf8_lossy(&bytes[i + 1..i + 3]), 16) {
                            out.push(h);
                            i += 3;
                            continue;
                        }
                    }
                    out.push(bytes[i]);
                    i += 1;
                }
                return Some(String::from_utf8_lossy(&out).to_string());
            }
        }
    }
    None
}

async fn google_error(res: reqwest::Response) -> String {
    let status = res.status();
    let text = res.text().await.unwrap_or_default();
    let message = serde_json::from_str::<Value>(&text)
        .ok()
        .and_then(|v| {
            v["error_description"]
                .as_str()
                .or_else(|| v["error"]["message"].as_str())
                .or_else(|| v["error"].as_str())
                .map(|s| s.to_string())
        })
        .unwrap_or(text);
    format!("Google Drive ({}): {}", status.as_u16(), message)
}

/// Sign in with Google in the system browser. Returns the refresh token to keep in settings.
#[tauri::command(async)]
pub async fn gdrive_login(
    app_handle: tauri::AppHandle,
    client_id: String,
    client_secret: String,
) -> Result<String, String> {
    if client_id.trim().is_empty() || client_secret.trim().is_empty() {
        return Err("Hãy nhập Client ID và Client Secret trước".to_string());
    }
    let server = Server::http("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = server
        .server_addr()
        .to_ip()
        .map(|a| a.port())
        .ok_or_else(|| "Không mở được cổng nhận đăng nhập".to_string())?;
    let redirect = format!("http://127.0.0.1:{}", port);
    let verifier = random_token(48);
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let state = random_token(16);
    let url = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent&code_challenge={}&code_challenge_method=S256&state={}",
        AUTH_URL,
        enc(client_id.trim()),
        enc(&redirect),
        enc(SCOPE),
        challenge,
        state
    );
    tauri::api::shell::open(&app_handle.shell_scope(), url, None).map_err(|e| e.to_string())?;

    // Wait (max 3 minutes) for Google to redirect back to us
    let expected_state = state.clone();
    let code = tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let deadline = std::time::Instant::now() + Duration::from_secs(180);
        loop {
            let left = deadline.saturating_duration_since(std::time::Instant::now());
            if left.is_zero() {
                return Err("Hết thời gian chờ đăng nhập Google".to_string());
            }
            match server.recv_timeout(left.min(Duration::from_secs(2))) {
                Ok(Some(request)) => {
                    let url = request.url().to_string();
                    if !url.contains("code=") && !url.contains("error=") {
                        let _ = request.respond(Response::from_string("").with_status_code(404));
                        continue;
                    }
                    let ok_state = query_param(&url, "state").as_deref() == Some(expected_state.as_str());
                    let code = query_param(&url, "code");
                    let err = query_param(&url, "error");
                    let page = if ok_state && code.is_some() {
                        "Đăng nhập thành công. Bạn có thể đóng tab này và quay lại 673Trans."
                    } else {
                        "Đăng nhập không thành công. Hãy thử lại trong 673Trans."
                    };
                    let _ = request.respond(
                        Response::from_string(format!(
                            "<html><head><meta charset=\"utf-8\"></head><body style=\"font-family:sans-serif;padding:40px\">{}</body></html>",
                            page
                        ))
                        .with_header(
                            tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap(),
                        ),
                    );
                    if let Some(e) = err {
                        return Err(format!("Google từ chối đăng nhập: {}", e));
                    }
                    if !ok_state {
                        return Err("Phản hồi đăng nhập không hợp lệ (state)".to_string());
                    }
                    return code.ok_or_else(|| "Không nhận được mã đăng nhập".to_string());
                }
                Ok(None) => continue,
                Err(e) => return Err(e.to_string()),
            }
        }
    })
    .await
    .map_err(|e| e.to_string())??;

    let res = reqwest::Client::new()
        .post(TOKEN_URL)
        .form(&[
            ("client_id", client_id.trim()),
            ("client_secret", client_secret.trim()),
            ("code", code.as_str()),
            ("code_verifier", verifier.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect.as_str()),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(google_error(res).await);
    }
    let body: Value = res.json().await.map_err(|e| e.to_string())?;
    body["refresh_token"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Google không trả về refresh token, hãy thử đăng nhập lại".to_string())
}

async fn access_token(client_id: &str, client_secret: &str, refresh_token: &str) -> Result<String, String> {
    let res = reqwest::Client::new()
        .post(TOKEN_URL)
        .form(&[
            ("client_id", client_id.trim()),
            ("client_secret", client_secret.trim()),
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(google_error(res).await);
    }
    let body: Value = res.json().await.map_err(|e| e.to_string())?;
    body["access_token"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Không lấy được access token".to_string())
}

async fn find_id(client: &reqwest::Client, token: &str, name: &str) -> Result<String, String> {
    let q = format!("name = '{}' and trashed = false", name.replace('\\', "\\\\").replace('\'', "\\'"));
    let res = client
        .get(FILES_URL)
        .bearer_auth(token)
        .query(&[("spaces", "appDataFolder"), ("q", q.as_str()), ("fields", "files(id,name)")])
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(google_error(res).await);
    }
    let body: Value = res.json().await.map_err(|e| e.to_string())?;
    body["files"][0]["id"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Không tìm thấy bản sao lưu trên Google Drive".to_string())
}

/// operate: "list" | "put" | "get" | "delete". `list` returns a JSON array of file names.
#[tauri::command(async)]
pub async fn gdrive(
    operate: String,
    client_id: String,
    client_secret: String,
    refresh_token: String,
    name: Option<String>,
) -> Result<String, String> {
    let token = access_token(&client_id, &client_secret, &refresh_token).await?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;
    match operate.as_str() {
        "list" => {
            let res = client
                .get(FILES_URL)
                .bearer_auth(&token)
                .query(&[
                    ("spaces", "appDataFolder"),
                    ("fields", "files(id,name,createdTime)"),
                    ("orderBy", "createdTime desc"),
                    ("pageSize", "100"),
                ])
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !res.status().is_success() {
                return Err(google_error(res).await);
            }
            let body: Value = res.json().await.map_err(|e| e.to_string())?;
            let names: Vec<String> = body["files"]
                .as_array()
                .map(|a| a.iter().filter_map(|f| f["name"].as_str().map(|s| s.to_string())).collect())
                .unwrap_or_default();
            serde_json::to_string(&names).map_err(|e| e.to_string())
        }
        "put" => {
            let name = name.ok_or_else(|| "Thiếu tên file".to_string())?;
            let data = build_archive().map_err(|e| e.to_string())?;
            // multipart/related upload: JSON metadata part + zip bytes part
            let boundary = format!("673trans{}", random_token(12).replace(['-', '_'], "x"));
            let metadata = serde_json::json!({ "name": name, "parents": ["appDataFolder"] }).to_string();
            let mut body: Vec<u8> = Vec::new();
            body.extend_from_slice(
                format!("--{b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{m}\r\n--{b}\r\nContent-Type: application/zip\r\n\r\n", b = boundary, m = metadata).as_bytes(),
            );
            body.extend_from_slice(&data);
            body.extend_from_slice(format!("\r\n--{}--", boundary).as_bytes());
            let res = client
                .post(UPLOAD_URL)
                .bearer_auth(&token)
                .query(&[("uploadType", "multipart")])
                .header("Content-Type", format!("multipart/related; boundary={}", boundary))
                .body(body)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !res.status().is_success() {
                return Err(google_error(res).await);
            }
            Ok(String::new())
        }
        "get" => {
            let name = name.ok_or_else(|| "Thiếu tên file".to_string())?;
            let id = find_id(&client, &token, &name).await?;
            let res = client
                .get(format!("{}/{}", FILES_URL, id))
                .bearer_auth(&token)
                .query(&[("alt", "media")])
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !res.status().is_success() {
                return Err(google_error(res).await);
            }
            let data = res.bytes().await.map_err(|e| e.to_string())?;
            restore_archive(&data).map_err(|e| e.to_string())?;
            Ok(String::new())
        }
        "delete" => {
            let name = name.ok_or_else(|| "Thiếu tên file".to_string())?;
            let id = find_id(&client, &token, &name).await?;
            let res = client
                .delete(format!("{}/{}", FILES_URL, id))
                .bearer_auth(&token)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !res.status().is_success() {
                return Err(google_error(res).await);
            }
            Ok(String::new())
        }
        _ => Err(format!("Thao tác không hợp lệ: {}", operate)),
    }
}
