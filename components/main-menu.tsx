"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TeamRoster } from "./team-roster"
import { OpponentSelection } from "./opponent-selection"
import { GameSimulation } from "./game-simulation"
import { GameResultComponent } from "./game-result"
import { SettingsMenu } from "./settings-menu"
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Basketball GM</h1>
          <p className="text-xl text-muted-foreground">
            GM {gm.firstName} {gm.lastName} • Managing {userTeam.name}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            League: {league.name} • Record: {userTeam.record.wins}-{userTeam.record.losses}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCurrentView("roster")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>👥</span>
                View Roster
              </CardTitle>
              <CardDescription>Manage your team's players and see detailed attributes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Team Overall:{" "}
                <span className="font-semibold">
                  {Math.round(userTeam.players.reduce((sum, p) => sum + p.overall, 0) / userTeam.players.length)}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setCurrentView("game-select")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🏀</span>
                Play Game
              </CardTitle>
              <CardDescription>Select an opponent and simulate a basketball game</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Choose from {league.teams.length - 1} opponents</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📊</span>
                League Standings
              </CardTitle>
              <CardDescription>View league standings and team records</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">See how your team stacks up</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCurrentView("settings")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>⚙️</span>
                Settings
              </CardTitle>
              <CardDescription>Game preferences and reset options</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Manage your game data</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Team Overview</CardTitle>
            <CardDescription>Your {userTeam.name} at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {userTeam.players.map((player) => (
                <div key={player.id} className="text-center p-3 bg-muted rounded-lg">
                  <p className="font-medium text-sm">{player.name.split(" ")[1]}</p>
                  <p className="text-xs text-muted-foreground">{player.position}</p>
                  <p className="text-lg font-bold text-primary">{player.overall}</p>
                  <p className="text-xs text-muted-foreground">{player.descriptor}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
