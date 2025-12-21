import { useEffect } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Sidebar } from './components/layout/Sidebar'
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
      <div className="flex h-full">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentView === 'home' ? (
            <HomeView />
          ) : (
            <>
              <Header />
              <GameGrid />
            </>
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
