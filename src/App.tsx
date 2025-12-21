import { useEffect } from 'react'
import { AppShell } from './components/layout/AppShell'
import { TopNavigation } from './components/layout/TopNavigation'
import { Header } from './components/layout/Header'
import { GameGrid } from './components/game/GameGrid'
import { GameDetail } from './components/game/GameDetail'
import { AddGameModal } from './components/game/AddGameModal'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { HomeView } from './components/home/HomeView'
import { useGameStore } from './stores/gameStore'

function App() {
  const { setGames, currentView } = useGameStore()

  // Load games from store on mount (no API call)
  useEffect(() => {
    const loadGames = async () => {
      try {
        const games = await window.api?.getGames()
        if (games) {
          setGames(games)
        }
      } catch (error) {
        console.error('Failed to load games:', error)
      }
    }
    loadGames()
  }, [setGames])

  return (
    <AppShell>
      <div className="relative h-full w-full overflow-hidden">
        {/* Top Navigation - Overlay */}
        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
          <TopNavigation />
        </div>

        {/* Main Content */}
        <div className="h-full w-full">
          {currentView === 'home' ? (
            <HomeView />
          ) : (
            <div className="flex flex-col h-full pt-20"> {/* Add padding for library view */}
              <Header />
              <GameGrid />
            </div>
          )}
        </div>
      </div>

      {/* Overlays */}
      <GameDetail />
      <AddGameModal />
      <SettingsPanel />
    </AppShell>
  )
}

export default App
