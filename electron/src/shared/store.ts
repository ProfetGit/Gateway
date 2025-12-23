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
        return this.data[key]
    }

    set<K extends keyof StoreData>(key: K, value: StoreData[K]): void {
        this.data[key] = value
        this.save()
    }
}
