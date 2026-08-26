import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { StoreData } from './types'

export class JsonStore {
    private filePath: string
    private data: StoreData

    constructor() {
        const userDataPath = app.getPath('userData')
        this.filePath = path.join(userDataPath, 'gateway-data.json')
        this.data = this.load()
    }

    private get backupPath(): string {
        return `${this.filePath}.bak`
    }

    private static empty(): StoreData {
        return {
            games: [],
            settings: { steamPath: '' },
            claimedAppIds: [],
            pendingClaimAppId: null,
        }
    }

    private readFile(filePath: string): StoreData | null {
        try {
            if (!fs.existsSync(filePath)) return null
            const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
            // A truncated write can still parse as valid JSON of the wrong
            // shape, so check for the one field everything depends on.
            if (!parsed || !Array.isArray(parsed.games)) return null
            return parsed as StoreData
        } catch (error) {
            console.error(`[Store] Could not read ${filePath}:`, error)
            return null
        }
    }

    private load(): StoreData {
        const primary = this.readFile(this.filePath)
        if (primary) return primary

        // Never silently start empty on top of an existing file — the next
        // save() would overwrite it and destroy the only copy of the library.
        if (fs.existsSync(this.filePath)) {
            const quarantine = `${this.filePath}.corrupt-${Date.now()}`
            try {
                fs.renameSync(this.filePath, quarantine)
                console.error(`[Store] Data file unreadable, preserved at ${quarantine}`)
            } catch (error) {
                console.error('[Store] Could not quarantine the unreadable data file:', error)
            }
        }

        const backup = this.readFile(this.backupPath)
        if (backup) {
            console.warn(`[Store] Recovered ${backup.games.length} game(s) from the backup file`)
            return backup
        }

        return JsonStore.empty()
    }

    /**
     * Write atomically: a full serialize into a temp file, flushed to disk,
     * then renamed over the target. rename(2) is atomic within a filesystem,
     * so a crash mid-write leaves the previous file intact rather than a
     * truncated one. The store is rewritten in full on every set(), and syncs
     * call set() hundreds of times, so the exposure is real.
     */
    private save(): void {
        const tempPath = `${this.filePath}.tmp`
        try {
            const serialized = JSON.stringify(this.data, null, 2)

            const handle = fs.openSync(tempPath, 'w')
            try {
                fs.writeFileSync(handle, serialized)
                fs.fsyncSync(handle)
            } finally {
                fs.closeSync(handle)
            }

            // Keep the last known-good copy before replacing it.
            if (fs.existsSync(this.filePath)) {
                try {
                    fs.copyFileSync(this.filePath, this.backupPath)
                } catch (error) {
                    console.warn('[Store] Could not refresh the backup file:', error)
                }
            }

            fs.renameSync(tempPath, this.filePath)
        } catch (error) {
            console.error('Failed to save store:', error)
            fs.rmSync(tempPath, { force: true })
        }
    }

    get<K extends keyof StoreData>(key: K): StoreData[K] {
        const value = this.data[key]
        // Hand back a copy of the array so a caller holding it cannot silently
        // reshape stored state without going through set()/updateGames().
        return (Array.isArray(value) ? [...value] : value) as StoreData[K]
    }

    set<K extends keyof StoreData>(key: K, value: StoreData[K]): void {
        this.data[key] = value
        this.save()
    }

    /**
     * Atomic read-modify-write for the library.
     *
     * The hazard this exists to kill: several code paths read the games array,
     * `await` something slow (a cover download, an appdetails lookup), then
     * write their now-stale snapshot back — erasing every row written in the
     * meantime. That is how a Heroic import vanished when a Steam refresh's
     * background cover mirroring finished after it.
     *
     * Anything that awaits between reading and writing must go through here,
     * so the mutation is applied to whatever the library looks like *now*.
     */
    updateGames(mutate: (games: StoreData['games']) => StoreData['games']): StoreData['games'] {
        const next = mutate([...this.data.games])
        this.data.games = next
        this.save()
        return next
    }

    getDataDir(): string {
        return path.dirname(this.filePath)
    }
}
