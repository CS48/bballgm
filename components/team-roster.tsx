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

  const sortedPlayers = teamRoster?.players ? [...teamRoster.players].sort((a, b) => b.overall_rating - a.overall_rating) : []

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
          <CardDescription>Your team's roster sorted by overall rating</CardDescription>
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
