/// Steam local file service — VDF parsing, install detection, Steam path lookup.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::fs;

// ─── VDF parser ───────────────────────────────────────────────

#[derive(Debug, Clone)]
pub enum VdfValue {
    String(String),
    Object(HashMap<String, VdfValue>),
}

pub fn parse_vdf(content: &str) -> HashMap<String, VdfValue> {
    let mut result: HashMap<String, VdfValue> = HashMap::new();
    let tokens: Vec<&str> = tokenize(content);
    let mut idx = 0;
    parse_object(&tokens, &mut idx, &mut result);
    result
}

fn tokenize(input: &str) -> Vec<&str> {
    let mut tokens = Vec::new();
    let bytes = input.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'"' => {
                let start = i + 1;
                let mut j = start;
                while j < bytes.len() {
                    if bytes[j] == b'\\' {
                        j += 2;
                    } else if bytes[j] == b'"' {
                        break;
                    } else {
                        j += 1;
                    }
                }
                tokens.push(&input[start..j]);
                i = j + 1;
            }
            b'{' | b'}' => {
                tokens.push(&input[i..i + 1]);
                i += 1;
            }
            b'/' if bytes.get(i + 1) == Some(&b'/') => {
                while i < bytes.len() && bytes[i] != b'\n' {
                    i += 1;
                }
            }
            b' ' | b'\t' | b'\r' | b'\n' => i += 1,
            _ => {
                let start = i;
                while i < bytes.len()
                    && !matches!(bytes[i], b' ' | b'\t' | b'\r' | b'\n' | b'"' | b'{' | b'}')
                {
                    i += 1;
                }
                if i > start {
                    tokens.push(&input[start..i]);
                }
            }
        }
    }
    tokens
}

fn parse_object<'a>(
    tokens: &[&'a str],
    idx: &mut usize,
    map: &mut HashMap<String, VdfValue>,
) {
    while *idx < tokens.len() {
        let token = tokens[*idx];
        if token == "}" {
            *idx += 1;
            return;
        }
        let key = token.to_lowercase();
        *idx += 1;
        if *idx >= tokens.len() {
            break;
        }
        let next = tokens[*idx];
        if next == "{" {
            *idx += 1;
            let mut child = HashMap::new();
            parse_object(tokens, idx, &mut child);
            map.insert(key, VdfValue::Object(child));
        } else if next == "}" {
            break;
        } else {
            map.insert(key, VdfValue::String(unescape(next)));
            *idx += 1;
        }
    }
}

fn unescape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars();
    while let Some(c) = chars.next() {
        if c == '\\' {
            match chars.next() {
                Some('n') => out.push('\n'),
                Some('t') => out.push('\t'),
                Some('"') => out.push('"'),
                Some('\\') => out.push('\\'),
                Some(c) => { out.push('\\'); out.push(c); }
                None => out.push('\\'),
            }
        } else {
            out.push(c);
        }
    }
    out
}

fn vdf_str<'a>(map: &'a HashMap<String, VdfValue>, key: &str) -> Option<&'a str> {
    match map.get(key) {
        Some(VdfValue::String(s)) => Some(s.as_str()),
        _ => None,
    }
}

fn vdf_obj<'a>(map: &'a HashMap<String, VdfValue>, key: &str) -> Option<&'a HashMap<String, VdfValue>> {
    match map.get(key) {
        Some(VdfValue::Object(o)) => Some(o),
        _ => None,
    }
}

// ─── Steam path detection ─────────────────────────────────────

pub fn find_steam_installation() -> Option<PathBuf> {
    let candidates = get_candidate_steam_paths();
    for path in candidates {
        let p = Path::new(&path);
        if p.exists() {
            let apps = p.join("steamapps");
            if apps.exists() {
                return Some(p.to_path_buf());
            }
        }
    }
    None
}

fn get_candidate_steam_paths() -> Vec<String> {
    let mut paths = Vec::new();

    #[cfg(windows)]
    {
        // 1. Registry — authoritative
        if let Some(reg_path) = read_steam_registry_path() {
            paths.push(reg_path);
        }
        // 2. Common install locations
        let pf86 = std::env::var("ProgramFiles(x86)")
            .unwrap_or_else(|_| "C:\\Program Files (x86)".to_string());
        let pf = std::env::var("ProgramFiles")
            .unwrap_or_else(|_| "C:\\Program Files".to_string());
        paths.push(format!("{}\\Steam", pf86));
        paths.push(format!("{}\\Steam", pf));
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            paths.push(format!("{}/.steam/steam", home));
            paths.push(format!("{}/.local/share/Steam", home));
            paths.push(format!("{}/.var/app/com.valvesoftware.Steam/.local/share/Steam", home));
        }
    }

    paths
}

#[cfg(windows)]
fn read_steam_registry_path() -> Option<String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let steam = hkcu.open_subkey("Software\\Valve\\Steam").ok()?;
    let path: String = steam.get_value("SteamPath").ok()?;
    Some(path.replace('/', "\\"))
}

pub fn get_library_folders(steam_path: &Path) -> Vec<PathBuf> {
    let vdf_path = steam_path.join("steamapps/libraryfolders.vdf");
    if !vdf_path.exists() {
        return vec![steam_path.to_path_buf()];
    }
    let content = match fs::read_to_string(&vdf_path) {
        Ok(c) => c,
        Err(_) => return vec![steam_path.to_path_buf()],
    };
    let parsed = parse_vdf(&content);
    let folders_map = vdf_obj(&parsed, "libraryfolders");
    let mut paths = Vec::new();
    if let Some(folders) = folders_map {
        for (_key, val) in folders.iter() {
            if let VdfValue::Object(entry) = val {
                if let Some(p) = vdf_str(entry, "path") {
                    paths.push(PathBuf::from(p));
                }
            }
        }
    }
    if paths.is_empty() {
        vec![steam_path.to_path_buf()]
    } else {
        paths
    }
}

// ─── Installed games ──────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct InstalledGame {
    pub app_id: String,
    #[allow(dead_code)] pub name: String,
    #[allow(dead_code)] pub install_path: Option<PathBuf>,
    #[allow(dead_code)] pub size_on_disk: Option<u64>,
}

pub fn get_installed_games(library_paths: &[PathBuf]) -> Vec<InstalledGame> {
    let mut games = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for lib in library_paths {
        let apps_path = lib.join("steamapps");
        let Ok(entries) = fs::read_dir(&apps_path) else { continue };

        for entry in entries.flatten() {
            let name = entry.file_name();
            let fname = name.to_string_lossy();
            if !fname.starts_with("appmanifest_") || !fname.ends_with(".acf") {
                continue;
            }
            let Ok(content) = fs::read_to_string(entry.path()) else { continue };
            let parsed = parse_vdf(&content);
            let Some(app_state) = vdf_obj(&parsed, "appstate") else { continue };

            let Some(app_id) = vdf_str(app_state, "appid") else { continue };
            let Some(game_name) = vdf_str(app_state, "name") else { continue };

            if seen.contains(app_id) { continue; }
            if is_tool_or_runtime(game_name, app_id) { continue; }
            seen.insert(app_id.to_string());

            let size_on_disk = vdf_str(app_state, "sizeondisk")
                .and_then(|s| s.parse().ok())
                .filter(|&n: &u64| n > 0);
            let install_dir = vdf_str(app_state, "installdir")
                .map(|d| apps_path.join("common").join(d));

            games.push(InstalledGame {
                app_id: app_id.to_string(),
                name: game_name.to_string(),
                install_path: install_dir,
                size_on_disk,
            });
        }
    }
    games
}

fn is_tool_or_runtime(name: &str, app_id: &str) -> bool {
    const TOOL_IDS: &[&str] = &["228980", "1070560", "1493710", "1887720", "2180100"];
    if TOOL_IDS.contains(&app_id) { return true; }
    let name_lower = name.to_lowercase();
    name_lower.contains("proton")
        || name_lower.contains("steam linux runtime")
        || name_lower.contains("steamworks")
        || name_lower.contains("redistributable")
        || name_lower.starts_with("steam ")
        || name_lower.ends_with(" sdk")
        || name_lower.contains("dedicated server")
}

// ─── Most recent user ─────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize)]
pub struct SteamStatus {
    pub installed: bool,
    #[serde(rename = "steamPath")]
    pub steam_path: Option<String>,
    #[serde(rename = "libraryPaths")]
    pub library_paths: Vec<String>,
    #[serde(rename = "userId")]
    pub user_id: Option<String>,
    pub username: Option<String>,
}

pub fn get_steam_status(steam_path: Option<&Path>) -> SteamStatus {
    let Some(path) = steam_path else {
        return SteamStatus {
            installed: false,
            steam_path: None,
            library_paths: vec![],
            user_id: None,
            username: None,
        };
    };

    let library_paths = get_library_folders(path)
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();

    let (user_id, username) = get_most_recent_user(path)
        .map(|(id, name)| (Some(id), Some(name)))
        .unwrap_or((None, None));

    SteamStatus {
        installed: true,
        steam_path: Some(path.to_string_lossy().to_string()),
        library_paths,
        user_id,
        username,
    }
}

fn get_most_recent_user(steam_path: &Path) -> Option<(String, String)> {
    let login_users = steam_path.join("config/loginusers.vdf");
    let content = fs::read_to_string(login_users).ok()?;
    let parsed = parse_vdf(&content);
    let users = vdf_obj(&parsed, "users")?;

    for (user_id, val) in users.iter() {
        if let VdfValue::Object(data) = val {
            let most_recent = vdf_str(data, "mostrecent").unwrap_or("0");
            if most_recent == "1" {
                let name = vdf_str(data, "personaname")
                    .or_else(|| vdf_str(data, "accountname"))
                    .unwrap_or("Unknown")
                    .to_string();
                return Some((user_id.clone(), name));
            }
        }
    }

    // Fallback: first user
    let first = users.iter().next()?;
    if let VdfValue::Object(data) = first.1 {
        let name = vdf_str(data, "personaname")
            .or_else(|| vdf_str(data, "accountname"))
            .unwrap_or("Unknown")
            .to_string();
        return Some((first.0.clone(), name));
    }
    None
}

/// Sync installed status: returns a map of appId → isInstalled
pub fn get_install_status_map(library_paths: &[PathBuf]) -> HashMap<String, bool> {
    get_installed_games(library_paths)
        .into_iter()
        .map(|g| (g.app_id, true))
        .collect()
}
