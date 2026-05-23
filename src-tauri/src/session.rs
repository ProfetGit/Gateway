/// Steam HTTP session — plain reqwest without cookie jar.
/// The OpenID login path (system browser) doesn't give us Steam's session
/// cookies, so all session-cookie paths fall through to the API key fallback.
/// This module provides the HTTP helpers used by both session and API-key paths.

use crate::store::SteamUser;

const STEAM_COMMUNITY: &str = "https://steamcommunity.com";
const USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Gateway/1.0";

/// Resolve a SteamUser from a known steamId by scraping the public profile page.
/// Falls back to a placeholder if the profile is private or the request fails.
pub async fn resolve_current_user(steam_id: &str) -> SteamUser {
    let fallback = SteamUser {
        steam_id: steam_id.to_string(),
        username: format!("Steam User {}", &steam_id[steam_id.len().saturating_sub(4)..]),
        avatar_url: String::new(),
        profile_url: format!("{}/profiles/{}", STEAM_COMMUNITY, steam_id),
    };

    let client = build_client();

    // Try HTML profile page first
    if let Ok(res) = client
        .get(format!("{}/profiles/{}/", STEAM_COMMUNITY, steam_id))
        .send()
        .await
    {
        if res.status().is_success() {
            if let Ok(html) = res.text().await {
                let parsed = parse_profile_html(&html, steam_id);
                if !parsed.avatar_url.is_empty() || parsed.username != fallback.username {
                    return parsed;
                }
            }
        }
    }

    // Fallback: XML feed
    if let Ok(res) = client
        .get(format!("{}/profiles/{}/?xml=1", STEAM_COMMUNITY, steam_id))
        .send()
        .await
    {
        if res.status().is_success() {
            if let Ok(text) = res.text().await {
                let username = pick_xml(&text, "steamID").unwrap_or_else(|| fallback.username.clone());
                let avatar_url = pick_xml(&text, "avatarFull").unwrap_or_default();
                return SteamUser {
                    steam_id: steam_id.to_string(),
                    username,
                    avatar_url,
                    profile_url: fallback.profile_url.clone(),
                };
            }
        }
    }

    fallback
}

fn parse_profile_html(html: &str, steam_id: &str) -> SteamUser {
    let avatar_url = html
        .find("playerAvatarAutoSizeInner")
        .and_then(|pos| {
            let slice = &html[pos..];
            let img_pos = slice.find("<img")?;
            let src_pos = slice[img_pos..].find("src=\"")?;
            let start = img_pos + src_pos + 5;
            let end = slice[start..].find('"')?;
            Some(slice[start..start + end].to_string())
        })
        .or_else(|| {
            // Try _full avatar URL
            let re_start = html.find("avatars.steamstatic.com")?;
            let before = &html[..re_start];
            let quote_pos = before.rfind('"')? + 1;
            let end = html[quote_pos..].find('"')?;
            let url = &html[quote_pos..quote_pos + end];
            if url.contains("_full") || url.contains("_medium") {
                Some(url.to_string())
            } else {
                None
            }
        })
        .unwrap_or_default();

    let username = html
        .find("actual_persona_name")
        .and_then(|pos| {
            let slice = &html[pos..];
            let gt = slice.find('>')?;
            let lt = slice[gt + 1..].find('<')?;
            Some(slice[gt + 1..gt + 1 + lt].trim().to_string())
        })
        .unwrap_or_else(|| format!("Steam User {}", &steam_id[steam_id.len().saturating_sub(4)..]));

    SteamUser {
        steam_id: steam_id.to_string(),
        username: decode_html_entities(&username),
        avatar_url,
        profile_url: format!("{}/profiles/{}", STEAM_COMMUNITY, steam_id),
    }
}

pub fn pick_xml(xml: &str, tag: &str) -> Option<String> {
    // Try CDATA
    let cdata_open = format!("<{}>", tag);
    if let Some(pos) = xml.find(&cdata_open) {
        let rest = &xml[pos + cdata_open.len()..];
        if rest.starts_with("<![CDATA[") {
            let inner = &rest[9..];
            if let Some(end) = inner.find("]]>") {
                return Some(inner[..end].trim().to_string());
            }
        }
        // Plain text
        let close = format!("</{}>", tag);
        if let Some(end) = rest.find(&close) {
            return Some(decode_html_entities(rest[..end].trim()));
        }
    }
    None
}

fn decode_html_entities(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
}

pub fn build_client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_default()
}
