"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { Team } from "@/lib/types/database"
import type { GameEvent, StrategicAdjustments } from "@/lib/types/game-simulation"

interface HalftimeProps {
  homeTeam: Team
  awayTeam: Team
  homeScore: number
  awayScore: number
  firstHalfEvents: GameEvent[]
  userTeam: Team
  onStartSecondHalf: (strategy: StrategicAdjustments) => void
  onBackToOpponentSelect: () => void
}

export function Halftime({ 
  homeTeam, 
  awayTeam, 
  homeScore, 
  awayScore, 
  firstHalfEvents, 
  userTeam, 
  onStartSecondHalf,
  onBackToOpponentSelect 
}: HalftimeProps) {
  const [strategy, setStrategy] = useState<StrategicAdjustments>({
    pace: 'normal',
    shotSelection: 'balanced',
    defense: 'normal'
  })

  const isUserTeamWinning = (userTeam.id === homeTeam.id && homeScore > awayScore) || 
                           (userTeam.id === awayTeam.id && awayScore > homeScore)
  const userIsHome = userTeam.id === homeTeam.id
  const userScore = userIsHome ? homeScore : awayScore
  const opponentScore = userIsHome ? awayScore : homeScore

  const handleStartSecondHalf = () => {
    console.log('🎯 Starting second half with strategy:', strategy)
    onStartSecondHalf(strategy)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Halftime</h2>
          <p className="text-muted-foreground">Make strategic adjustments for the second half</p>
        </div>
        <Button variant="secondary" onClick={onBackToOpponentSelect}>
          Back to Opponent Select
        </Button>
      </div>

      {/* First Half Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">First Half Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h3 className="text-xl font-bold">{homeTeam.name}</h3>
              <div className="text-4xl font-bold text-primary mt-2">{homeScore}</div>
            </div>
            <div className="text-center px-4">
              <div className="text-lg text-muted-foreground">VS</div>
            </div>
            <div className="text-center flex-1">
              <h3 className="text-xl font-bold">{awayTeam.name}</h3>
              <div className="text-4xl font-bold text-secondary mt-2">{awayScore}</div>
            </div>
          </div>

          <div className="text-center mt-4">
            <Badge
              variant={isUserTeamWinning ? "default" : "destructive"}
              className="text-lg px-4 py-2"
            >
              {isUserTeamWinning ? "Leading" : "Trailing"} {Math.abs(userScore - opponentScore)}
            </Badge>
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {firstHalfEvents.length} events in the first half
          </div>
        </CardContent>
      </Card>

      {/* Strategic Adjustments */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Adjustments</CardTitle>
          <CardDescription>
            Choose how your team will play in the second half
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pace */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Pace of Play</Label>
            <RadioGroup
              value={strategy.pace}
              onValueChange={(value) => setStrategy(prev => ({ ...prev, pace: value as any }))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="slow" id="pace-slow" />
                <Label htmlFor="pace-slow" className="flex-1">
                  <div className="font-medium">Slow & Controlled</div>
                  <div className="text-sm text-muted-foreground">Longer possessions, fewer shots</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="pace-normal" />
                <Label htmlFor="pace-normal" className="flex-1">
                  <div className="font-medium">Balanced</div>
                  <div className="text-sm text-muted-foreground">Standard pace and shot frequency</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fast" id="pace-fast" />
                <Label htmlFor="pace-fast" className="flex-1">
                  <div className="font-medium">Fast & Aggressive</div>
                  <div className="text-sm text-muted-foreground">Quick possessions, more shots</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Shot Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Shot Selection</Label>
            <RadioGroup
              value={strategy.shotSelection}
              onValueChange={(value) => setStrategy(prev => ({ ...prev, shotSelection: value as any }))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="conservative" id="shot-conservative" />
                <Label htmlFor="shot-conservative" className="flex-1">
                  <div className="font-medium">Conservative</div>
                  <div className="text-sm text-muted-foreground">Focus on high-percentage shots</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="balanced" id="shot-balanced" />
                <Label htmlFor="shot-balanced" className="flex-1">
                  <div className="font-medium">Balanced</div>
                  <div className="text-sm text-muted-foreground">Mix of inside and outside shots</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="aggressive" id="shot-aggressive" />
                <Label htmlFor="shot-aggressive" className="flex-1">
                  <div className="font-medium">Aggressive</div>
                  <div className="text-sm text-muted-foreground">More three-point attempts</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Defense */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Defensive Intensity</Label>
            <RadioGroup
              value={strategy.defense}
              onValueChange={(value) => setStrategy(prev => ({ ...prev, defense: value as any }))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="soft" id="defense-soft" />
                <Label htmlFor="defense-soft" className="flex-1">
                  <div className="font-medium">Soft</div>
                  <div className="text-sm text-muted-foreground">Focus on offense, less defensive pressure</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="defense-normal" />
                <Label htmlFor="defense-normal" className="flex-1">
                  <div className="font-medium">Normal</div>
                  <div className="text-sm text-muted-foreground">Balanced defensive approach</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="intense" id="defense-intense" />
                <Label htmlFor="defense-intense" className="flex-1">
                  <div className="font-medium">Intense</div>
                  <div className="text-sm text-muted-foreground">High defensive pressure, disrupt opponent</div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Start Second Half Button */}
      <div className="text-center">
        <Button onClick={handleStartSecondHalf} className="text-lg px-8 py-6">
          Start Second Half
        </Button>
      </div>
    </div>
  )
}
