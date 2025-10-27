"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GameStatsTable } from "./game-stats-table"
import { GameWatchNavigationModal } from "./game-watch-navigation-modal"
import { WatchGameEngine } from "@/lib/game-watch-engine"
import { formatGameClock, getEventColorClass } from "@/lib/utils/event-formatter"
import type { GameSimulationTeam, WatchGameState, AnimationSpeed } from "@/lib/types/game-simulation"

interface GameWatchProps {
  homeTeam: GameSimulationTeam
  awayTeam: GameSimulationTeam
  onGameComplete: (result: any) => void
  onNavigateAway: () => void
}

export function GameWatch({ homeTeam, awayTeam, onGameComplete, onNavigateAway }: GameWatchProps) {
  const [gameEngine] = useState(() => new WatchGameEngine(homeTeam, awayTeam))
  const [gameState, setGameState] = useState<WatchGameState>(gameEngine.getState())
  const [showNavigationModal, setShowNavigationModal] = useState(false)
  const eventFeedRef = useRef<HTMLDivElement>(null)

  // Update game state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newState = gameEngine.getState()
      setGameState(newState)
      
      // Check if game is complete and trigger callback
      if (newState.isComplete && !gameState.isComplete) {
        const gameResult = gameEngine.buildGameResult()
        onGameComplete(gameResult)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [gameEngine, gameState.isComplete, onGameComplete])

  // Auto-scroll event feed to bottom
  useEffect(() => {
    if (eventFeedRef.current && gameState.events.length > 0) {
      const scrollContainer = eventFeedRef.current
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      })
    }
  }, [gameState.events.length])

  // Handle navigation attempts
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!gameState.isComplete) {
        e.preventDefault()
        e.returnValue = ''
        setShowNavigationModal(true)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [gameState.isComplete])

  const handleStartGame = () => {
    gameEngine.startGame()
  }

  const handlePauseGame = () => {
    gameEngine.pauseGame()
  }

  const handleResumeGame = () => {
    gameEngine.resumeGame()
  }

  const handleSpeedChange = (speed: AnimationSpeed) => {
    gameEngine.setAnimationSpeed(speed)
  }

  const handleNavigationAttempt = () => {
    if (!gameState.isComplete) {
      setShowNavigationModal(true)
    } else {
      onNavigateAway()
    }
  }

  const handleContinueWatching = () => {
    setShowNavigationModal(false)
  }

  const handleLeaveAndSim = async () => {
    await gameEngine.autoSimulateRemaining()
    setShowNavigationModal(false)
    onNavigateAway()
  }

  // Convert game simulation teams to roster table format
  const getRosterTableData = (team: GameSimulationTeam) => {
    return team.players.map(player => {
      const stats = gameState.playerStats.get(player.id)
      const result = {
        player_id: parseInt(player.id),
        name: player.name,
        position: player.position,
        is_starter: player.is_starter,
        age: 25, // Default age for game simulation
        height: 75, // Default height for game simulation
        weight: 200, // Default weight for game simulation
        years_pro: 3, // Default years pro
        overall_rating: player.overall,
        current_stats: stats ? {
          games: 1,
          minutes: stats.minutes,
          points: stats.points,
          fg_made: stats.fieldGoalsMade,
          fg_attempted: stats.fieldGoalsAttempted,
          fg_pct: stats.fieldGoalsAttempted > 0 ? (stats.fieldGoalsMade / stats.fieldGoalsAttempted) * 100 : 0,
          three_made: stats.threePointersMade,
          three_attempted: stats.threePointersAttempted,
          three_pct: stats.threePointersAttempted > 0 ? (stats.threePointersMade / stats.threePointersAttempted) * 100 : 0,
          ft_made: 0, // Free throws not implemented yet
          ft_attempted: 0,
          ft_pct: 0,
          oreb: stats.offensiveRebound || 0,
          dreb: stats.defensiveRebound || 0,
          rebounds: (stats.offensiveRebound || 0) + (stats.defensiveRebound || 0),
          assists: stats.assists,
          turnovers: stats.turnovers,
          steals: stats.steals,
          blocks: stats.blocks,
          pf: stats.fouls,
          plus_minus: 0 // Not calculated in current system
        } : {
          games: 1,
          minutes: 0,
          points: 0,
          fg_made: 0,
          fg_attempted: 0,
          fg_pct: 0,
          three_made: 0,
          three_attempted: 0,
          three_pct: 0,
          ft_made: 0,
          ft_attempted: 0,
          ft_pct: 0,
          oreb: 0,
          dreb: 0,
          rebounds: 0,
          assists: 0,
          turnovers: 0,
          steals: 0,
          blocks: 0,
          pf: 0,
          plus_minus: 0
        }
      }
      
      return result
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Flexbox 1: Scoreboard & Controls */}
      <div className="w-full px-[10vw] py-3 border-b border-black">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Sub-flexbox 1: Scoreboard */}
          <div className="flex items-center justify-center lg:justify-start gap-8">
            <div className="text-lg font-medium">{awayTeam.name}</div>
            <div className="text-3xl font-bold">{gameState.awayScore}</div>
            <div className="text-xl font-bold">{gameState.gameClock}</div>
            <div className="text-3xl font-bold">{gameState.homeScore}</div>
            <div className="text-lg font-medium">{homeTeam.name}</div>
          </div>

          {/* Sub-flexbox 2: Controls */}
          <div className="flex items-center justify-center lg:justify-end gap-4">
            {/* Play/Pause Button */}
            {!gameState.isPlaying ? (
              <Button onClick={handleStartGame} size="lg" variant="outline">
                ▶️ Play
              </Button>
            ) : gameState.isPaused ? (
              <Button onClick={handleResumeGame} size="lg" variant="outline">
                ▶️ Resume
              </Button>
            ) : (
              <Button onClick={handlePauseGame} size="lg" variant="outline">
                ⏸️ Pause
              </Button>
            )}
            
            {/* Skip Button */}
            <Button variant="outline" size="lg">
              ⏭️ Skip
            </Button>
            
            {/* Speed Controls */}
            <div className="flex space-x-1">
              {([1, 2, 4, 8] as AnimationSpeed[]).map((speed) => (
                <Button
                  key={speed}
                  variant={gameState.animationSpeed === speed ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSpeedChange(speed)}
                  className={gameState.animationSpeed === speed ? "bg-gray-800 text-white" : ""}
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Flexbox 2: Stats & Event Log */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
        {/* Sub-flexbox 1: Team Stats */}
        <div className="flex-[2] min-w-[50vw] p-4 overflow-hidden">
          <Tabs defaultValue="away" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="away">Away stats</TabsTrigger>
              <TabsTrigger value="home">Home stats</TabsTrigger>
            </TabsList>
            
            <TabsContent value="away" className="flex-1 overflow-hidden">
              <div className="h-full overflow-auto">
                <GameStatsTable players={getRosterTableData(awayTeam)} />
              </div>
            </TabsContent>
            
            <TabsContent value="home" className="flex-1 overflow-hidden">
              <div className="h-full overflow-auto">
                <GameStatsTable players={getRosterTableData(homeTeam)} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sub-flexbox 2: Event Log */}
        <div className="flex-[1] p-4 border-l border-black">
          <div className="h-full flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-center text-muted-foreground">Event feed</h3>
            <div className="flex-1 overflow-y-auto scroll-smooth" ref={eventFeedRef}>
              <div className="space-y-2 p-2">
                {gameState.events.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Game will start when you click Play
                  </div>
                ) : (
                  gameState.events.map((event, index) => {
                    // Determine which team took the action
                    const isHomeTeam = event.teamId === homeTeam.id
                    const teamAbbrev = isHomeTeam ? homeTeam.abbreviation : awayTeam.abbreviation
                    
                    return (
                      <div key={event.id} className="flex items-start space-x-2 text-sm font-mono">
                        <div className="text-muted-foreground font-semibold text-xs w-8 flex-shrink-0">
                          {teamAbbrev}
                        </div>
                        <div className="text-muted-foreground text-xs w-12 flex-shrink-0">
                          {event.time}
                        </div>
                        <div className="flex-1">
                          {event.description}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Warning Modal */}
      <GameWatchNavigationModal
        isOpen={showNavigationModal}
        onClose={() => setShowNavigationModal(false)}
        onContinueWatching={handleContinueWatching}
        onLeaveAndSim={handleLeaveAndSim}
      />
    </div>
  )
}