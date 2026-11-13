//! Selection toolbar
//!
//! A small floating bar with three buttons (translate / paste translation / speak)
//! that pops up next to the cursor right after the user selects text in ANY app.
//!
//! How it works (Windows only for now):
//!   1. A low-level mouse hook watches for "drag" or "double click" gestures.
//!   2. If the gesture looks like a text selection (I-beam cursor), the bar is
//!      shown next to the cursor WITHOUT taking focus from the source app.
//!   3. Nothing is copied until the user actually clicks a button. Only then the
//!      selected text is read (UI Automation, falling back to a simulated Ctrl+C).
//!
//! Frontend lives in `src/window/SelToolbar`.
//! Settings keys (config.json):
//!   selection_toolbar_enable        bool     default true
//!   selection_toolbar_double_click  bool     default true   (double click on a word)
//!   selection_toolbar_ctrl_a        bool     default true   (Ctrl+A inside a text field)
//!   selection_toolbar_ibeam_only    bool     default true
//!   selection_toolbar_blacklist     string   default ""     (exe names, comma separated)
//!   selection_toolbar_actions       string[] default ["translate","replace","speak"]
//!                                   (buttons shown, in order; see src/window/SelToolbar)

use crate::config::{get, set};

/// Window label of the toolbar (also the key in `windowMap` in src/App.jsx)
pub const LABEL: &str = "seltoolbar";

// Logical size of the toolbar window. Keep in sync with src/window/SelToolbar/style.css.
#[allow(dead_code)]
const BAR_PADDING: f64 = 12.0;
#[allow(dead_code)]
const BUTTON_W: f64 = 40.0;
#[allow(dead_code)]
const BAR_H: f64 = 44.0;

/// Size of the bar for the user's buttons, layout and display mode.
/// Keep in sync with src/window/SelToolbar/style.css.
///   selection_toolbar_layout   "horizontal" | "vertical"   default horizontal
///   selection_toolbar_display  "icon" | "text" | "both"    default icon
#[allow(dead_code)]
fn bar_size() -> (f64, f64) {
    let count = match get("selection_toolbar_actions") {
        Some(v) => v.as_array().map_or(3, |a| a.len()),
        None => 3,
    }
    .clamp(1, 8) as f64;
    let vertical = cfg_string("selection_toolbar_layout") == "vertical";
    let display = cfg_string("selection_toolbar_display");
    if vertical {
        let w = match display.as_str() {
            "text" => 92.0,
            "both" => 120.0,
            _ => BUTTON_W,
        };
        (BAR_PADDING + w, BAR_PADDING + 34.0 * count)
    } else {
        let w = match display.as_str() {
            "text" => 66.0,
            "both" => 92.0,
            _ => BUTTON_W,
        };
        (BAR_PADDING + w * count, BAR_H)
    }
}

#[allow(dead_code)]
fn cfg_num(key: &str, default: f64) -> f64 {
    get(key).and_then(|v| v.as_f64()).unwrap_or(default)
}

#[allow(dead_code)]
fn cfg_bool(key: &str, default: bool) -> bool {
    match get(key) {
        Some(v) => v.as_bool().unwrap_or(default),
        None => {
            set(key, default);
            default
        }
    }
}

#[allow(dead_code)]
fn cfg_string(key: &str) -> String {
    match get(key) {
        Some(v) => v.as_str().unwrap_or("").to_string(),
        None => String::new(),
    }
}

// ---------------------------------------------------------------------------
// Windows implementation
// ---------------------------------------------------------------------------
#[cfg(target_os = "windows")]
mod imp {
    use super::{bar_size, cfg_bool, cfg_num, cfg_string, LABEL};
    use crate::APP;
    use log::{info, warn};
    use once_cell::sync::OnceCell;
    use std::ffi::c_void;
    use std::mem::size_of;
    use std::sync::atomic::{AtomicBool, AtomicI32, AtomicIsize, Ordering::SeqCst};
    use std::sync::mpsc::{channel, Receiver, RecvTimeoutError, Sender};
    use std::thread;
    use std::time::{Duration, Instant};
    use tauri::Manager;
    use windows::core::PWSTR;
    use windows::Win32::Foundation::{
        CloseHandle, HINSTANCE, HWND, LPARAM, LRESULT, POINT, WPARAM,
    };
    use windows::Win32::Graphics::Gdi::{
        ClientToScreen, GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED,
    };
    use windows::Win32::UI::Accessibility::{
        CUIAutomation, IUIAutomation, IUIAutomationTextPattern, UIA_DocumentControlTypeId,
        UIA_EditControlTypeId, UIA_TextPatternId,
    };
    use windows::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows::Win32::System::Threading::{
        AttachThreadInput, GetCurrentProcessId, GetCurrentThreadId, OpenProcess,
        QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::HiDpi::{GetDpiForMonitor, MDT_EFFECTIVE_DPI};
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, GetDoubleClickTime, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD,
        KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP, VIRTUAL_KEY, VK_A, VK_CONTROL, VK_LWIN,
        VK_MENU, VK_SHIFT, VK_V,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        BringWindowToTop, CallNextHookEx, DispatchMessageW, GetCursorInfo, GetCursorPos,
        GetForegroundWindow, GetGUIThreadInfo, GetMessageW, GetWindowLongPtrW, GUITHREADINFO,
        KBDLLHOOKSTRUCT, LLKHF_INJECTED, WH_KEYBOARD_LL, WM_KEYUP, GetWindowThreadProcessId,
        IsWindowVisible, LoadCursorW, SetForegroundWindow, SetWindowLongPtrW, SetWindowPos,
        SetWindowsHookExW, ShowWindow, TranslateMessage, CURSORINFO, GWL_EXSTYLE, HHOOK,
        HWND_TOPMOST, IDC_IBEAM, MSG, MSLLHOOKSTRUCT, SWP_NOACTIVATE, SWP_SHOWWINDOW, SW_HIDE,
        WH_MOUSE_LL, WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MBUTTONDOWN, WM_MOUSEWHEEL,
        WM_RBUTTONDOWN, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW, WS_EX_TOPMOST,
    };

    /// Minimum mouse travel (physical px) for a press-move-release to count as a drag
    const DRAG_THRESHOLD: i32 = 8;
    /// Max distance between two clicks of a double click
    const DBL_CLICK_SLOP: i32 = 4;
    /// Hide the bar automatically after this long without interaction
    const AUTO_HIDE: Duration = Duration::from_secs(6);

    enum Ev {
        Down { x: i32, y: i32, ibeam: bool },
        Up { x: i32, y: i32, t: u32, ibeam: bool },
        /// wheel / right click / middle click
        Dismiss { x: i32, y: i32 },
        /// Ctrl+A was pressed
        SelectAll,
    }

    static TX: OnceCell<Sender<Ev>> = OnceCell::new();
    /// Is the bar currently on screen
    static VISIBLE: AtomicBool = AtomicBool::new(false);
    /// When true, clicking elsewhere does not hide the bar (used while speaking)
    static STICKY: AtomicBool = AtomicBool::new(false);
    /// When true, the bar does not auto-hide after a few seconds (a button is working).
    /// Clicking elsewhere still hides it, which cancels a pending paste.
    static BUSY: AtomicBool = AtomicBool::new(false);
    /// A hotkey (not the bar) started the current action: allow paste with the bar hidden
    static HOTKEY_MODE: AtomicBool = AtomicBool::new(false);
    /// Bar rectangle in physical screen coordinates
    static RECT_L: AtomicI32 = AtomicI32::new(0);
    static RECT_T: AtomicI32 = AtomicI32::new(0);
    static RECT_R: AtomicI32 = AtomicI32::new(0);
    static RECT_B: AtomicI32 = AtomicI32::new(0);
    /// Window that had focus when the selection was made
    static SRC_HWND: AtomicIsize = AtomicIsize::new(0);
    /// Native handle of the bar window
    static BAR_HWND: AtomicIsize = AtomicIsize::new(0);
    /// Handle of the system I-beam cursor
    static IBEAM: AtomicIsize = AtomicIsize::new(0);

    fn hwnd(raw: isize) -> HWND {
        HWND(raw as *mut c_void)
    }

    fn in_bar(x: i32, y: i32) -> bool {
        x >= RECT_L.load(SeqCst)
            && x < RECT_R.load(SeqCst)
            && y >= RECT_T.load(SeqCst)
            && y < RECT_B.load(SeqCst)
    }

    unsafe fn cursor_is_ibeam() -> bool {
        let ibeam = IBEAM.load(SeqCst);
        if ibeam == 0 {
            return false;
        }
        let mut ci = CURSORINFO {
            cbSize: size_of::<CURSORINFO>() as u32,
            ..Default::default()
        };
        GetCursorInfo(&mut ci).is_ok() && ci.hCursor.0 as isize == ibeam
    }

    // Runs inside the low-level hook: keep it tiny, just forward to the worker.
    unsafe extern "system" fn mouse_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0 {
            let msg = wparam.0 as u32;
            if matches!(
                msg,
                WM_LBUTTONDOWN | WM_LBUTTONUP | WM_RBUTTONDOWN | WM_MBUTTONDOWN | WM_MOUSEWHEEL
            ) {
                if let Some(tx) = TX.get() {
                    let info = &*(lparam.0 as *const MSLLHOOKSTRUCT);
                    let (x, y, t) = (info.pt.x, info.pt.y, info.time);
                    let ev = match msg {
                        WM_LBUTTONDOWN => Ev::Down {
                            x,
                            y,
                            ibeam: cursor_is_ibeam(),
                        },
                        WM_LBUTTONUP => Ev::Up {
                            x,
                            y,
                            t,
                            ibeam: cursor_is_ibeam(),
                        },
                        _ => Ev::Dismiss { x, y },
                    };
                    let _ = tx.send(ev);
                }
            }
        }
        CallNextHookEx(HHOOK::default(), code, wparam, lparam)
    }

    // Low-level keyboard hook: only looks for Ctrl+A (released A while Ctrl is held)
    unsafe extern "system" fn keyboard_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0 && wparam.0 as u32 == WM_KEYUP {
            let info = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
            let injected = info.flags.0 & LLKHF_INJECTED.0 != 0;
            if info.vkCode == VK_A.0 as u32 && !injected {
                let down = |vk: VIRTUAL_KEY| GetAsyncKeyState(vk.0 as i32) < 0;
                if down(VK_CONTROL) && !down(VK_MENU) && !down(VK_SHIFT) && !down(VK_LWIN) {
                    if let Some(tx) = TX.get() {
                        let _ = tx.send(Ev::SelectAll);
                    }
                }
            }
        }
        CallNextHookEx(HHOOK::default(), code, wparam, lparam)
    }

    /// Is the keyboard focus inside something you can type / select text in?
    /// Returns the caret position (screen coordinates) when Windows knows it.
    unsafe fn focused_text_field(window: HWND) -> Option<Option<(i32, i32)>> {
        // 1. Classic Win32 controls (and Chromium) expose a system caret
        let thread = GetWindowThreadProcessId(window, None);
        let mut gui = GUITHREADINFO {
            cbSize: size_of::<GUITHREADINFO>() as u32,
            ..Default::default()
        };
        if GetGUIThreadInfo(thread, &mut gui).is_ok() && !gui.hwndCaret.0.is_null() {
            let mut pt = POINT {
                x: gui.rcCaret.left,
                y: gui.rcCaret.bottom,
            };
            if ClientToScreen(gui.hwndCaret, &mut pt).as_bool() && (pt.x != 0 || pt.y != 0) {
                return Some(Some((pt.x, pt.y)));
            }
            return Some(None);
        }
        // 2. Everything else: ask UI Automation what kind of element has focus
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let automation: IUIAutomation =
            CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).ok()?;
        let element = automation.GetFocusedElement().ok()?;
        let kind = element.CurrentControlType().ok()?;
        if kind == UIA_EditControlTypeId || kind == UIA_DocumentControlTypeId {
            return Some(None);
        }
        let has_text: Result<IUIAutomationTextPattern, _> =
            element.GetCurrentPatternAs(UIA_TextPatternId);
        if has_text.is_ok() {
            return Some(None);
        }
        None
    }

    fn hook_thread() {
        unsafe {
            if let Ok(cursor) = LoadCursorW(HINSTANCE::default(), IDC_IBEAM) {
                IBEAM.store(cursor.0 as isize, SeqCst);
            }
            let module: HINSTANCE = GetModuleHandleW(None).unwrap_or_default().into();
            match SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_proc), module, 0) {
                Ok(_) => info!("Selection toolbar: mouse hook installed"),
                Err(e) => {
                    warn!("Selection toolbar: failed to install mouse hook: {:?}", e);
                    return;
                }
            }
            if let Err(e) = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_proc), module, 0) {
                warn!("Selection toolbar: failed to install keyboard hook: {:?}", e);
            }
            // A low-level hook needs a message loop on the installing thread
            let mut msg = MSG::default();
            while GetMessageW(&mut msg, HWND::default(), 0, 0).as_bool() {
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        }
    }

    fn bar_window() -> Option<tauri::Window> {
        let app = APP.get()?;
        if let Some(w) = app.get_window(LABEL) {
            return Some(w);
        }
        info!("Selection toolbar: creating window");
        let w = tauri::WindowBuilder::new(app, LABEL, tauri::WindowUrl::App("index.html".into()))
            .title("Selection Toolbar")
            .inner_size(bar_size().0, bar_size().1)
            .decorations(false)
            .transparent(true)
            .resizable(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(false)
            .visible(false)
            // All webviews of the app must share the same browser args
            .additional_browser_args("--disable-web-security")
            .build()
            .map_err(|e| warn!("Selection toolbar: failed to create window: {:?}", e))
            .ok()?;
        let raw = w.hwnd().ok()?.0 as isize;
        unsafe {
            // Never take focus when clicked, stay out of Alt+Tab
            let ex = GetWindowLongPtrW(hwnd(raw), GWL_EXSTYLE);
            let extra = (WS_EX_NOACTIVATE.0 | WS_EX_TOOLWINDOW.0 | WS_EX_TOPMOST.0) as isize;
            SetWindowLongPtrW(hwnd(raw), GWL_EXSTYLE, ex | extra);
        }
        BAR_HWND.store(raw, SeqCst);
        Some(w)
    }

    pub fn hide() {
        let raw = BAR_HWND.load(SeqCst);
        if raw != 0 {
            unsafe {
                let _ = ShowWindow(hwnd(raw), SW_HIDE);
            }
        }
        VISIBLE.store(false, SeqCst);
        BUSY.store(false, SeqCst);
        HOTKEY_MODE.store(false, SeqCst);
    }

    fn show_at(x: i32, y: i32, source: HWND) {
        let Some(window) = bar_window() else {
            return;
        };
        let raw = BAR_HWND.load(SeqCst);
        if raw == 0 {
            return;
        }
        unsafe {
            let monitor = MonitorFromPoint(POINT { x, y }, MONITOR_DEFAULTTONEAREST);
            let mut mi = MONITORINFO {
                cbSize: size_of::<MONITORINFO>() as u32,
                ..Default::default()
            };
            let _ = GetMonitorInfoW(monitor, &mut mi);
            let (mut dpi_x, mut dpi_y) = (96u32, 96u32);
            let _ = GetDpiForMonitor(monitor, MDT_EFFECTIVE_DPI, &mut dpi_x, &mut dpi_y);
            let scale = dpi_x as f64 / 96.0;
            let (bw, bh) = bar_size();
            let w = (bw * scale).round() as i32;
            let h = (bh * scale).round() as i32;
            let area = mi.rcWork;

            // Below the cursor by default; offsets come from the settings
            // (positive X = right, positive Y = down). No room below: flip above.
            let off_x = (cfg_num("selection_toolbar_offset_x", 0.0) * scale) as i32;
            let off_y = (cfg_num("selection_toolbar_offset_y", 12.0) * scale) as i32;
            let mut px = x + off_x;
            let mut py = y + off_y;
            if py + h > area.bottom {
                py = y - h - off_y.abs().max((8.0 * scale) as i32);
            }
            if area.right - w > area.left {
                px = px.clamp(area.left, area.right - w);
            }
            if area.bottom - h > area.top {
                py = py.clamp(area.top, area.bottom - h);
            }

            RECT_L.store(px, SeqCst);
            RECT_T.store(py, SeqCst);
            RECT_R.store(px + w, SeqCst);
            RECT_B.store(py + h, SeqCst);
            SRC_HWND.store(source.0 as isize, SeqCst);

            let _ = SetWindowPos(
                hwnd(raw),
                HWND_TOPMOST,
                px,
                py,
                w,
                h,
                SWP_NOACTIVATE | SWP_SHOWWINDOW,
            );
        }
        VISIBLE.store(true, SeqCst);
        let _ = window.emit("sel_toolbar_show", ());
    }

    unsafe fn window_pid(window: HWND) -> u32 {
        let mut pid = 0u32;
        GetWindowThreadProcessId(window, Some(&mut pid));
        pid
    }

    /// Lower-case exe name ("chrome.exe") of the process owning `window`
    unsafe fn process_name(window: HWND) -> String {
        let pid = window_pid(window);
        if pid == 0 {
            return String::new();
        }
        let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
            return String::new();
        };
        let mut buf = [0u16; 1024];
        let mut len = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            PWSTR(buf.as_mut_ptr()),
            &mut len,
        )
        .is_ok();
        let _ = CloseHandle(handle);
        if !ok {
            return String::new();
        }
        let path = String::from_utf16_lossy(&buf[..len as usize]);
        path.rsplit(['\\', '/'])
            .next()
            .unwrap_or("")
            .to_lowercase()
    }

    unsafe fn blacklisted(window: HWND) -> bool {
        let list = cfg_string("selection_toolbar_blacklist");
        if list.trim().is_empty() {
            return false;
        }
        let name = process_name(window);
        if name.is_empty() {
            return false;
        }
        let bare = name.trim_end_matches(".exe");
        list.split([',', ';', '\n'])
            .map(|s| s.trim().to_lowercase())
            .filter(|s| !s.is_empty())
            .any(|s| s == name || s.trim_end_matches(".exe") == bare)
    }

    fn worker(rx: Receiver<Ev>) {
        let mut down: Option<(i32, i32)> = None;
        let mut down_ibeam = false;
        let mut pressed_in_bar = false;
        let mut prev_click: Option<(i32, i32, u32)> = None;
        let mut shown_at = Instant::now();

        loop {
            match rx.recv_timeout(Duration::from_millis(500)) {
                Ok(Ev::Down { x, y, ibeam, .. }) => {
                    if VISIBLE.load(SeqCst) && in_bar(x, y) {
                        // A click on one of our buttons, the webview handles it
                        pressed_in_bar = true;
                        shown_at = Instant::now();
                        continue;
                    }
                    pressed_in_bar = false;
                    if VISIBLE.load(SeqCst) && !STICKY.load(SeqCst) {
                        hide();
                    }
                    down = Some((x, y));
                    down_ibeam = ibeam;
                }
                Ok(Ev::Up { x, y, t, ibeam }) => {
                    if pressed_in_bar {
                        pressed_in_bar = false;
                        continue;
                    }
                    let Some((dx, dy)) = down.take() else {
                        continue;
                    };
                    let dist = (x - dx).abs().max((y - dy).abs());
                    let is_drag = dist >= DRAG_THRESHOLD;
                    let is_double = !is_drag
                        && prev_click.map_or(false, |(px, py, pt)| {
                            t.wrapping_sub(pt) <= unsafe { GetDoubleClickTime() }
                                && (x - px).abs() <= DBL_CLICK_SLOP
                                && (y - py).abs() <= DBL_CLICK_SLOP
                        });
                    prev_click = if is_drag { None } else { Some((x, y, t)) };
                    if !(is_drag || is_double) {
                        continue;
                    }
                    if is_double && !is_drag && !cfg_bool("selection_toolbar_double_click", true) {
                        continue;
                    }
                    if !cfg_bool("selection_toolbar_enable", true) {
                        continue;
                    }
                    if cfg_bool("selection_toolbar_ibeam_only", true) && !(ibeam || down_ibeam) {
                        continue;
                    }
                    let source = unsafe { GetForegroundWindow() };
                    if source.0.is_null() {
                        continue;
                    }
                    unsafe {
                        // Skip our own windows and apps the user excluded
                        if window_pid(source) == GetCurrentProcessId() || blacklisted(source) {
                            continue;
                        }
                    }
                    // Give the app a moment to finish updating its selection
                    thread::sleep(Duration::from_millis(60));
                    show_at(x, y, source);
                    shown_at = Instant::now();
                }
                Ok(Ev::SelectAll) => {
                    if !cfg_bool("selection_toolbar_enable", true)
                        || !cfg_bool("selection_toolbar_ctrl_a", true)
                    {
                        continue;
                    }
                    let source = unsafe { GetForegroundWindow() };
                    if source.0.is_null() {
                        continue;
                    }
                    let field = unsafe {
                        if window_pid(source) == GetCurrentProcessId() || blacklisted(source) {
                            continue;
                        }
                        focused_text_field(source)
                    };
                    // Ctrl+A in a file list, on the desktop... is not a text selection
                    let Some(caret) = field else {
                        continue;
                    };
                    thread::sleep(Duration::from_millis(60));
                    let mut pt = POINT::default();
                    let (x, y) = match caret {
                        Some(pos) => pos,
                        None => {
                            let _ = unsafe { GetCursorPos(&mut pt) };
                            (pt.x, pt.y)
                        }
                    };
                    show_at(x, y, source);
                    shown_at = Instant::now();
                }
                Ok(Ev::Dismiss { x, y }) => {
                    if VISIBLE.load(SeqCst) && !STICKY.load(SeqCst) && !in_bar(x, y) {
                        hide();
                    }
                }
                Err(RecvTimeoutError::Timeout) => {
                    if VISIBLE.load(SeqCst)
                        && !STICKY.load(SeqCst)
                        && !BUSY.load(SeqCst)
                        && shown_at.elapsed() > AUTO_HIDE
                    {
                        let mut pt = POINT::default();
                        let hovering =
                            unsafe { GetCursorPos(&mut pt).is_ok() } && in_bar(pt.x, pt.y);
                        if hovering {
                            shown_at = Instant::now();
                        } else {
                            hide();
                        }
                    }
                }
                Err(RecvTimeoutError::Disconnected) => break,
            }
        }
    }

    pub fn init() {
        let (tx, rx) = channel::<Ev>();
        if TX.set(tx).is_err() {
            return;
        }
        thread::spawn(move || {
            // Warm up the webview so the first popup is instant
            if cfg_bool("selection_toolbar_enable", true) {
                thread::sleep(Duration::from_millis(1500));
                let _ = bar_window();
            }
            worker(rx);
        });
        thread::spawn(hook_thread);
    }

    /// Bring `target` to the foreground even if another process owns the focus.
    unsafe fn force_foreground(target: HWND) {
        let foreground = GetForegroundWindow();
        if foreground == target {
            return;
        }
        let current_thread = GetCurrentThreadId();
        let foreground_thread = GetWindowThreadProcessId(foreground, None);
        let attached = foreground_thread != 0
            && foreground_thread != current_thread
            && AttachThreadInput(current_thread, foreground_thread, true).as_bool();
        let _ = BringWindowToTop(target);
        let _ = SetForegroundWindow(target);
        if attached {
            let _ = AttachThreadInput(current_thread, foreground_thread, false);
        }
    }

    /// Make sure the app where the text was selected has the keyboard focus again
    fn refocus_source() {
        let source = SRC_HWND.load(SeqCst);
        if source == 0 {
            return;
        }
        unsafe {
            if GetForegroundWindow().0 as isize != source {
                force_foreground(hwnd(source));
                thread::sleep(Duration::from_millis(120));
            }
        }
    }

    pub fn capture(hide_bar: bool) -> String {
        if hide_bar {
            STICKY.store(false, SeqCst);
            hide();
        }
        refocus_source();
        selection::get_text()
    }

    pub fn set_sticky(sticky: bool) {
        STICKY.store(sticky, SeqCst);
    }

    pub fn set_busy(busy: bool) {
        BUSY.store(busy, SeqCst);
    }

    fn key(vk: VIRTUAL_KEY, up: bool) -> INPUT {
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: 0,
                    dwFlags: if up {
                        KEYEVENTF_KEYUP
                    } else {
                        KEYBD_EVENT_FLAGS(0)
                    },
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        }
    }

    pub fn paste(text: String) -> Result<(), String> {
        // The bar was dismissed while translating (the user clicked somewhere else):
        // pasting now would land in the wrong place, so give up quietly.
        let allowed = VISIBLE.load(SeqCst) || HOTKEY_MODE.load(SeqCst);
        if !allowed {
            return Err("cancelled".into());
        }
        STICKY.store(false, SeqCst);
        hide();
        arboard::Clipboard::new()
            .and_then(|mut c| c.set_text(text))
            .map_err(|e| e.to_string())?;
        refocus_source();
        thread::sleep(Duration::from_millis(60));
        let inputs = [
            key(VK_CONTROL, false),
            key(VK_V, false),
            key(VK_V, true),
            key(VK_CONTROL, true),
        ];
        let sent = unsafe { SendInput(&inputs, size_of::<INPUT>() as i32) };
        if sent as usize != inputs.len() {
            return Err("Failed to send Ctrl+V".into());
        }
        Ok(())
    }

    /// Run a toolbar action from a global hotkey: remember the app that has the
    /// selection, then tell the (hidden) toolbar webview to do the work.
    pub fn hotkey_run(action: String) {
        unsafe {
            SRC_HWND.store(GetForegroundWindow().0 as isize, SeqCst);
        }
        HOTKEY_MODE.store(true, SeqCst);
        thread::spawn(move || {
            let fresh = APP.get().and_then(|a| a.get_window(LABEL)).is_none();
            let Some(window) = bar_window() else {
                return;
            };
            if fresh {
                // let the webview load its scripts first
                thread::sleep(Duration::from_millis(1800));
            }
            let _ = window.emit("sel_toolbar_hotkey", action);
        });
    }

    /// The translate window is shown by its own webview a bit later. Our process
    /// usually is not the foreground one at that moment, so help it get focus
    /// (otherwise "close on blur" never fires).
    pub fn focus_translate_window() {
        let Some(app) = APP.get() else {
            return;
        };
        for _ in 0..40 {
            thread::sleep(Duration::from_millis(50));
            let Some(w) = app.get_window("translate") else {
                continue;
            };
            let Ok(h) = w.hwnd() else {
                continue;
            };
            let target = hwnd(h.0 as isize);
            unsafe {
                if IsWindowVisible(target).as_bool() {
                    force_foreground(target);
                    break;
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Other platforms: not implemented yet, everything is a no-op
// ---------------------------------------------------------------------------
#[cfg(not(target_os = "windows"))]
mod imp {
    pub fn init() {}
    pub fn hide() {}
    pub fn capture(_hide_bar: bool) -> String {
        String::new()
    }
    pub fn set_sticky(_sticky: bool) {}
    pub fn set_busy(_busy: bool) {}
    pub fn paste(_text: String) -> Result<(), String> {
        Err("Selection toolbar is only available on Windows".into())
    }
    pub fn focus_translate_window() {}
    pub fn hotkey_run(_action: String) {}
}

/// Start watching for text selections. Call once after the config is loaded.
pub fn init_selection_toolbar() {
    imp::init();
}

/// Run a toolbar action (translate_copy, replace, speak, ocr_copy, ocr_translate_copy)
/// from a global hotkey. The hidden toolbar webview does the work.
pub fn hotkey_action(action: String) {
    imp::hotkey_run(action);
}

/// Read the text currently selected in the source app.
#[tauri::command(async)]
pub fn sel_toolbar_capture(hide: bool) -> String {
    imp::capture(hide)
}

/// Button 1: open the normal translate window with the selected text.
#[tauri::command(async)]
pub fn sel_toolbar_translate() {
    let text = imp::capture(true);
    if text.trim().is_empty() {
        return;
    }
    crate::window::text_translate(text);
    imp::focus_translate_window();
}

/// Button 2 (second half): replace the selection with `text` via Ctrl+V.
#[tauri::command(async)]
pub fn sel_toolbar_paste(text: String) -> Result<(), String> {
    imp::paste(text)
}

#[tauri::command(async)]
pub fn sel_toolbar_hide() {
    imp::set_sticky(false);
    imp::hide();
}

/// While sticky, clicking elsewhere does not dismiss the bar (used while speaking).
#[tauri::command(async)]
pub fn sel_toolbar_sticky(sticky: bool) {
    imp::set_sticky(sticky);
}

/// While busy, the bar does not auto-hide (a button is still working).
#[tauri::command(async)]
pub fn sel_toolbar_busy(busy: bool) {
    imp::set_busy(busy);
}
