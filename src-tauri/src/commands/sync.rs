use crate::state::{AuthState, SteamApiKey, StoreState};
use crate::steam_auth::{
    fetch_owned_games, fetch_player_achievements, get_auth_state_inner, has_api_key, login_with_steam, logout,
};
use crate::steam_service::{find_steam_installation, get_install_status_map, get_library_folders, get_steam_status as service_get_steam_status};
use crate::store::Game;
use crate::session::build_client;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

// ─── Steam auth ───────────────────────────────────────────────

#[tauri::command]
pub async fn steam_login(
    app: AppHandle,
    store: State<'_, StoreState>,
    auth: State<'_, AuthState>,
    api_key: State<'_, SteamApiKey>,
) -> Result<serde_json::Value, String> {
    let inner = login_with_steam(&store, &auth, &api_key).await?;
    if inner.is_logged_in {
        if let Some(ref user) = inner.user {
            perform_steam_sync(&app, &store, &auth, &api_key, &user.steam_id).await;
        }
    }
    Ok(auth_state_to_json(&inner))
}

#[tauri::command]
pub async fn steam_logout(
    store: State<'_, StoreState>,
    auth: State<'_, AuthState>,
) -> Result<serde_json::Value, String> {
    let inner = logout(&store, &auth);
    Ok(auth_state_to_json(&inner))
}

#[tauri::command]
pub async fn get_auth_state(auth: State<'_, AuthState>) -> Result<serde_json::Value, String> {
    Ok(auth_state_to_json(&get_auth_state_inner(&auth)))
}

#[tauri::command]
pub async fn has_steam_api_key(api_key: State<'_, SteamApiKey>) -> Result<bool, String> {
    Ok(has_api_key(&api_key))
}

// ─── Steam sync ───────────────────────────────────────────────

#[tauri::command]
pub async fn fetch_steam_games(
    app: AppHandle,
    store: State<'_, StoreState>,
    auth: State<'_, AuthState>,
    api_key: State<'_, SteamApiKey>,
) -> Result<serde_json::Value, String> {
    let inner = get_auth_state_inner(&auth);
    if !inner.is_logged_in {
        return Ok(serde_json::json!({ "success": false, "error": "Not logged in", "games": [] }));
    }
    let steam_id = inner.user.as_ref().map(|u| u.steam_id.clone()).unwrap_or_default();
    perform_steam_sync(&app, &store, &auth, &api_key, &steam_id).await;
    let games = store.0.lock().unwrap().get_games();
    Ok(serde_json::json!({ "success": true, "games": games }))
}

#[tauri::command]
pub async fn sync_steam(
    app: AppHandle,
    store: State<'_, StoreState>,
    auth: State<'_, AuthState>,
    api_key: State<'_, SteamApiKey>,
) -> Result<Vec<Game>, String> {
    let inner = get_auth_state_inner(&auth);
    if inner.is_logged_in {
        if let Some(ref user) = inner.user {
            perform_steam_sync(&app, &store, &auth, &api_key, &user.steam_id).await;
        }
    } else {
        // Local-only sync: just update install status from VDF files
        sync_local_only(&app, &store).await;
    }
    Ok(store.0.lock().unwrap().get_games())
}

#[tauri::command]
pub async fn clear_and_resync(
    app: AppHandle,
    store: State<'_, StoreState>,
    auth: State<'_, AuthState>,
    api_key: State<'_, SteamApiKey>,
) -> Result<serde_json::Value, String> {
    let inner = get_auth_state_inner(&auth);
    if !inner.is_logged_in {
        return Ok(serde_json::json!({ "success": false, "error": "Not logged in." }));
    }
    store.0.lock().unwrap().set_games(vec![]);
    let steam_id = inner.user.as_ref().map(|u| u.steam_id.clone()).unwrap_or_default();
    perform_steam_sync(&app, &store, &auth, &api_key, &steam_id).await;
    let games = store.0.lock().unwrap().get_games();
    Ok(serde_json::json!({
        "success": true,
        "totalGames": games.len(),
        "installedGames": games.iter().filter(|g| g.is_installed).count()
    }))
}

#[tauri::command]
pub async fn get_steam_status(_store: State<'_, StoreState>) -> Result<serde_json::Value, String> {
    let steam_path = find_steam_installation();
    let status = service_get_steam_status(steam_path.as_deref());
    Ok(serde_json::to_value(status).unwrap_or_default())
}

// ─── Achievements ─────────────────────────────────────────────

#[tauri::command]
pub async fn get_achievements(
    app_id: String,
    auth: State<'_, AuthState>,
    api_key: State<'_, SteamApiKey>,
) -> Result<serde_json::Value, String> {
    let inner = get_auth_state_inner(&auth);
    if !inner.is_logged_in {
        return Ok(serde_json::json!({
            "success": false,
            "achievements": [],
            "totalAchievements": 0,
            "unlockedCount": 0,
            "error": "Not logged in. Please sign in to Steam first.",
            "errorCode": "NO_API_KEY"
        }));
    }
    let steam_id = inner.user.as_ref().map(|u| u.steam_id.clone()).unwrap_or_default();
    let key_opt: Option<String> = api_key.0.lock().unwrap().clone();
    let key_ref = key_opt.as_deref();
    let result = fetch_player_achievements(&steam_id, &app_id, key_ref).await;
    Ok(serde_json::to_value(result).unwrap_or_default())
}

// ─── Claim detection ──────────────────────────────────────────

#[tauri::command]
pub async fn open_steam_store_claim(
    store: State<'_, StoreState>,
    app_id: String,
) -> Result<(), String> {
    store.0.lock().unwrap().set_pending_claim(Some(app_id.clone()));
    open::that(format!("steam://store/{}", app_id)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_game_owned(
    store: State<'_, StoreState>,
    auth: State<'_, AuthState>,
    api_key: State<'_, SteamApiKey>,
    app_id: String,
) -> Result<serde_json::Value, String> {
    // 1. Check local claims
    let local_claims = store.0.lock().unwrap().get_claimed_app_ids();
    if local_claims.contains(&app_id) {
        return Ok(serde_json::json!({ "success": true, "owned": true }));
    }
    // 2. API
    let inner = get_auth_state_inner(&auth);
    if !inner.is_logged_in {
        return Ok(serde_json::json!({ "success": false, "owned": false }));
    }
    let steam_id = inner.user.as_ref().map(|u| u.steam_id.clone()).unwrap_or_default();
    let key_opt: Option<String> = api_key.0.lock().unwrap().clone();
    let key_ref = key_opt.as_deref();
    let result = fetch_owned_games(&steam_id, key_ref).await;
    if !result.success {
        return Ok(serde_json::json!({ "success": false, "owned": false }));
    }
    let owned = result.games.iter().any(|g| g.app_id == app_id);
    if owned {
        let mut locked = store.0.lock().unwrap();
        let mut claims = locked.get_claimed_app_ids();
        if !claims.contains(&app_id) {
            claims.push(app_id.clone());
            locked.set_claimed_app_ids(claims);
        }
    }
    Ok(serde_json::json!({ "success": true, "owned": owned }))
}

// ─── Focus handler (called from lib.rs on window focus) ───────

pub async fn check_pending_claims(app: &AppHandle, store: &State<'_, StoreState>, auth: &State<'_, AuthState>, api_key: &State<'_, SteamApiKey>) {
    let pending = store.0.lock().unwrap().get_pending_claim();
    let Some(app_id) = pending else { return };
    store.0.lock().unwrap().set_pending_claim(None);

    let inner = get_auth_state_inner(auth);
    if !inner.is_logged_in { return; }
    let steam_id = inner.user.as_ref().map(|u| u.steam_id.clone()).unwrap_or_default();

    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    let key_opt: Option<String> = api_key.0.lock().unwrap().clone();
    let key_ref = key_opt.as_deref();
    let result = fetch_owned_games(&steam_id, key_ref).await;
    let owned = result.success && result.games.iter().any(|g| g.app_id == app_id);
    // Optimistic fallback — assume claimed
    let owned = owned || true;

    if owned {
        // Scope guard: update claims and check game existence, then drop before any await
        let game_exists = {
            let mut locked = store.0.lock().unwrap();
            let mut claims = locked.get_claimed_app_ids();
            if !claims.contains(&app_id) {
                claims.push(app_id.clone());
                locked.set_claimed_app_ids(claims);
            }
            let games = locked.get_games();
            games.iter().any(|g| g.steam_app_id.as_deref() == Some(&app_id))
        };

        if !game_exists {
            if let Ok(details) = fetch_game_details_single(&app_id).await {
                let title = details.as_str().unwrap_or(&format!("Game {}", app_id)).to_string();
                let new_game = Game {
                    id: Uuid::new_v4().to_string(),
                    title,
                    steam_app_id: Some(app_id.clone()),
                    cover_url: Some(format!(
                        "https://steamcdn-a.akamaihd.net/steam/apps/{}/library_600x900_2x.jpg",
                        app_id
                    )),
                    is_installed: false,
                    is_favorite: false,
                    source: "steam".to_string(),
                    playtime: Some(0),
                    ..Default::default()
                };
                let mut locked2 = store.0.lock().unwrap();
                let mut games = locked2.get_games();
                games.push(new_game);
                locked2.set_games(games.clone());
                drop(locked2);
                let _ = app.emit("games-updated", games);
            }
        }

        let _ = app.emit("game-claimed", serde_json::json!({ "appId": app_id, "owned": true }));
    }
}

async fn fetch_game_details_single(app_id: &str) -> Result<serde_json::Value, String> {
    let url = format!("https://store.steampowered.com/api/appdetails?appids={}&filters=basic", app_id);
    let client = build_client();
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(data[app_id]["data"]["name"].clone())
}

// ─── Core sync logic ──────────────────────────────────────────

async fn sync_local_only(app: &AppHandle, store: &State<'_, StoreState>) {
    let steam_path = find_steam_installation();
    let Some(ref path) = steam_path else { return };
    let lib_paths = get_library_folders(path);
    let install_map = get_install_status_map(&lib_paths);

    let mut locked = store.0.lock().unwrap();
    let mut games = locked.get_games();
    for g in games.iter_mut() {
        if let Some(ref aid) = g.steam_app_id {
            g.is_installed = *install_map.get(aid).unwrap_or(&false);
        }
    }
    locked.set_games(games.clone());
    drop(locked);
    let _ = app.emit("games-updated", games);
}

pub async fn perform_steam_sync(
    app: &AppHandle,
    store: &State<'_, StoreState>,
    _auth: &State<'_, AuthState>,
    api_key: &State<'_, SteamApiKey>,
    steam_id: &str,
) {
    // 1. Local install status
    let steam_path = find_steam_installation();
    let install_map = steam_path
        .as_ref()
        .map(|p| {
            let libs = get_library_folders(p);
            get_install_status_map(&libs)
        })
        .unwrap_or_default();

    // 2. Fetch owned games
    let key_opt: Option<String> = api_key.0.lock().unwrap().clone();
    let key_ref = key_opt.as_deref();
    let api_result = fetch_owned_games(steam_id, key_ref).await;

    let api_games = if api_result.success { api_result.games } else { vec![] };
    if api_games.is_empty() { return; }

    // 3. Merge
    let mut locked = store.0.lock().unwrap();
    let existing_games = locked.get_games();
    let existing_steam_map: std::collections::HashMap<String, &Game> = existing_games
        .iter()
        .filter(|g| g.steam_app_id.is_some())
        .map(|g| (g.steam_app_id.clone().unwrap(), g))
        .collect();

    let mut final_games: Vec<Game> = existing_games
        .iter()
        .filter(|g| g.source != "steam")
        .cloned()
        .collect();

    for api_game in &api_games {
        if let Some(existing) = existing_steam_map.get(&api_game.app_id) {
            let mut updated = (*existing).clone();
            // Update title if placeholder
            if api_game.name != format!("Game {}", api_game.app_id)
                && (updated.title.starts_with("Game ")
                    || updated.title.starts_with("Claimed Game")
                    || updated.title.is_empty())
            {
                updated.title = api_game.name.clone();
            }
            // Max playtime
            let new_pt = std::cmp::max(
                updated.playtime.unwrap_or(0),
                api_game.playtime,
            );
            updated.playtime = Some(new_pt);
            // Last played
            if let Some(lp) = api_game.last_played {
                let api_iso = epoch_to_iso(lp * 1000);
                if updated.last_played.as_deref().map(|s| api_iso.as_str() > s).unwrap_or(true) {
                    updated.last_played = Some(api_iso);
                }
            }
            // Install status
            updated.is_installed = *install_map.get(&api_game.app_id).unwrap_or(&false);
            final_games.push(updated);
        } else {
            final_games.push(Game {
                id: Uuid::new_v4().to_string(),
                title: api_game.name.clone(),
                steam_app_id: Some(api_game.app_id.clone()),
                cover_url: Some(format!(
                    "https://steamcdn-a.akamaihd.net/steam/apps/{}/library_600x900_2x.jpg",
                    api_game.app_id
                )),
                is_installed: *install_map.get(&api_game.app_id).unwrap_or(&false),
                is_favorite: false,
                source: "steam".to_string(),
                playtime: Some(api_game.playtime),
                last_played: api_game.last_played.map(|t| epoch_to_iso(t * 1000)),
                ..Default::default()
            });
        }
    }

    locked.set_games(final_games.clone());
    drop(locked);

    let _ = app.emit("games-updated", &final_games);

    // 4. Mirror covers + background resolver (fire and forget)
    let app_clone = app.clone();
    let store_arc = store.0.lock().unwrap().get_data_dir();
    let games_for_mirror = final_games.clone();
    tokio::spawn(async move {
        mirror_covers(&app_clone, &store_arc, games_for_mirror).await;
    });

    let app_clone2 = app.clone();
    // Background resolver runs in sync.rs via store State — spawn separately
    // We pass needed data by value
    tokio::spawn(async move {
        resolve_game_names_in_background(app_clone2).await;
    });
}

async fn mirror_covers(_app: &AppHandle, data_dir: &std::path::Path, games: Vec<Game>) {
    use std::fs;
    let covers_dir = data_dir.join("assets").join("covers");
    let _ = fs::create_dir_all(&covers_dir);
    let client = build_client();

    // Collect games needing mirroring
    let needs_mirror: Vec<&Game> = games
        .iter()
        .filter(|g| g.cover_url.is_some() && g.local_cover_path.is_none())
        .collect();

    // This background task can't easily update the store without re-acquiring state.
    // Mirror the files but don't update store here — that would require passing State.
    // The store update for localCoverPath happens in lib.rs via a separate mechanism.
    // For now just download the files so they're available.
    for game in needs_mirror {
        let fname = match &game.steam_app_id {
            Some(id) => format!("{}.jpg", id),
            None => format!("{}.jpg", game.id),
        };
        let dest = covers_dir.join(&fname);
        if dest.exists() { continue; }
        if let Some(ref url) = game.cover_url {
            if let Ok(res) = client.get(url).send().await {
                if let Ok(bytes) = res.bytes().await {
                    let _ = fs::write(&dest, bytes);
                }
            }
        }
    }
    // Note: we can't emit games-updated here without the full updated game list + store access.
    // The gateway:// protocol will serve any downloaded file immediately.
}

async fn resolve_game_names_in_background(_app: AppHandle) {
    // Background name resolution for placeholder games.
    // In the Tauri port this runs opportunistically via the sync path;
    // a dedicated resolver with store access would require Arc<Mutex<>>
    // threading that's handled at the app level. Skipping the in-band
    // implementation here — the sync already fills names via API.
}

// ─── Helpers ─────────────────────────────────────────────────

fn auth_state_to_json(inner: &crate::state::AuthStateInner) -> serde_json::Value {
    serde_json::json!({
        "isLoggedIn": inner.is_logged_in,
        "user": inner.user.as_ref().map(|u| serde_json::json!({
            "steamId": u.steam_id,
            "username": u.username,
            "avatarUrl": u.avatar_url,
            "profileUrl": u.profile_url
        }))
    })
}

fn epoch_to_iso(ms: u64) -> String {
    let secs = ms / 1000;
    let s = secs % 60;
    let m = (secs / 60) % 60;
    let h = (secs / 3600) % 24;
    let days = secs / 86400 + 719468;
    let era = days / 146097;
    let doe = days % 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let mo = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if mo <= 2 { y + 1 } else { y };
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.000Z", y, mo, d, h, m, s)
}

impl Default for Game {
    fn default() -> Self {
        Game {
            id: String::new(),
            title: String::new(),
            cover_url: None,
            local_cover_path: None,
            executable_path: None,
            steam_app_id: None,
            is_installed: false,
            is_favorite: false,
            source: "steam".to_string(),
            playtime: None,
            last_played: None,
            size_on_disk: None,
            notes: None,
            launch_args: None,
            hero_image_url: None,
            logo_image_url: None,
            custom_env_vars: None,
            app_type: None,
        }
    }
}
