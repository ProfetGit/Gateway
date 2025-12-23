import { motion } from 'framer-motion'
import { Download, Play, Terminal } from 'lucide-react'
import { Game } from '../../../types/game'
import { FetchGameDetailsResult } from '../../../types/game'
import {
    launchBoltVariants,
    launchIconVariants,
    launchTextVariants,
    launchSubtextVariants,
    installBoltVariants,
    installIconVariants,
    installTextVariants,
    installSubtextVariants,
    springTransition,
    fastTransition
} from './animations'

interface GameDetailHeroProps {
    selectedGame: Game
    bannerSrc: string | undefined
    gameDetails: FetchGameDetailsResult | null
    isInstalling: boolean
    handlePlay: () => void
    handleInstall: () => void
    handleBannerError: () => void
    formattedSize: string
}

export function GameDetailHero({
    selectedGame,
    bannerSrc,
    gameDetails,
    isInstalling,
    handlePlay,
    handleInstall,
    handleBannerError,
    formattedSize
}: GameDetailHeroProps) {
    return (
        <div className="relative h-[200px] shrink-0 overflow-hidden">
            {bannerSrc ? (
                <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <img
                        src={bannerSrc}
                        className="w-full h-full object-cover"
                        alt=""
                        onError={handleBannerError}
                    />
                    {/* Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-t from-void-pure via-void-pure/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-void-pure/60 via-transparent to-void-pure/30" />
                    {/* Scanlines */}
                    <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none" />
                </motion.div>
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-crimson-950/30 via-void-deep to-void-pure" />
            )}

            {/* Title & Launch */}
            <div className="absolute inset-0 flex items-end p-6">
                <div className="flex-1 max-w-3xl">
                    {/* Developer tag */}
                    {gameDetails?.details?.developers?.[0] && (
                        <motion.div
                            className="flex items-center gap-2 mb-2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Terminal size={10} className="text-crimson-500" />
                            <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                                {gameDetails.details.developers[0]}
                            </span>
                        </motion.div>
                    )}

                    <motion.h1
                        className="text-4xl font-display font-black text-white leading-none tracking-tight drop-shadow-lg"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {selectedGame.title}
                    </motion.h1>
                </div>

                {/* Primary Action — Floating Bolt Style (inspired by HomeView hero) */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 25 }}
                >
                    {selectedGame.isInstalled ? (
                        <motion.button
                            onClick={handlePlay}
                            className="group relative flex items-center gap-4 bg-transparent pr-4"
                            initial="idle"
                            whileHover="hover"
                            whileTap="tap"
                        >
                            {/* The Bolt (Icon) */}
                            <motion.div
                                className="relative flex items-center justify-center w-12 h-12 bg-crimson-600 text-white rounded-md z-10 will-change-transform"
                                style={{ boxShadow: '0 0 25px rgba(220, 38, 38, 0.4)' }}
                                variants={launchBoltVariants}
                                transition={springTransition}
                            >
                                <motion.div variants={launchIconVariants}>
                                    <Play size={22} className="fill-current ml-0.5" />
                                </motion.div>
                            </motion.div>

                            {/* The Impact (Text) */}
                            <div className="flex flex-col items-start">
                                <motion.span
                                    className="uppercase tracking-tighter text-2xl font-display font-black italic leading-none text-white will-change-transform"
                                    variants={launchTextVariants}
                                    transition={springTransition}
                                >
                                    Launch
                                </motion.span>
                                <motion.div
                                    className="flex items-center gap-1.5 text-[9px] font-mono tracking-[0.2em] text-crimson-500 uppercase font-bold mt-0.5"
                                    variants={launchSubtextVariants}
                                    transition={fastTransition}
                                >
                                    <span className="w-1.5 h-1.5 bg-crimson-500 rounded-full animate-pulse" />
                                    Ready to play
                                </motion.div>
                            </div>
                        </motion.button>
                    ) : (
                        <motion.button
                            onClick={handleInstall}
                            disabled={isInstalling}
                            className="group relative flex items-center gap-4 bg-transparent pr-4"
                            initial="idle"
                            whileHover="hover"
                            whileTap="tap"
                        >
                            {/* The Bolt (Icon) — Ghost style for install */}
                            <motion.div
                                className="relative flex items-center justify-center w-12 h-12 border-2 border-white/30 text-white rounded-md z-10 backdrop-blur-sm will-change-transform"
                                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                variants={installBoltVariants}
                                transition={springTransition}
                            >
                                {isInstalling ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <motion.div variants={installIconVariants}>
                                        <Download size={20} />
                                    </motion.div>
                                )}
                            </motion.div>

                            {/* The Impact (Text) */}
                            <div className="flex flex-col items-start">
                                <motion.span
                                    className="uppercase tracking-tighter text-2xl font-display font-black italic leading-none text-white will-change-transform"
                                    variants={installTextVariants}
                                    transition={springTransition}
                                >
                                    {isInstalling ? 'Installing' : 'Install'}
                                </motion.span>
                                <motion.div
                                    className="flex items-center gap-1.5 text-[9px] font-mono tracking-[0.2em] text-white/40 uppercase font-bold mt-0.5"
                                    variants={installSubtextVariants}
                                    transition={fastTransition}
                                >
                                    {isInstalling && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
                                    {formattedSize}
                                </motion.div>
                            </div>
                        </motion.button>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
