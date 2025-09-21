"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GameEngine } from "@/lib/game-engine"
import type { Team, GameResult, GameEvent } from "@/types/game"

interface GameSimulationProps {
  userTeam: Team
  opponent: Team
  onGameComplete: (result: GameResult) => void
  onBackToOpponentSelect: () => void
}

export function GameSimulation({ userTeam, opponent, onGameComplete, onBackToOpponentSelect }: GameSimulationProps) {
  const [gameResult, setGameResult] = useState<GameResult | null>(null)
  const [currentEventIndex, setCurrentEventIndex] = useState(0)
  const [isSimulating, setIsSimulating] = useState(true)
  const [displayedEvents, setDisplayedEvents] = useState<GameEvent[]>([])
  const [simulationSpeed, setSimulationSpeed] = useState(800) // Default 800ms
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Start simulation
    const result = GameEngine.simulateGame(userTeam, opponent)
    setGameResult(result)

    // Start the animation timer
    startSimulation(result)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [userTeam, opponent])

  const startSimulation = (result: GameResult) => {
    if (intervalId) {
      clearInterval(intervalId)
    }

    const timer = setInterval(() => {
      setCurrentEventIndex((prev) => {
        if (prev >= result.events.length - 1) {
          setIsSimulating(false)
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, simulationSpeed)

    setIntervalId(timer)
  }

  const changeSpeed = (newSpeed: number) => {
    setSimulationSpeed(newSpeed)
    if (gameResult && isSimulating) {
      startSimulation(gameResult)
    }
  }

  const simToEnd = () => {
    if (gameResult) {
      if (intervalId) {
        clearInterval(intervalId)
      }
      setCurrentEventIndex(gameResult.events.length - 1)
      setIsSimulating(false)
    }
  }

  useEffect(() => {
    if (gameResult && currentEventIndex >= 0) {
      setDisplayedEvents(gameResult.events.slice(0, currentEventIndex + 1))
    }
  }, [currentEventIndex, gameResult])

  const handleGameComplete = () => {
    if (gameResult) {
      onGameComplete(gameResult)
    }
  }

  const getQuarterName = (quarter: number): string => {
    switch (quarter) {
      case 1:
        return "1st Quarter"
      case 2:
        return "2nd Quarter"
      case 3:
        return "3rd Quarter"
      case 4:
        return "4th Quarter"
      default:
        return `Quarter ${quarter}`
    }
  }

  if (!gameResult) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg font-medium">Preparing Game...</p>
              <p className="text-sm text-muted-foreground">
                {userTeam.name} vs {opponent.name}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentScore = displayedEvents.length > 0 ? displayedEvents[displayedEvents.length - 1] : gameResult.events[0]
  const isUserTeamWinning = currentScore.homeScore > currentScore.awayScore
  const userIsHome = userTeam.id === gameResult.homeTeam.id

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Game Simulation</h2>
          <p className="text-muted-foreground">{isSimulating ? "Game in progress..." : "Game completed"}</p>
        </div>
        <Button variant="secondary" onClick={onBackToOpponentSelect}>
          Back to Opponent Select
        </Button>
      </div>

      {/* Scoreboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Live Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h3 className="text-xl font-bold">{gameResult.homeTeam.name}</h3>
              <div className="text-4xl font-bold text-primary mt-2">{currentScore.homeScore}</div>
            </div>
            <div className="text-center px-4">
              <div className="text-lg text-muted-foreground">VS</div>
            </div>
            <div className="text-center flex-1">
              <h3 className="text-xl font-bold">{gameResult.awayTeam.name}</h3>
              <div className="text-4xl font-bold text-secondary mt-2">{currentScore.awayScore}</div>
            </div>
          </div>

          {!isSimulating && (
            <div className="text-center mt-4">
              <Badge
                variant={
                  (userIsHome && gameResult.homeScore > gameResult.awayScore) ||
                  (!userIsHome && gameResult.awayScore > gameResult.homeScore)
                    ? "default"
                    : "destructive"
                }
                className="text-lg px-4 py-2"
              >
                {(userIsHome && gameResult.homeScore > gameResult.awayScore) ||
                (!userIsHome && gameResult.awayScore > gameResult.homeScore)
                  ? "Victory!"
                  : "Defeat"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Play by Play */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Play by Play</CardTitle>
              <CardDescription>
                {isSimulating
                  ? `Event ${currentEventIndex + 1} of ${gameResult.events.length}`
                  : `All ${gameResult.events.length} events`}
              </CardDescription>
            </div>
            {isSimulating && (
              <div className="flex gap-2">
                <Button
                  variant={simulationSpeed === 800 ? "default" : "outline"}
                  size="sm"
                  onClick={() => changeSpeed(800)}
                >
                  1x
                </Button>
                <Button
                  variant={simulationSpeed === 400 ? "default" : "outline"}
                  size="sm"
                  onClick={() => changeSpeed(400)}
                >
                  2x
                </Button>
                <Button variant="secondary" size="sm" onClick={simToEnd}>
                  Sim to End
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full">
            <div className="space-y-2">
              {displayedEvents.map((event, index) => {
                const isNewQuarter = index === 0 || event.quarter !== displayedEvents[index - 1]?.quarter

                return (
                  <div key={event.id}>
                    {isNewQuarter && (
                      <div className="flex items-center justify-center py-2">
                        <Badge variant="outline" className="text-sm">
                          {getQuarterName(event.quarter)}
                        </Badge>
                      </div>
                    )}
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm">{event.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Q{event.quarter} - {event.time}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {event.homeScore} - {event.awayScore}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {!isSimulating && (
        <div className="text-center">
          <Button onClick={handleGameComplete} className="text-lg px-8 py-6">
            Continue
          </Button>
        </div>
      )}
    </div>
  )
}
