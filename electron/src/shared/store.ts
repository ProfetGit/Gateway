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

    private load(): StoreData {
        try {
            if (fs.existsSync(this.filePath)) {
                const content = fs.readFileSync(this.filePath, 'utf-8')
                return JSON.parse(content)
            }
        } catch (error) {
            console.error('Failed to load store:', error)
        }
        return {
            games: [],
            settings: { steamPath: '' },
            claimedAppIds: [],
            pendingClaimAppId: null
        }
    }

    private save(): void {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2))
        } catch (error) {
            console.error('Failed to save store:', error)
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
