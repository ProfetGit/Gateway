use crate::state::{AuthState, SteamApiKey, StoreState};
use crate::steam_auth::{enrich_user_with_api_key, get_auth_state_inner};
use tauri::{Emitter, AppHandle, State};

#[tauri::command]
pub async fn get_setup_state(
    store: State<'_, StoreState>,
    auth: State<'_, AuthState>,
    api_key: State<'_, SteamApiKey>,
) -> Result<serde_json::Value, String> {
    let locked = store.0.lock().unwrap();
    let settings = locked.get_settings();
    let games = locked.get_games();
    drop(locked);
    let inner = get_auth_state_inner(&auth);
    Ok(serde_json::json!({
        "hasCompletedSetup": settings.has_completed_setup.unwrap_or(false),
        "hasApiKey": api_key.0.lock().unwrap().is_some(),
        "isSteamLoggedIn": inner.is_logged_in,
        "hasGames": !games.is_empty()
    }))
}

#[tauri::command]
pub async fn mark_setup_complete(store: State<'_, StoreState>) -> Result<(), String> {
    let mut locked = store.0.lock().unwrap();
    let mut settings = locked.get_settings();
    settings.has_completed_setup = Some(true);
    locked.set_settings(settings);
    Ok(())
}

#[tauri::command]
pub async fn set_steam_api_key(
    app: AppHandle,
    store: State<'_, StoreState>,
    auth: State<'_, AuthState>,
    api_key_state: State<'_, SteamApiKey>,
    key: String,
) -> Result<serde_json::Value, String> {
    let trimmed = key.trim().to_string();

    if trimmed.is_empty() {
        let mut locked = store.0.lock().unwrap();
        let mut settings = locked.get_settings();
        settings.steam_api_key = None;
        locked.set_settings(settings);
        *api_key_state.0.lock().unwrap() = None;
        return Ok(serde_json::json!({ "success": true, "hasKey": false }));
    }

    // Validate key + check profile visibility
    let inner = get_auth_state_inner(&auth);
    if inner.is_logged_in {
        if let Some(ref user) = inner.user {
            let url = format!(
                "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/\
                 ?key={}&steamids={}",
                trimmed, user.steam_id
            );
            let client = crate::session::build_client();
            match client.get(&url).send().await {
                Ok(res) if !res.status().is_success() => {
                    return Ok(serde_json::json!({
                        "success": false, "hasKey": false, "error": "Invalid API key"
                    }));
                }
                Ok(res) => {
                    if let Ok(data) = res.json::<serde_json::Value>().await {
                        let player = &data["response"]["players"][0];
                        let visibility = player["communityvisibilitystate"].as_u64().unwrap_or(0);
                        if visibility != 3 {
                            return Ok(serde_json::json!({
                                "success": false,
                                "hasKey": false,
                                "error": "Your Steam profile is set to private. Set Game details to Public in Steam privacy settings."
                            }));
                        }
                        // Backfill avatar if missing
                        if inner.user.as_ref().map(|u| u.avatar_url.is_empty()).unwrap_or(false) {
                            if let Some(enriched) =
                                enrich_user_with_api_key(&user.steam_id, &trimmed).await
                            {
                                let new_inner = crate::state::AuthStateInner {
                                    is_logged_in: true,
                                    user: Some(enriched.clone()),
                                };
                                *auth.0.lock().unwrap() = new_inner;
                                let auth_data = crate::store::SteamAuthData {
                                    is_logged_in: true,
                                    user: Some(enriched),
                                };
                                store.0.lock().unwrap().set_steam_auth(auth_data.clone());
                                let _ = app.emit(
                                    "auth-state-updated",
                                    serde_json::json!({
                                        "isLoggedIn": auth_data.is_logged_in,
                                        "user": auth_data.user
                                    }),
                                );
                            }
                        }
                    }
                }
                Err(_) => {} // Network error — save anyway
            }
        }
    }

    let mut locked = store.0.lock().unwrap();
    let mut settings = locked.get_settings();
    settings.steam_api_key = Some(trimmed.clone());
    locked.set_settings(settings);
    *api_key_state.0.lock().unwrap() = Some(trimmed);

    Ok(serde_json::json!({ "success": true, "hasKey": true }))
}

#[tauri::command]
pub async fn get_steam_api_key(store: State<'_, StoreState>) -> Result<String, String> {
    Ok(store
        .0
        .lock()
        .unwrap()
        .get_settings()
        .steam_api_key
        .unwrap_or_default())
}
