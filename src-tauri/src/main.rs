#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // WebKitGTK's DMA-BUF renderer crashes on native Wayland with NVIDIA's
    // proprietary driver ("Error 71 dispatching to Wayland display"). Disabling
    // it falls back to a software/EGL path that works on both X11 and Wayland.
    #[cfg(target_os = "linux")]
    {
        // SAFETY: single-threaded, called before any other threads are spawned.
        unsafe {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }
    gateway_lib::run()
}
