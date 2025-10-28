/**
 * Rotation Chart Component
 * 
 * Toggle-based interface for setting player rotation patterns.
 * Each player has 48 rectangles representing game minutes.
 * Click/drag to toggle playing time on/off.
 */

"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { PlayerRotation, TeamRotationConfig } from '@/lib/types/database'
import type { Player } from '@/lib/types/database'

interface RotationChartProps {
  players: Player[]
  rotationConfig: TeamRotationConfig | null
  onSave: (config: TeamRotationConfig) => void
  onReset: () => void
}

const TOTAL_MINUTES = 48
const QUARTER_MINUTES = 12
const RECTANGLE_WIDTH = 12
const RECTANGLE_HEIGHT = 30

export function RotationChart({ players, rotationConfig, onSave, onReset }: RotationChartProps) {
  const [playerMinutes, setPlayerMinutes] = useState<Map<number, boolean[]>>(new Map())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartState, setDragStartState] = useState<boolean | null>(null)
  const [dragPlayerId, setDragPlayerId] = useState<number | null>(null)
  const [dragStartMinute, setDragStartMinute] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isValid, setIsValid] = useState(false)

  // Create default rotation pattern (position-aware)
  const createDefaultRotation = useCallback((): Map<number, boolean[]> => {
    const playerMinutesMap = new Map<number, boolean[]>()
    
    // Group players by position
    const positions = ['PG', 'SG', 'SF', 'PF', 'C'] as const
    const playersByPosition: Record<string, any[]> = {
      PG: [],
      SG: [],
      SF: [],
      PF: [],
      C: []
    }
    
    players.forEach(player => {
      if (playersByPosition[player.position]) {
        playersByPosition[player.position].push(player)
      }
    })
    
    // Sort each position by overall rating
    positions.forEach(pos => {
      playersByPosition[pos].sort((a, b) => b.overall_rating - a.overall_rating)
    })
    
    // Assign minutes for each position
    positions.forEach(pos => {
      const posPlayers = playersByPosition[pos]
      
      if (posPlayers.length === 0) return
      
      // Starter (best at position): ~32 minutes
      // Pattern: Play most of Q1, Q2, Q3, Q4 with 6-minute rests
      if (posPlayers[0]) {
        const minutes = Array(TOTAL_MINUTES).fill(false)
        // Q1: 0-6, Q2: 12-18, Q3: 24-30, Q4: 36-42
        const ranges = [[0, 6], [12, 18], [24, 30], [36, 42]]
        ranges.forEach(([start, end]) => {
          for (let i = start; i < end; i++) {
            minutes[i] = true
          }
        })
        playerMinutesMap.set(posPlayers[0].player_id, minutes)
      }
      
      // Backup (2nd best): ~16 minutes
      // Pattern: Fill in when starter rests
      if (posPlayers[1]) {
        const minutes = Array(TOTAL_MINUTES).fill(false)
        // Q1: 6-10, Q2: 18-22, Q3: 30-34, Q4: 42-46
        const ranges = [[6, 10], [18, 22], [30, 34], [42, 46]]
        ranges.forEach(([start, end]) => {
          for (let i = start; i < end; i++) {
            minutes[i] = true
          }
        })
        playerMinutesMap.set(posPlayers[1].player_id, minutes)
      }
      
      // 3rd string: limited garbage time minutes
      if (posPlayers[2]) {
        const minutes = Array(TOTAL_MINUTES).fill(false)
        // End of quarters when both starter and backup rest
        const ranges = [[10, 12], [22, 24], [34, 36], [46, 48]]
        ranges.forEach(([start, end]) => {
          for (let i = start; i < end; i++) {
            minutes[i] = true
          }
        })
        playerMinutesMap.set(posPlayers[2].player_id, minutes)
      }
      
      // Additional players at this position: no minutes by default
      for (let i = 3; i < posPlayers.length; i++) {
        playerMinutesMap.set(posPlayers[i].player_id, Array(TOTAL_MINUTES).fill(false))
      }
    })
    
    return playerMinutesMap
  }, [players])

  // Initialize player minutes from rotation config
  useEffect(() => {
    if (rotationConfig) {
      const newPlayerMinutes = new Map<number, boolean[]>()
      
      rotationConfig.player_rotations.forEach(playerRotation => {
        const minutes = Array(TOTAL_MINUTES).fill(false)
        
        playerRotation.active_minutes.forEach(([start, end]) => {
          for (let i = start; i < end; i++) {
            minutes[i] = true
          }
        })
        
        newPlayerMinutes.set(playerRotation.player_id, minutes)
      })
      
      setPlayerMinutes(newPlayerMinutes)
    } else {
      // Create default rotation
      setPlayerMinutes(createDefaultRotation())
    }
  }, [rotationConfig, createDefaultRotation])

  // Get total minutes for a player
  const getPlayerTotalMinutes = (playerId: number): number => {
    const minutes = playerMinutes.get(playerId) || Array(TOTAL_MINUTES).fill(false)
    return minutes.filter(m => m).length
  }

  // Get player count for a specific minute
  const getMinutePlayerCount = (minute: number): number => {
    let count = 0
    playerMinutes.forEach(minutes => {
      if (minutes[minute]) count++
    })
    return count
  }

  // Handle minute click
  const handleMinuteClick = (playerId: number, minute: number) => {
    const current = playerMinutes.get(playerId) || Array(TOTAL_MINUTES).fill(false)
    const newState = [...current]
    newState[minute] = !newState[minute]
    
    setPlayerMinutes(new Map(playerMinutes.set(playerId, newState)))
  }

  // Handle minute drag
  const handleMinuteDrag = (playerId: number, minute: number) => {
    if (!isDragging || playerId !== dragPlayerId || dragStartState === null) return
    
    const current = playerMinutes.get(playerId) || Array(TOTAL_MINUTES).fill(false)
    const newState = [...current]
    
    const startMinute = Math.min(dragStartMinute!, minute)
    const endMinute = Math.max(dragStartMinute!, minute)
    
    for (let i = startMinute; i <= endMinute; i++) {
      newState[i] = dragStartState
    }
    
    setPlayerMinutes(new Map(playerMinutes.set(playerId, newState)))
  }

  // Handle mouse down
  const handleMouseDown = (playerId: number, minute: number) => {
    const current = playerMinutes.get(playerId) || Array(TOTAL_MINUTES).fill(false)
    const newState = !current[minute] // Toggle from current state
    
    setIsDragging(true)
    setDragPlayerId(playerId)
    setDragStartMinute(minute)
    setDragStartState(newState)
    
    // Immediately toggle the clicked minute
    handleMinuteClick(playerId, minute)
  }

  // Handle mouse enter
  const handleMouseEnter = (playerId: number, minute: number) => {
    if (isDragging && playerId === dragPlayerId) {
      handleMinuteDrag(playerId, minute)
    }
  }

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false)
    setDragPlayerId(null)
    setDragStartState(null)
    setDragStartMinute(null)
  }

  // Validate rotation
  const validateRotation = useCallback(() => {
    const errors: string[] = []
    
    // Check that exactly 5 players are on court at all times
    for (let minute = 0; minute < TOTAL_MINUTES; minute++) {
      let count = 0
      playerMinutes.forEach(minutes => {
        if (minutes[minute]) count++
      })
      
      if (count !== 5) {
        errors.push(`Minute ${minute}: ${count} players on court (should be 5)`)
      }
    }

    setValidationErrors(errors)
    const valid = errors.length === 0
    setIsValid(valid)
    return valid
  }, [playerMinutes])

  // Run validation whenever player minutes change
  useEffect(() => {
    validateRotation()
  }, [playerMinutes, validateRotation])

  // Convert boolean arrays to minute ranges
  const convertToMinuteRanges = (minutes: boolean[]): number[][] => {
    const ranges: number[][] = []
    let start = -1
    
    for (let i = 0; i < minutes.length; i++) {
      if (minutes[i] && start === -1) {
        start = i
      } else if (!minutes[i] && start !== -1) {
        ranges.push([start, i])
        start = -1
      }
    }
    
    if (start !== -1) {
      ranges.push([start, minutes.length])
    }
    
    return ranges
  }

  // Save rotation configuration
  const handleSave = () => {
    // Validate before saving
    if (!isValid) {
      alert('Cannot save rotation: All 48 minutes must have exactly 5 players on court.')
      return
    }

    const playerRotations: PlayerRotation[] = players.map(player => {
      const minutes = playerMinutes.get(player.player_id) || Array(TOTAL_MINUTES).fill(false)
      const activeMinutes = convertToMinuteRanges(minutes)
      const totalMinutes = getPlayerTotalMinutes(player.player_id)

      return {
        player_id: player.player_id,
        active_minutes: activeMinutes,
        total_minutes: totalMinutes
      }
    })

    const config: TeamRotationConfig = {
      team_id: players[0]?.team_id || 0,
      player_rotations: playerRotations,
      is_custom: true,
      last_updated: new Date().toISOString()
    }

    onSave(config)
  }

  // Reset to default
  const handleReset = () => {
    setPlayerMinutes(createDefaultRotation())
    setValidationErrors([])
    onReset()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Rotation Chart</h3>
          <p className="text-sm text-muted-foreground">
            Click rectangles to toggle playing time. Each minute must have exactly 5 players on court.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Save Rotation
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Chart */}
      <Card>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            {/* Validation Row */}
            <div className="flex mb-2">
              <div className="w-32 flex-shrink-0"></div>
              <div className="w-24 flex-shrink-0"></div>
              <div className="w-16 flex-shrink-0 ml-4"></div>
              <div className="flex-grow ml-4">
                <div className="flex">
                  {Array.from({ length: TOTAL_MINUTES }, (_, minute) => {
                    const playerCount = getMinutePlayerCount(minute)
                    const hasError = playerCount !== 5
                    
                    return (
                      <div 
                        key={minute}
                        className={`text-xs text-center flex-shrink-0 border-r border-gray-200 ${
                          hasError ? 'bg-red-100' : ''
                        }`}
                        style={{ width: RECTANGLE_WIDTH }}
                      >
                        {hasError && <span className="text-red-600">⚠️</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Quarter Labels */}
            <div className="flex mb-2">
              <div className="w-32 flex-shrink-0"></div>
              <div className="w-24 flex-shrink-0"></div>
              <div className="w-16 flex-shrink-0 ml-4"></div>
              <div className="flex-grow ml-4">
                <div className="flex">
                  {Array.from({ length: 4 }, (_, quarter) => (
                    <div 
                      key={quarter}
                      className="text-xs text-center font-medium flex-shrink-0 border-r-2 border-gray-300"
                      style={{ width: QUARTER_MINUTES * RECTANGLE_WIDTH }}
                    >
                      Q{quarter + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Player rows */}
            {players
              .sort((a, b) => {
                // Starters first (is_starter === 1), then by position, then by overall rating
                if (a.is_starter !== b.is_starter) {
                  return b.is_starter - a.is_starter
                }
                
                // Position order: PG, SG, SF, PF, C
                const positionOrder = { 'PG': 0, 'SG': 1, 'SF': 2, 'PF': 3, 'C': 4 }
                const aPosOrder = positionOrder[a.position as keyof typeof positionOrder] ?? 5
                const bPosOrder = positionOrder[b.position as keyof typeof positionOrder] ?? 5
                
                if (aPosOrder !== bPosOrder) {
                  return aPosOrder - bPosOrder
                }
                
                // Within same position, sort by overall rating (highest first)
                return b.overall_rating - a.overall_rating
              })
              .map((player) => {
              const minutes = playerMinutes.get(player.player_id) || Array(TOTAL_MINUTES).fill(false)
              const totalMinutes = getPlayerTotalMinutes(player.player_id)
              
              return (
                <div key={player.player_id} className="flex items-center border-b border-gray-200 py-2">
                  {/* Player Name */}
                  <div className="text-sm font-medium w-32 flex-shrink-0">
                    {player.name}
                  </div>
                  {/* Position | OVR */}
                  <div className="text-sm text-muted-foreground w-24 flex-shrink-0">
                    {player.position} | {player.overall_rating} ovr
                  </div>
                  {/* Total Minutes */}
                  <div className="text-sm text-muted-foreground w-16 flex-shrink-0 ml-4">
                    {totalMinutes} min
                  </div>
                  {/* Minute rectangles */}
                  <div 
                    className="flex flex-grow h-full relative ml-4"
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {/* Quarter dividers */}
                    {Array.from({ length: 3 }, (_, i) => (
                      <div 
                        key={i}
                        className="absolute h-full border-r-2 border-gray-300"
                        style={{ left: (i + 1) * QUARTER_MINUTES * RECTANGLE_WIDTH }}
                      />
                    ))}

                    {/* Minute rectangles */}
                    {minutes.map((isActive, minute) => (
                      <div
                        key={minute}
                        className={`border border-gray-200 cursor-pointer hover:opacity-80 ${
                          isActive ? 'bg-black' : 'bg-white'
                        }`}
                        style={{ 
                          width: RECTANGLE_WIDTH,
                          height: RECTANGLE_HEIGHT
                        }}
                        onMouseDown={() => handleMouseDown(player.player_id, minute)}
                        onMouseEnter={() => handleMouseEnter(player.player_id, minute)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
