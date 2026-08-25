import { motion } from 'framer-motion'
import { X, User as UserIcon, Library, Info, Boxes } from 'lucide-react'

export type SettingsTabId = 'account' | 'library' | 'sources' | 'about'

export type SettingsHeaderProps = {
    tab: SettingsTabId
    setTab: (t: SettingsTabId) => void
    libraryCount: number
    onClose: () => void
}

export function SettingsHeader({ tab, setTab, libraryCount, onClose }: SettingsHeaderProps) {
    return (
        <div className="relative shrink-0 border-b border-white/10 bg-void-pure">
            <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-display font-black text-white italic tracking-tighter uppercase transform -skew-x-6">
                        Settings
                        <span className="text-white/15 ml-2 text-lg">///</span>
                    </h2>
                </div>
                <button
                    onClick={onClose}
                    className="group relative p-2.5 hover:bg-white/5 transition-colors duration-100 border border-white/10 hover:border-crimson-500/50"
                >
                    <X className="w-4 h-4 text-white/60 group-hover:text-crimson-500 transition-colors duration-100" />
                </button>
            </div>

            <div className="px-6 flex items-center gap-1">
                <TabButton id="account" active={tab} setTab={setTab} icon={<UserIcon className="w-3.5 h-3.5" />} label="Account" />
                <TabButton id="library" active={tab} setTab={setTab} icon={<Library className="w-3.5 h-3.5" />} label="Library" badge={libraryCount} />
                <TabButton id="sources" active={tab} setTab={setTab} icon={<Boxes className="w-3.5 h-3.5" />} label="Sources" />
                <TabButton id="about" active={tab} setTab={setTab} icon={<Info className="w-3.5 h-3.5" />} label="About" />
            </div>
        </div>
    )
}

function TabButton({ id, active, setTab, icon, label, badge }: { id: SettingsTabId, active: SettingsTabId, setTab: (t: SettingsTabId) => void, icon: React.ReactNode, label: string, badge?: number }) {
    const isActive = active === id
    return (
        <button
            onClick={() => setTab(id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest font-bold transition-colors duration-100 ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
        >
            {icon}
            <span>{label}</span>
            {typeof badge === 'number' && badge > 0 && (
                <span className={`text-[9px] font-mono tracking-wider ${isActive ? 'text-crimson-400' : 'text-white/30'}`}>
                    {badge}
                </span>
            )}
            {isActive && (
                <motion.div
                    layoutId="settings-tab-underline"
                    className="absolute -bottom-px left-0 right-0 h-0.5 bg-crimson-500"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
            )}
        </button>
    )
}
