"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GameEngine } from "@/lib/game-engine"
import { Halftime } from "./halftime"
import type { Team } from "@/lib/types/database"
import type { GameSimulationTeam, GameSimulationResult, GameEvent, StrategicAdjustments } from "@/lib/types/game-simulation"
import { convertDatabaseTeamToGameTeam } from "@/lib/types/game-simulation"
import { leagueService } from "@/lib/services/league-service"

interface GameSimulationProps {
  userTeam: Team
  opponent: Team
  onGameComplete: (result: GameSimulationResult) => void
  onBackToOpponentSelect: () => void
}

export function GameSimulation({ userTeam, opponent, onGameComplete, onBackToOpponentSelect }: GameSimulationProps) {
  // Ref to prevent multiple simulations in React Strict Mode (development only)
  const simulationRunRef = useRef(false)
  // Ref to prevent multiple animations from starting
  const animationStartedRef = useRef(false)
  // Ref to prevent multiple callback executions
  const callbackExecutedRef = useRef(false)
  // Ref to track current gamePhase for callbacks (fixes stale closure issue)
  const gamePhaseRef = useRef<'first-half' | 'halftime' | 'second-half' | 'complete'>('first-half')
  
  // Track component lifecycle
  useEffect(() => {
    console.log('🚀 GameSimulation component mounted')
    return () => {
      console.log('💀 GameSimulation component unmounting')
    }
  }, [])

  // Convert database teams to game teams
  useEffect(() => {
    const convertTeams = async () => {
      try {
        const [userRoster, opponentRoster] = await Promise.all([
          leagueService.getTeamRoster(userTeam.team_id),
          leagueService.getTeamRoster(opponent.team_id)
        ])

        const gameUserTeam = convertDatabaseTeamToGameTeam(userTeam, userRoster.players)
        const gameOpponentTeam = convertDatabaseTeamToGameTeam(opponent, opponentRoster.players)

        setGameTeams({ userTeam: gameUserTeam, opponent: gameOpponentTeam })
      } catch (error) {
        console.error('Failed to convert teams:', error)
      }
    }

    convertTeams()
  }, [userTeam, opponent])

  const [gameResult, setGameResult] = useState<GameSimulationResult | null>(null)
  const [gameTeams, setGameTeams] = useState<{ userTeam: GameSimulationTeam; opponent: GameSimulationTeam } | null>(null)
  const [currentEventIndex, setCurrentEventIndex] = useState(0)
  const [isSimulating, setIsSimulating] = useState(true)
  const [displayedEvents, setDisplayedEvents] = useState<GameEvent[]>([])
  const [simulationSpeed, setSimulationSpeed] = useState(800) // Default 800ms
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)
  
  // Halftime state
  const [gamePhase, setGamePhase] = useState<'first-half' | 'halftime' | 'second-half' | 'complete'>('first-half')
  const [firstHalfResult, setFirstHalfResult] = useState<{
    homeScore: number
    awayScore: number
    events: GameEvent[]
    eventId: number
  } | null>(null)

  // Update gamePhaseRef whenever gamePhase changes (fixes stale closure issue)
  useEffect(() => {
    gamePhaseRef.current = gamePhase
  }, [gamePhase])

  // Run simulation once when teams are available
  const simulationResult = useMemo(() => {
    console.log('🔍 useMemo executing with dependencies:', {
      userTeamId: userTeam?.team_id,
      opponentId: opponent?.team_id,
      userTeamName: userTeam?.name,
      opponentName: opponent?.name,
      gameTeamsAvailable: !!gameTeams
    })
    
    if (!gameTeams) {
      console.log('❌ Game teams not converted yet, returning null')
      return null
    }
    
    // React Strict Mode in development causes double execution
    // This guard prevents multiple simulations
    if (simulationRunRef.current) {
      console.log('🚫 Simulation already run (React Strict Mode), skipping')
      return null
    }
    
    simulationRunRef.current = true
    console.log('🎮 Running first half simulation for:', gameTeams.userTeam.name, 'vs', gameTeams.opponent.name)
    
    // Determine home/away teams (user team is always home for now)
    const homeTeam = gameTeams.userTeam
    const awayTeam = gameTeams.opponent
    
    // Start first half simulation
    const result = GameEngine.simulateGameSegment(
      homeTeam,
      awayTeam,
      { pace: 'normal', shotSelection: 'balanced', defense: 'normal' },
      1, // start quarter
      2, // end quarter
      0, // starting home score
      0, // starting away score
      new Map(), // starting player stats
      new Map(),
      0, // starting home possessions
      0, // starting away possessions
      homeTeam, // starting possession
      1 // starting event ID
    )
    
    console.log('✅ First half simulation completed')
    return {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      events: result.events,
      eventId: result.eventId
    }
  }, [gameTeams])

  // Start animation when simulation result is available
  useEffect(() => {
    console.log('🔄 useEffect running with:', {
      hasSimulationResult: !!simulationResult,
      gamePhase,
      simulationResultEvents: simulationResult?.events?.length,
      animationStarted: animationStartedRef.current
    })
    
    if (simulationResult && gamePhase === 'first-half' && !animationStartedRef.current) {
      animationStartedRef.current = true
      console.log('🎬 Starting first half animation')
      setFirstHalfResult(simulationResult)
      startSimulation(simulationResult.events, 0, () => {
        if (!callbackExecutedRef.current) {
          callbackExecutedRef.current = true
          console.log('🏁 First half animation complete')
          setGamePhase('halftime')
        } else {
          console.log('🚫 Callback already executed, skipping')
        }
      })
    } else if (simulationResult && gamePhase === 'first-half' && animationStartedRef.current) {
      console.log('🚫 Animation already started, skipping')
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [simulationResult, gamePhase])

  const startSimulation = (events: GameEvent[], startIndex: number = 0, onComplete?: () => void) => {
    console.log('🎬 startSimulation called with:', { 
      eventsLength: events.length, 
      startIndex, 
      hasCallback: !!onComplete,
      currentIntervalId: intervalId
    })
    
    if (intervalId) {
      console.log('🔄 Clearing existing interval:', intervalId)
      clearInterval(intervalId)
    }

    setCurrentEventIndex(startIndex)
    setIsSimulating(true)

    const timer = setInterval(() => {
      setCurrentEventIndex((prev) => {
        if (prev >= events.length - 1) {
          console.log('🏁 Animation complete, current gamePhase:', gamePhaseRef.current)
          setIsSimulating(false)
          clearInterval(timer)
          if (onComplete && (gamePhaseRef.current === 'first-half' || gamePhaseRef.current === 'second-half')) {
            console.log('✅ Executing callback')
            onComplete()
          } else if (onComplete) {
            console.log('❌ Skipping callback - gamePhase is:', gamePhaseRef.current)
          }
          return prev
        }
        return prev + 1
      })
    }, simulationSpeed)

    setIntervalId(timer)
    console.log('⏰ New interval set with ID:', timer)
  }

  const changeSpeed = (newSpeed: number) => {
    setSimulationSpeed(newSpeed)
    if (gamePhase === 'first-half' && firstHalfResult && isSimulating) {
      startSimulation(firstHalfResult.events, 0, () => {
        setGamePhase('halftime')
      })
    } else if (gamePhase === 'second-half' && gameResult && isSimulating) {
      startSimulation(gameResult.events, firstHalfResult?.events.length || 0, () => {
        setGamePhase('complete')
      })
    }
  }

  const handleStartSecondHalf = (strategy: StrategicAdjustments) => {
    console.log('🎮 Starting second half with strategy:', strategy)
    console.log('🔍 Current state before second half:', {
      gamePhase,
      intervalId,
      firstHalfResult: !!firstHalfResult
    })
    
    // Clear any pending animations and reset state
    if (intervalId) {
      console.log('🔄 Clearing interval in handleStartSecondHalf:', intervalId)
      clearInterval(intervalId)
      setIntervalId(null)
    }
    setIsSimulating(false)
    setCurrentEventIndex(0)
    
    console.log('🔄 Setting gamePhase to second-half')
    setGamePhase('second-half')
    
    // Simulate second half
    if (!gameTeams) {
      console.error('Game teams not available for second half')
      return
    }
    const homeTeam = gameTeams.userTeam
    const awayTeam = gameTeams.opponent
    
    const secondHalfResult = GameEngine.simulateGameSegment(
      homeTeam,
      awayTeam,
      strategy,
      3, // start quarter
      4, // end quarter
      firstHalfResult!.homeScore,
      firstHalfResult!.awayScore,
      new Map(), // We'll need to pass the actual player stats from first half
      new Map(),
      0, // FIXED: Reset possession counts for second half
      0, // FIXED: Reset possession counts for second half
      homeTeam, // We'll need to pass the actual final possession from first half
      firstHalfResult!.eventId // Continue event ID sequence from first half
    )
    
    // Combine first and second half results
    const allEvents = [...firstHalfResult!.events, ...secondHalfResult.events]
    
    // Debug: Check event continuity
    console.log('🔍 Event ID continuity check:')
    console.log('First half events:', firstHalfResult!.events.length, 'Last event ID:', firstHalfResult!.eventId)
    console.log('Second half events:', secondHalfResult.events.length, 'Last event ID:', secondHalfResult.eventId)
    console.log('Combined events:', allEvents.length)
    console.log('First few combined events:', allEvents.slice(0, 3).map(e => ({ id: e.id, quarter: e.quarter, description: e.description })))
    console.log('Last few first half events:', firstHalfResult!.events.slice(-3).map(e => ({ id: e.id, quarter: e.quarter, description: e.description })))
    console.log('First few second half events:', secondHalfResult.events.slice(0, 3).map(e => ({ id: e.id, quarter: e.quarter, description: e.description })))
    const finalResult: GameSimulationResult = {
      homeTeam,
      awayTeam,
      homeScore: secondHalfResult.homeScore,
      awayScore: secondHalfResult.awayScore,
      events: allEvents,
      winner: secondHalfResult.homeScore > secondHalfResult.awayScore ? homeTeam.name : awayTeam.name,
      homePlayerStats: [], // We'll need to calculate these properly
      awayPlayerStats: [],
      mvp: undefined
    }
    
    setGameResult(finalResult)
    
    // Start animation for second half - animate all events starting from first half end
    startSimulation(allEvents, firstHalfResult!.events.length, () => {
      console.log('🎮 Second half animation complete')
      setGamePhase('complete')
    })
  }

  const simToEnd = () => {
    if (gamePhase === 'first-half' && firstHalfResult) {
      if (intervalId) {
        clearInterval(intervalId)
      }
      setCurrentEventIndex(firstHalfResult.events.length - 1)
      setIsSimulating(false)
      setGamePhase('halftime')
    } else if (gamePhase === 'second-half' && gameResult) {
      if (intervalId) {
        clearInterval(intervalId)
      }
      setCurrentEventIndex(gameResult.events.length - 1)
      setIsSimulating(false)
      setGamePhase('complete')
    }
  }

  useEffect(() => {
    if (gamePhase === 'first-half' && firstHalfResult && currentEventIndex >= 0) {
      setDisplayedEvents(firstHalfResult.events.slice(0, currentEventIndex + 1))
    } else if (gamePhase === 'second-half' && gameResult && currentEventIndex >= 0) {
      // Show all first half events immediately + new second half events as they animate
      const firstHalfEvents = firstHalfResult!.events
      const secondHalfEvents = gameResult.events.slice(firstHalfEvents.length, currentEventIndex + 1)
      setDisplayedEvents([...firstHalfEvents, ...secondHalfEvents])
      
      // Debug: Track what's being displayed
      console.log('📺 Second half display update:', {
        currentEventIndex,
        firstHalfEventsCount: firstHalfEvents.length,
        secondHalfEventsCount: secondHalfEvents.length,
        totalDisplayed: firstHalfEvents.length + secondHalfEvents.length
      })
    }
  }, [currentEventIndex, gameResult, firstHalfResult, gamePhase])

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

  // Show halftime screen
  if (gamePhase === 'halftime' && firstHalfResult) {
    return (
      <Halftime
        homeTeam={userTeam}
        awayTeam={opponent}
        homeScore={firstHalfResult.homeScore}
        awayScore={firstHalfResult.awayScore}
        firstHalfEvents={firstHalfResult.events}
        userTeam={userTeam}
        onStartSecondHalf={handleStartSecondHalf}
        onBackToOpponentSelect={onBackToOpponentSelect}
      />
    )
  }

  // Show loading screen
  if (!firstHalfResult && gamePhase === 'first-half') {
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

  // Get current score based on game phase
  let currentScore: { homeScore: number; awayScore: number }
  let isUserTeamWinning: boolean
  let userIsHome: boolean
  
  if (gamePhase === 'first-half' && firstHalfResult) {
    currentScore = displayedEvents.length > 0 ? displayedEvents[displayedEvents.length - 1] : firstHalfResult.events[0]
    isUserTeamWinning = currentScore.homeScore > currentScore.awayScore
    userIsHome = userTeam.id === userTeam.id // User team is always home
  } else if (gamePhase === 'second-half' && gameResult) {
    currentScore = displayedEvents.length > 0 ? displayedEvents[displayedEvents.length - 1] : gameResult.events[0]
    isUserTeamWinning = currentScore.homeScore > currentScore.awayScore
    userIsHome = userTeam.id === gameResult.homeTeam.id
  } else if (gamePhase === 'complete' && gameResult) {
    // Use final score from gameResult
    currentScore = { homeScore: gameResult.homeScore, awayScore: gameResult.awayScore }
    isUserTeamWinning = currentScore.homeScore > currentScore.awayScore
    userIsHome = userTeam.id === gameResult.homeTeam.id
  } else {
    // Fallback
    currentScore = { homeScore: 0, awayScore: 0 }
    isUserTeamWinning = false
    userIsHome = true
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">
            {gamePhase === 'first-half' ? 'First Half' : 
             gamePhase === 'second-half' ? 'Second Half' : 'Game Simulation'}
          </h2>
          <p className="text-muted-foreground">
            {isSimulating ? "Game in progress..." : 
             gamePhase === 'first-half' ? "First half completed" :
             gamePhase === 'second-half' ? "Second half completed" : "Game completed"}
          </p>
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
              <h3 className="text-xl font-bold">{userTeam.name}</h3>
              <div className="text-4xl font-bold text-primary mt-2">{currentScore.homeScore}</div>
            </div>
            <div className="text-center px-4">
              <div className="text-lg text-muted-foreground">VS</div>
            </div>
            <div className="text-center flex-1">
              <h3 className="text-xl font-bold">{opponent.name}</h3>
              <div className="text-4xl font-bold text-secondary mt-2">{currentScore.awayScore}</div>
            </div>
          </div>

          {!isSimulating && gamePhase === 'complete' && gameResult && (
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
                  ? `Event ${currentEventIndex + 1} of ${displayedEvents.length}`
                  : `All ${displayedEvents.length} events`}
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

      {!isSimulating && gamePhase === 'complete' && (
        <div className="text-center">
          <Button onClick={handleGameComplete} className="text-lg px-8 py-6">
            Continue
          </Button>
        </div>
      )}
    </div>
  )
}
