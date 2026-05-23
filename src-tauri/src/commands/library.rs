use crate::state::StoreState;
use crate::store::Game;
use tauri::{State, WebviewWindow};
use uuid::Uuid;

// ─── Game CRUD ───────────────────────────────────────────────

#[tauri::command]
pub async fn get_games(store: State<'_, StoreState>) -> Result<Vec<Game>, String> {
    Ok(store.0.lock().unwrap().get_games())
}

#[tauri::command]
pub async fn add_game(
    store: State<'_, StoreState>,
    game: serde_json::Value,
) -> Result<Game, String> {
    let mut new_game: Game = serde_json::from_value(game).map_err(|e| e.to_string())?;
    new_game.id = Uuid::new_v4().to_string();
    let mut locked = store.0.lock().unwrap();
    let mut games = locked.get_games();
    games.push(new_game.clone());
    locked.set_games(games);
    Ok(new_game)
}

#[tauri::command]
pub async fn update_game(
    store: State<'_, StoreState>,
    id: String,
    updates: serde_json::Value,
) -> Result<Game, String> {
    let mut locked = store.0.lock().unwrap();
    let mut games = locked.get_games();
    let idx = games.iter().position(|g| g.id == id)
        .ok_or_else(|| "Game not found".to_string())?;

    // Merge updates into the existing game via JSON round-trip
    let mut existing = serde_json::to_value(&games[idx]).map_err(|e| e.to_string())?;
    if let (Some(obj), Some(upd)) = (existing.as_object_mut(), updates.as_object()) {
        for (k, v) in upd {
            obj.insert(k.clone(), v.clone());
        }
    }
    let updated: Game = serde_json::from_value(existing).map_err(|e| e.to_string())?;
    games[idx] = updated.clone();
    locked.set_games(games);
    Ok(updated)
}

#[tauri::command]
pub async fn delete_game(store: State<'_, StoreState>, id: String) -> Result<(), String> {
    let mut locked = store.0.lock().unwrap();
    let games = locked.get_games().into_iter().filter(|g| g.id != id).collect();
    locked.set_games(games);
    Ok(())
}

// ─── Launch / install / uninstall ────────────────────────────

#[tauri::command]
pub async fn launch_game(
    store: State<'_, StoreState>,
    game: serde_json::Value,
) -> Result<(), String> {
    let game: Game = serde_json::from_value(game).map_err(|e| e.to_string())?;

    if let Some(ref app_id) = game.steam_app_id {
        open::that(format!("steam://rungameid/{}", app_id))
            .map_err(|e| e.to_string())?;
    } else if let Some(ref exe_path) = game.executable_path {
        let env_prefix = game.custom_env_vars.as_deref().unwrap_or("").trim().to_string();
        let args_str = game.launch_args.as_deref().unwrap_or("").to_string();

        #[cfg(windows)]
        {
            let cmd = if !env_prefix.is_empty() {
                format!("{} \"{}\" {}", env_prefix, exe_path, args_str)
            } else {
                format!("\"{}\" {}", exe_path, args_str)
            };
            std::process::Command::new("cmd")
                .args(["/C", &cmd])
                .spawn()
                .map_err(|e| format!("Failed to launch game: {}", e))?;
        }
    }

    // Update last played
    let mut locked = store.0.lock().unwrap();
    let mut games = locked.get_games();
    if let Some(g) = games.iter_mut().find(|g| g.id == game.id) {
        g.last_played = Some(chrono_now_iso());
    }
    locked.set_games(games);
    Ok(())
}

#[tauri::command]
pub async fn uninstall_game(game: serde_json::Value) -> Result<serde_json::Value, String> {
    let game: Game = serde_json::from_value(game).map_err(|e| e.to_string())?;
    if let Some(app_id) = game.steam_app_id {
        open::that(format!("steam://uninstall/{}", app_id))
            .map_err(|e| e.to_string())?;
        return Ok(serde_json::json!({ "success": true }));
    }
    Ok(serde_json::json!({ "success": false, "error": "Uninstall not supported for this game type" }))
}

#[tauri::command]
pub async fn install_steam_game(app_id: String) -> Result<(), String> {
    open::that(format!("steam://install/{}", app_id)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_steam_store(app_id: String) -> Result<(), String> {
    open::that(format!("steam://store/{}", app_id)).map_err(|e| e.to_string())
}

// ─── File dialogs ─────────────────────────────────────────────

#[tauri::command]
pub async fn select_executable(window: WebviewWindow) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = std::sync::mpsc::channel();
    window
        .dialog()
        .file()
        .add_filter("Executables", &["exe"])
        .add_filter("All Files", &["*"])
        .pick_file(move |path| {
            let _ = tx.send(path);
        });
    Ok(rx.recv().ok().flatten().map(|p| p.to_string()))
}

#[tauri::command]
pub async fn select_image(window: WebviewWindow) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = std::sync::mpsc::channel();
    window
        .dialog()
        .file()
        .add_filter("Images", &["jpg", "jpeg", "png", "webp", "gif"])
        .pick_file(move |path| {
            let _ = tx.send(path);
        });
    Ok(rx.recv().ok().flatten().map(|p| p.to_string()))
}

fn chrono_now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // Approximate ISO 8601 — good enough for lastPlayed
    let (y, mo, d, h, min, s) = epoch_to_parts(secs);
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.000Z", y, mo, d, h, min, s)
}

fn epoch_to_parts(secs: u64) -> (u32, u32, u32, u32, u32, u32) {
    let s = secs % 60;
    let m = (secs / 60) % 60;
    let h = (secs / 3600) % 24;
    let days = secs / 86400;
    let (y, mo, d) = days_to_ymd(days);
    (y, mo, d, h as u32, m as u32, s as u32)
}

fn days_to_ymd(mut days: u64) -> (u32, u32, u32) {
    days += 719468;
    let era = days / 146097;
    let doe = days % 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let mo = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if mo <= 2 { y + 1 } else { y };
    (y as u32, mo as u32, d as u32)
}
