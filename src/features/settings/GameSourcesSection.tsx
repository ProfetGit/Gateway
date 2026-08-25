import { useState, useEffect, useCallback } from 'react'
import { Check, Download, RefreshCw } from 'lucide-react'
import { getHeroicStatus } from '@/features/game-library/api/get-heroic-status'
import { getLutrisStatus } from '@/features/game-library/api/get-lutris-status'
import { syncHeroic } from '@/features/game-library/api/sync-heroic'
import { syncLutris } from '@/features/game-library/api/sync-lutris'
import { useGameStore } from '@/features/game-library/game-store'

type SourceState = { detected: boolean; gamesCount: number } | null

export function GameSourcesSection() {
    const setGames = useGameStore((state) => state.setGames)
    const [heroic, setHeroic] = useState<SourceState>(null)
    const [lutris, setLutris] = useState<SourceState>(null)
    const [importing, setImporting] = useState<'heroic' | 'lutris' | null>(null)

    const refresh = useCallback(() => {
        getHeroicStatus()
            .then((s) => setHeroic({ detected: s.installed, gamesCount: s.gamesCount }))
            .catch(() => setHeroic({ detected: false, gamesCount: 0 }))
        getLutrisStatus()
            .then((s) => setLutris({ detected: s.installed, gamesCount: s.gamesCount }))
            .catch(() => setLutris({ detected: false, gamesCount: 0 }))
    }, [])

    useEffect(refresh, [refresh])

    const runImport = async (which: 'heroic' | 'lutris') => {
        setImporting(which)
        try {
            setGames(await (which === 'heroic' ? syncHeroic() : syncLutris()))
            refresh()
        } catch (error) {
            console.error(`Failed to import from ${which}:`, error)
        } finally {
            setImporting(null)
        }
    }

    return (
        <div className="space-y-4">
            <p className="font-mono text-[10px] text-white/40 tracking-wider uppercase">
                Gateway reads these libraries without changing them. Games still launch through
                their own app.
            </p>

            <SourceCard
                name="Heroic"
                blurb="Epic Games, GOG, and anything you added yourself"
                state={heroic}
                isImporting={importing === 'heroic'}
                onImport={() => runImport('heroic')}
            />
            <SourceCard
                name="Lutris"
                blurb="Everything in your Lutris library"
                state={lutris}
                isImporting={importing === 'lutris'}
                onImport={() => runImport('lutris')}
            />
        </div>
    )
}

type SourceCardProps = {
    name: string
    blurb: string
    state: SourceState
    isImporting: boolean
    onImport: () => void
}

function SourceCard({ name, blurb, state, isImporting, onImport }: SourceCardProps) {
    const detected = state?.detected ?? false

    return (
        <div className="bg-white/5 border border-white/10 p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-display font-black text-white uppercase tracking-tight italic">
                        {name}
                    </h3>
                    {detected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="font-mono text-[10px] text-white/40 tracking-wider mt-1">
                    {state === null
                        ? 'Checking…'
                        : detected
                          ? `${state.gamesCount} ${state.gamesCount === 1 ? 'game' : 'games'} found`
                          : `Not installed — ${blurb}`}
                </p>
            </div>

            <button
                onClick={onImport}
                disabled={!detected || isImporting}
                className="shrink-0 px-3 py-2 border border-white/15 enabled:hover:border-crimson-500/50 enabled:hover:text-crimson-300 text-white/70 font-mono text-[10px] uppercase tracking-widest font-bold transition-colors duration-100 flex items-center gap-1.5 disabled:opacity-30"
            >
                {isImporting ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                    <Download className="w-3 h-3" />
                )}
                {isImporting ? 'Importing' : 'Import'}
            </button>
        </div>
    )
}
