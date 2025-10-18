"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { GameWatch } from "@/components/game-watch"
import { convertDatabaseTeamToGameTeam } from "@/lib/types/game-simulation"
import { leagueService } from "@/lib/services/league-service"
import type { GameSimulationTeam, GameSimulationPlayer } from "@/lib/types/game-simulation"
import type { Team } from "@/lib/types/database"

// Helper function to convert roster data to game simulation team
function convertRosterToGameTeam(roster: any): GameSimulationTeam {
  const gamePlayers: GameSimulationPlayer[] = roster.players.map((player: any) => ({
    id: player.player_id.toString(),
    name: player.name,
    position: player.position as "PG" | "SG" | "SF" | "PF" | "C",
    attributes: {
      shooting: Math.round((player.inside_shot + player.three_point_shot) / 2),
      defense: Math.round((player.on_ball_defense + player.block + player.steal) / 3),
      rebounding: Math.round((player.offensive_rebound + player.defensive_rebound) / 2),
      passing: player.pass,
      athleticism: Math.round((player.speed + player.stamina) / 2)
    },
    overall: player.overall_rating,
    descriptor: `${player.position} - ${player.overall_rating} OVR`
  }))

  return {
    id: roster.team.team_id.toString(),
    name: roster.team.name,
    city: roster.team.city,
    players: gamePlayers,
    record: { wins: 0, losses: 0 } // Default record for watch mode
  }
}

export default function WatchGamePage() {
  const searchParams = useSearchParams()
  const [homeTeam, setHomeTeam] = useState<GameSimulationTeam | null>(null)
  const [awayTeam, setAwayTeam] = useState<GameSimulationTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const homeTeamId = searchParams.get('homeTeamId')
        const awayTeamId = searchParams.get('awayTeamId')

        if (!homeTeamId || !awayTeamId) {
          setError('Missing team IDs')
          return
        }
        
        // Fetch team rosters (which include team data)
        const [homeRoster, awayRoster] = await Promise.all([
          leagueService.getTeamRoster(parseInt(homeTeamId)),
          leagueService.getTeamRoster(parseInt(awayTeamId))
        ])

        // Convert to game simulation teams
        const homeGameTeam = convertRosterToGameTeam(homeRoster)
        const awayGameTeam = convertRosterToGameTeam(awayRoster)

        setHomeTeam(homeGameTeam)
        setAwayTeam(awayGameTeam)
      } catch (err) {
        console.error('Failed to load teams:', err)
        setError(`Failed to load game data: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    loadTeams()
  }, [searchParams])

  const handleGameComplete = (result: any) => {
    // Handle game completion - could navigate to results page
    console.log('Game completed:', result)
  }

  const handleNavigateAway = () => {
    // Navigate back to home hub
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading game...</p>
        </div>
      </div>
    )
  }

  if (error || !homeTeam || !awayTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-muted-foreground mb-4">{error || 'Failed to load teams'}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <GameWatch
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      onGameComplete={handleGameComplete}
      onNavigateAway={handleNavigateAway}
    />
  )
}
