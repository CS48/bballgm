"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TeamRoster } from "./team-roster"
import { OpponentSelection } from "./opponent-selection"
import { GameResultComponent } from "./game-result"
import { SettingsMenu } from "./settings-menu"
import { HomeHub } from "./home-hub"
import { GameWatch } from "./game-watch"
import { useLeague } from "@/lib/context/league-context"
import { convertDatabaseTeamToGameTeam } from "@/lib/types/game-simulation"
import type { Team } from "@/lib/types/database"
import type { GameSimulationTeam } from "@/lib/types/game-simulation"

interface MainMenuProps {
  userTeam: Team
  onResetGame: () => void
}

type MenuView = "main" | "roster" | "game-select" | "game-result" | "settings" | "watch-game"

export function MainMenu({ userTeam, onResetGame }: MainMenuProps) {
  const { simulateGame, teams, players } = useLeague()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<MenuView>("main")
  const [selectedOpponent, setSelectedOpponent] = useState<Team | null>(null)
  const [gameResult, setGameResult] = useState<any>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [watchGameTeams, setWatchGameTeams] = useState<{ home: GameSimulationTeam; away: GameSimulationTeam } | null>(null)

  const handleOpponentSelected = async (opponent: Team, gameMode: 'sim' | 'watch') => {
    setSelectedOpponent(opponent)
    
    if (gameMode === 'watch') {
      // Prepare teams for watch mode (stay in same context)
      try {
        // Get players for both teams
        const homeTeamPlayers = players.filter(p => p.team_id === userTeam.team_id)
        const awayTeamPlayers = players.filter(p => p.team_id === opponent.team_id)
        
        // Convert to game simulation teams
        const homeGameTeam = convertDatabaseTeamToGameTeam(userTeam, homeTeamPlayers)
        const awayGameTeam = convertDatabaseTeamToGameTeam(opponent, awayTeamPlayers)
        
        setWatchGameTeams({ home: homeGameTeam, away: awayGameTeam })
        setCurrentView("watch-game")
      } catch (error) {
        console.error('Failed to prepare watch game:', error)
        setCurrentView("game-select")
      }
      return
    }
    
    // Handle sim mode (existing logic)
    setIsSimulating(true)
    
    try {
      // Simulate game instantly using simulation service
      const result = await simulateGame(userTeam.team_id, opponent.team_id)
      
      // Create game result object for the result component
      const gameResult = {
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        homeTeam: userTeam,
        awayTeam: opponent,
        winner: result.homeScore > result.awayScore ? userTeam : opponent,
        events: [] // No events needed for instant simulation
      }
      
      handleGameComplete(gameResult)
    } catch (error) {
      console.error('Game simulation failed:', error)
      // Reset to game selection on error
      setCurrentView("game-select")
    } finally {
      setIsSimulating(false)
    }
  }

  const handleGameComplete = (result: any) => {
    setGameResult(result)
    setCurrentView("game-result")
  }

  const handlePlayAgain = () => {
    setSelectedOpponent(null)
    setGameResult(null)
    setCurrentView("game-select")
  }

  if (currentView === "roster") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <TeamRoster team={userTeam} onBackToMenu={() => setCurrentView("main")} />
        </div>
      </div>
    )
  }

  if (currentView === "game-select") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <OpponentSelection
            userTeam={userTeam}
            onOpponentSelected={handleOpponentSelected}
            onBackToMenu={() => setCurrentView("main")}
            isSimulating={isSimulating}
          />
        </div>
      </div>
    )
  }


  if (currentView === "game-result" && gameResult) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <GameResultComponent
            result={gameResult}
            userTeam={userTeam}
            onPlayAgain={handlePlayAgain}
            onBackToMenu={() => setCurrentView("main")}
          />
        </div>
      </div>
    )
  }

  if (currentView === "settings") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <SettingsMenu
            onResetGame={onResetGame}
            onBackToMenu={() => setCurrentView("main")}
          />
        </div>
      </div>
    )
  }

  if (currentView === "watch-game" && watchGameTeams) {
    return (
      <GameWatch
        homeTeam={watchGameTeams.home}
        awayTeam={watchGameTeams.away}
        onGameComplete={(result) => {
          // Convert watch game result to game result format
          setGameResult({
            homeScore: result.homeScore || 0,
            awayScore: result.awayScore || 0,
            homeTeam: userTeam,
            awayTeam: selectedOpponent,
            winner: (result.homeScore || 0) > (result.awayScore || 0) ? userTeam : selectedOpponent,
            events: result.events || []
          })
          setCurrentView("game-result")
        }}
        onNavigateAway={() => setCurrentView("main")}
      />
    )
  }

  return (
    <HomeHub
      userTeam={userTeam}
      onNavigateToRoster={() => setCurrentView("roster")}
      onNavigateToGameSelect={() => setCurrentView("game-select")}
      onNavigateToSettings={() => setCurrentView("settings")}
      onNavigateToWatchGame={(homeTeam, awayTeam) => {
        // Prepare teams for watch mode
        try {
          const homeTeamPlayers = players.filter(p => p.team_id === homeTeam.team_id)
          const awayTeamPlayers = players.filter(p => p.team_id === awayTeam.team_id)
          
          const homeGameTeam = convertDatabaseTeamToGameTeam(homeTeam, homeTeamPlayers)
          const awayGameTeam = convertDatabaseTeamToGameTeam(awayTeam, awayTeamPlayers)
          
          setSelectedOpponent(awayTeam)
          setWatchGameTeams({ home: homeGameTeam, away: awayGameTeam })
          setCurrentView("watch-game")
        } catch (error) {
          console.error('Failed to prepare watch game:', error)
        }
      }}
    />
  )
}
