import { useEffect, useState } from 'react'
import { getSetupState, getGames } from './lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell } from './components/layout/AppShell'
import { TopNavigation } from './components/layout/TopNavigation'
import { Header } from './components/layout/Header'
import { GameGrid } from './components/game/GameGrid'
import { GameDetail } from './components/game/GameDetail'
import { AddGameModal } from './components/game/AddGameModal'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { HomeView } from './components/home/HomeView'
import { ContextMenu } from './components/shared/ContextMenu'
import { AchievementHuntsDrawer } from './features/achievement-hunts'
import { OnboardingScreen } from './components/onboarding/OnboardingScreen'
import { useGameStore } from './stores/gameStore'

function App() {
  const { setGames, currentView } = useGameStore()
  const [displayedView, setDisplayedView] = useState(currentView)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [setupChecked, setSetupChecked] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Show onboarding on first run, or if the user has no account and no games
  // (covers data loss / fresh reinstall after a previous setup).
  useEffect(() => {
    getSetupState().then((state) => {
      if (state && (!state.hasCompletedSetup || (!state.isSteamLoggedIn && !state.hasGames))) {
        setShowOnboarding(true)
      }
      setSetupChecked(true)
    }).catch(() => setSetupChecked(true))
  }, [])

  // Load games from store on mount (no API call)
  useEffect(() => {
    if (!setupChecked || showOnboarding) return
    const loadGames = async () => {
      try {
        const games = await getGames()
        if (games) {
          setGames(games)
        }
      } catch (error) {
        console.error('Failed to load games:', error)
      }
    }
    loadGames()
  }, [setGames, setupChecked, showOnboarding])

  // Handle view transition with fade
  useEffect(() => {
    if (currentView !== displayedView) {
      setIsTransitioning(true)
      // Wait for fade-to-black, then swap view
      const timer = setTimeout(() => {
        setDisplayedView(currentView)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [currentView, displayedView])

  // Clear transition after view swap
  useEffect(() => {
    if (isTransitioning && displayedView === currentView) {
      const timer = setTimeout(() => {
        setIsTransitioning(false)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [displayedView, currentView, isTransitioning])

  if (!setupChecked) return null

  if (showOnboarding) {
    return (
      <OnboardingScreen
        onComplete={() => {
          setShowOnboarding(false)
          // Load games that were synced during onboarding
          getGames().then((games) => { if (games) setGames(games) }).catch(() => {})
        }}
      />
    )
  }

  return (
    <AppShell>
      <div className="relative h-full w-full overflow-hidden">
        {/* Top Navigation - Overlay */}
        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
          <TopNavigation />
        </div>

        {/* Main Content */}
        <div className="h-full w-full">
          {displayedView === 'home' ? (
            <HomeView />
          ) : (
            <div
              key="library"
              className="flex flex-col h-full pt-20 animate-[fadeSlideIn_0.3s_ease-out]"
              style={{
                // CSS keyframes defined inline for simplicity
              }}
            >
              <Header />
              <GameGrid />
            </div>
          )}
        </div>

        {/* Black fade overlay */}
        <AnimatePresence>
          {isTransitioning && (
            <motion.div
              className="absolute inset-0 bg-black z-20 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Overlays */}
      <GameDetail />
      <AddGameModal />
      <SettingsPanel />
      <AchievementHuntsDrawer />
      <ContextMenu />
    </AppShell>
  )
}

export default App

