use crate::config::{get, set};
use crate::sel_toolbar::hotkey_action;
use crate::window::{dict_input, input_translate, ocr_recognize, ocr_to_clipboard, ocr_translate, selection_dictionary, selection_translate};
use crate::APP;
use log::{info, warn};
use std::sync::atomic::{AtomicBool, Ordering::SeqCst};
use tauri::api::notification::Notification;
use tauri::{AppHandle, GlobalShortcutManager};

type Handler = Box<dyn Fn() + Send + 'static>;

/// Every hotkey that is a plain action. The config key is the same as the name.
const ACTIONS: [&str; 12] = [
    "hotkey_toggle_toolbar",
    "hotkey_input_translate",
    "hotkey_selection_translate",
    "hotkey_selection_translate_copy",
    "hotkey_selection_replace",
    "hotkey_selection_speak",
    "hotkey_selection_dictionary",
    "hotkey_dictionary_input",
    "hotkey_ocr_recognize",
    "hotkey_ocr_translate",
    "hotkey_ocr_copy",
    "hotkey_ocr_translate_copy",
];
const TOGGLE_ALL: &str = "hotkey_toggle_all";

/// false while "disable all hotkeys" is active
static ALL_ON: AtomicBool = AtomicBool::new(true);

fn notify(body: &str) {
    if let Some(app) = APP.get() {
        let _ = Notification::new(app.config().tauri.bundle.identifier.clone())
            .title("673Trans")
            .body(body)
            .show();
    }
}

fn toggle_toolbar() {
    let on = get("selection_toolbar_enable")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    set("selection_toolbar_enable", !on);
    notify(if on {
        "Đã tắt trợ lý chọn văn bản"
    } else {
        "Đã bật trợ lý chọn văn bản"
    });
}

fn handler_for(name: &str) -> Option<Handler> {
    Some(match name {
        "hotkey_toggle_all" => Box::new(toggle_all),
        "hotkey_toggle_toolbar" => Box::new(toggle_toolbar),
        "hotkey_input_translate" => Box::new(input_translate),
        "hotkey_selection_translate" => Box::new(selection_translate),
        "hotkey_selection_translate_copy" => Box::new(|| hotkey_action("translate_copy".into())),
        "hotkey_selection_replace" => Box::new(|| hotkey_action("replace".into())),
        "hotkey_selection_speak" => Box::new(|| hotkey_action("speak".into())),
        "hotkey_selection_dictionary" => Box::new(selection_dictionary),
        "hotkey_dictionary_input" => Box::new(dict_input),
        "hotkey_ocr_recognize" => Box::new(ocr_recognize),
        "hotkey_ocr_translate" => Box::new(ocr_translate),
        "hotkey_ocr_copy" => Box::new(|| ocr_to_clipboard("ocr_copy")),
        "hotkey_ocr_translate_copy" => Box::new(|| ocr_to_clipboard("ocr_translate_copy")),
        _ => return None,
    })
}

fn register(app_handle: &AppHandle, name: &str, handler: Handler, key: &str) -> Result<(), String> {
    let hotkey = if key.is_empty() {
        match get(name).and_then(|v| v.as_str().map(|s| s.to_string())) {
            Some(v) => v,
            None => {
                set(name, "");
                String::new()
            }
        }
    } else {
        key.to_string()
    };
    if hotkey.is_empty() {
        return Ok(());
    }
    match app_handle
        .global_shortcut_manager()
        .register(hotkey.as_str(), handler)
    {
        Ok(()) => {
            info!("Registered global shortcut: {} for {}", hotkey, name);
            Ok(())
        }
        Err(e) => {
            warn!("Failed to register global shortcut: {} {:?}", hotkey, e);
            Err(e.to_string())
        }
    }
}

/// Language pairs: [{ "target": "vi", "second": "en", "hotkey": "Ctrl+Alt+1" }, ...]
fn register_pair(app_handle: &AppHandle, shortcut: &str, target: String, second: String) -> Result<(), String> {
    let handler: Handler = Box::new(move || {
        set("translate_target_language", target.clone());
        set("translate_second_language", second.clone());
        notify(&format!("Ngôn ngữ đích: {} (dự phòng: {})", target, second));
    });
    match app_handle.global_shortcut_manager().register(shortcut, handler) {
        Ok(()) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

fn register_all_pairs(app_handle: &AppHandle) {
    if let Some(list) = get("translate_language_pairs").and_then(|v| v.as_array().cloned()) {
        for pair in list {
            let key = pair["hotkey"].as_str().unwrap_or("");
            if key.is_empty() {
                continue;
            }
            let target = pair["target"].as_str().unwrap_or("").to_string();
            let second = pair["second"].as_str().unwrap_or("").to_string();
            let _ = register_pair(app_handle, key, target, second);
        }
    }
}

fn unregister_all_pairs(app_handle: &AppHandle) {
    if let Some(list) = get("translate_language_pairs").and_then(|v| v.as_array().cloned()) {
        for pair in list {
            if let Some(key) = pair["hotkey"].as_str().filter(|k| !k.is_empty()) {
                let _ = app_handle.global_shortcut_manager().unregister(key);
            }
        }
    }
}

/// "Enable / disable all hotkeys": this hotkey itself always stays registered.
fn toggle_all() {
    let Some(app_handle) = APP.get() else { return };
    let was_on = ALL_ON.fetch_xor(true, SeqCst);
    if was_on {
        for name in ACTIONS {
            if let Some(key) = get(name).and_then(|v| v.as_str().map(|s| s.to_string())) {
                if !key.is_empty() {
                    let _ = app_handle.global_shortcut_manager().unregister(&key);
                }
            }
        }
        unregister_all_pairs(app_handle);
        notify("Đã tắt tất cả phím tắt (bấm lại phím này để bật)");
    } else {
        for name in ACTIONS {
            if let Some(h) = handler_for(name) {
                let _ = register(app_handle, name, h, "");
            }
        }
        register_all_pairs(app_handle);
        notify("Đã bật lại tất cả phím tắt");
    }
}

// Register global shortcuts. A shortcut that fails (already used by another app)
// is skipped and the rest still register; the Hotkey page shows which one failed.
pub fn register_shortcut(shortcut: &str) -> Result<(), String> {
    let app_handle = APP.get().unwrap();
    match shortcut {
        "all" => {
            ALL_ON.store(true, SeqCst);
            let mut failed: Vec<String> = Vec::new();
            for name in std::iter::once(TOGGLE_ALL).chain(ACTIONS) {
                if let Some(h) = handler_for(name) {
                    if let Err(e) = register(app_handle, name, h, "") {
                        failed.push(format!("{} ({})", name.trim_start_matches("hotkey_"), e));
                    }
                }
            }
            register_all_pairs(app_handle);
            if !failed.is_empty() {
                return Err(failed.join(", "));
            }
        }
        name => {
            if let Some(h) = handler_for(name) {
                register(app_handle, name, h, "")?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn register_shortcut_by_frontend(name: &str, shortcut: &str) -> Result<(), String> {
    let app_handle = APP.get().unwrap();
    if let Some(h) = handler_for(name) {
        register(app_handle, name, h, shortcut)?;
    }
    Ok(())
}

/// Hotkey that sets the target / backup language: see `translate_language_pairs`.
#[tauri::command]
pub fn register_language_pair_hotkey(shortcut: &str, target: String, second: String) -> Result<(), String> {
    let app_handle = APP.get().unwrap();
    register_pair(app_handle, shortcut, target, second)
}
