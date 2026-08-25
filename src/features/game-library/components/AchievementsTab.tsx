import type { FetchAchievementsResult } from '@/features/achievements/api/achievements-schema'
import { computeCompletionPercent } from '@/features/achievements/achievement-progress'
import { AchievementCard } from './AchievementCard'
import { AchievementsProgressHeader } from './AchievementsProgressHeader'
import { AchievementsSkeleton, AchievementsError, AchievementsEmpty } from './AchievementsTabStates'
import { AchievementTrackingPanel } from './AchievementTrackingPanel'

interface AchievementsTabProps {
    gameId: string
    data: FetchAchievementsResult | null
    isLoading: boolean
    /** Provided only for manually-tracked games. Its absence is what makes
     *  cards non-interactive for Steam-tracked games. */
    onToggle?: (apiname: string) => void
    isManual?: boolean
}

export function AchievementsTab({ gameId, data, isLoading, onToggle, isManual = false }: AchievementsTabProps) {
    const trackingPanel = isManual ? <AchievementTrackingPanel gameId={gameId} /> : null

    if (isLoading) return <>{trackingPanel}<AchievementsSkeleton /></>

    if (!data?.success && data?.error) {
        return <>{trackingPanel}<AchievementsError error={data.error} isProfilePrivate={data.errorCode === 'PROFILE_PRIVATE'} /></>
    }

    if (data?.totalAchievements === 0) return <>{trackingPanel}<AchievementsEmpty /></>

    const percentage = data ? computeCompletionPercent(data.unlockedCount, data.totalAchievements) : 0

    return (
        <div className="space-y-6">
            {trackingPanel}

            <AchievementsProgressHeader
                unlockedCount={data?.unlockedCount ?? 0}
                totalAchievements={data?.totalAchievements ?? 0}
                percentage={percentage}
                isManual={isManual}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {data?.achievements.map((achievement, index) => (
                    <AchievementCard
                        key={achievement.apiname}
                        achievement={achievement}
                        index={index}
                        onToggle={onToggle ? () => onToggle(achievement.apiname) : undefined}
                    />
                ))}
            </div>
        </div>
    )
}
