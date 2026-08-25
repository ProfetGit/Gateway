import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RadarIcon, RefreshCw, FileWarning, CircleCheck, FolderSearch } from 'lucide-react'
import { getAchievementTrackingStatus } from '@/features/achievements/api/get-achievement-tracking-status'
import { rescanAchievementWatchers } from '@/features/achievements/api/rescan-achievement-watchers'
import type { AchievementTrackingStatus } from '@/features/achievements/api/achievement-tracking-status-schema'

interface AchievementTrackingPanelProps {
    gameId: string
}

/**
 * Read-only diagnostic for a manually-tracked game: does Gateway see a
 * recognizable tracking setup, and does it look switched on? Never edits
 * anything — the exact enable mechanism differs too much between loader
 * families to safely automate, so this only ever points at what to change.
 */
export function AchievementTrackingPanel({ gameId }: AchievementTrackingPanelProps) {
    const [status, setStatus] = useState<AchievementTrackingStatus | null>(null)
    const [isChecking, setIsChecking] = useState(false)
    const [isRescanning, setIsRescanning] = useState(false)

    const check = useCallback(async () => {
        setIsChecking(true)
        try {
            setStatus(await getAchievementTrackingStatus(gameId))
        } catch {
            setStatus(null)
        } finally {
            setIsChecking(false)
        }
    }, [gameId])

    useEffect(() => { void check() }, [check])

    const handleRescan = async () => {
        setIsRescanning(true)
        try {
            await rescanAchievementWatchers()
            await check()
        } finally {
            setIsRescanning(false)
        }
    }

    if (!status && !isChecking) return null

    const off = status?.flags.find((f) => f.enabled === false)

    return (
        <motion.div
            className="bg-void-surface border border-void-border p-4 mb-4"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <RadarIcon className="w-4 h-4 text-crimson-500" />
                    <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
                        Achievement tracking
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => void check()}
                        disabled={isChecking}
                        className="text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
                    >
                        {isChecking ? 'Checking' : 'Check again'}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleRescan()}
                        disabled={isRescanning}
                        className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-crimson-400 hover:text-crimson-300 transition-colors disabled:opacity-40"
                    >
                        <RefreshCw className={`w-3 h-3 ${isRescanning ? 'animate-spin' : ''}`} />
                        Rescan
                    </button>
                </div>
            </div>

            {status?.summary === 'active' && (
                <p className="flex items-center gap-2 text-sm text-emerald-400">
                    <CircleCheck className="w-4 h-4 shrink-0" />
                    Tracking looks active — Gateway found a save file it can read.
                </p>
            )}

            {status?.summary === 'flag-off' && off && (
                <p className="flex items-start gap-2 text-sm text-white/70">
                    <FileWarning className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>
                        Tracking looks off. Open <code className="text-crimson-300">{off.file}</code> and change{' '}
                        <code className="text-white/50">{off.key} = {off.rawValue}</code> to{' '}
                        <code className="text-emerald-400">{off.key} = 1</code>, then hit Rescan.
                    </span>
                </p>
            )}

            {status?.summary === 'no-file-yet' && (
                <p className="flex items-start gap-2 text-sm text-white/60">
                    <FolderSearch className="w-4 h-4 shrink-0 mt-0.5 text-white/40" />
                    Tracking looks enabled, but no save file exists yet — this usually appears after playing a bit.
                </p>
            )}

            {status?.summary === 'unknown' && (
                <p className="flex items-start gap-2 text-sm text-white/50">
                    <FolderSearch className="w-4 h-4 shrink-0 mt-0.5 text-white/30" />
                    No recognizable tracking setup found. If this game's loader has its own settings, check there.
                </p>
            )}
        </motion.div>
    )
}
