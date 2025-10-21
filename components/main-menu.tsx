"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OpponentSelection } from "./opponent-selection"
import { GameResultComponent } from "./game-result"
import { HomeHub } from "./home-hub"
import { GameWatch } from "./game-watch"
import { useLeague } from "@/lib/context/league-context"
import { leagueService } from "@/lib/services/league-service"
import { convertDatabaseTeamToGameTeam } from "@/lib/types/game-simulation"
import type { Team } from "@/lib/types/database"
import type { GameSimulationTeam, GameSimulationPlayer } from "@/lib/types/game-simulation"

interface MainMenuProps {
  userTeam: Team
  onResetGame: () => void
}

type MenuView = "main" | "game-select" | "game-result" | "watch-game"

// Helper to convert roster from getTeamRoster to GameSimulationTeam
function convertRosterToGameTeam(roster: any, team: Team): GameSimulationTeam {
  const gamePlayers: GameSimulationPlayer[] = roster.players.map((player: any) => ({
    id: player.player_id.toString(),
    name: player.name,
    position: player.position as "PG" | "SG" | "SF" | "PF" | "C",
    teamId: roster.team.team_id.toString(),
    is_starter: player.is_starter,
    attributes: {
      shooting: Math.round((player.inside_shot + player.three_point_shot) / 2),
      defense: Math.round((player.on_ball_defense + player.block + player.steal) / 3),
      rebounding: Math.round((player.offensive_rebound + player.defensive_rebound) / 2),
      passing: player.pass,
      athleticism: Math.round((player.speed + player.stamina) / 2)
    },
    overall: player.overall_rating,  // This is now calculated by getTeamRoster!
    descriptor: `${player.position} - ${player.overall_rating} OVR`,
    // Individual attributes for D20 engine
    speed: player.speed,
    ball_iq: player.ball_iq,
    inside_shot: player.inside_shot,
    three_point_shot: player.three_point_shot,
    pass: player.pass,
    skill_move: player.skill_move,
    on_ball_defense: player.on_ball_defense,
    stamina: player.stamina,
    block: player.block,
    steal: player.steal,
    offensive_rebound: player.offensive_rebound,
    defensive_rebound: player.defensive_rebound
  }))

  return {
    id: roster.team.team_id.toString(),
    name: roster.team.name,
    city: roster.team.city,
    abbreviation: team.abbreviation,
    players: gamePlayers,
    record: { wins: team.wins, losses: team.losses }
  }
}

export function MainMenu({ userTeam, onResetGame }: MainMenuProps) {
  const { simulateGame, logWatchGame, teams, players } = useLeague()
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
        // Get full rosters with calculated overall ratings
        const [homeRoster, awayRoster] = await Promise.all([
          leagueService.getTeamRoster(userTeam.team_id),
          leagueService.getTeamRoster(opponent.team_id)
        ])
        
        // Convert to game simulation teams
        const homeGameTeam = convertRosterToGameTeam(homeRoster, userTeam)
        const awayGameTeam = convertRosterToGameTeam(awayRoster, opponent)
        
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


  if (currentView === "watch-game" && watchGameTeams) {
    return (
      <GameWatch
        homeTeam={watchGameTeams.home}
        awayTeam={watchGameTeams.away}
        onGameComplete={async (result) => {
          try {
            // Log the completed watch game to the database
            await logWatchGame(
              parseInt(watchGameTeams.home.id),
              parseInt(watchGameTeams.away.id),
              result
            )
            
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
          } catch (error) {
            console.error('Failed to log watch game:', error)
            // Still show the result even if logging failed
            setGameResult({
              homeScore: result.homeScore || 0,
              awayScore: result.awayScore || 0,
              homeTeam: userTeam,
              awayTeam: selectedOpponent,
              winner: (result.homeScore || 0) > (result.awayScore || 0) ? userTeam : selectedOpponent,
              events: result.events || []
            })
            setCurrentView("game-result")
          }
        }}
        onNavigateAway={() => setCurrentView("main")}
      />
    )
  }

  return (
    <HomeHub
      userTeam={userTeam}
      onNavigateToGameSelect={() => setCurrentView("game-select")}
      onNavigateToWatchGame={async (homeTeam, awayTeam) => {
        // Prepare teams for watch mode
        try {
          // Get full rosters with calculated overall ratings
          const [homeRoster, awayRoster] = await Promise.all([
            leagueService.getTeamRoster(homeTeam.team_id),
            leagueService.getTeamRoster(awayTeam.team_id)
          ])
          
          // Convert to game simulation teams
          const homeGameTeam = convertRosterToGameTeam(homeRoster, homeTeam)
          const awayGameTeam = convertRosterToGameTeam(awayRoster, awayTeam)
          
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
