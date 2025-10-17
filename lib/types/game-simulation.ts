/**
 * Game Simulation Types
 * 
 * This file contains types specifically for game simulation that bridge
 * database types with the game engine needs.
 */

import type { Team as DatabaseTeam, Player as DatabasePlayer } from './database'

/**
 * Simplified player for game engine
 */
export interface GameSimulationPlayer {
  id: string
  name: string
  position: "PG" | "SG" | "SF" | "PF" | "C"
  attributes: {
    shooting: number
    defense: number
    rebounding: number
    passing: number
    athleticism: number
  }
  overall: number
  descriptor: string
}

/**
 * Team wrapper for game simulation with players array
 */
export interface GameSimulationTeam {
  id: string
  name: string
  city: string
  players: GameSimulationPlayer[]
  record: { wins: number; losses: number }
}

/**
 * Game event during simulation
 */
export interface GameEvent {
  id: string
  quarter: number
  time: string
  description: string
  homeScore: number
  awayScore: number
  eventType: 'shot' | 'rebound' | 'assist' | 'steal' | 'block' | 'foul' | 'timeout' | 'substitution' | 'turnover'
  playerId?: string
  teamId?: string
  shotClockRemaining?: number
  gameTimeSeconds: number
}

/**
 * Strategic adjustments for game simulation
 */
export interface StrategicAdjustments {
  pace: 'slow' | 'normal' | 'fast'
  shotSelection: 'conservative' | 'balanced' | 'aggressive'
  defense: 'soft' | 'normal' | 'intense'
}

/**
 * Player game stats during simulation
 */
export interface PlayerGameStats extends GameSimulationPlayer {
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  fieldGoalsMade: number
  fieldGoalsAttempted: number
  threePointersMade: number
  threePointersAttempted: number
}

/**
 * Game simulation result
 */
export interface GameSimulationResult {
  homeTeam: GameSimulationTeam
  awayTeam: GameSimulationTeam
  homeScore: number
  awayScore: number
  events: GameEvent[]
  winner: string
  homePlayerStats: PlayerGameStats[]
  awayPlayerStats: PlayerGameStats[]
  mvp?: PlayerGameStats
}

/**
 * Convert database team to game simulation team
 */
export function convertDatabaseTeamToGameTeam(dbTeam: DatabaseTeam, players: DatabasePlayer[]): GameSimulationTeam {
  const gamePlayers: GameSimulationPlayer[] = players.map(player => ({
    id: player.player_id.toString(),
    name: `${player.first_name} ${player.last_name}`,
    position: player.position as "PG" | "SG" | "SF" | "PF" | "C",
    attributes: {
      shooting: Math.round((player.inside_shot + player.three_point_shot) / 2),
      defense: Math.round((player.on_ball_defense + player.block + player.steal) / 3),
      rebounding: Math.round((player.offensive_rebound + player.defensive_rebound) / 2),
      passing: player.pass,
      athleticism: Math.round((player.speed + player.stamina) / 2)
    },
    overall: player.overall_rating,
    descriptor: `${player.position} - ${player.overall_rating} OVR`
  }))

  return {
    id: dbTeam.team_id.toString(),
    name: dbTeam.name,
    city: dbTeam.city,
    players: gamePlayers,
    record: { wins: dbTeam.wins, losses: dbTeam.losses }
  }
}
