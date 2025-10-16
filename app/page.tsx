"use client"

import { useState, useEffect } from "react"
import { GMCreation } from "@/components/gm-creation"
import { TeamSelection } from "@/components/team-selection"
import { MainMenu } from "@/components/main-menu"
import { LeagueInitializer } from "@/components/league-initializer"
import { LeagueTester } from "@/components/league-tester"
import { useLeague, useLeagueReady } from "@/lib/context/league-context"
import type { GM } from "@/types/game"
import type { Team } from "@/lib/types/database"

type GameState = "league-initialization" | "gm-creation" | "team-selection" | "main-game" | "testing"

export default function HomePage() {
  const { isLoading, error } = useLeague()
  const isLeagueReady = useLeagueReady()
  const [gameState, setGameState] = useState<GameState>("league-initialization")
  const [currentGM, setCurrentGM] = useState<GM | null>(null)
  const [userTeam, setUserTeam] = useState<Team | null>(null)

  // Check if league is ready and update game state
  useEffect(() => {
    if (isLeagueReady && gameState === "league-initialization") {
      // Go to GM creation to start the game
      setGameState("gm-creation")
    }
  }, [isLeagueReady, gameState])

  const handleGMCreated = (gm: GM) => {
    setCurrentGM(gm)
    setGameState("team-selection")
  }

  const handleTeamSelected = (selectedTeam: Team) => {
    setUserTeam(selectedTeam)
    setGameState("main-game")
  }

  const handleResetGame = () => {
    setCurrentGM(null)
    setUserTeam(null)
    setGameState("gm-creation")
  }

  const handleOpenDebugger = () => {
    setGameState("testing")
  }

  const handleBackFromDebugger = () => {
    setGameState("main-game")
  }

  // Show league initializer if no league exists
  if (gameState === "league-initialization") {
    return <LeagueInitializer />
  }

  if (gameState === "gm-creation") {
    return <GMCreation onGMCreated={handleGMCreated} />
  }

  if (gameState === "team-selection") {
    return <TeamSelection onTeamSelected={handleTeamSelected} />
  }

  if (gameState === "main-game" && currentGM && userTeam) {
    return <MainMenu gm={currentGM} userTeam={userTeam} onResetGame={handleResetGame} onOpenDebugger={handleOpenDebugger} />
  }

  if (gameState === "testing") {
    return <LeagueTester onBackToGame={handleBackFromDebugger} />
  }

  return null
}
