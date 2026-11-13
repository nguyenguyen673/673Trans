use crate::config::{get, set};
use crate::window::*;
use log::{info, warn};
use std::thread;
use tauri::api::notification;
use tiny_http::{Request, Response, Server};

pub fn start_server() {
    let port = match get("server_port") {
        Some(v) => v.as_i64().unwrap(),
        None => {
            set("server_port", 60828);
            60828
        }
    };
    thread::spawn(move || {
        let server = match Server::http(format!("127.0.0.1:{port}")) {
            Ok(v) => v,
            Err(e) => {
                let _ = notification::Notification::new("com.pot-app.desktop")
                    .title("Server start failed")
                    .body("Please Change Server Port and restart the application")
                    .show();
                warn!("Server start failed: {}", e);
                return;
            }
        };
        for request in server.incoming_requests() {
            http_handle(request, port);
        }
    });
}

/// Only local programs may call this API: a web page opened in the browser must not be
/// able to trigger it (cross-site requests, DNS rebinding). Optional shared secret:
/// set `server_token` in config.json and send it as the `X-Token` header.
fn is_allowed(request: &Request, port: i64) -> bool {
    let header = |name: &str| {
        request
            .headers()
            .iter()
            .find(|h| h.field.equiv(name))
            .map(|h| h.value.as_str().to_string())
    };
    // Browsers always attach Origin to cross-origin POSTs and Sec-Fetch-Site to fetches
    if header("Origin").is_some() {
        return false;
    }
    if let Some(site) = header("Sec-Fetch-Site") {
        if site != "none" {
            return false;
        }
    }
    let host_ok = match header("Host") {
        Some(h) => h == format!("127.0.0.1:{port}") || h == format!("localhost:{port}"),
        None => false,
    };
    if !host_ok {
        return false;
    }
    if let Some(token) = get("server_token").and_then(|v| v.as_str().map(|s| s.to_string())) {
        if !token.is_empty() && header("X-Token").as_deref() != Some(token.as_str()) {
            return false;
        }
    }
    true
}

fn http_handle(request: Request, port: i64) {
    if !is_allowed(&request, port) {
        warn!("Rejected request {} (not a local client)", request.url());
        let _ = request.respond(Response::from_string("forbidden").with_status_code(403));
        return;
    }
    info!("Handle {} request", request.url());
    match request.url() {
        "/" => handle_translate(request),
        "/config" => handle_config(request),
        "/translate" => handle_translate(request),
        "/selection_translate" => handle_selection_translate(request),
        "/input_translate" => handle_input_translate(request),
        "/ocr_recognize" => handle_ocr_recognize(request),
        "/ocr_translate" => handle_ocr_translate(request),
        "/ocr_recognize?screenshot=false" => handle_ocr_recognize(request),
        "/ocr_translate?screenshot=false" => handle_ocr_translate(request),
        "/ocr_recognize?screenshot=true" => handle_ocr_recognize(request),
        "/ocr_translate?screenshot=true" => handle_ocr_translate(request),
        _ => warn!("Unknown request url: {}", request.url()),
    }
}

fn handle_config(request: Request) {
    config_window();
    response_ok(request);
}

fn handle_translate(mut request: Request) {
    use std::io::Read;
    let mut content = String::new();
    // Cap the body at 1 MB
    if request.as_reader().take(1_000_000).read_to_string(&mut content).is_err() {
        let _ = request.respond(Response::from_string("bad request").with_status_code(400));
        return;
    }
    text_translate(content);
    response_ok(request);
}

fn handle_selection_translate(request: Request) {
    selection_translate();
    response_ok(request);
}

fn handle_input_translate(request: Request) {
    input_translate();
    response_ok(request);
}

fn handle_ocr_recognize(request: Request) {
    if request.url().ends_with("false") {
        recognize_window();
    } else {
        ocr_recognize();
    }
    response_ok(request);
}

fn handle_ocr_translate(request: Request) {
    if request.url().ends_with("false") {
        image_translate();
    } else {
        ocr_translate();
    }
    response_ok(request);
}

fn response_ok(request: Request) {
    let response = Response::from_string("ok");
    let _ = request.respond(response);
}
