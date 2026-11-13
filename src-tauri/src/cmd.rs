use crate::config::get;
use crate::config::StoreWrapper;
use crate::error::Error;
use crate::StringWrapper;
use crate::APP;
use log::{error, info};
use serde_json::{json, Value};
use std::io::Read;
use tauri::Manager;

#[tauri::command]
pub fn get_text(state: tauri::State<StringWrapper>) -> String {
    return state.0.lock().unwrap().to_string();
}

#[tauri::command]
pub fn reload_store() {
    let state = APP.get().unwrap().state::<StoreWrapper>();
    let mut store = state.0.lock().unwrap();
    store.load().unwrap();
}

#[tauri::command]
pub fn cut_image(left: u32, top: u32, width: u32, height: u32, app_handle: tauri::AppHandle) {
    use dirs::cache_dir;
    use image::GenericImage;
    info!("Cut image: {}x{}+{}+{}", width, height, left, top);
    let mut app_cache_dir_path = cache_dir().expect("Get Cache Dir Failed");
    app_cache_dir_path.push(&app_handle.config().tauri.bundle.identifier);
    app_cache_dir_path.push("pot_screenshot.png");
    if !app_cache_dir_path.exists() {
        return;
    }
    let mut img = match image::open(&app_cache_dir_path) {
        Ok(v) => v,
        Err(e) => {
            error!("{:?}", e.to_string());
            return;
        }
    };
    let img2 = img.sub_image(left, top, width, height);
    app_cache_dir_path.pop();
    app_cache_dir_path.push("pot_screenshot_cut.png");
    match img2.to_image().save(&app_cache_dir_path) {
        Ok(_) => {}
        Err(e) => {
            error!("{:?}", e.to_string());
        }
    }
}

#[tauri::command]
pub fn get_base64(app_handle: tauri::AppHandle) -> String {
    use base64::{engine::general_purpose, Engine as _};
    use dirs::cache_dir;
    use std::fs::File;
    let mut app_cache_dir_path = cache_dir().expect("Get Cache Dir Failed");
    app_cache_dir_path.push(&app_handle.config().tauri.bundle.identifier);
    app_cache_dir_path.push("pot_screenshot_cut.png");
    if !app_cache_dir_path.exists() {
        return "".to_string();
    }
    let mut file = File::open(app_cache_dir_path).unwrap();
    let mut vec = Vec::new();
    match file.read_to_end(&mut vec) {
        Ok(_) => {}
        Err(e) => {
            error!("{:?}", e.to_string());
            return "".to_string();
        }
    }
    let base64 = general_purpose::STANDARD.encode(&vec);
    base64.replace("\r\n", "")
}

#[tauri::command]
pub fn copy_img(app_handle: tauri::AppHandle, width: usize, height: usize) -> Result<(), Error> {
    use arboard::{Clipboard, ImageData};
    use dirs::cache_dir;
    use image::ImageReader;
    use std::borrow::Cow;

    let mut app_cache_dir_path = cache_dir().expect("Get Cache Dir Failed");
    app_cache_dir_path.push(&app_handle.config().tauri.bundle.identifier);
    app_cache_dir_path.push("pot_screenshot_cut.png");
    let data = ImageReader::open(app_cache_dir_path)?.decode()?;

    let img = ImageData {
        width,
        height,
        bytes: Cow::from(data.as_bytes()),
    };
    let result = Clipboard::new()?.set_image(img)?;
    Ok(result)
}

#[tauri::command]
pub fn set_proxy() -> Result<bool, ()> {
    let host = match get("proxy_host") {
        Some(v) => v.as_str().unwrap().to_string(),
        None => return Err(()),
    };
    let port = match get("proxy_port") {
        Some(v) => v.as_i64().unwrap(),
        None => return Err(()),
    };
    let no_proxy = match get("no_proxy") {
        Some(v) => v.as_str().unwrap().to_string(),
        None => return Err(()),
    };
    let proxy = format!("http://{}:{}", host, port);

    std::env::set_var("http_proxy", &proxy);
    std::env::set_var("https_proxy", &proxy);
    std::env::set_var("all_proxy", &proxy);
    std::env::set_var("no_proxy", &no_proxy);
    Ok(true)
}

#[tauri::command]
pub fn unset_proxy() -> Result<bool, ()> {
    std::env::remove_var("http_proxy");
    std::env::remove_var("https_proxy");
    std::env::remove_var("all_proxy");
    std::env::remove_var("no_proxy");
    Ok(true)
}

#[tauri::command]
pub fn install_plugin(path_list: Vec<String>) -> Result<i32, Error> {
    let mut success_count = 0;

    for path in path_list {
        if !path.ends_with("potext") {
            continue;
        }
        let path = std::path::Path::new(&path);
        let file_name = path.file_name().unwrap().to_str().unwrap();
        let file_name = file_name.replace(".potext", "");
        if !file_name.starts_with("plugin") {
            return Err(Error::Error(
                "Invalid Plugin: file name must start with plugin".into(),
            ));
        }

        let mut zip = zip::ZipArchive::new(std::fs::File::open(path)?)?;
        #[allow(unused_mut)]
        let mut plugin_type: String;
        if let Ok(mut info) = zip.by_name("info.json") {
            let mut content = String::new();
            info.read_to_string(&mut content)?;
            let json: serde_json::Value = serde_json::from_str(&content)?;
            plugin_type = json["plugin_type"]
                .as_str()
                .ok_or(Error::Error("can't find plugin type in info.json".into()))?
                .to_string();
        } else {
            return Err(Error::Error("Invalid Plugin: miss info.json".into()));
        }
        if zip.by_name("main.js").is_err() {
            return Err(Error::Error("Invalid Plugin: miss main.js".into()));
        }
        let config_path = dirs::config_dir().unwrap();
        let config_path =
            config_path.join(APP.get().unwrap().config().tauri.bundle.identifier.clone());
        let config_path = config_path.join("plugins");
        let config_path = config_path.join(plugin_type);
        let plugin_path = config_path.join(file_name);
        std::fs::create_dir_all(&config_path)?;
        zip.extract(&plugin_path)?;

        success_count += 1;
    }
    Ok(success_count)
}

#[tauri::command]
pub fn run_binary(
    plugin_type: String,
    plugin_name: String,
    cmd_name: String,
    args: Vec<String>,
) -> Result<Value, Error> {
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    let config_path = dirs::config_dir().unwrap();
    let config_path = config_path.join(APP.get().unwrap().config().tauri.bundle.identifier.clone());
    let config_path = config_path.join("plugins");
    let config_path = config_path.join(plugin_type);
    let plugin_path = config_path.join(plugin_name);

    #[cfg(target_os = "windows")]
    let mut cmd = Command::new(&cmd_name);
    #[cfg(target_os = "windows")]
    let cmd = cmd.creation_flags(0x08000000);
    #[cfg(not(target_os = "windows"))]
    let mut cmd = Command::new(&cmd_name);

    let output = cmd.args(args).current_dir(plugin_path).output()?;
    Ok(json!({
        "stdout": String::from_utf8_lossy(&output.stdout).to_string(),
        "stderr": String::from_utf8_lossy(&output.stderr).to_string(),
        "status": output.status.code().unwrap_or(-1),
    }))
}

#[tauri::command]
pub fn font_list() -> Result<Vec<String>, Error> {
    use font_kit::source::SystemSource;
    let source = SystemSource::new();

    Ok(source.all_families()?)
}

#[tauri::command]
pub fn open_devtools(window: tauri::Window) {
    if !window.is_devtools_open() {
        window.open_devtools();
    } else {
        window.close_devtools();
    }
}

// Built-in Edge neural voices (the Microsoft Edge "read aloud" service): no server and no
// Python needed. Returns mp3 bytes. rate = percent faster (+) or slower (-) than normal.
#[tauri::command(async)]
pub fn edge_tts(text: String, voice: String, rate: i32) -> Result<Vec<u8>, String> {
    use msedge_tts::tts::{client::connect, SpeechConfig};
    let config = SpeechConfig {
        voice_name: voice,
        audio_format: "audio-24khz-48kbitrate-mono-mp3".to_string(),
        pitch: 0,
        rate,
        volume: 0,
    };
    let mut client = connect().map_err(|e| e.to_string())?;
    let audio = client.synthesize(&text, &config).map_err(|e| e.to_string())?;
    if audio.audio_bytes.is_empty() {
        return Err("Edge TTS trả về âm thanh rỗng".to_string());
    }
    Ok(audio.audio_bytes)
}

// Start the Local TTS server (tts_server.py) hidden, from the folder given in the
// Local TTS service settings. Uses the python listed in python_path.txt like the
// server's own start_hidden.vbs does, else `pythonw` from PATH.
#[tauri::command]
pub fn local_tts_start(dir: String) -> Result<(), String> {
    use std::path::PathBuf;
    use std::process::{Command, Stdio};
    let dir = PathBuf::from(dir.trim());
    let script = dir.join("tts_server.py");
    if !script.exists() {
        return Err(format!("Không thấy {}", script.display()));
    }
    let mut python = String::from("pythonw");
    if let Ok(bytes) = std::fs::read(dir.join("python_path.txt")) {
        let text = if bytes.starts_with(&[0xFF, 0xFE]) {
            let units: Vec<u16> = bytes[2..]
                .chunks_exact(2)
                .map(|c| u16::from_le_bytes([c[0], c[1]]))
                .collect();
            String::from_utf16_lossy(&units)
        } else {
            String::from_utf8_lossy(&bytes).to_string()
        };
        if let Some(line) = text.lines().map(|l| l.trim()).find(|l| !l.is_empty()) {
            python = line.to_string();
        }
    }
    let mut cmd = Command::new(python);
    cmd.arg(&script)
        .current_dir(&dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW | DETACHED_PROCESS
        cmd.creation_flags(0x08000000 | 0x00000008);
    }
    cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
}

// The English-Vietnamese dictionary shipped inside the exe (gzip). On start it is unpacked to
// <config>/<app id>/dict/dict-data.json unless the user already has a file there.
const BUNDLED_DICT: &[u8] = include_bytes!("../assets/dict-data.json.gz");

pub fn ensure_bundled_dict() {
    use std::io::Read;
    let Some(app) = APP.get() else { return };
    let Some(base) = dirs::config_dir() else { return };
    let dir = base.join(app.config().tauri.bundle.identifier.clone()).join("dict");
    let target = dir.join("dict-data.json");
    if target.exists() {
        return;
    }
    let _ = std::fs::create_dir_all(&dir);
    let mut out = Vec::new();
    if flate2::read::GzDecoder::new(BUNDLED_DICT).read_to_end(&mut out).is_ok() {
        let _ = std::fs::write(&target, out);
    }
}

// Copy a dictionary data file (dict-data.json, or a .mplugin / .zip that contains it)
// into the app config folder: <config>/<app id>/dict/dict-data.json
#[tauri::command]
pub fn dict_import(src: String) -> Result<String, String> {
    let target_dir = dirs::config_dir()
        .ok_or("no config dir")?
        .join(APP.get().unwrap().config().tauri.bundle.identifier.clone())
        .join("dict");
    std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    let target = target_dir.join("dict-data.json");
    let lower = src.to_lowercase();
    if lower.ends_with(".mplugin") || lower.ends_with(".zip") {
        let file = std::fs::File::open(&src).map_err(|e| e.to_string())?;
        let mut zip = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
        let mut found = None;
        for i in 0..zip.len() {
            let name = zip.by_index(i).map_err(|e| e.to_string())?.name().to_string();
            if name.ends_with("dict-data.json") {
                found = Some(i);
                break;
            }
        }
        let i = found.ok_or("Không thấy dict-data.json trong file này")?;
        let mut entry = zip.by_index(i).map_err(|e| e.to_string())?;
        let mut buf = Vec::new();
        entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
        std::fs::write(&target, buf).map_err(|e| e.to_string())?;
    } else {
        std::fs::copy(&src, &target).map_err(|e| e.to_string())?;
    }
    Ok(target.to_string_lossy().to_string())
}
