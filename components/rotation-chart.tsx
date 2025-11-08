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
import { createDefaultRotationConfig } from '@/lib/utils/default-rotation-generator'

interface RotationChartProps {
  players: Player[]
  rotationConfig: TeamRotationConfig | null
  teamId: number
  onSave: (config: TeamRotationConfig) => void
  onReset: () => void
}

const TOTAL_MINUTES = 48
const QUARTER_MINUTES = 12
const RECTANGLE_WIDTH = 12
const RECTANGLE_HEIGHT = 30

export function RotationChart({ players, rotationConfig, teamId, onSave, onReset }: RotationChartProps) {
  const [playerMinutes, setPlayerMinutes] = useState<Map<number, boolean[]>>(new Map())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartState, setDragStartState] = useState<boolean | null>(null)
  const [dragPlayerId, setDragPlayerId] = useState<number | null>(null)
  const [dragStartMinute, setDragStartMinute] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isValid, setIsValid] = useState(false)

  // Create default rotation using shared utility (overall-rating-based, matching simulation engine)
  const createDefaultRotation = useCallback((): Map<number, boolean[]> => {
    const playerMinutesMap = new Map<number, boolean[]>()
    
    // Generate default rotation config using shared utility
    // Convert players to full Player format (players from getTeamRoster have all attributes)
    const fullPlayers: Player[] = players.map(p => {
      const playerAny = p as any
      const nameParts = playerAny.name?.split(' ') || ['', '']
      return {
        player_id: p.player_id,
        team_id: teamId,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        age: playerAny.age ?? 25,
        position: p.position,
        is_starter: playerAny.is_starter ?? 0,
        height: playerAny.height ?? 75,
        weight: playerAny.weight ?? 200,
        years_pro: playerAny.years_pro ?? 5,
        draft_info: null,
        speed: playerAny.speed ?? 50,
        ball_iq: playerAny.ball_iq ?? 50,
        inside_shot: playerAny.inside_shot ?? 50,
        three_point_shot: playerAny.three_point_shot ?? 50,
        pass: playerAny.pass ?? 50,
        skill_move: playerAny.skill_move ?? 50,
        on_ball_defense: playerAny.on_ball_defense ?? 50,
        stamina: playerAny.stamina ?? 50,
        block: playerAny.block ?? 50,
        steal: playerAny.steal ?? 50,
        offensive_rebound: playerAny.offensive_rebound ?? 50,
        defensive_rebound: playerAny.defensive_rebound ?? 50,
        current_season_stats: null,
        historical_stats: null,
        career_stats: null
      }
    })
    
    const defaultConfig = createDefaultRotationConfig(teamId, fullPlayers)
    
    // Convert TeamRotationConfig to Map<number, boolean[]> format
    defaultConfig.player_rotations.forEach(playerRotation => {
      const minutes = Array(TOTAL_MINUTES).fill(false)
      
      playerRotation.active_minutes.forEach(([start, end]) => {
        for (let i = start; i < end; i++) {
          minutes[i] = true
        }
      })
      
      playerMinutesMap.set(playerRotation.player_id, minutes)
    })
    
    // Ensure all players have an entry (even if they have no minutes)
    players.forEach(player => {
      if (!playerMinutesMap.has(player.player_id)) {
        playerMinutesMap.set(player.player_id, Array(TOTAL_MINUTES).fill(false))
      }
    })
    
    return playerMinutesMap
  }, [players, teamId])

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
                          hasError ? 'bg-red-100' : 'bg-transparent'
                        }`}
                        style={{ width: RECTANGLE_WIDTH, height: RECTANGLE_HEIGHT }}
                      >
                        {hasError && <span className="text-red-600 font-bold">!</span>}
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
                          isActive ? 'bg-gray-500' : 'bg-white'
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
