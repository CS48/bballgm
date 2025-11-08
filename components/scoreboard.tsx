"use client"

import { useState, useEffect } from "react"
import type { GameSimulationTeam, WatchGameState } from "@/lib/types/game-simulation"

interface ScoreboardProps {
  awayTeam: GameSimulationTeam
  homeTeam: GameSimulationTeam
  gameState: WatchGameState
}

export function Scoreboard({ awayTeam, homeTeam, gameState }: ScoreboardProps) {
  const [awayScoreAnimation, setAwayScoreAnimation] = useState<number | null>(null)
  const [homeScoreAnimation, setHomeScoreAnimation] = useState<number | null>(null)
  const [prevAwayScore, setPrevAwayScore] = useState(gameState.awayScore)
  const [prevHomeScore, setPrevHomeScore] = useState(gameState.homeScore)

  // Detect score changes and trigger animations
  useEffect(() => {
    if (gameState.awayScore > prevAwayScore) {
      const points = gameState.awayScore - prevAwayScore
      setAwayScoreAnimation(points)
      setTimeout(() => setAwayScoreAnimation(null), 2000) // Hide after 2 seconds
      setPrevAwayScore(gameState.awayScore)
    } else if (gameState.awayScore !== prevAwayScore) {
      setPrevAwayScore(gameState.awayScore)
    }

    if (gameState.homeScore > prevHomeScore) {
      const points = gameState.homeScore - prevHomeScore
      setHomeScoreAnimation(points)
      setTimeout(() => setHomeScoreAnimation(null), 2000) // Hide after 2 seconds
      setPrevHomeScore(gameState.homeScore)
    } else if (gameState.homeScore !== prevHomeScore) {
      setPrevHomeScore(gameState.homeScore)
    }
  }, [gameState.awayScore, gameState.homeScore, prevAwayScore, prevHomeScore])
  // Determine game state for display
  const getGameState = () => {
    if (gameState.isComplete) {
      return { label: "Game Over", time: "" }
    }
    
    // Check if we're at halftime (between Q2 and Q3)
    const lastEvent = gameState.events[gameState.events.length - 1]
    const isHalftime = (gameState.currentQuarter === 3 && gameState.quarterTimeRemaining === 12 * 60) ||
                       (lastEvent?.description?.includes("End of Quarter 2") && gameState.currentQuarter === 3 && gameState.quarterTimeRemaining === 12 * 60)
    
    if (isHalftime) {
      return { label: "Halftime", time: "" }
    }
    
    // Normal quarter display
    const minutes = Math.floor(gameState.quarterTimeRemaining / 60)
    const seconds = Math.floor(gameState.quarterTimeRemaining % 60)
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    return { label: `QUARTER ${gameState.currentQuarter}`, time: timeString }
  }

  const gameStateInfo = getGameState()

  return (
    <div className="w-full h-full bg-transparent rounded-lg p-6">
      <div className="flex items-center justify-between h-full">
        {/* Away Team Section */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 relative">
          <div className="text-sm font-medium text-gray-600 uppercase">Away</div>
          <div className="text-2xl font-medium text-black">{awayTeam.name}</div>
          <div className="relative">
            <div className="text-5xl font-bold text-black">{gameState.awayScore}</div>
            {awayScoreAnimation !== null && (
              <div className="absolute -left-16 top-1/2 transform -translate-y-1/2 text-3xl font-bold text-black animate-score-pop whitespace-nowrap">
                +{awayScoreAnimation}
              </div>
            )}
          </div>
        </div>

        {/* Game State Section */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8 border-x border-gray-300">
          {gameStateInfo.label === "Halftime" || gameStateInfo.label === "Game Over" ? (
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-300">
              <div className="text-center">
                <div className="text-xs font-medium text-gray-600 uppercase">
                  {gameStateInfo.label}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm font-medium text-gray-600 uppercase">
                {gameStateInfo.label}
              </div>
              <div className="text-2xl font-bold text-black">{gameStateInfo.time}</div>
            </>
          )}
        </div>

        {/* Home Team Section */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 relative">
          <div className="text-sm font-medium text-gray-600 uppercase">Home</div>
          <div className="text-2xl font-medium text-black">{homeTeam.name}</div>
          <div className="relative">
            <div className="text-5xl font-bold text-black">{gameState.homeScore}</div>
            {homeScoreAnimation !== null && (
              <div className="absolute -left-16 top-1/2 transform -translate-y-1/2 text-3xl font-bold text-black animate-score-pop whitespace-nowrap">
                +{homeScoreAnimation}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

