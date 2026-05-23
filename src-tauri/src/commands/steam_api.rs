use crate::state::ApiCacheState;
use crate::session::build_client;
use tauri::State;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

const TRENDING_TTL_MS: u64 = 10 * 60 * 1000;
const FREE_DEALS_TTL_MS: u64 = 10 * 60 * 1000;
const NEWS_TTL_MS: u64 = 5 * 60 * 1000;
const DETAILS_TTL_MS: u64 = 30 * 60 * 1000;

// ─── Trending ────────────────────────────────────────────────

#[tauri::command]
pub async fn get_trending_games(cache: State<'_, ApiCacheState>) -> Result<serde_json::Value, String> {
    // Check cache
    {
        let guard = cache.trending.lock().unwrap();
        if let Some((ref json, ts)) = *guard {
            if now_ms() - ts < TRENDING_TTL_MS {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(json) {
                    return Ok(serde_json::json!({ "success": true, "data": data }));
                }
            }
        }
    }

    let client = build_client();
    let res = client
        .get("https://store.steampowered.com/api/featuredcategories?cc=us&l=en")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Ok(serde_json::json!({ "success": false, "error": format!("Steam API returned {}", res.status()) }));
    }

    let raw: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;

    const HARDWARE_IDS: &[u64] = &[1675200, 1675180, 353380, 530260, 353370];
    const HARDWARE_PATTERNS: &[&str] = &[
        "steam deck", "controller", "hardware", "dock", "steam link", "valve index",
    ];

    let items: Vec<serde_json::Value> = raw["top_sellers"]["items"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|item| {
            let id = item["id"].as_u64().unwrap_or(0);
            if HARDWARE_IDS.contains(&id) {
                return false;
            }
            let name = item["name"].as_str().unwrap_or("").to_lowercase();
            !HARDWARE_PATTERNS.iter().any(|p| name.contains(p))
        })
        .take(12)
        .map(|item| {
            let id = item["id"].as_u64().unwrap_or(0);
            serde_json::json!({
                "id": id,
                "name": item["name"],
                "headerImage": item["header_image"]
                    .as_str()
                    .unwrap_or(&format!("https://steamcdn-a.akamaihd.net/steam/apps/{}/header.jpg", id))
                    .to_string(),
                "capsuleImage": item["small_capsule_image"]
                    .as_str()
                    .unwrap_or(&format!("https://steamcdn-a.akamaihd.net/steam/apps/{}/capsule_184x69.jpg", id))
                    .to_string(),
                "discountPercent": item["discount_percent"].as_u64().unwrap_or(0),
                "originalPrice": item["original_price"].as_u64().map(|p| format!("${:.2}", p as f64 / 100.0)),
                "finalPrice": item["final_price"].as_u64().map(|p| if p == 0 { "Free".to_string() } else { format!("${:.2}", p as f64 / 100.0) }),
                "windowsAvailable": item["windows_available"].as_bool().unwrap_or(true),
                "linuxAvailable": item["linux_available"].as_bool().unwrap_or(false),
                "macAvailable": item["mac_available"].as_bool().unwrap_or(false),
            })
        })
        .collect();

    let trending_data = serde_json::json!({
        "games": items,
        "fetchedAt": now_ms(),
        "source": "top_sellers"
    });

    let json_str = serde_json::to_string(&trending_data).unwrap_or_default();
    *cache.trending.lock().unwrap() = Some((json_str, now_ms()));

    Ok(serde_json::json!({ "success": true, "data": trending_data }))
}

// ─── Free deals ───────────────────────────────────────────────

#[tauri::command]
pub async fn get_free_deals(cache: State<'_, ApiCacheState>) -> Result<serde_json::Value, String> {
    {
        let guard = cache.free_deals.lock().unwrap();
        if let Some((ref json, ts)) = *guard {
            if now_ms() - ts < FREE_DEALS_TTL_MS {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(json) {
                    return Ok(serde_json::json!({ "success": true, "data": data }));
                }
            }
        }
    }

    let client = build_client();
    let res = client
        .get("https://www.gamerpower.com/api/giveaways?platform=steam&type=game")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Ok(serde_json::json!({ "success": false, "error": format!("GamerPower API returned {}", res.status()) }));
    }

    let raw: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let giveaways = raw.as_array().cloned().unwrap_or_default();

    let mut deals = Vec::new();
    for giveaway in giveaways.into_iter().take(12) {
        let raw_title = giveaway["title"].as_str().unwrap_or("").to_string();
        let clean_title = raw_title
            .trim_end_matches(" Giveaway")
            .trim_end_matches(" (Steam)")
            .to_string();

        // Search Steam for appId
        let steam_app_id = search_steam_app_id(&client, &clean_title).await;

        deals.push(serde_json::json!({
            "id": giveaway["id"],
            "title": clean_title,
            "originalPrice": giveaway["worth"],
            "thumbnail": giveaway["thumbnail"],
            "image": giveaway["image"],
            "description": giveaway["description"],
            "claimUrl": giveaway["open_giveaway_url"],
            "endDate": giveaway["end_date"],
            "status": giveaway["status"],
            "steamAppId": steam_app_id
        }));
    }

    let free_deals_data = serde_json::json!({ "deals": deals, "fetchedAt": now_ms() });
    let json_str = serde_json::to_string(&free_deals_data).unwrap_or_default();
    *cache.free_deals.lock().unwrap() = Some((json_str, now_ms()));

    Ok(serde_json::json!({ "success": true, "data": free_deals_data }))
}

async fn search_steam_app_id(client: &reqwest::Client, name: &str) -> Option<String> {
    let url = format!(
        "https://store.steampowered.com/api/storesearch/?term={}&l=en&cc=US",
        urlencoding::encode(name)
    );
    let res = client.get(&url).send().await.ok()?;
    let data: serde_json::Value = res.json().await.ok()?;
    let items = data["items"].as_array()?;
    let exact = items.iter().find(|i| {
        i["name"].as_str().map(|n| n.to_lowercase()) == Some(name.to_lowercase())
    });
    let item = exact.or_else(|| items.first())?;
    Some(item["id"].as_u64()?.to_string())
}

// ─── Game news ────────────────────────────────────────────────

#[tauri::command]
pub async fn get_game_news(
    cache: State<'_, ApiCacheState>,
    app_id: String,
    count: Option<u32>,
) -> Result<serde_json::Value, String> {
    let count = count.unwrap_or(10);
    {
        let guard = cache.news.lock().unwrap();
        if let Some((ref json, ts)) = guard.get(&app_id) {
            if now_ms() - ts < NEWS_TTL_MS {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(json) {
                    return Ok(data);
                }
            }
        }
    }

    let url = format!(
        "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/\
         ?appid={}&count={}&maxlength=0&format=json&feeds=steam_community_announcements",
        app_id, count
    );
    let client = build_client();
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Ok(serde_json::json!({ "success": false, "news": [], "totalCount": 0, "error": format!("Steam API returned {}", res.status()), "errorCode": "NETWORK_ERROR" }));
    }
    let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;

    let empty = vec![];
    let newsitems = data["appnews"]["newsitems"].as_array().unwrap_or(&empty);
    let news: Vec<serde_json::Value> = newsitems
        .iter()
        .map(|item| {
            serde_json::json!({
                "gid": item["gid"],
                "title": item["title"],
                "url": item["url"],
                "author": item["author"].as_str().unwrap_or("Unknown"),
                "contents": item["contents"],
                "feedlabel": item["feedlabel"],
                "feedname": item["feedname"],
                "date": item["date"],
                "appId": data["appnews"]["appid"].to_string().trim_matches('"').to_string()
            })
        })
        .collect();

    let result = serde_json::json!({
        "success": true,
        "news": news,
        "totalCount": data["appnews"]["count"].as_u64().unwrap_or(0)
    });

    let json_str = serde_json::to_string(&result).unwrap_or_default();
    cache.news.lock().unwrap().insert(app_id, (json_str, now_ms()));

    Ok(result)
}

// ─── Game details ─────────────────────────────────────────────

#[tauri::command]
pub async fn get_game_details(
    cache: State<'_, ApiCacheState>,
    app_id: String,
) -> Result<serde_json::Value, String> {
    {
        let guard = cache.details.lock().unwrap();
        if let Some((ref json, ts)) = guard.get(&app_id) {
            if now_ms() - ts < DETAILS_TTL_MS {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(json) {
                    return Ok(data);
                }
            }
        }
    }

    let url = format!(
        "https://store.steampowered.com/api/appdetails?appids={}&l=en",
        app_id
    );
    let client = build_client();
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Ok(serde_json::json!({ "success": false, "details": null, "error": format!("Steam API returned {}", res.status()), "errorCode": "API_ERROR" }));
    }
    let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let app_data = &data[&app_id];
    if !app_data["success"].as_bool().unwrap_or(false) {
        return Ok(serde_json::json!({ "success": false, "details": null, "error": "Game details not found", "errorCode": "API_ERROR" }));
    }
    let d = &app_data["data"];
    let details = serde_json::json!({
        "appId": app_id,
        "name": d["name"],
        "shortDescription": d["short_description"].as_str().unwrap_or(""),
        "detailedDescription": d["detailed_description"].as_str().unwrap_or(""),
        "developers": d["developers"].as_array().cloned().unwrap_or_default(),
        "publishers": d["publishers"].as_array().cloned().unwrap_or_default(),
        "releaseDate": d["release_date"]["date"].as_str().unwrap_or("Unknown"),
        "metacriticScore": d["metacritic"]["score"],
        "metacriticUrl": d["metacritic"]["url"],
        "pcRequirements": {
            "minimum": d["pc_requirements"]["minimum"],
            "recommended": d["pc_requirements"]["recommended"]
        },
        "genres": d["genres"].as_array().map(|arr| arr.iter().map(|g| &g["description"]).collect::<Vec<_>>()).unwrap_or_default(),
        "categories": d["categories"].as_array().map(|arr| arr.iter().map(|c| &c["description"]).collect::<Vec<_>>()).unwrap_or_default(),
    });

    let result = serde_json::json!({ "success": true, "details": details });
    let json_str = serde_json::to_string(&result).unwrap_or_default();
    cache.details.lock().unwrap().insert(app_id, (json_str, now_ms()));
    Ok(result)
}

// urlencoding helper (avoid adding dependency just for this)
mod urlencoding {
    pub fn encode(input: &str) -> String {
        let mut out = String::with_capacity(input.len() * 3);
        for byte in input.bytes() {
            match byte {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9'
                | b'-' | b'_' | b'.' | b'~' => out.push(byte as char),
                b' ' => out.push('+'),
                b => out.push_str(&format!("%{:02X}", b)),
            }
        }
        out
    }
}
