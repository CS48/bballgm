/**
 * Watch Game Engine
 * 
 * Handles incremental game simulation for watch mode.
 * Simulates one possession at a time and manages game state.
 */

import type { 
  GameSimulationTeam, 
  GameEvent, 
  WatchGameState, 
  AnimationSpeed,
  PlayerGameStats 
} from './types/game-simulation'
import type { PossessionResult } from './types/simulation-engine'
import { GameEngine } from './game-engine'
import { simulatePossession } from './simulation/possession-engine'
import { convertToSimulationTeam, convertToSimulationPlayer } from './types/simulation-engine'
import { initializeD20RNG } from './simulation/d20-rng'
import { formatPossessionEvent, formatGameClock } from './utils/event-formatter'

export class WatchGameEngine {
  private state: WatchGameState
  private eventQueue: GameEvent[] = []
  private currentPossessionIndex = 0
  private isProcessing = false

  constructor(homeTeam: GameSimulationTeam, awayTeam: GameSimulationTeam) {
    this.state = this.initializeState(homeTeam, awayTeam)
  }

  /**
   * Initialize watch game state
   */
  private initializeState(homeTeam: GameSimulationTeam, awayTeam: GameSimulationTeam): WatchGameState {
    const playerStats = new Map<string, PlayerGameStats>()
    
    // Initialize player stats for both teams
    const allPlayers = [...homeTeam.players, ...awayTeam.players]
    allPlayers.forEach(player => {
      playerStats.set(player.id, {
        ...player,
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        fieldGoalsMade: 0,
        fieldGoalsAttempted: 0,
        threePointersMade: 0,
        threePointersAttempted: 0,
        turnovers: 0,
        fouls: 0,
      })
    })

    return {
      homeTeam,
      awayTeam,
      homeScore: 0,
      awayScore: 0,
      currentQuarter: 1,
      quarterTimeRemaining: 12 * 60, // 12 minutes per quarter
      gameClock: '12:00 Q1',
      currentPossession: 'home',
      events: [],
      isPlaying: false,
      isPaused: true,
      isComplete: false,
      animationSpeed: 1,
      playerStats,
      currentEventIndex: 0
    }
  }

  /**
   * Get current game state
   */
  getState(): WatchGameState {
    return { ...this.state }
  }

  /**
   * Start the game (begin simulation)
   */
  startGame(): void {
    this.state.isPlaying = true
    this.state.isPaused = false
    this.simulateNextPossession()
  }

  /**
   * Pause the game
   */
  pauseGame(): void {
    this.state.isPaused = true
    this.state.isPlaying = false
  }

  /**
   * Resume the game
   */
  resumeGame(): void {
    this.state.isPaused = false
    this.state.isPlaying = true
    this.simulateNextPossession()
  }

  /**
   * Set animation speed
   */
  setAnimationSpeed(speed: AnimationSpeed): void {
    this.state.animationSpeed = speed
  }

  /**
   * Simulate the next possession
   */
  async simulateNextPossession(): Promise<void> {
    if (this.isProcessing || this.state.isComplete || this.state.isPaused) {
      return
    }

    this.isProcessing = true

    try {
      // Check if quarter is over or insufficient time for another possession
      const MIN_POSSESSION_TIME = 3 // Minimum time needed for any action
      if (this.state.quarterTimeRemaining <= 0 || this.state.quarterTimeRemaining < MIN_POSSESSION_TIME) {
        await this.advanceQuarter()
        this.isProcessing = false
        
        // Continue simulation if game is still playing (after quarter advance)
        if (this.state.isPlaying && !this.state.isComplete) {
          setTimeout(() => {
            this.simulateNextPossession()
          }, this.getEventDelay())
        }
        return
      }

      // Determine current teams
      const offensiveTeam = this.state.currentPossession === 'home' ? this.state.homeTeam : this.state.awayTeam
      const defensiveTeam = this.state.currentPossession === 'home' ? this.state.awayTeam : this.state.homeTeam

      // Convert to simulation teams
      const simOffensiveTeam = convertToSimulationTeam(offensiveTeam)
      const simDefensiveTeam = convertToSimulationTeam(defensiveTeam)

      // Initialize RNG with deterministic seed
      const seed = Date.now() + this.currentPossessionIndex
      initializeD20RNG(seed)

      // Start with point guard as ball handler
      const ballHandler = simOffensiveTeam.players.find(p => p.position === 'PG') || simOffensiveTeam.players[0]

      // Simulate possession
      const possessionResult = simulatePossession(
        simOffensiveTeam,
        simDefensiveTeam,
        ballHandler,
        seed,
        this.state.quarterTimeRemaining
      )

      // Process possession events
      await this.processPossessionEvents(possessionResult, offensiveTeam, defensiveTeam)

      // Update game state
      this.updateGameState(possessionResult, offensiveTeam)

      this.currentPossessionIndex++

      // Continue simulation if game is still playing
      if (this.state.isPlaying && !this.state.isComplete) {
        setTimeout(() => {
          this.simulateNextPossession()
        }, this.getEventDelay())
      }

    } catch (error) {
      console.error('Error simulating possession:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Process possession events and add them to the event queue
   */
  private async processPossessionEvents(
    possessionResult: PossessionResult,
    offensiveTeam: GameSimulationTeam,
    defensiveTeam: GameSimulationTeam
  ): Promise<void> {
    for (const possessionEvent of possessionResult.events) {
      // Use the updated quarter time from the possession event if available
      const eventQuarterTime = possessionEvent.stateUpdate?.quarterTimeRemaining ?? this.state.quarterTimeRemaining
      
      const gameEvent: GameEvent = {
        id: `event-${Date.now()}-${Math.random()}`,
        quarter: this.state.currentQuarter,
        time: formatGameClock(eventQuarterTime, this.state.currentQuarter),
        description: formatPossessionEvent(possessionEvent),
        homeScore: this.state.currentPossession === 'home' ? this.state.homeScore : this.state.awayScore,
        awayScore: this.state.currentPossession === 'home' ? this.state.awayScore : this.state.homeScore,
        eventType: this.mapEventType(possessionEvent),
        playerId: this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam),
        teamId: offensiveTeam.id,
        gameTimeSeconds: (4 - this.state.currentQuarter) * 12 * 60 + eventQuarterTime,
        ballHandler: {
          id: this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam) || '',
          name: possessionEvent.ballHandler
        },
        opennessScores: possessionEvent.opennessScores,
        decision: possessionEvent.decision,
        rollDetails: possessionEvent.rollResult ? {
          roll: possessionEvent.rollResult.roll,
          faces: possessionEvent.rollResult.faces,
          outcome: possessionEvent.rollResult.outcome,
          rawValue: possessionEvent.rollResult.rawValue
        } : undefined
      }

      this.state.events.push(gameEvent)
      this.state.currentEventIndex++

      // Update player stats
      this.updatePlayerStats(possessionEvent, offensiveTeam)

      // Wait for animation delay
      await this.waitForEventDelay()
    }
  }

  /**
   * Update game state after possession
   */
  private updateGameState(possessionResult: PossessionResult, offensiveTeam: GameSimulationTeam): void {
    // Update scores
    if (possessionResult.finalScore > 0) {
      if (this.state.currentPossession === 'home') {
        this.state.homeScore += possessionResult.finalScore
      } else {
        this.state.awayScore += possessionResult.finalScore
      }
    }

    // Update quarter time (use the updated time from possession result)
    this.state.quarterTimeRemaining = possessionResult.quarterTimeRemaining
    this.state.gameClock = formatGameClock(this.state.quarterTimeRemaining, this.state.currentQuarter)

    // Change possession
    if (possessionResult.changePossession) {
      this.state.currentPossession = this.state.currentPossession === 'home' ? 'away' : 'home'
    }

    // Check for game completion
    if (this.state.currentQuarter >= 4 && this.state.quarterTimeRemaining <= 0) {
      this.state.isComplete = true
      this.state.isPlaying = false
    }
  }

  /**
   * Advance to next quarter
   */
  private async advanceQuarter(): Promise<void> {
    // Add quarter end event
    const quarterEndEvent: GameEvent = {
      id: `quarter-end-${this.state.currentQuarter}`,
      quarter: this.state.currentQuarter,
      time: formatGameClock(0, this.state.currentQuarter),
      description: `End of Quarter ${this.state.currentQuarter}`,
      homeScore: this.state.homeScore,
      awayScore: this.state.awayScore,
      eventType: 'timeout',
      gameTimeSeconds: (4 - this.state.currentQuarter) * 12 * 60
    }
    this.state.events.push(quarterEndEvent)
    
    if (this.state.currentQuarter < 4) {
      this.state.currentQuarter++
      this.state.quarterTimeRemaining = 12 * 60
      this.state.gameClock = formatGameClock(this.state.quarterTimeRemaining, this.state.currentQuarter)
      
      // Add quarter start event
      const quarterStartEvent: GameEvent = {
        id: `quarter-start-${this.state.currentQuarter}`,
        quarter: this.state.currentQuarter,
        time: formatGameClock(this.state.quarterTimeRemaining, this.state.currentQuarter),
        description: `Start of Quarter ${this.state.currentQuarter}`,
        homeScore: this.state.homeScore,
        awayScore: this.state.awayScore,
        eventType: 'timeout',
        gameTimeSeconds: (4 - this.state.currentQuarter) * 12 * 60 + this.state.quarterTimeRemaining
      }
      
      this.state.events.push(quarterStartEvent)
    }
  }

  /**
   * Update player stats based on possession event
   */
  private updatePlayerStats(possessionEvent: any, offensiveTeam: GameSimulationTeam): void {
    const playerId = this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam)
    if (!playerId) return

    const playerStats = this.state.playerStats.get(playerId)
    if (!playerStats) return

    if (possessionEvent.rollResult?.outcome === 'success' && possessionEvent.rollResult.points) {
      playerStats.points += possessionEvent.rollResult.points
      playerStats.fieldGoalsMade++
      playerStats.fieldGoalsAttempted++
      if (possessionEvent.rollResult.isThreePointer) {
        playerStats.threePointersMade++
        playerStats.threePointersAttempted++
      }
    } else if (possessionEvent.rollResult?.outcome === 'failure') {
      playerStats.fieldGoalsAttempted++
      if (possessionEvent.rollResult.isThreePointer) {
        playerStats.threePointersAttempted++
      }
    }
  }

  /**
   * Map possession event type to game event type
   */
  private mapEventType(possessionEvent: any): GameEvent['eventType'] {
    if (possessionEvent.rollResult?.outcome === 'success' && possessionEvent.rollResult.points) {
      return 'shot'
    } else if (possessionEvent.rollResult?.outcome === 'failure') {
      return 'shot'
    } else if (possessionEvent.rollResult?.outcome === 'complete') {
      return 'pass'
    } else if (possessionEvent.rollResult?.outcome === 'intercepted') {
      return 'steal'
    } else if (possessionEvent.rollResult?.outcome === 'steal') {
      return 'steal'
    }
    return 'shot'
  }

  /**
   * Find player ID by name
   */
  private findPlayerIdByName(playerName: string, team: GameSimulationTeam): string | undefined {
    return team.players.find(p => p.name === playerName)?.id
  }

  /**
   * Get event animation delay based on speed
   */
  private getEventDelay(): number {
    const baseDelay = 2000 // 2 seconds base
    return baseDelay / this.state.animationSpeed
  }

  /**
   * Wait for event delay
   */
  private waitForEventDelay(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, this.getEventDelay())
    })
  }

  /**
   * Auto-simulate the rest of the game
   */
  async autoSimulateRemaining(): Promise<void> {
    // Use the existing GameEngine to simulate the rest
    const gameResult = GameEngine.simulateGame(this.state.homeTeam, this.state.awayTeam)
    
    // Update state with final results
    this.state.homeScore = gameResult.homeScore
    this.state.awayScore = gameResult.awayScore
    this.state.isComplete = true
    this.state.isPlaying = false
    
    // Add remaining events
    this.state.events.push(...gameResult.events.slice(this.state.currentEventIndex))
  }
}
