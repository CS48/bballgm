/**
 * Fatigue Calculator
 * 
 * Calculates fatigue penalties for players based on minutes played and applies
 * them to player attributes during possession simulation.
 */

import type { SimulationPlayer } from '../types/simulation-engine'

export interface FatigueState {
  /** Player ID */
  playerId: string
  /** Total minutes played this game */
  minutesPlayed: number
  /** Current fatigue penalty (0-20) */
  fatiguePenalty: number
  /** Whether player is currently on court */
  isActive: boolean
}

export class FatigueCalculator {
  private fatigueStates: Map<string, FatigueState> = new Map()
  private gameStartTime: number = 0

  constructor() {
    this.gameStartTime = Date.now()
  }

  /**
   * Update fatigue for active players
   */
  updateFatigue(activePlayers: SimulationPlayer[], timeElapsed: number): void {
    for (const player of activePlayers) {
      const currentState = this.fatigueStates.get(player.id) || {
        playerId: player.id,
        minutesPlayed: 0,
        fatiguePenalty: 0,
        isActive: false
      }

      // Add time to minutes played
      currentState.minutesPlayed += timeElapsed / 60 // Convert seconds to minutes
      currentState.isActive = true

      // Calculate fatigue penalty
      currentState.fatiguePenalty = this.calculateFatiguePenalty(currentState.minutesPlayed, player.stamina)

      this.fatigueStates.set(player.id, currentState)
    }

    // Mark inactive players
    for (const [playerId, state] of this.fatigueStates) {
      const isActive = activePlayers.some(p => p.id === playerId)
      if (!isActive) {
        state.isActive = false
        // Fatigue recovers slowly while on bench (1 point per 2 minutes)
        state.fatiguePenalty = Math.max(0, state.fatiguePenalty - (timeElapsed / 60) / 2)
      }
    }
  }

  /**
   * Calculate fatigue penalty based on minutes played and stamina
   */
  private calculateFatiguePenalty(minutesPlayed: number, stamina: number): number {
    // Base fatigue: 1 point per 2 minutes played
    const baseFatigue = minutesPlayed / 2
    
    // Stamina modifier: higher stamina = less fatigue
    const staminaModifier = (100 - stamina) / 100
    
    // Apply stamina modifier
    const adjustedFatigue = baseFatigue * (1 + staminaModifier)
    
    // Cap at 20 points maximum
    return Math.min(20, adjustedFatigue)
  }

  /**
   * Apply fatigue to player attributes
   */
  applyFatigue(player: SimulationPlayer): SimulationPlayer {
    const fatigueState = this.fatigueStates.get(player.id)
    if (!fatigueState || fatigueState.fatiguePenalty === 0) {
      return player
    }

    const fatigue = fatigueState.fatiguePenalty

    // Create modified player with fatigue-adjusted attributes
    return {
      ...player,
      stamina: Math.max(0, player.stamina - fatigue),
      speed: Math.max(0, player.speed - (fatigue * 0.3)),
      ball_iq: Math.max(0, player.ball_iq - (fatigue * 0.2)),
      inside_shot: Math.max(0, player.inside_shot - (fatigue * 0.25)),
      three_point_shot: Math.max(0, player.three_point_shot - (fatigue * 0.25)),
      pass: Math.max(0, player.pass - (fatigue * 0.2)),
      skill_move: Math.max(0, player.skill_move - (fatigue * 0.3)),
      on_ball_defense: Math.max(0, player.on_ball_defense - (fatigue * 0.2)),
      block: Math.max(0, player.block - (fatigue * 0.2)),
      steal: Math.max(0, player.steal - (fatigue * 0.2)),
      offensive_rebound: Math.max(0, player.offensive_rebound - (fatigue * 0.15)),
      defensive_rebound: Math.max(0, player.defensive_rebound - (fatigue * 0.15))
    }
  }

  /**
   * Apply fatigue to entire lineup
   */
  applyFatigueToLineup(players: SimulationPlayer[]): SimulationPlayer[] {
    return players.map(player => this.applyFatigue(player))
  }

  /**
   * Get fatigue state for a player
   */
  getFatigueState(playerId: string): FatigueState | undefined {
    return this.fatigueStates.get(playerId)
  }

  /**
   * Get all fatigue states
   */
  getAllFatigueStates(): Map<string, FatigueState> {
    return new Map(this.fatigueStates)
  }

  /**
   * Reset fatigue for a player (e.g., after substitution)
   */
  resetPlayerFatigue(playerId: string): void {
    const state = this.fatigueStates.get(playerId)
    if (state) {
      state.fatiguePenalty = 0
      this.fatigueStates.set(playerId, state)
    }
  }

  /**
   * Reset all fatigue (e.g., start of new game)
   */
  resetAllFatigue(): void {
    this.fatigueStates.clear()
    this.gameStartTime = Date.now()
  }

  /**
   * Get fatigue penalty for a player
   */
  getFatiguePenalty(playerId: string): number {
    const state = this.fatigueStates.get(playerId)
    return state ? state.fatiguePenalty : 0
  }

  /**
   * Check if a player is fatigued (penalty > 10)
   */
  isPlayerFatigued(playerId: string): boolean {
    return this.getFatiguePenalty(playerId) > 10
  }

  /**
   * Get fatigue level description
   */
  getFatigueLevel(playerId: string): 'fresh' | 'tired' | 'fatigued' | 'exhausted' {
    const penalty = this.getFatiguePenalty(playerId)
    
    if (penalty < 5) return 'fresh'
    if (penalty < 10) return 'tired'
    if (penalty < 15) return 'fatigued'
    return 'exhausted'
  }

  /**
   * Calculate fatigue impact on performance (0-1 multiplier)
   */
  getPerformanceMultiplier(playerId: string): number {
    const penalty = this.getFatiguePenalty(playerId)
    
    // Performance drops linearly with fatigue
    // At 20 fatigue penalty, performance is 80% of normal
    return Math.max(0.8, 1 - (penalty * 0.01))
  }
}



