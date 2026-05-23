use crate::session::{build_client, resolve_current_user};
use crate::state::{AuthState, AuthStateInner, SteamApiKey, StoreState};
use crate::store::{SteamAuthData, SteamUser};
use tauri::{AppHandle, State};

// ─── Getters ─────────────────────────────────────────────────

pub fn get_auth_state_inner(auth: &State<'_, AuthState>) -> AuthStateInner {
    auth.0.lock().unwrap().clone()
}

pub fn has_api_key(api_key: &State<'_, SteamApiKey>) -> bool {
    api_key.0.lock().unwrap().is_some()
}

// ─── Init on startup ─────────────────────────────────────────


/// Refresh display data for a returning user. Called once on startup.
pub async fn refresh_session_on_startup(
    store: &State<'_, StoreState>,
    auth: &State<'_, AuthState>,
    _app: &AppHandle,
) {
    let (is_logged_in, steam_id) = {
        let inner = auth.0.lock().unwrap();
        (inner.is_logged_in, inner.user.as_ref().map(|u| u.steam_id.clone()))
    };
    if !is_logged_in {
        return;
    }
    let Some(steam_id) = steam_id else { return };

    match resolve_current_user(&steam_id).await {
        user => {
            let new_inner = AuthStateInner {
                is_logged_in: true,
                user: Some(user.clone()),
            };
            *auth.0.lock().unwrap() = new_inner;
            let auth_data = SteamAuthData {
                is_logged_in: true,
                user: Some(user),
            };
            store.0.lock().unwrap().set_steam_auth(auth_data);
        }
    }
}

// ─── Login / Logout ──────────────────────────────────────────

pub async fn login_with_steam(
    store: &State<'_, StoreState>,
    auth: &State<'_, AuthState>,
    api_key: &State<'_, SteamApiKey>,
) -> Result<AuthStateInner, String> {
    let steam_id = crate::openid::login_with_openid().await?;
    let mut user = resolve_current_user(&steam_id).await;

    // Backfill avatar via API key if scraping returned empty
    if user.avatar_url.is_empty() {
        let key_opt: Option<String> = api_key.0.lock().unwrap().clone();
        if let Some(key) = key_opt {
            if let Some(enriched) = enrich_user_with_api_key(&steam_id, &key).await {
                user = enriched;
            }
        }
    }

    let new_inner = AuthStateInner {
        is_logged_in: true,
        user: Some(user.clone()),
    };
    *auth.0.lock().unwrap() = new_inner.clone();

    let auth_data = SteamAuthData {
        is_logged_in: true,
        user: Some(user),
    };
    store.0.lock().unwrap().set_steam_auth(auth_data);

    Ok(new_inner)
}

pub fn logout(store: &State<'_, StoreState>, auth: &State<'_, AuthState>) -> AuthStateInner {
    let empty = AuthStateInner::default();
    *auth.0.lock().unwrap() = empty.clone();
    let auth_data = SteamAuthData {
        is_logged_in: false,
        user: None,
    };
    store.0.lock().unwrap().set_steam_auth(auth_data);
    empty
}

// ─── Profile enrichment via API key ──────────────────────────

pub async fn enrich_user_with_api_key(steam_id: &str, api_key: &str) -> Option<SteamUser> {
    let url = format!(
        "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key={}&steamids={}",
        api_key, steam_id
    );
    let client = build_client();
    let res = client.get(&url).send().await.ok()?;
    if !res.status().is_success() {
        return None;
    }
    let data: serde_json::Value = res.json().await.ok()?;
    let player = data["response"]["players"].as_array()?.first()?.clone();
    Some(SteamUser {
        steam_id: steam_id.to_string(),
        username: player["personaname"]
            .as_str()
            .unwrap_or(&format!("Steam User {}", &steam_id[steam_id.len().saturating_sub(4)..]))
            .to_string(),
        avatar_url: player["avatarfull"]
            .as_str()
            .or_else(|| player["avatarmedium"].as_str())
            .unwrap_or_default()
            .to_string(),
        profile_url: player["profileurl"]
            .as_str()
            .unwrap_or(&format!(
                "https://steamcommunity.com/profiles/{}",
                steam_id
            ))
            .to_string(),
    })
}

// ─── Owned games ─────────────────────────────────────────────

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct OwnedGame {
    #[serde(rename = "appId")]
    pub app_id: String,
    pub name: String,
    pub playtime: u64,
    #[serde(rename = "lastPlayed", skip_serializing_if = "Option::is_none")]
    pub last_played: Option<u64>,
}

#[derive(Debug, serde::Serialize)]
pub struct FetchGamesResult {
    pub success: bool,
    pub games: Vec<OwnedGame>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(rename = "errorCode", skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
}

pub async fn fetch_owned_games(steam_id: &str, api_key: Option<&str>) -> FetchGamesResult {
    match api_key {
        Some(key) => fetch_owned_games_via_api_key(steam_id, key).await,
        None => FetchGamesResult {
            success: false,
            games: vec![],
            error: Some(
                "No Web API key configured. Sign in to Steam and add an API key in Settings."
                    .to_string(),
            ),
            error_code: Some("NO_AUTH".to_string()),
        },
    }
}

async fn fetch_owned_games_via_api_key(steam_id: &str, api_key: &str) -> FetchGamesResult {
    let url = format!(
        "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/\
         ?key={}&steamid={}&include_appinfo=1&include_played_free_games=1",
        api_key, steam_id
    );
    let client = build_client();
    let res = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) => {
            return FetchGamesResult {
                success: false,
                games: vec![],
                error: Some(format!("Network error: {}", e)),
                error_code: Some("NETWORK_ERROR".to_string()),
            }
        }
    };

    if !res.status().is_success() {
        let code = match res.status().as_u16() {
            401 => "API_ERROR",
            403 => "API_ERROR",
            429 => "RATE_LIMITED",
            _ => "API_ERROR",
        };
        return FetchGamesResult {
            success: false,
            games: vec![],
            error: Some(format!("Steam API error: {}", res.status())),
            error_code: Some(code.to_string()),
        };
    }

    let data: serde_json::Value = match res.json().await {
        Ok(d) => d,
        Err(e) => {
            return FetchGamesResult {
                success: false,
                games: vec![],
                error: Some(format!("Parse error: {}", e)),
                error_code: Some("API_ERROR".to_string()),
            }
        }
    };

    let Some(raw_games) = data["response"]["games"].as_array() else {
        if data["response"].as_object().map(|o| o.is_empty()).unwrap_or(false) {
            return FetchGamesResult {
                success: false,
                games: vec![],
                error: Some("Steam profile is private. Set Profile + Game details to Public, or sign in via the Setup wizard.".to_string()),
                error_code: Some("PROFILE_PRIVATE".to_string()),
            };
        }
        return FetchGamesResult {
            success: true,
            games: vec![],
            error: Some("No games found in library".to_string()),
            error_code: None,
        };
    };

    const UNWANTED_KEYWORDS: &[&str] = &[
        "Dedicated Server", "SDK", "Redistributable", "Shared Resources",
        "Test Server", "Beta", "Demo", "Trial", "Prototype", "Soundtrack",
        "Artbook", "Benchmark", "Editor", "Server", "Client", "macOS",
        "Linux", "Windows", "Software", "Application",
    ];
    const UNWANTED_NAMES: &[&str] = &[
        "OBS Studio", "Wallpaper Engine", "Soundpad", "ShareX", "Blender",
        "Spacewar", "SteamCMD", "Source SDK Base 2013 Singleplayer",
        "Source SDK Base 2013 Multiplayer", "Source SDK Base 2007",
        "Source SDK Base 2006", "Valve Hammer Editor", "Steamworks Common Redistributables",
        "SteamVR",
    ];

    let games: Vec<OwnedGame> = raw_games
        .iter()
        .filter_map(|g| {
            let app_id = g["appid"].as_u64()?.to_string();
            let name = g["name"].as_str().unwrap_or(&format!("Game {}", app_id)).to_string();
            if UNWANTED_NAMES.contains(&name.as_str()) {
                return None;
            }
            if UNWANTED_KEYWORDS.iter().any(|kw| name.contains(kw)) {
                return None;
            }
            Some(OwnedGame {
                app_id,
                name,
                playtime: g["playtime_forever"].as_u64().unwrap_or(0),
                last_played: g["rtime_last_played"].as_u64().filter(|&t| t > 0),
            })
        })
        .collect();

    FetchGamesResult {
        success: true,
        games,
        error: None,
        error_code: None,
    }
}

// ─── Achievements ─────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Achievement {
    pub apiname: String,
    pub name: String,
    pub description: String,
    pub achieved: bool,
    pub unlocktime: u64,
    pub icon: String,
    pub icongray: String,
}

#[derive(Debug, serde::Serialize)]
pub struct FetchAchievementsResult {
    pub success: bool,
    pub achievements: Vec<Achievement>,
    #[serde(rename = "totalAchievements")]
    pub total_achievements: usize,
    #[serde(rename = "unlockedCount")]
    pub unlocked_count: usize,
    #[serde(rename = "gameName", skip_serializing_if = "Option::is_none")]
    pub game_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(rename = "errorCode", skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
}

pub async fn fetch_player_achievements(
    steam_id: &str,
    app_id: &str,
    api_key: Option<&str>,
) -> FetchAchievementsResult {
    // Try community XML feed first (public profiles don't need a key)
    let xml_result = fetch_achievements_via_xml(steam_id, app_id).await;
    if xml_result.success || xml_result.error_code.as_deref() == Some("NO_ACHIEVEMENTS") {
        return xml_result;
    }

    // Fallback to API key
    match api_key {
        Some(key) => fetch_achievements_via_api_key(steam_id, app_id, key).await,
        None => FetchAchievementsResult {
            success: false,
            achievements: vec![],
            total_achievements: 0,
            unlocked_count: 0,
            game_name: None,
            error: Some("Not signed in. Please sign in to Steam first.".to_string()),
            error_code: Some("NO_AUTH".to_string()),
        },
    }
}

async fn fetch_achievements_via_xml(
    steam_id: &str,
    app_id: &str,
) -> FetchAchievementsResult {
    let url = format!(
        "https://steamcommunity.com/profiles/{}/stats/{}/?xml=1&l=english",
        steam_id, app_id
    );
    let client = build_client();
    let res = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) => {
            return empty_achievement_result(
                &format!("Network error: {}", e),
                "NETWORK_ERROR",
            )
        }
    };

    if !res.status().is_success() {
        let code = if matches!(res.status().as_u16(), 401 | 403) {
            "PROFILE_PRIVATE"
        } else {
            "NETWORK_ERROR"
        };
        return empty_achievement_result(&format!("HTTP {}", res.status()), code);
    }

    let xml = match res.text().await {
        Ok(t) => t,
        Err(e) => return empty_achievement_result(&e.to_string(), "NETWORK_ERROR"),
    };

    if xml.contains("g_steamID = false") || xml.contains("<title>Sign In") {
        return empty_achievement_result("No active Steam session", "NO_SESSION");
    }

    if !xml.contains("<achievements>") {
        return FetchAchievementsResult {
            success: true,
            achievements: vec![],
            total_achievements: 0,
            unlocked_count: 0,
            game_name: crate::session::pick_xml(&xml, "gameName"),
            error: None,
            error_code: Some("NO_ACHIEVEMENTS".to_string()),
        };
    }

    let game_name = crate::session::pick_xml(&xml, "gameName");
    let mut achievements = parse_achievements_xml(&xml);
    achievements.sort_by(|a, b| {
        match (a.achieved, b.achieved) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            (true, true) => b.unlocktime.cmp(&a.unlocktime),
            (false, false) => a.name.cmp(&b.name),
        }
    });
    let unlocked = achievements.iter().filter(|a| a.achieved).count();
    let total = achievements.len();

    FetchAchievementsResult {
        success: true,
        achievements,
        total_achievements: total,
        unlocked_count: unlocked,
        game_name,
        error: None,
        error_code: None,
    }
}

fn parse_achievements_xml(xml: &str) -> Vec<Achievement> {
    let mut achievements = Vec::new();
    let mut search = xml;
    while let Some(start) = search.find("<achievement") {
        let rest = &search[start..];
        // Extract optional closed="1" attribute
        let closed_attr = rest
            .splitn(2, '>')
            .next()
            .and_then(|attrs| {
                if attrs.contains("closed=\"1\"") {
                    Some(true)
                } else {
                    None
                }
            })
            .unwrap_or(false);

        let end = match rest.find("</achievement>") {
            Some(e) => e + 14,
            None => break,
        };
        let block = &rest[..end];

        let closed_inner = crate::session::pick_xml(block, "closed")
            .map(|v| v == "1")
            .unwrap_or(false);
        let achieved = closed_attr || closed_inner;

        let apiname = crate::session::pick_xml(block, "apiname").unwrap_or_default();
        let name = crate::session::pick_xml(block, "name").unwrap_or_else(|| apiname.clone());
        let description = crate::session::pick_xml(block, "description").unwrap_or_default();
        let icon = crate::session::pick_xml(block, "iconClosed").unwrap_or_default();
        let icongray = crate::session::pick_xml(block, "iconOpen").unwrap_or_default();
        let unlocktime = crate::session::pick_xml(block, "unlockTimestamp")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);

        achievements.push(Achievement {
            apiname,
            name,
            description,
            achieved,
            unlocktime,
            icon,
            icongray,
        });

        search = &rest[end..];
    }
    achievements
}

async fn fetch_achievements_via_api_key(
    steam_id: &str,
    app_id: &str,
    api_key: &str,
) -> FetchAchievementsResult {
    let client = build_client();
    let player_url = format!(
        "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/\
         ?key={}&steamid={}&appid={}&l=english",
        api_key, steam_id, app_id
    );
    let schema_url = format!(
        "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/\
         ?key={}&appid={}&l=english",
        api_key, app_id
    );

    let (player_res, schema_res) = tokio::join!(
        client.get(&player_url).send(),
        client.get(&schema_url).send()
    );

    let player_data: serde_json::Value = match player_res {
        Ok(r) if r.status().is_success() => r.json().await.unwrap_or_default(),
        Ok(r) => {
            let code = if r.status().as_u16() == 403 {
                "PROFILE_PRIVATE"
            } else {
                "API_ERROR"
            };
            return empty_achievement_result(&format!("Steam API error: {}", r.status()), code);
        }
        Err(e) => return empty_achievement_result(&e.to_string(), "NETWORK_ERROR"),
    };

    let schema_data: serde_json::Value = schema_res
        .ok()
        .and_then(|r| if r.status().is_success() { Some(r) } else { None })
        .and_then(|r| tokio::runtime::Handle::try_current().ok().map(|h| (r, h)))
        .map(|(r, _h)| {
            // We're already in async context — use block_in_place pattern.
            // Since we're using tokio::join! above, we can just return default here
            // and re-use the json from the already-completed future.
            // Actually we need to handle this differently.
            let _ = r;
            serde_json::Value::Null
        })
        .unwrap_or_default();

    // Re-fetch schema properly (already resolved above via join)
    let _ = schema_data;
    let schema_map = build_schema_map_from_api_key(app_id, api_key).await;

    let raw_achievements = match player_data["playerstats"]["achievements"].as_array() {
        Some(arr) => arr.clone(),
        None => {
            if let Some(err) = player_data["playerstats"]["error"].as_str() {
                let code = if err.contains("Private") {
                    "PROFILE_PRIVATE"
                } else {
                    "API_ERROR"
                };
                return empty_achievement_result(err, code);
            }
            return FetchAchievementsResult {
                success: true,
                achievements: vec![],
                total_achievements: 0,
                unlocked_count: 0,
                game_name: player_data["playerstats"]["gameName"].as_str().map(|s| s.to_string()),
                error: None,
                error_code: Some("NO_ACHIEVEMENTS".to_string()),
            };
        }
    };

    let mut achievements: Vec<Achievement> = raw_achievements
        .iter()
        .map(|ach| {
            let apiname = ach["apiname"].as_str().unwrap_or_default().to_string();
            let schema = schema_map.get(&apiname);
            Achievement {
                apiname: apiname.clone(),
                name: schema
                    .and_then(|s| s["name"].as_str())
                    .unwrap_or(&apiname)
                    .to_string(),
                description: ach["description"]
                    .as_str()
                    .or_else(|| schema.and_then(|s| s["description"].as_str()))
                    .unwrap_or_default()
                    .to_string(),
                achieved: ach["achieved"].as_u64().unwrap_or(0) == 1,
                unlocktime: ach["unlocktime"].as_u64().unwrap_or(0),
                icon: schema
                    .and_then(|s| s["icon"].as_str())
                    .unwrap_or_default()
                    .to_string(),
                icongray: schema
                    .and_then(|s| s["icongray"].as_str())
                    .unwrap_or_default()
                    .to_string(),
            }
        })
        .collect();

    achievements.sort_by(|a, b| match (a.achieved, b.achieved) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        (true, true) => b.unlocktime.cmp(&a.unlocktime),
        (false, false) => a.name.cmp(&b.name),
    });

    let unlocked = achievements.iter().filter(|a| a.achieved).count();
    let total = achievements.len();

    FetchAchievementsResult {
        success: true,
        achievements,
        total_achievements: total,
        unlocked_count: unlocked,
        game_name: player_data["playerstats"]["gameName"].as_str().map(|s| s.to_string()),
        error: None,
        error_code: None,
    }
}

async fn build_schema_map_from_api_key(
    app_id: &str,
    api_key: &str,
) -> std::collections::HashMap<String, serde_json::Value> {
    let url = format!(
        "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/\
         ?key={}&appid={}&l=english",
        api_key, app_id
    );
    let client = build_client();
    let data: serde_json::Value = match client.get(&url).send().await {
        Ok(r) if r.status().is_success() => r.json().await.unwrap_or_default(),
        _ => return std::collections::HashMap::new(),
    };

    let mut map = std::collections::HashMap::new();
    if let Some(arr) = data["game"]["availableGameStats"]["achievements"].as_array() {
        for ach in arr {
            if let Some(name) = ach["name"].as_str() {
                map.insert(name.to_string(), ach.clone());
            }
        }
    }
    map
}

fn empty_achievement_result(error: &str, code: &str) -> FetchAchievementsResult {
    FetchAchievementsResult {
        success: false,
        achievements: vec![],
        total_achievements: 0,
        unlocked_count: 0,
        game_name: None,
        error: Some(error.to_string()),
        error_code: Some(code.to_string()),
    }
}
