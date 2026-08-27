import { HardDrive, PackagePlus } from 'lucide-react'
import { CornerBrackets } from '@/components/ui/CornerBrackets'

export type AddGameChooseProps = {
    onPickFile: () => void
    onRunInstaller: () => void
    onSkipFile: () => void
}

/**
 * Step one is a decision, not a form. Each tile performs its action straight
 * away — the left one opens the file dialog, so choosing costs no more clicks
 * than the old "Browse" button did, and the two ways to add a game stop being
 * a mode switch buried above fields it invalidates.
 */
export function AddGameChoose({ onPickFile, onRunInstaller, onSkipFile }: AddGameChooseProps) {
    return (
        <>
            <div className="grid grid-cols-2 gap-3.5">
                <Tile
                    icon={<HardDrive className="w-6 h-6" />}
                    title="The game is already on my computer"
                    hint="Pick the file you start it with. We fill in the rest."
                    onClick={onPickFile}
                />
                <Tile
                    icon={<PackagePlus className="w-6 h-6" />}
                    title="I have an installer to run"
                    hint="A Windows setup file. We run it and find the game after."
                    onClick={onRunInstaller}
                />
            </div>

            <button
                type="button"
                onClick={onSkipFile}
                className="block mx-auto mt-4 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/32 hover:text-white/70 border-b border-transparent hover:border-void-border transition-[color,border-color] duration-100 ease-out-expo"
            >
                Add a game I have no file for
            </button>
        </>
    )
}

function Tile({
    icon, title, hint, onClick,
}: { icon: React.ReactNode; title: string; hint: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative overflow-hidden text-left p-5 bg-void-deep border border-void-border hover:border-crimson-500 hover:-translate-y-[3px] transition-[border-color,transform] duration-100 ease-out-expo focus:outline-none focus-visible:border-crimson-500"
        >
            <CornerBrackets colorClass="border-crimson-500" size={20} thickness={2} />
            <span className="block text-crimson-400">{icon}</span>
            <span className="block mt-3.5 text-[15px] font-bold leading-tight text-white">{title}</span>
            <span className="block mt-1.5 text-xs leading-relaxed text-white/45">{hint}</span>
        </button>
    )
}
