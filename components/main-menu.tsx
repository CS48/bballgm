"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TeamRoster } from "./team-roster"
import { OpponentSelection } from "./opponent-selection"
import { GameSimulation } from "./game-simulation"
import { GameResultComponent } from "./game-result"
import { SettingsMenu } from "./settings-menu"
import { HomeHub } from "./home-hub"
import type { GM, League, Team, GameResult } from "@/types/game"

interface MainMenuProps {
  gm: GM
  league: League
  userTeam: Team
  onResetGame: () => void
}

type MenuView = "main" | "roster" | "game-select" | "game-simulation" | "game-result" | "settings"

export function MainMenu({ gm, league, userTeam, onResetGame }: MainMenuProps) {
  const [currentView, setCurrentView] = useState<MenuView>("main")
  const [selectedOpponent, setSelectedOpponent] = useState<Team | null>(null)
  const [gameResult, setGameResult] = useState<GameResult | null>(null)

  const handleOpponentSelected = (opponent: Team) => {
    setSelectedOpponent(opponent)
    setCurrentView("game-simulation")
  }

  const handleGameComplete = (result: GameResult) => {
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
            league={league}
            userTeam={userTeam}
            onOpponentSelected={handleOpponentSelected}
            onBackToMenu={() => setCurrentView("main")}
          />
        </div>
      </div>
    )
  }

  if (currentView === "game-simulation" && selectedOpponent) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <GameSimulation
            userTeam={userTeam}
            opponent={selectedOpponent}
            onGameComplete={handleGameComplete}
            onBackToOpponentSelect={() => setCurrentView("game-select")}
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
            gm={gm}
            league={league}
            userTeam={userTeam}
            onResetGame={onResetGame}
            onBackToMenu={() => setCurrentView("main")}
          />
        </div>
      </div>
    )
  }

  return (
    <HomeHub
      gm={gm}
      league={league}
      userTeam={userTeam}
      onNavigateToRoster={() => setCurrentView("roster")}
      onNavigateToGameSelect={() => setCurrentView("game-select")}
      onNavigateToSettings={() => setCurrentView("settings")}
    />
  )
}
