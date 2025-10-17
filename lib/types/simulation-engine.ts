/**
 * D20 Basketball Simulation Engine Types
 * 
 * This file contains all TypeScript interfaces and types for the D20-based
 * basketball simulation system, including possession state, roll results,
 * and configuration structures.
 */

import type { GameSimulationPlayer, GameSimulationTeam } from './game-simulation'
import type { Player as DatabasePlayer } from './database'

/**
 * Player attributes for simulation (0-100 scale)
 */
export interface SimulationPlayer {
  id: string
  name: string
  position: "PG" | "SG" | "SF" | "PF" | "C"
  teamId: string
  speed: number
  ball_iq: number
  inside_shot: number
  three_point_shot: number
  pass: number
  skill_move: number
  on_ball_defense: number
  stamina: number
  block: number
  steal: number
  offensive_rebound: number
  defensive_rebound: number
  overall: number
}

/**
 * Team for simulation with 5 players
 */
export interface SimulationTeam {
  id: string
  name: string
  city: string
  players: SimulationPlayer[]
}

/**
 * Possession state tracking
 */
export interface PossessionState {
  ballHandler: SimulationPlayer
  passCount: number
  defensiveBreakdown: number
  shotClock: number
  opennessScores: Map<string, number> // playerId -> openness score
  staminaDecay: Map<string, number> // playerId -> stamina penalty
}

/**
 * D20 roll result with detailed information
 */
export interface RollResult {
  outcome: string
  roll: number // 1-20
  faces: number[] // face allocation per outcome
  rawValue: number
  normalizedProbability: number
  debug: {
    coefficients: Record<string, number>
    calculation: string
  }
}

/**
 * Shot roll result
 */
export interface ShotRollResult extends RollResult {
  made: boolean
  isThreePointer: boolean
  points: number
}

/**
 * Skill move roll result (3 outcomes)
 */
export interface SkillMoveRollResult extends RollResult {
  outcome: 'success' | 'neutral' | 'steal'
  opennessGain?: number
}

/**
 * Pass roll result
 */
export interface PassRollResult extends RollResult {
  complete: boolean
  intercepted: boolean
  newBallHandler?: SimulationPlayer
}

/**
 * Rebound roll result
 */
export interface ReboundRollResult extends RollResult {
  rebounder: SimulationPlayer
  isOffensive: boolean
  teamId: string
}

/**
 * Ball handler decision
 */
export interface BallHandlerDecision {
  action: 'pass' | 'skill_move' | 'shoot'
  target?: SimulationPlayer
  reasoning: string
  opennessScore: number
}

/**
 * Possession log entry
 */
export interface PossessionLogEntry {
  step: number
  ballHandler: string
  decision: BallHandlerDecision
  opennessScores: Record<string, number>
  rollResult?: RollResult
  stateUpdate?: Partial<PossessionState>
  description: string
}

/**
 * Complete possession result
 */
export interface PossessionResult {
  events: PossessionLogEntry[]
  finalScore: number
  changePossession: boolean
  offensiveRebound: boolean
  newBallHandler?: SimulationPlayer
  possessionDuration: number
}

/**
 * Simulation configuration structure
 */
export interface SimulationConfig {
  shot_roll: {
    coefficients: {
      off_shot: number
      openness: number
      off_speed: number
      stamina: number
      def_onball: number
      def_speed: number
      shot_clock_pressure: number
      context_modifier: number
    }
    caps: {
      max_faces: number
      min_faces: number
    }
  }
  skill_move_roll: {
    coefficients: {
      success: {
        off_skill: number
        off_speed: number
        def_onball: number
        def_speed: number
        openness: number
      }
      steal: {
        def_steal: number
        def_speed: number
        off_skill: number
      }
    }
    caps: {
      steal_cap: number
      max_faces: number
      min_faces: number
    }
    baseline: {
      neutral_weight: number
    }
  }
  pass_roll: {
    coefficients: {
      off_pass: number
      target_openness: number
      ball_iq: number
      def_openness: number
      def_steal: number
    }
    caps: {
      steal_cap: number
      max_faces: number
      min_faces: number
    }
  }
  rebound_roll: {
    coefficients: {
      off_reb: number
      def_reb: number
      position_bonus: number
      team_bias: number
    }
    caps: {
      max_faces: number
      min_faces: number
    }
  }
  decision_logic: {
    forced_shot_threshold: number
    def_breakdown_increment: number
    max_def_breakdown: number
    stamina_decay_per_possession: number
  }
  allocation_rules: {
    d20_total_faces: number
    rounding_method: string
    fractional_priority: string
    seeded_rng: boolean
  }
  logging?: {
    verbose_possession_logs?: boolean
    show_decision_details?: boolean
    show_roll_details?: boolean
  }
}

/**
 * Face allocation caps for D20 rolls
 */
export interface FaceCaps {
  min: number[]
  max: number[]
}

/**
 * Enhanced game event with D20 simulation details
 */
export interface D20GameEvent {
  id: string
  quarter: number
  time: string
  description: string
  homeScore: number
  awayScore: number
  eventType: 'shot' | 'rebound' | 'assist' | 'steal' | 'block' | 'foul' | 'timeout' | 'substitution' | 'turnover' | 'pass' | 'skill_move'
  playerId?: string
  teamId?: string
  shotClockRemaining?: number
  gameTimeSeconds: number
  
  // D20 simulation details
  ballHandler?: {
    id: string
    name: string
  }
  opennessScores?: Record<string, number>
  decision?: BallHandlerDecision
  rollDetails?: {
    roll: number
    faces: number[]
    outcome: string
    rawValue: number
  }
}

/**
 * Convert database player to simulation player
 */
export function convertToSimulationPlayer(player: DatabasePlayer, teamId: string): SimulationPlayer {
  return {
    id: player.player_id.toString(),
    name: `${player.first_name} ${player.last_name}`,
    position: player.position,
    teamId: teamId,
    speed: player.speed,
    ball_iq: player.ball_iq,
    inside_shot: player.inside_shot,
    three_point_shot: player.three_point_shot,
    pass: player.pass,
    skill_move: player.skill_move,
    on_ball_defense: player.on_ball_defense,
    stamina: player.stamina,
    block: player.block,
    steal: player.steal,
    offensive_rebound: player.offensive_rebound,
    defensive_rebound: player.defensive_rebound,
    overall: player.overall_rating
  }
}

/**
 * Convert database team to simulation team
 */
export function convertToSimulationTeam(team: GameSimulationTeam): SimulationTeam {
  return {
    id: team.id,
    name: team.name,
    city: team.city,
    players: team.players.map(player => {
      // Convert GameSimulationPlayer to SimulationPlayer
      // The player object should have the individual attributes from the database
      return {
        id: player.id,
        name: player.name,
        position: player.position,
        teamId: (player as any).teamId || team.id, // Use player's teamId or fallback to team.id
        speed: (player as any).speed || 50,
        ball_iq: (player as any).ball_iq || 50,
        inside_shot: (player as any).inside_shot || 50,
        three_point_shot: (player as any).three_point_shot || 50,
        pass: (player as any).pass || 50,
        skill_move: (player as any).skill_move || 50,
        on_ball_defense: (player as any).on_ball_defense || 50,
        stamina: (player as any).stamina || 50,
        block: (player as any).block || 50,
        steal: (player as any).steal || 50,
        offensive_rebound: (player as any).offensive_rebound || 50,
        defensive_rebound: (player as any).defensive_rebound || 50,
        overall: player.overall
      }
    })
  }
}
