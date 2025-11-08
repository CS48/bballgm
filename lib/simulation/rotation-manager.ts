/**
 * Rotation Manager
 * 
 * Handles player substitutions and minute tracking during game simulations.
 * Uses user-configured rotation charts with intelligent overrides for foul trouble,
 * blowouts, and close games.
 */

import type { TeamRotationConfig, PlayerRotation, Player } from '../types/database'
import type { SimulationPlayer, SimulationTeam } from '../types/simulation-engine'
import { createDefaultRotationConfig } from '../utils/default-rotation-generator'

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
   * Uses position-based selection to match createDefaultRotationConfig
   * Ensures exactly one player of each position (PG, SG, SF, PF, C) at all times
   */
  private getDefaultActiveLineup(): SimulationPlayer[] {
    const positions: Array<'PG' | 'SG' | 'SF' | 'PF' | 'C'> = ['PG', 'SG', 'SF', 'PF', 'C']
    
    // Group players by position and sort by overall rating within each position
    const playersByPosition: Record<string, SimulationPlayer[]> = {
      PG: [],
      SG: [],
      SF: [],
      PF: [],
      C: []
    }
    
    this.team.players.forEach(player => {
      if (playersByPosition[player.position]) {
        playersByPosition[player.position].push(player)
      }
    })
    
    // Sort each position by overall rating (best first)
    positions.forEach(pos => {
      playersByPosition[pos].sort((a, b) => {
        const aRating = this.calculateOverallRating(a)
        const bRating = this.calculateOverallRating(b)
        return bRating - aRating
      })
    })
    
    // Get starters: best player at each position
    const starters: SimulationPlayer[] = positions
      .map(pos => playersByPosition[pos][0])
      .filter(Boolean)
    
    // Get backups: 2nd best at each position
    const backups: SimulationPlayer[] = positions
      .map(pos => playersByPosition[pos][1])
      .filter(Boolean)
    
    // Get third string: 3rd best at each position
    const thirdString: SimulationPlayer[] = positions
      .map(pos => playersByPosition[pos][2])
      .filter(Boolean)
    
    const { quarter, quarterTimeRemaining } = this.gameState
    const totalGameTime = (quarter - 1) * 12 * 60 + (12 * 60 - quarterTimeRemaining)
    const totalGameMinutes = Math.floor(totalGameTime / 60) // Convert to minutes
    
    // Use the same pattern as createDefaultRotationConfig:
    // 0-6: Starters, 6-12: Backups, 12-18: Starters, 18-24: Backups, 24-30: Starters, 30-36: Backups, 36-42: Starters, 42-48: Starters, 46-48: Top 3 starters + 2 backups
    if (totalGameMinutes < 6) {
      // 0-6 minutes: Starters (one of each position)
      return this.getBestLineup(starters, 5)
    } else if (totalGameMinutes < 12) {
      // 6-12 minutes: Backups (one of each position)
      return this.getBestLineup(backups, 5)
    } else if (totalGameMinutes < 18) {
      // 12-18 minutes: Starters
      return this.getBestLineup(starters, 5)
    } else if (totalGameMinutes < 24) {
      // 18-24 minutes: Backups
      return this.getBestLineup(backups, 5)
    } else if (totalGameMinutes < 30) {
      // 24-30 minutes: Starters
      return this.getBestLineup(starters, 5)
    } else if (totalGameMinutes < 36) {
      // 30-36 minutes: Backups
      return this.getBestLineup(backups, 5)
    } else if (totalGameMinutes < 42) {
      // 36-42 minutes: Starters
      return this.getBestLineup(starters, 5)
    } else if (totalGameMinutes < 46) {
      // 42-46 minutes: Starters
      return this.getBestLineup(starters, 5)
    } else {
      // 46-48 minutes: Top 3 starters + backups at positions of starters 4-5 (ensuring position balance)
      const top3Starters = starters.slice(0, 3)
      const top3StarterPositions = new Set(top3Starters.map(s => s.position))
      const backupsFor46_48 = backups.filter(b => !top3StarterPositions.has(b.position))
      const combined = [...top3Starters, ...backupsFor46_48]
      return this.getBestLineup(combined, 5)
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
   * Uses the shared utility function for consistency with UI
   */
  static createDefaultRotation(team: SimulationTeam): TeamRotationConfig {
    // Convert SimulationPlayer to Player-like format for the shared utility
    const playersAsDbFormat: Player[] = team.players.map(simPlayer => ({
      player_id: parseInt(simPlayer.id),
      team_id: parseInt(team.id),
      first_name: simPlayer.name.split(' ')[0] || '',
      last_name: simPlayer.name.split(' ').slice(1).join(' ') || '',
      age: 25, // Default age (not used in rotation calculation)
      position: simPlayer.position,
      is_starter: simPlayer.is_starter || 0,
      height: 75, // Default height (not used in rotation calculation)
      weight: 200, // Default weight (not used in rotation calculation)
      years_pro: 5, // Default years (not used in rotation calculation)
      draft_info: null,
      speed: simPlayer.speed,
      ball_iq: simPlayer.ball_iq,
      inside_shot: simPlayer.inside_shot,
      three_point_shot: simPlayer.three_point_shot,
      pass: simPlayer.pass,
      skill_move: simPlayer.skill_move,
      on_ball_defense: simPlayer.on_ball_defense,
      stamina: simPlayer.stamina,
      block: simPlayer.block,
      steal: simPlayer.steal,
      offensive_rebound: simPlayer.offensive_rebound,
      defensive_rebound: simPlayer.defensive_rebound,
      current_season_stats: null,
      historical_stats: null,
      career_stats: null
    }))

    // Use shared utility to generate default rotation
    return createDefaultRotationConfig(parseInt(team.id), playersAsDbFormat)
  }
}
