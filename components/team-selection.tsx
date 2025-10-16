"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTeams } from "@/lib/context/league-context"
import type { Team } from "@/lib/types/database"

interface TeamSelectionProps {
  onTeamSelected: (selectedTeam: Team) => void
}

export function TeamSelection({ onTeamSelected }: TeamSelectionProps) {
  const teams = useTeams()
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team)
  }

  const handleConfirmSelection = () => {
    if (selectedTeam) {
      onTeamSelected(selectedTeam)
    }
  }

  const getTeamOverallRating = (team: Team): number => {
    // Use team_id as seed for consistent rating per team
    // This ensures the same team always gets the same rating
    const seed = team.team_id
    return 70 + (seed % 20) // Consistent rating between 70-89 based on team_id
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Select Your Team</h1>
          <p className="text-xl text-muted-foreground">Choose your team to manage</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {teams.map((team) => {
            const overallRating = getTeamOverallRating(team)
            const isSelected = selectedTeam?.team_id === team.team_id

            return (
              <Card
                key={team.team_id}
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
                    <div className="text-muted-foreground">Record: {team.wins}-{team.losses}</div>
                    <div className="text-muted-foreground">Conference: {team.conference}</div>
                    <div className="text-xs text-muted-foreground pt-1">15 players on roster</div>
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
