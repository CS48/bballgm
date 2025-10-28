/**
 * Rotation Manager
 * 
 * Handles player substitutions and minute tracking during game simulations.
 * Uses user-configured rotation charts with intelligent overrides for foul trouble,
 * blowouts, and close games.
 */

import type { TeamRotationConfig, PlayerRotation } from '../types/database'
import type { SimulationPlayer, SimulationTeam } from '../types/simulation-engine'

export interface GameState {
  quarter: number
  quarterTimeRemaining: number
  homeScore: number
  awayScore: number
  playerFouls: Map<string, number>
  playerMinutes: Map<string, number>
}

export interface SubstitutionEvent {
  playerOut: SimulationPlayer
  playerIn: SimulationPlayer
  time: string
  reason: 'rotation' | 'foul_trouble' | 'blowout' | 'close_game'
}

export class RotationManager {
  private rotationConfig: TeamRotationConfig | null
  private team: SimulationTeam
  private gameState: GameState
  private substitutionEvents: SubstitutionEvent[] = []
  private lastActiveLineup: SimulationPlayer[] = []

  constructor(team: SimulationTeam, rotationConfig: TeamRotationConfig | null = null) {
    this.team = team
    this.rotationConfig = rotationConfig
    this.gameState = {
      quarter: 1,
      quarterTimeRemaining: 12 * 60, // 12 minutes in seconds
      homeScore: 0,
      awayScore: 0,
      playerFouls: new Map(),
      playerMinutes: new Map()
    }
  }

  /**
   * Get the active lineup (5 players) for the current game time
   */
  getActiveLineup(gameState: GameState): SimulationPlayer[] {
    this.gameState = gameState
    
    // If no rotation config, use default pattern
    if (!this.rotationConfig) {
      return this.getDefaultActiveLineup()
    }

    // Convert rotation config to active lineup
    const activeLineup = this.getActiveLineupFromConfig()
    
    // Apply intelligent overrides
    const finalLineup = this.applyIntelligentOverrides(activeLineup)
    
    // Track substitutions
    this.trackSubstitutions(finalLineup)
    
    this.lastActiveLineup = finalLineup
    return finalLineup
  }

  /**
   * Get default rotation pattern when no custom config exists
   */
  private getDefaultActiveLineup(): SimulationPlayer[] {
    const starters = this.team.players.filter(p => p.is_starter === 1)
    const bench = this.team.players.filter(p => p.is_starter === 0)
    
    // Sort bench by overall rating (best first)
    bench.sort((a, b) => this.calculateOverallRating(b) - this.calculateOverallRating(a))
    
    const { quarter, quarterTimeRemaining } = this.gameState
    const totalGameTime = (quarter - 1) * 12 * 60 + (12 * 60 - quarterTimeRemaining)
    
    // Default pattern: Starters play 0-6, bench 6-12, starters 12-18, etc.
    if (totalGameTime < 6 * 60) {
      // Q1: 0-6 minutes - Starters
      return this.getBestLineup(starters, 5)
    } else if (totalGameTime < 12 * 60) {
      // Q1: 6-12 minutes - Bench
      return this.getBestLineup(bench, 5)
    } else if (totalGameTime < 18 * 60) {
      // Q2: 0-6 minutes - Starters
      return this.getBestLineup(starters, 5)
    } else if (totalGameTime < 24 * 60) {
      // Q2: 6-12 minutes - Bench
      return this.getBestLineup(bench, 5)
    } else if (totalGameTime < 30 * 60) {
      // Q3: 0-6 minutes - Starters
      return this.getBestLineup(starters, 5)
    } else if (totalGameTime < 36 * 60) {
      // Q3: 6-12 minutes - Bench
      return this.getBestLineup(bench, 5)
    } else {
      // Q4: Mix of best players
      const allPlayers = [...starters, ...bench.slice(0, 3)] // Top 8 players
      return this.getBestLineup(allPlayers, 5)
    }
  }

  /**
   * Get active lineup based on user's rotation configuration
   */
  private getActiveLineupFromConfig(): SimulationPlayer[] {
    if (!this.rotationConfig) return this.getDefaultActiveLineup()
    
    const { quarter, quarterTimeRemaining } = this.gameState
    const totalGameTime = (quarter - 1) * 12 * 60 + (12 * 60 - quarterTimeRemaining)
    
    // Find players who should be active at this time
    const activePlayers: SimulationPlayer[] = []
    
    for (const playerRotation of this.rotationConfig.player_rotations) {
      const player = this.team.players.find(p => p.id === playerRotation.player_id.toString())
      if (!player) continue
      
      // Check if player should be active at current time
      const isActive = playerRotation.active_minutes.some(([start, end]) => 
        totalGameTime >= start * 60 && totalGameTime < end * 60
      )
      
      if (isActive) {
        activePlayers.push(player)
      }
    }
    
    // If we don't have exactly 5 players, fill with best available
    if (activePlayers.length < 5) {
      const allPlayers = [...this.team.players]
      allPlayers.sort((a, b) => this.calculateOverallRating(b) - this.calculateOverallRating(a))
      
      for (const player of allPlayers) {
        if (!activePlayers.includes(player) && activePlayers.length < 5) {
          activePlayers.push(player)
        }
      }
    }
    
    return this.getBestLineup(activePlayers, 5)
  }

  /**
   * Apply intelligent overrides to the rotation
   */
  private applyIntelligentOverrides(lineup: SimulationPlayer[]): SimulationPlayer[] {
    let finalLineup = [...lineup]
    
    // Foul trouble override
    finalLineup = this.handleFoulTrouble(finalLineup)
    
    // Blowout management
    finalLineup = this.handleBlowout(finalLineup)
    
    // Close game management
    finalLineup = this.handleCloseGame(finalLineup)
    
    return finalLineup
  }

  /**
   * Handle foul trouble substitutions
   */
  private handleFoulTrouble(lineup: SimulationPlayer[]): SimulationPlayer[] {
    const { quarter } = this.gameState
    
    return lineup.map(player => {
      const fouls = this.gameState.playerFouls.get(player.id) || 0
      
      // Foul trouble thresholds
      const shouldSub = (quarter <= 2 && fouls >= 2) || 
                       (quarter === 3 && fouls >= 4) || 
                       (fouls >= 5)
      
      if (shouldSub) {
        // Find best substitute at same position
        const substitute = this.findBestSubstitute(player.position, lineup)
        if (substitute) {
          this.addSubstitutionEvent(player, substitute, 'foul_trouble')
          return substitute
        }
      }
      
      return player
    })
  }

  /**
   * Handle blowout management (Q4 only)
   */
  private handleBlowout(lineup: SimulationPlayer[]): SimulationPlayer[] {
    const { quarter, homeScore, awayScore } = this.gameState
    const pointDiff = Math.abs(homeScore - awayScore)
    
    // Only apply in Q4 with >20 point differential
    if (quarter === 4 && pointDiff > 20) {
      // Play deeper bench
      const allPlayers = [...this.team.players]
      allPlayers.sort((a, b) => this.calculateOverallRating(b) - this.calculateOverallRating(a))
      
      // Use players 8-12 (deeper bench)
      const blowoutLineup = allPlayers.slice(7, 12)
      return this.getBestLineup(blowoutLineup, 5)
    }
    
    return lineup
  }

  /**
   * Handle close game management (Q4 only)
   */
  private handleCloseGame(lineup: SimulationPlayer[]): SimulationPlayer[] {
    const { quarter, homeScore, awayScore } = this.gameState
    const pointDiff = Math.abs(homeScore - awayScore)
    
    // Only apply in Q4 with <5 point differential
    if (quarter === 4 && pointDiff < 5) {
      // Use best 7-8 players
      const allPlayers = [...this.team.players]
      allPlayers.sort((a, b) => this.calculateOverallRating(b) - this.calculateOverallRating(a))
      
      const closers = allPlayers.slice(0, 8)
      return this.getBestLineup(closers, 5)
    }
    
    return lineup
  }

  /**
   * Find best substitute for a position
   */
  private findBestSubstitute(position: string, currentLineup: SimulationPlayer[]): SimulationPlayer | null {
    const availablePlayers = this.team.players.filter(p => 
      !currentLineup.includes(p) && p.position === position
    )
    
    if (availablePlayers.length === 0) {
      // No same-position substitute, find best available
      const allAvailable = this.team.players.filter(p => !currentLineup.includes(p))
      if (allAvailable.length === 0) return null
      
      allAvailable.sort((a, b) => this.calculateOverallRating(b) - this.calculateOverallRating(a))
      return allAvailable[0]
    }
    
    availablePlayers.sort((a, b) => this.calculateOverallRating(b) - this.calculateOverallRating(a))
    return availablePlayers[0]
  }

  /**
   * Get best lineup from available players
   */
  private getBestLineup(availablePlayers: SimulationPlayer[], count: number): SimulationPlayer[] {
    if (availablePlayers.length <= count) {
      return availablePlayers
    }
    
    // Sort by overall rating
    const sortedPlayers = [...availablePlayers].sort((a, b) => 
      this.calculateOverallRating(b) - this.calculateOverallRating(a)
    )
    
    // Try to maintain position balance
    const positions = ['PG', 'SG', 'SF', 'PF', 'C']
    const lineup: SimulationPlayer[] = []
    
    // First pass: get one player per position if possible
    for (const position of positions) {
      if (lineup.length >= count) break
      
      const playerAtPosition = sortedPlayers.find(p => 
        p.position === position && !lineup.includes(p)
      )
      
      if (playerAtPosition) {
        lineup.push(playerAtPosition)
      }
    }
    
    // Second pass: fill remaining spots with best available
    for (const player of sortedPlayers) {
      if (lineup.length >= count) break
      if (!lineup.includes(player)) {
        lineup.push(player)
      }
    }
    
    return lineup
  }

  /**
   * Track substitution events
   */
  private trackSubstitutions(newLineup: SimulationPlayer[]): void {
    if (this.lastActiveLineup.length === 0) return
    
    for (let i = 0; i < 5; i++) {
      const oldPlayer = this.lastActiveLineup[i]
      const newPlayer = newLineup[i]
      
      if (oldPlayer && newPlayer && oldPlayer.id !== newPlayer.id) {
        this.addSubstitutionEvent(oldPlayer, newPlayer, 'rotation')
      }
    }
  }

  /**
   * Add substitution event to tracking
   */
  private addSubstitutionEvent(playerOut: SimulationPlayer, playerIn: SimulationPlayer, reason: SubstitutionEvent['reason']): void {
    const { quarter, quarterTimeRemaining } = this.gameState
    const time = `${quarter}:${Math.floor(quarterTimeRemaining / 60)}:${quarterTimeRemaining % 60}`
    
    this.substitutionEvents.push({
      playerOut,
      playerIn,
      time,
      reason
    })
  }

  /**
   * Update player minutes based on time played
   */
  updatePlayerMinutes(timeElapsed: number): void {
    for (const player of this.lastActiveLineup) {
      const currentMinutes = this.gameState.playerMinutes.get(player.id) || 0
      this.gameState.playerMinutes.set(player.id, currentMinutes + timeElapsed)
    }
  }

  /**
   * Update player fouls
   */
  updatePlayerFouls(playerId: string, fouls: number): void {
    this.gameState.playerFouls.set(playerId, fouls)
  }

  /**
   * Get substitution events
   */
  getSubstitutionEvents(): SubstitutionEvent[] {
    return [...this.substitutionEvents]
  }

  /**
   * Get player minutes
   */
  getPlayerMinutes(): Map<string, number> {
    return new Map(this.gameState.playerMinutes)
  }

  /**
   * Calculate overall rating for a player
   */
  private calculateOverallRating(player: SimulationPlayer): number {
    return (player.speed + player.ball_iq + player.inside_shot + player.three_point_shot + 
            player.pass + player.skill_move + player.on_ball_defense + player.stamina + 
            player.block + player.steal + player.offensive_rebound + player.defensive_rebound) / 12
  }

  /**
   * Create default rotation configuration for a team
   */
  static createDefaultRotation(team: SimulationTeam): TeamRotationConfig {
    const players = [...team.players].sort((a, b) => {
      const aRating = (a.speed + a.ball_iq + a.inside_shot + a.three_point_shot + 
                      a.pass + a.skill_move + a.on_ball_defense + a.stamina + 
                      a.block + a.steal + a.offensive_rebound + a.defensive_rebound) / 12
      const bRating = (b.speed + b.ball_iq + b.inside_shot + b.three_point_shot + 
                      b.pass + b.skill_move + b.on_ball_defense + b.stamina + 
                      b.block + b.steal + b.offensive_rebound + b.defensive_rebound) / 12
      return bRating - aRating
    })

    const playerRotations: PlayerRotation[] = []
    
    // Starters (players 1-5): ~32 minutes each
    for (let i = 0; i < 5; i++) {
      playerRotations.push({
        player_id: parseInt(players[i].id),
        active_minutes: [[0, 6], [12, 18], [24, 30], [36, 42]], // 24 minutes + Q4 time
        total_minutes: 32
      })
    }
    
    // 6th-7th man: ~22 minutes each
    for (let i = 5; i < 7; i++) {
      playerRotations.push({
        player_id: parseInt(players[i].id),
        active_minutes: [[6, 12], [18, 24], [30, 36]], // 18 minutes + Q4 time
        total_minutes: 22
      })
    }
    
    // 8th man: ~18 minutes
    if (players[7]) {
      playerRotations.push({
        player_id: parseInt(players[7].id),
        active_minutes: [[6, 12], [30, 36]], // 12 minutes + Q4 time
        total_minutes: 18
      })
    }
    
    // 9th-10th man: ~9 minutes each
    for (let i = 8; i < 10; i++) {
      if (players[i]) {
        playerRotations.push({
          player_id: parseInt(players[i].id),
          active_minutes: [[6, 12]], // 6 minutes + Q4 time
          total_minutes: 9
        })
      }
    }
    
    // Remaining players: minimal time
    for (let i = 10; i < players.length; i++) {
      playerRotations.push({
        player_id: parseInt(players[i].id),
        active_minutes: [[42, 48]], // Only garbage time
        total_minutes: 3
      })
    }

    return {
      team_id: parseInt(team.id),
      player_rotations: playerRotations,
      is_custom: false,
      last_updated: new Date().toISOString()
    }
  }
}
