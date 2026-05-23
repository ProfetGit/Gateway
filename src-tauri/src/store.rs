use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    pub id: String,
    pub title: String,
    #[serde(rename = "coverUrl", skip_serializing_if = "Option::is_none")]
    pub cover_url: Option<String>,
    #[serde(rename = "localCoverPath", skip_serializing_if = "Option::is_none")]
    pub local_cover_path: Option<String>,
    #[serde(rename = "executablePath", skip_serializing_if = "Option::is_none")]
    pub executable_path: Option<String>,
    #[serde(rename = "steamAppId", skip_serializing_if = "Option::is_none")]
    pub steam_app_id: Option<String>,
    #[serde(rename = "isInstalled")]
    pub is_installed: bool,
    #[serde(rename = "isFavorite")]
    pub is_favorite: bool,
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub playtime: Option<u64>,
    #[serde(rename = "lastPlayed", skip_serializing_if = "Option::is_none")]
    pub last_played: Option<String>,
    #[serde(rename = "sizeOnDisk", skip_serializing_if = "Option::is_none")]
    pub size_on_disk: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(rename = "launchArgs", skip_serializing_if = "Option::is_none")]
    pub launch_args: Option<String>,
    #[serde(rename = "heroImageUrl", skip_serializing_if = "Option::is_none")]
    pub hero_image_url: Option<String>,
    #[serde(rename = "logoImageUrl", skip_serializing_if = "Option::is_none")]
    pub logo_image_url: Option<String>,
    #[serde(rename = "customEnvVars", skip_serializing_if = "Option::is_none")]
    pub custom_env_vars: Option<String>,
    #[serde(rename = "appType", skip_serializing_if = "Option::is_none")]
    pub app_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Settings {
    #[serde(rename = "steamPath")]
    pub steam_path: String,
    #[serde(rename = "steamApiKey", skip_serializing_if = "Option::is_none")]
    pub steam_api_key: Option<String>,
    #[serde(rename = "hasCompletedSetup", skip_serializing_if = "Option::is_none")]
    pub has_completed_setup: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SteamUser {
    #[serde(rename = "steamId")]
    pub steam_id: String,
    pub username: String,
    #[serde(rename = "avatarUrl")]
    pub avatar_url: String,
    #[serde(rename = "profileUrl")]
    pub profile_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SteamAuthData {
    #[serde(rename = "isLoggedIn")]
    pub is_logged_in: bool,
    pub user: Option<SteamUser>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StoreData {
    #[serde(default)]
    pub games: Vec<Game>,
    #[serde(default)]
    pub settings: Settings,
    #[serde(rename = "steamAuth", skip_serializing_if = "Option::is_none")]
    pub steam_auth: Option<SteamAuthData>,
    #[serde(rename = "claimedAppIds", default)]
    pub claimed_app_ids: Vec<String>,
    #[serde(rename = "pendingClaimAppId", skip_serializing_if = "Option::is_none")]
    pub pending_claim_app_id: Option<String>,
}

pub struct JsonStore {
    file_path: PathBuf,
    data: StoreData,
}

impl JsonStore {
    pub fn new(app: &AppHandle) -> Result<Self, String> {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?;
        fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
        let file_path = app_data_dir.join("gateway-data.json");
        let data = Self::load(&file_path);
        Ok(JsonStore { file_path, data })
    }

    fn load(path: &PathBuf) -> StoreData {
        match fs::read_to_string(path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => StoreData::default(),
        }
    }

    fn save(&self) {
        if let Ok(json) = serde_json::to_string_pretty(&self.data) {
            let _ = fs::write(&self.file_path, json);
        }
    }

    pub fn get_games(&self) -> Vec<Game> {
        self.data.games.clone()
    }

    pub fn set_games(&mut self, games: Vec<Game>) {
        self.data.games = games;
        self.save();
    }

    pub fn get_settings(&self) -> Settings {
        self.data.settings.clone()
    }

    pub fn set_settings(&mut self, settings: Settings) {
        self.data.settings = settings;
        self.save();
    }

    pub fn get_steam_auth(&self) -> Option<SteamAuthData> {
        self.data.steam_auth.clone()
    }

    pub fn set_steam_auth(&mut self, auth: SteamAuthData) {
        self.data.steam_auth = Some(auth);
        self.save();
    }

    pub fn get_claimed_app_ids(&self) -> Vec<String> {
        self.data.claimed_app_ids.clone()
    }

    pub fn set_claimed_app_ids(&mut self, ids: Vec<String>) {
        self.data.claimed_app_ids = ids;
        self.save();
    }

    pub fn get_pending_claim(&self) -> Option<String> {
        self.data.pending_claim_app_id.clone()
    }

    pub fn set_pending_claim(&mut self, app_id: Option<String>) {
        self.data.pending_claim_app_id = app_id;
        self.save();
    }

    pub fn get_data_dir(&self) -> PathBuf {
        self.file_path.parent().unwrap().to_path_buf()
    }
}
