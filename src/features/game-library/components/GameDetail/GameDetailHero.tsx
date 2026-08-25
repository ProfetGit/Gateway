import { motion } from 'framer-motion'
import { Download, Play } from 'lucide-react'
import { Game, FetchGameDetailsResult } from '../../game-library-types'
import {
    launchBoltVariants,
    launchIconVariants,
    launchTextVariants,
    launchSubtextVariants,
    installBoltVariants,
    installIconVariants,
    installTextVariants,
    installSubtextVariants,
    hoverTransition,
    fastTransition
} from './game-detail-animations'

interface GameDetailHeroProps {
    selectedGame: Game
    bannerSrc: string | undefined
    gameDetails: FetchGameDetailsResult | null
    isInstalling: boolean
    handlePlay: () => void
    handleInstall: () => void
    handleBannerError: () => void
    formattedSize: string | undefined
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
        /* h-72 = 288px — dominant, cinematic. overflow-visible so the cover card (in modal root) can overlap. */
        <div className="relative h-72 shrink-0">
            {/* Banner — clipped to hero bounds */}
            <div className="absolute inset-0 overflow-hidden">
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
                        <div className="absolute inset-0 bg-gradient-to-t from-void-pure via-void-pure/50 to-void-pure/10" />
                        <div className="absolute inset-0 bg-gradient-to-r from-void-pure/30 via-transparent to-transparent" />
                        <div className="absolute inset-0 bg-scanlines opacity-15 pointer-events-none" />
                    </motion.div>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-crimson-950/20 via-void-deep to-void-pure" />
                )}
            </div>

            {/* Hero content — title + launch — offset right to clear cover card (left-8 + w-36 = 176px, pl-52 = 208px) */}
            <div className="absolute inset-0 flex items-end">
                <div className="flex-1 flex items-end justify-between pl-52 pr-8 pb-6 gap-8">

                    {/* Title block */}
                    <div className="min-w-0">
                        {gameDetails?.details?.developers?.[0] && (
                            <motion.p
                                className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1.5"
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                {gameDetails.details.developers[0]}
                            </motion.p>
                        )}
                        <motion.h1
                            className="text-4xl font-display font-black italic text-white leading-none tracking-tight"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            {selectedGame.title}
                        </motion.h1>
                    </div>

                    {/* Primary action — Launch / Install bolt */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 25 }}
                        className="shrink-0"
                    >
                        {selectedGame.isInstalled ? (
                            <motion.button
                                onClick={handlePlay}
                                className="group relative flex items-center gap-4 bg-transparent"
                                initial="idle"
                                whileHover="hover"
                                whileTap="tap"
                            >
                                <motion.div
                                    className="relative flex items-center justify-center w-12 h-12 bg-crimson-600 text-white z-10 will-change-transform"
                                    style={{ boxShadow: '0 0 25px oklch(0.52 0.23 25 / 0.4)' }}
                                    variants={launchBoltVariants}
                                    transition={hoverTransition}
                                >
                                    <motion.div variants={launchIconVariants}>
                                        <Play size={22} className="fill-current ml-0.5" />
                                    </motion.div>
                                </motion.div>
                                <div className="flex flex-col items-start">
                                    <motion.span
                                        className="uppercase tracking-tighter text-2xl font-display font-black italic leading-none text-white will-change-transform"
                                        variants={launchTextVariants}
                                        transition={hoverTransition}
                                    >
                                        Launch
                                    </motion.span>
                                    <motion.div
                                        className="text-[9px] font-mono tracking-[0.2em] text-crimson-500 uppercase font-bold mt-0.5"
                                        variants={launchSubtextVariants}
                                        transition={fastTransition}
                                    >
                                        Ready to play
                                    </motion.div>
                                </div>
                            </motion.button>
                        ) : (
                            <motion.button
                                onClick={handleInstall}
                                disabled={isInstalling}
                                className="group relative flex items-center gap-4 bg-transparent"
                                initial="idle"
                                whileHover="hover"
                                whileTap="tap"
                            >
                                <motion.div
                                    className="relative flex items-center justify-center w-12 h-12 border-2 border-white/30 text-white z-10 backdrop-blur-sm will-change-transform"
                                    style={{ backgroundColor: 'oklch(0.98 0.003 25 / 0.05)' }}
                                    variants={installBoltVariants}
                                    transition={hoverTransition}
                                >
                                    {isInstalling ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <motion.div variants={installIconVariants}>
                                            <Download size={20} />
                                        </motion.div>
                                    )}
                                </motion.div>
                                <div className="flex flex-col items-start">
                                    <motion.span
                                        className="uppercase tracking-tighter text-2xl font-display font-black italic leading-none text-white will-change-transform"
                                        variants={installTextVariants}
                                        transition={hoverTransition}
                                    >
                                        {isInstalling ? 'Installing' : 'Install'}
                                    </motion.span>
                                    <motion.div
                                        className="text-[9px] font-mono tracking-[0.2em] text-white/40 uppercase font-bold mt-0.5"
                                        variants={installSubtextVariants}
                                        transition={fastTransition}
                                    >
                                        {formattedSize ?? 'Not installed'}
                                    </motion.div>
                                </div>
                            </motion.button>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
