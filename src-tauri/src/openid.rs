use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::{Duration, Instant};

const CALLBACK_PORT: u16 = 14200;
const TIMEOUT_SECS: u64 = 120;

const OPENID_URL: &str = concat!(
    "https://steamcommunity.com/openid/login",
    "?openid.mode=checkid_setup",
    "&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0",
    "&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select",
    "&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select",
    "&openid.return_to=http%3A%2F%2Flocalhost%3A14200%2Fauth%2Fcallback",
    "&openid.realm=http%3A%2F%2Flocalhost%3A14200",
);

/// Opens Steam OpenID in the system browser, waits for the callback on
/// localhost:14200, extracts and returns the SteamID64.
pub async fn login_with_openid() -> Result<String, String> {
    // Bind before opening browser so the port is ready
    let listener = TcpListener::bind(format!("127.0.0.1:{}", CALLBACK_PORT))
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::AddrInUse {
                format!("Port {} is already in use. Close any other app using it and try again.", CALLBACK_PORT)
            } else {
                format!("Failed to start login server: {}", e)
            }
        })?;
    listener
        .set_nonblocking(true)
        .map_err(|e| e.to_string())?;

    // Open browser
    open::that(OPENID_URL).map_err(|e| format!("Failed to open browser: {}", e))?;

    let deadline = Instant::now() + Duration::from_secs(TIMEOUT_SECS);

    loop {
        if Instant::now() > deadline {
            return Err("Steam sign-in timed out. Try again.".to_string());
        }

        match listener.accept() {
            Ok((mut stream, _)) => {
                let mut buf = [0u8; 4096];
                let _ = stream.read(&mut buf);
                let request = String::from_utf8_lossy(&buf);

                // Extract the request path from "GET /auth/callback?... HTTP/1.1"
                let path = request
                    .lines()
                    .next()
                    .and_then(|line| line.split_whitespace().nth(1))
                    .unwrap_or("");

                if !path.starts_with("/auth/callback") {
                    let resp = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
                    let _ = stream.write_all(resp.as_bytes());
                    continue;
                }

                let steam_id = extract_steam_id(path);

                let body = if steam_id.is_some() {
                    "<!DOCTYPE html><html><head><title>Gateway</title></head>\
                    <body style=\"background:#0d0d0d;color:#fff;font-family:sans-serif;\
                    display:flex;align-items:center;justify-content:center;height:100vh;margin:0\">\
                    <p>Signed in. You can close this tab.</p>\
                    <script>window.close();</script></body></html>"
                } else {
                    "<!DOCTYPE html><html><body>Sign-in failed. You can close this tab.</body></html>"
                };

                let resp = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = stream.write_all(resp.as_bytes());

                return steam_id
                    .ok_or_else(|| "Could not read Steam ID from login response".to_string());
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                tokio::time::sleep(Duration::from_millis(50)).await;
            }
            Err(e) => return Err(format!("Login server error: {}", e)),
        }
    }
}

fn extract_steam_id(path: &str) -> Option<String> {
    // path looks like /auth/callback?openid.claimed_id=...%2Fid%2F76561198XXXXXXXXX&...
    let query = path.splitn(2, '?').nth(1)?;
    for pair in query.split('&') {
        let mut kv = pair.splitn(2, '=');
        let key = kv.next()?;
        let value = kv.next().unwrap_or("");
        if key == "openid.claimed_id" {
            let decoded = urlencoding_decode(value);
            // claimed_id ends with /id/{steamid64}
            let id = decoded.rsplit('/').next()?.to_string();
            if id.chars().all(|c| c.is_ascii_digit()) && id.len() >= 15 {
                return Some(id);
            }
        }
    }
    None
}

fn urlencoding_decode(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let bytes = input.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = (from_hex(bytes[i + 1]), from_hex(bytes[i + 2])) {
                out.push(char::from(h << 4 | l));
                i += 3;
                continue;
            }
        }
        if bytes[i] == b'+' {
            out.push(' ');
        } else {
            out.push(bytes[i] as char);
        }
        i += 1;
    }
    out
}

fn from_hex(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}
