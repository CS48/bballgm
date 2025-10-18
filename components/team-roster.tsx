"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayerCard } from "./player-card"
import type { Team } from "@/lib/types/database"
import { leagueService } from "@/lib/services/league-service"
import { useState, useEffect } from "react"

interface TeamRosterProps {
  team: Team
  onBackToMenu?: () => void
}

export function TeamRoster({ team, onBackToMenu }: TeamRosterProps) {
  const [showDetailed, setShowDetailed] = useState(false)
  const [teamRoster, setTeamRoster] = useState<any>(null)
  const [teamRatings, setTeamRatings] = useState({ overall: 0 })

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const roster = await leagueService.getTeamRoster(team.team_id)
        setTeamRoster(roster)
        
        if (roster.players && roster.players.length > 0) {
          const overallRatings = roster.players.map(p => p.overall_rating)
          const averageRating = Math.round(overallRatings.reduce((a, b) => a + b, 0) / overallRatings.length)
          setTeamRatings({ overall: averageRating })
        }
      } catch (error) {
        console.error('Failed to fetch team roster:', error)
      }
    }

    fetchTeamData()
  }, [team.team_id])

  const getTeamOverallRating = (): number => {
    return teamRatings.overall
  }

  // Get actual starters and bench players separately
  const starters = teamRoster?.players 
    ? (() => {
        // Debug: Check if any players have is_starter set
        const playersWithStarterFlag = teamRoster.players.filter(player => player.is_starter === 1)
        console.log('TeamRoster Debug - Players with is_starter=1:', playersWithStarterFlag.length)
        console.log('TeamRoster Debug - All players is_starter values:', teamRoster.players.map(p => ({ name: p.name, is_starter: p.is_starter })))
        
        // If no players are marked as starters, fall back to top 5 by overall rating
        if (playersWithStarterFlag.length === 0) {
          console.log('TeamRoster Debug - No starters found, using top 5 by overall rating')
          return teamRoster.players
            .sort((a, b) => b.overall_rating - a.overall_rating)
            .slice(0, 5)
        }
        
        // Use actual starters
        return playersWithStarterFlag.sort((a, b) => {
          // Sort by position order: PG, SG, SF, PF, C
          const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C']
          return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position)
        })
      })()
    : []
  
  const benchPlayers = teamRoster?.players 
    ? teamRoster.players.filter(player => player.is_starter !== 1)
        .sort((a, b) => b.overall_rating - a.overall_rating)
    : []
  
  const sortedPlayers = [...starters, ...benchPlayers]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">{team.name}</h2>
          <p className="text-muted-foreground">
            Team Overall: <span className="font-semibold">{getTeamOverallRating()}</span> • Record: {team.wins}-
            {team.losses}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDetailed(!showDetailed)}>
            {showDetailed ? "Simple View" : "Detailed View"}
          </Button>
          {onBackToMenu && (
            <Button variant="secondary" onClick={onBackToMenu}>
              Back to Menu
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Starting Lineup</CardTitle>
          <CardDescription>Your team's starting 5 players</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {sortedPlayers.map((player) => (
              <PlayerCard key={player.player_id} player={player} showDetailed={showDetailed} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Best Shooter</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              if (!teamRoster?.players) return <div>Loading...</div>
              const bestShooter = teamRoster.players.reduce((best, player) =>
                player.inside_shot > best.inside_shot ? player : best,
              )
              return (
                <div>
                  <p className="font-medium text-sm">{bestShooter.name}</p>
                  <p className="text-xs text-muted-foreground">{bestShooter.inside_shot} Inside Shot</p>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Best Defender</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              if (!teamRoster?.players) return <div>Loading...</div>
              const bestDefender = teamRoster.players.reduce((best, player) =>
                player.on_ball_defense > best.on_ball_defense ? player : best,
              )
              return (
                <div>
                  <p className="font-medium text-sm">{bestDefender.name}</p>
                  <p className="text-xs text-muted-foreground">{bestDefender.on_ball_defense} Defense</p>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Best Rebounder</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              if (!teamRoster?.players) return <div>Loading...</div>
              const bestRebounder = teamRoster.players.reduce((best, player) =>
                (player.offensive_rebound + player.defensive_rebound) > (best.offensive_rebound + best.defensive_rebound) ? player : best,
              )
              return (
                <div>
                  <p className="font-medium text-sm">{bestRebounder.name}</p>
                  <p className="text-xs text-muted-foreground">{bestRebounder.offensive_rebound + bestRebounder.defensive_rebound} Rebounding</p>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Best Passer</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              if (!teamRoster?.players) return <div>Loading...</div>
              const bestPasser = teamRoster.players.reduce((best, player) =>
                player.pass > best.pass ? player : best,
              )
              return (
                <div>
                  <p className="font-medium text-sm">{bestPasser.name}</p>
                  <p className="text-xs text-muted-foreground">{bestPasser.pass} Passing</p>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Most Athletic</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              if (!teamRoster?.players) return <div>Loading...</div>
              const mostAthletic = teamRoster.players.reduce((best, player) =>
                (player.speed + player.stamina) > (best.speed + best.stamina) ? player : best,
              )
              return (
                <div>
                  <p className="font-medium text-sm">{mostAthletic.name}</p>
                  <p className="text-xs text-muted-foreground">{Math.round((mostAthletic.speed + mostAthletic.stamina) / 2)} Athleticism</p>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
