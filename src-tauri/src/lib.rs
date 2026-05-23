mod commands;
mod openid;
mod session;
mod state;
mod steam_auth;
mod steam_service;
mod store;

use state::{ApiCacheState, AuthState, AuthStateInner, SteamApiKey, StoreState};
use store::JsonStore;
use tauri::{
    http, Manager, RunEvent,
    WindowEvent,
};

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .register_uri_scheme_protocol("gateway", handle_gateway_protocol)
        .setup(|app| {
            let handle = app.handle().clone();

            // Initialize store
            let json_store = JsonStore::new(&handle)
                .expect("Failed to initialize data store");

            // Bootstrap state from persisted data
            let saved_auth = json_store.get_steam_auth();
            let steam_api_key = json_store
                .get_settings()
                .steam_api_key
                .clone()
                .filter(|k| !k.is_empty());

            // Register managed state
            app.manage(StoreState(std::sync::Mutex::new(json_store)));
            app.manage(AuthState(std::sync::Mutex::new(
                AuthStateInner::from_store(saved_auth),
            )));
            app.manage(SteamApiKey(std::sync::Mutex::new(steam_api_key)));
            app.manage(ApiCacheState::default());

            // Refresh user profile in background
            let h2 = handle.clone();
            tauri::async_runtime::spawn(async move {
                let store = h2.state::<StoreState>();
                let auth = h2.state::<AuthState>();
                steam_auth::refresh_session_on_startup(&store, &auth, &h2).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::library::get_games,
            commands::library::add_game,
            commands::library::update_game,
            commands::library::delete_game,
            commands::library::launch_game,
            commands::library::uninstall_game,
            commands::library::install_steam_game,
            commands::library::open_url,
            commands::library::open_steam_store,
            commands::library::select_executable,
            commands::library::select_image,
            commands::sync::steam_login,
            commands::sync::steam_logout,
            commands::sync::get_auth_state,
            commands::sync::has_steam_api_key,
            commands::sync::fetch_steam_games,
            commands::sync::get_steam_status,
            commands::sync::sync_steam,
            commands::sync::clear_and_resync,
            commands::sync::get_achievements,
            commands::sync::open_steam_store_claim,
            commands::sync::check_game_owned,
            commands::setup::get_setup_state,
            commands::setup::mark_setup_complete,
            commands::setup::set_steam_api_key,
            commands::setup::get_steam_api_key,
            commands::steam_api::get_trending_games,
            commands::steam_api::get_free_deals,
            commands::steam_api::get_game_news,
            commands::steam_api::get_game_details,
        ])
        .build(tauri::generate_context!())
        .expect("error building application");

    app.run(|app_handle, event| {
        if let RunEvent::WindowEvent {
            label: _,
            event: WindowEvent::Focused(true),
            ..
        } = event
        {
            let h = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                let store = h.state::<StoreState>();
                let auth = h.state::<AuthState>();
                let api_key = h.state::<SteamApiKey>();
                commands::sync::check_pending_claims(&h, &store, &auth, &api_key).await;
            });
        }
    });
}

fn handle_gateway_protocol<R: tauri::Runtime>(
    ctx: tauri::UriSchemeContext<'_, R>,
    request: http::Request<Vec<u8>>,
) -> http::Response<Vec<u8>> {
    let uri = request.uri();
    // gateway://cover/filename.jpg  →  path = /cover/filename.jpg
    let path = uri.path().trim_start_matches('/');
    let mut parts = path.splitn(2, '/');
    let kind = parts.next().unwrap_or("");
    let file_name = parts.next().unwrap_or("");

    if kind == "cover" && !file_name.is_empty() {
        let app = ctx.app_handle();
        let store = app.state::<StoreState>();
        let data_dir = store.0.lock().unwrap().get_data_dir();
        let file_path = data_dir.join("assets").join("covers").join(file_name);

        if file_path.exists() {
            if let Ok(bytes) = std::fs::read(&file_path) {
                let mime = if file_name.ends_with(".png") {
                    "image/png"
                } else {
                    "image/jpeg"
                };
                return http::Response::builder()
                    .status(200)
                    .header("Content-Type", mime)
                    .header("Cache-Control", "public, max-age=86400")
                    .body(bytes)
                    .unwrap_or_else(|_| not_found());
            }
        }
    }

    not_found()
}

fn not_found() -> http::Response<Vec<u8>> {
    http::Response::builder()
        .status(404)
        .body(b"Not Found".to_vec())
        .unwrap()
}
