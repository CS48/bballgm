"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LeagueGenerator } from "@/lib/league-generator"
import type { League } from "@/types/game"

interface LeagueCreationProps {
  onLeagueCreated: (league: League) => void
}

export function LeagueCreation({ onLeagueCreated }: LeagueCreationProps) {
  const [leagueName, setLeagueName] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!leagueName.trim()) {
      return
    }

    setIsGenerating(true)

    // Add a small delay to show the generating state
    setTimeout(() => {
      const league = LeagueGenerator.generateLeague(leagueName.trim())
      onLeagueCreated(league)
      setIsGenerating(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Create Your League</h1>
          <p className="text-muted-foreground text-lg">Generate an 8-team basketball league</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">League Setup</CardTitle>
            <CardDescription className="text-center">
              Name your league and we'll generate 8 teams from cities across America
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leagueName">League Name</Label>
                <Input
                  id="leagueName"
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  placeholder="e.g., National Basketball League"
                  required
                />
              </div>

              <Button type="submit" className="w-full text-lg py-6" disabled={!leagueName.trim() || isGenerating}>
                {isGenerating ? "Generating League..." : "Generate League"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
