"use client"

import { useState } from "react"
import { GMCreation } from "@/components/gm-creation"
import { LeagueCreation } from "@/components/league-creation"
import { TeamSelection } from "@/components/team-selection"
import { MainMenu } from "@/components/main-menu"
import type { GM, League, Team } from "@/types/game"

type GameState = "gm-creation" | "league-creation" | "team-selection" | "main-game"

export default function HomePage() {
  const [gameState, setGameState] = useState<GameState>("gm-creation")
  const [currentGM, setCurrentGM] = useState<GM | null>(null)
  const [currentLeague, setCurrentLeague] = useState<League | null>(null)
  const [userTeam, setUserTeam] = useState<Team | null>(null)

  const handleGMCreated = (gm: GM) => {
    setCurrentGM(gm)
    setGameState("league-creation")
  }

  const handleLeagueCreated = (league: League) => {
    setCurrentLeague(league)
    setGameState("team-selection")
  }

  const handleTeamSelected = (league: League, selectedTeam: Team) => {
    setCurrentLeague(league)
    setUserTeam(selectedTeam)
    setGameState("main-game")
  }

  const handleResetGame = () => {
    setCurrentGM(null)
    setCurrentLeague(null)
    setUserTeam(null)
    setGameState("gm-creation")
  }

  if (gameState === "gm-creation") {
    return <GMCreation onGMCreated={handleGMCreated} />
  }

  if (gameState === "league-creation") {
    return <LeagueCreation onLeagueCreated={handleLeagueCreated} />
  }

  if (gameState === "team-selection" && currentLeague) {
    return <TeamSelection league={currentLeague} onTeamSelected={handleTeamSelected} />
  }

  if (gameState === "main-game" && currentGM && currentLeague && userTeam) {
    return <MainMenu gm={currentGM} league={currentLeague} userTeam={userTeam} onResetGame={handleResetGame} />
  }

  return null
}
