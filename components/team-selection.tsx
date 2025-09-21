"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { League, Team } from "@/types/game"

interface TeamSelectionProps {
  league: League
  onTeamSelected: (league: League, selectedTeam: Team) => void
}

export function TeamSelection({ league, onTeamSelected }: TeamSelectionProps) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team)
  }

  const handleConfirmSelection = () => {
    if (selectedTeam) {
      const updatedLeague = {
        ...league,
        userTeamId: selectedTeam.id,
      }
      onTeamSelected(updatedLeague, selectedTeam)
    }
  }

  const getTeamOverallRating = (team: Team): number => {
    const totalOverall = team.players.reduce((sum, player) => sum + player.overall, 0)
    return Math.round(totalOverall / team.players.length)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">{league.name}</h1>
          <p className="text-xl text-muted-foreground">Choose your team to manage</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {league.teams.map((team) => {
            const overallRating = getTeamOverallRating(team)
            const isSelected = selectedTeam?.id === team.id

            return (
              <Card
                key={team.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? "ring-2 ring-primary bg-accent" : ""
                }`}
                onClick={() => handleTeamSelect(team)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-balance">{team.name}</CardTitle>
                  <CardDescription className="flex items-center justify-between">
                    <span>{team.city}</span>
                    <Badge variant="secondary">{overallRating} OVR</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1 text-sm">
                    {team.players.slice(0, 3).map((player) => (
                      <div key={player.id} className="flex justify-between">
                        <span className="text-muted-foreground">{player.name}</span>
                        <span className="font-medium">{player.overall}</span>
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground pt-1">+{team.players.length - 3} more players</div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {selectedTeam && (
          <div className="text-center">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Selected Team</CardTitle>
                <CardDescription>
                  You've chosen the <strong>{selectedTeam.name}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleConfirmSelection} className="w-full text-lg py-6">
                  Start Managing {selectedTeam.name}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
