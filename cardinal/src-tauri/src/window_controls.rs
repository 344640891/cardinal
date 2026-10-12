use crate::{TRAY_ICON_ENABLED, commands::SearchState};
use std::{sync::atomic::Ordering, thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager, Runtime, WebviewWindow};
use tracing::{error, info, warn};

#[cfg(target_os = "macos")]
use objc2_app_kit::NSApplication;
#[cfg(target_os = "macos")]
use objc2_foundation::MainThreadMarker;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WindowToggle {
    Hidden,
    Shown,
    Failed,
}

#[cfg(target_os = "macos")]
pub fn unhide_application() {
    unsafe {
        let mtm = MainThreadMarker::new_unchecked();
        let application = NSApplication::sharedApplication(mtm);
        application.unhideWithoutActivation();
        #[allow(deprecated)]
        application.activateIgnoringOtherApps(true);
    }
}

#[cfg(not(target_os = "macos"))]
pub fn unhide_application() {}

pub fn activate_window<R: Runtime>(window: &WebviewWindow<R>) {
    if let Ok(true) = window.is_minimized()
        && let Err(err) = window.unminimize()
    {
        error!(?err, "Failed to unminimize window");
    }

    if let Ok(false) = window.is_visible()
        && let Err(err) = window.show()
    {
        error!(?err, "Failed to show window");
    }

    if let Err(err) = window.set_focus() {
        error!(?err, "Failed to focus window");
    }
}

pub fn hide_window<R: Runtime>(window: &WebviewWindow<R>) -> bool {
    if let Err(err) = window.hide() {
        error!(?err, "Failed to hide window");
        return false;
    }
    true
}

pub fn trigger_quick_launch<R: Runtime>(window: &WebviewWindow<R>) {
    activate_window(window);

    if let Err(err) = window.emit("quick_launch", ()) {
        error!(?err, "Failed to emit quick launch event");
    }
}

pub fn toggle_window<R: Runtime>(window: &WebviewWindow<R>) -> WindowToggle {
    let is_visible = window.is_visible().unwrap_or(true);
    let is_minimized = window.is_minimized().unwrap_or(false);
    let is_focused = window.is_focused().unwrap_or(false);

    if is_visible && !is_minimized && is_focused {
        if hide_window(window) {
            WindowToggle::Hidden
        } else {
            WindowToggle::Failed
        }
    } else {
        trigger_quick_launch(window);
        WindowToggle::Shown
    }
}

pub fn is_main_window_foreground(app_handle: &AppHandle) -> bool {
    let Some(window) = app_handle.get_webview_window("main") else {
        return false;
    };

    let visible = window.is_visible().unwrap_or(false);
    let focused = window.is_focused().unwrap_or(false);
    let minimized = window.is_minimized().unwrap_or(false);

    visible && focused && !minimized
}

pub fn activate_main_window_impl(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        activate_window(&window);
        reassert_tray_policy(app);
        info!("Main window activated via command");
        if let Some(state) = app.try_state::<SearchState>() {
            let _ = state.update_window_state_tx.try_send(());
        }
    } else {
        warn!("Activate requested but main window is unavailable");
    }
}

fn reassert_tray_policy(app: &AppHandle) {
    if !TRAY_ICON_ENABLED.load(Ordering::Acquire) {
        return;
    }

    if let Err(error) = app.set_activation_policy(tauri::ActivationPolicy::Accessory) {
        error!(?error, "Failed to reassert tray activation policy");
    }
    if let Err(error) = app.set_dock_visibility(false) {
        error!(?error, "Failed to reassert tray Dock visibility");
    }

    let delayed_app = app.clone();
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(150));
        if !TRAY_ICON_ENABLED.load(Ordering::Acquire) {
            return;
        }
        let app_for_policy = delayed_app.clone();
        let _ = delayed_app.run_on_main_thread(move || {
            if TRAY_ICON_ENABLED.load(Ordering::Acquire) {
                if let Err(error) = app_for_policy
                    .set_activation_policy(tauri::ActivationPolicy::Accessory)
                {
                    error!(?error, "Failed to reassert delayed tray activation policy");
                }
                if let Err(error) = app_for_policy.set_dock_visibility(false) {
                    error!(?error, "Failed to reassert delayed tray Dock visibility");
                }
            }
        });
    });
}

pub fn hide_main_window_impl(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        hide_window(&window);
        info!("Main window hidden via command");
        if let Some(state) = app.try_state::<SearchState>() {
            let _ = state.update_window_state_tx.try_send(());
        }
    }
}

pub fn toggle_main_window_impl(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let toggle_result = toggle_window(&window);
        if matches!(toggle_result, WindowToggle::Hidden) {
            info!("Main window hidden via command");
        } else {
            info!("Main window shown via command");
            reassert_tray_policy(app);
        }
        if let Some(state) = app.try_state::<SearchState>() {
            let _ = state.update_window_state_tx.try_send(());
        }
    } else {
        warn!("Toggle requested but main window is unavailable");
    }
}
