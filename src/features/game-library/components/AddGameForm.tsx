import { motion } from 'framer-motion'
import { FolderOpen, Image } from 'lucide-react'

export type AddGameFormProps = {
    title: string
    setTitle: (v: string) => void
    coverUrl: string
    setCoverUrl: (v: string) => void
    executablePath: string
    setExecutablePath: (v: string) => void
    onSelectImage: () => void
    onSelectExecutable: () => void
}

export function AddGameForm({
    title, setTitle, coverUrl, setCoverUrl, executablePath, setExecutablePath,
    onSelectImage, onSelectExecutable,
}: AddGameFormProps) {
    return (
        <>
            {/* Title */}
            <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-2">
                    Title *
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Game title"
                    required
                    className="
              w-full px-4 py-2.5
              bg-void-surface border border-void-border rounded-lg
              text-text-primary placeholder:text-text-ghost
              focus:outline-none focus:border-crimson-900/50 focus:ring-1 focus:ring-crimson-900/30
              transition-all duration-200
            "
                />
            </div>

            {/* Cover Image */}
            <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-2">
                    Cover Image
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={coverUrl}
                        onChange={(e) => setCoverUrl(e.target.value)}
                        placeholder="Image link or pick a file"
                        className="
                flex-1 px-4 py-2.5
                bg-void-surface border border-void-border rounded-lg
                text-text-primary placeholder:text-text-ghost font-mono text-sm
                focus:outline-none focus:border-crimson-900/50 focus:ring-1 focus:ring-crimson-900/30
                transition-all duration-200
              "
                    />
                    <motion.button
                        type="button"
                        onClick={onSelectImage}
                        className="px-3 py-2.5 bg-void-surface border border-void-border rounded-lg text-text-muted hover:text-text-primary transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Image className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>

            {/* Executable */}
            <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-2">
                    Game File
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={executablePath}
                        onChange={(e) => setExecutablePath(e.target.value)}
                        placeholder="Where the game lives on your computer"
                        className="
                flex-1 px-4 py-2.5
                bg-void-surface border border-void-border rounded-lg
                text-text-primary placeholder:text-text-ghost font-mono text-sm
                focus:outline-none focus:border-crimson-900/50 focus:ring-1 focus:ring-crimson-900/30
                transition-all duration-200
              "
                    />
                    <motion.button
                        type="button"
                        onClick={onSelectExecutable}
                        className="px-3 py-2.5 bg-void-surface border border-void-border rounded-lg text-text-muted hover:text-text-primary transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FolderOpen className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>
        </>
    )
}
