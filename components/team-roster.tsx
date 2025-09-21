"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayerCard } from "./player-card"
import type { Team } from "@/types/game"

interface TeamRosterProps {
  team: Team
  onBackToMenu?: () => void
}

export function TeamRoster({ team, onBackToMenu }: TeamRosterProps) {
  const [showDetailed, setShowDetailed] = useState(false)

  const getTeamOverallRating = (): number => {
    const totalOverall = team.players.reduce((sum, player) => sum + player.overall, 0)
    return Math.round(totalOverall / team.players.length)
  }

  const sortedPlayers = [...team.players].sort((a, b) => b.overall - a.overall)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">{team.name}</h2>
          <p className="text-muted-foreground">
            Team Overall: <span className="font-semibold">{getTeamOverallRating()}</span> • Record: {team.record.wins}-
            {team.record.losses}
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
              <PlayerCard key={player.id} player={player} showDetailed={showDetailed} />
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
              const bestShooter = team.players.reduce((best, player) =>
                player.attributes.shooting > best.attributes.shooting ? player : best,
              )
              return (
                <div>
                  <p className="font-medium text-sm">{bestShooter.name}</p>
                  <p className="text-xs text-muted-foreground">{bestShooter.attributes.shooting} Shooting</p>
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
              const bestDefender = team.players.reduce((best, player) =>
                player.attributes.defense > best.attributes.defense ? player : best,
              )
              return (
                <div>
                  <p className="font-medium text-sm">{bestDefender.name}</p>
                  <p className="text-xs text-muted-foreground">{bestDefender.attributes.defense} Defense</p>
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
              const bestRebounder = team.players.reduce((best, player) =>
                player.attributes.rebounding > best.attributes.rebounding ? player : best,
              )
              return (
                <div>
                  <p className="font-medium text-sm">{bestRebounder.name}</p>
                  <p className="text-xs text-muted-foreground">{bestRebounder.attributes.rebounding} Rebounding</p>
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
              const bestPasser = team.players.reduce((best, player) =>
                player.attributes.passing > best.attributes.passing ? player : best,
              )
              return (
                <div>
                  <p className="font-medium text-sm">{bestPasser.name}</p>
                  <p className="text-xs text-muted-foreground">{bestPasser.attributes.passing} Passing</p>
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
              const mostAthletic = team.players.reduce((best, player) =>
                player.attributes.athleticism > best.attributes.athleticism ? player : best,
              )
              return (
                <div>
                  <p className="font-medium text-sm">{mostAthletic.name}</p>
                  <p className="text-xs text-muted-foreground">{mostAthletic.attributes.athleticism} Athleticism</p>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
