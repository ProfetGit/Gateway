import http from 'node:http'
import { shell } from 'electron'

// ═══════════════════════════════════════════════════════════
// Steam OpenID login — system browser + localhost callback
// ═══════════════════════════════════════════════════════════
//
// Ported from the Tauri backend's openid.rs. Opens Steam's OpenID login
// page in the user's default browser, waits for the redirect back to a
// short-lived localhost HTTP server, and extracts the SteamID64 from the
// `openid.claimed_id` query parameter.

const CALLBACK_PORT = 14200
const TIMEOUT_MS = 120_000

const OPENID_URL =
    'https://steamcommunity.com/openid/login' +
    '?openid.mode=checkid_setup' +
    '&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0' +
    '&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select' +
    '&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select' +
    '&openid.return_to=http%3A%2F%2Flocalhost%3A14200%2Fauth%2Fcallback' +
    '&openid.realm=http%3A%2F%2Flocalhost%3A14200'

export async function loginWithOpenId(): Promise<string> {
    return new Promise((resolve, reject) => {
        let settled = false
        const finish = (fn: () => void) => {
            if (settled) return
            settled = true
            clearTimeout(timeout)
            server.close()
            fn()
        }

        const server = http.createServer((req, res) => {
            const url = req.url || ''
            if (!url.startsWith('/auth/callback')) {
                res.writeHead(404).end()
                return
            }

            const steamId = extractSteamId(url)
            const body = steamId
                ? '<!DOCTYPE html><html><head><title>Gateway</title></head>' +
                  '<body style="background:#0d0d0d;color:#fff;font-family:sans-serif;' +
                  'display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
                  '<p>Signed in. You can close this tab.</p>' +
                  '<script>window.close();</script></body></html>'
                : '<!DOCTYPE html><html><body>Sign-in failed. You can close this tab.</body></html>'

            res.writeHead(200, { 'Content-Type': 'text/html', Connection: 'close' })
            res.end(body)

            if (steamId) {
                finish(() => resolve(steamId))
            } else {
                finish(() => reject(new Error('Could not read Steam ID from login response')))
            }
        })

        server.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                finish(() => reject(new Error(`Port ${CALLBACK_PORT} is already in use. Close any other app using it and try again.`)))
            } else {
                finish(() => reject(new Error(`Failed to start login server: ${err.message}`)))
            }
        })

        const timeout = setTimeout(() => {
            finish(() => reject(new Error('Steam sign-in timed out. Try again.')))
        }, TIMEOUT_MS)

        server.listen(CALLBACK_PORT, '127.0.0.1', () => {
            shell.openExternal(OPENID_URL).catch((err) => {
                finish(() => reject(new Error(`Failed to open browser: ${err.message ?? err}`)))
            })
        })
    })
}

function extractSteamId(requestUrl: string): string | null {
    const queryIndex = requestUrl.indexOf('?')
    if (queryIndex === -1) return null
    const params = new URLSearchParams(requestUrl.slice(queryIndex + 1))
    const claimedId = params.get('openid.claimed_id')
    if (!claimedId) return null
    const id = claimedId.split('/').pop() || ''
    return /^\d{15,}$/.test(id) ? id : null
}
