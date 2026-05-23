use std::sync::Mutex;
use crate::store::{JsonStore, SteamAuthData, SteamUser};

pub struct StoreState(pub Mutex<JsonStore>);

#[derive(Debug, Clone, Default)]
pub struct AuthStateInner {
    pub is_logged_in: bool,
    pub user: Option<SteamUser>,
}

impl AuthStateInner {
    pub fn from_store(auth: Option<SteamAuthData>) -> Self {
        match auth {
            Some(a) if a.is_logged_in => AuthStateInner {
                is_logged_in: true,
                user: a.user,
            },
            _ => AuthStateInner::default(),
        }
    }
}

pub struct AuthState(pub Mutex<AuthStateInner>);
pub struct SteamApiKey(pub Mutex<Option<String>>);

/// In-process caches for Steam API responses (trending, free deals).
/// Each cache entry stores the serialized JSON + fetch timestamp (ms since epoch).
pub struct ApiCacheState {
    pub trending: Mutex<Option<(String, u64)>>,
    pub free_deals: Mutex<Option<(String, u64)>>,
    pub news: Mutex<std::collections::HashMap<String, (String, u64)>>,
    pub details: Mutex<std::collections::HashMap<String, (String, u64)>>,
}

impl Default for ApiCacheState {
    fn default() -> Self {
        ApiCacheState {
            trending: Mutex::new(None),
            free_deals: Mutex::new(None),
            news: Mutex::new(std::collections::HashMap::new()),
            details: Mutex::new(std::collections::HashMap::new()),
        }
    }
}
