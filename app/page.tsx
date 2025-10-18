"use client"

import { useState, useEffect } from "react"
import { GMCreation } from "@/components/gm-creation"
import { TeamSelection } from "@/components/team-selection"
import { MainMenu } from "@/components/main-menu"
import { LeagueInitializer } from "@/components/league-initializer"
import { useLeague, useLeagueReady } from "@/lib/context/league-context"
import type { Team } from "@/lib/types/database"

type GameState = "league-initialization" | "gm-creation" | "team-selection" | "main-game"

export default function HomePage() {
  const { isLoading, error } = useLeague()
  const isLeagueReady = useLeagueReady()
  const [gameState, setGameState] = useState<GameState>("league-initialization")
  const [currentGM, setCurrentGM] = useState<any>(null)
  const [userTeam, setUserTeam] = useState<Team | null>(null)

  // Check if league is ready and update game state
  useEffect(() => {
    if (isLeagueReady && gameState === "league-initialization") {
      // Go to GM creation to start the game
      setGameState("gm-creation")
    }
  }, [isLeagueReady, gameState])

  const handleGMCreated = (gm: any) => {
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
    return <MainMenu userTeam={userTeam} onResetGame={handleResetGame} />
  }

  return null
}
