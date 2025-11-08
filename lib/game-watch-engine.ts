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
  PlayerGameStats,
} from './types/game-simulation';
import type { TeamRotationConfig } from './types/database';
import type { PossessionResult } from './types/simulation-engine';
import { GameEngine } from './game-engine';
import { simulatePossession } from './simulation/possession-engine';
import { convertToSimulationTeam, convertToSimulationPlayer } from './types/simulation-engine';
import { initializeD20RNG } from './simulation/d20-rng';
import { formatPossessionEvent, formatGameClock } from './utils/event-formatter';
import { RotationManager } from './simulation/rotation-manager';
import { FatigueCalculator } from './simulation/fatigue-calculator';

export class WatchGameEngine {
  private state: WatchGameState;
  private eventQueue: GameEvent[] = [];
  private currentPossessionIndex = 0;
  private isProcessing = false;
  private homeRotationManager: RotationManager;
  private awayRotationManager: RotationManager;
  private homeFatigueCalculator: FatigueCalculator;
  private awayFatigueCalculator: FatigueCalculator;

  constructor(
    homeTeam: GameSimulationTeam,
    awayTeam: GameSimulationTeam,
    homeRotationConfig: TeamRotationConfig | null = null,
    awayRotationConfig: TeamRotationConfig | null = null
  ) {
    this.state = this.initializeState(homeTeam, awayTeam);

    // Initialize rotation managers
    const simHomeTeam = convertToSimulationTeam(homeTeam);
    const simAwayTeam = convertToSimulationTeam(awayTeam);

    this.homeRotationManager = new RotationManager(simHomeTeam, homeRotationConfig);
    this.awayRotationManager = new RotationManager(simAwayTeam, awayRotationConfig);

    this.homeFatigueCalculator = new FatigueCalculator();
    this.awayFatigueCalculator = new FatigueCalculator();
  }

  /**
   * Initialize watch game state
   */
  private initializeState(homeTeam: GameSimulationTeam, awayTeam: GameSimulationTeam): WatchGameState {
    const playerStats = new Map<string, PlayerGameStats>();
    const playerMinutes = new Map<string, number>();

    // Initialize player stats for both teams
    const allPlayers = [...homeTeam.players, ...awayTeam.players];
    allPlayers.forEach((player) => {
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
        offensiveRebound: 0,
        defensiveRebound: 0,
        minutes: 0,
      });
      playerMinutes.set(player.id, 0);
    });

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
      currentEventIndex: 0,
      playerMinutes,
      previousBallHandler: undefined,
      lastActionWasPass: false,
    };
  }

  /**
   * Get current game state
   */
  getState(): WatchGameState {
    return { ...this.state };
  }

  /**
   * Get currently active player IDs for a team
   */
  getActivePlayerIds(team: 'home' | 'away'): number[] {
    const gameState = {
      quarter: this.state.currentQuarter,
      quarterTimeRemaining: this.state.quarterTimeRemaining,
      homeScore: this.state.homeScore,
      awayScore: this.state.awayScore,
      playerFouls: new Map<string, number>(),
      playerMinutes: new Map<string, number>(),
    };

    const activePlayers =
      team === 'home'
        ? this.homeRotationManager.getActiveLineup(gameState)
        : this.awayRotationManager.getActiveLineup(gameState);

    return activePlayers.map((p) => parseInt(p.id));
  }

  /**
   * Start the game (begin simulation)
   */
  startGame(): void {
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.simulateNextPossession();
  }

  /**
   * Pause the game
   */
  pauseGame(): void {
    this.state.isPaused = true;
    this.state.isPlaying = false;
  }

  /**
   * Resume the game
   */
  resumeGame(): void {
    this.state.isPaused = false;
    this.state.isPlaying = true;
    this.simulateNextPossession();
  }

  /**
   * Set animation speed
   */
  setAnimationSpeed(speed: AnimationSpeed): void {
    this.state.animationSpeed = speed;
  }

  /**
   * Simulate the next possession
   */
  async simulateNextPossession(): Promise<void> {
    if (this.isProcessing || this.state.isComplete || this.state.isPaused) {
      return;
    }

    this.isProcessing = true;

    try {
      // Check if quarter is over or insufficient time for another possession
      const MIN_POSSESSION_TIME = 3; // Minimum time needed for any action
      if (this.state.quarterTimeRemaining <= 0 || this.state.quarterTimeRemaining < MIN_POSSESSION_TIME) {
        await this.advanceQuarter();
        this.isProcessing = false;

        // Continue simulation if game is still playing (after quarter advance)
        if (this.state.isPlaying && !this.state.isComplete) {
          setTimeout(() => {
            this.simulateNextPossession();
          }, this.getEventDelay());
        }
        return;
      }

      // Determine current teams
      const offensiveTeam = this.state.currentPossession === 'home' ? this.state.homeTeam : this.state.awayTeam;
      const defensiveTeam = this.state.currentPossession === 'home' ? this.state.awayTeam : this.state.homeTeam;

      // Convert to simulation teams
      const simOffensiveTeam = convertToSimulationTeam(offensiveTeam);
      const simDefensiveTeam = convertToSimulationTeam(defensiveTeam);

      // Initialize RNG with deterministic seed
      const seed = Date.now() + this.currentPossessionIndex;
      initializeD20RNG(seed);

      // Get active lineups from rotation managers
      const gameState = {
        quarter: this.state.currentQuarter,
        quarterTimeRemaining: this.state.quarterTimeRemaining,
        homeScore: this.state.homeScore,
        awayScore: this.state.awayScore,
        playerFouls: new Map<string, number>(),
        playerMinutes: new Map<string, number>(),
      };

      const activeHomePlayers = this.homeRotationManager.getActiveLineup(gameState);
      const activeAwayPlayers = this.awayRotationManager.getActiveLineup(gameState);

      // Determine which team is offensive/defensive
      const activeOffensivePlayers = this.state.currentPossession === 'home' ? activeHomePlayers : activeAwayPlayers;
      const activeDefensivePlayers = this.state.currentPossession === 'home' ? activeAwayPlayers : activeHomePlayers;

      // Update fatigue for active players (every ~3 seconds of game time)
      this.homeFatigueCalculator.updateFatigue(activeHomePlayers, 3);
      this.awayFatigueCalculator.updateFatigue(activeAwayPlayers, 3);

      // Apply fatigue to get performance-adjusted players
      const fatiguedHomePlayers = this.homeFatigueCalculator.applyFatigueToLineup(activeHomePlayers);
      const fatiguedAwayPlayers = this.awayFatigueCalculator.applyFatigueToLineup(activeAwayPlayers);

      const fatiguedOffensivePlayers =
        this.state.currentPossession === 'home' ? fatiguedHomePlayers : fatiguedAwayPlayers;
      const fatiguedDefensivePlayers =
        this.state.currentPossession === 'home' ? fatiguedAwayPlayers : fatiguedHomePlayers;

      // Start with point guard as ball handler from active offensive players
      const ballHandler = fatiguedOffensivePlayers.find((p) => p.position === 'PG') || fatiguedOffensivePlayers[0];

      // Simulate possession with fatigued players
      const possessionResult = simulatePossession(
        simOffensiveTeam,
        simDefensiveTeam,
        ballHandler,
        seed,
        this.state.quarterTimeRemaining,
        fatiguedOffensivePlayers,
        fatiguedDefensivePlayers
      );

      // Process possession events
      await this.processPossessionEvents(possessionResult, offensiveTeam, defensiveTeam);

      // Update game state
      this.updateGameState(possessionResult, offensiveTeam);

      this.currentPossessionIndex++;

      // Continue simulation if game is still playing
      if (this.state.isPlaying && !this.state.isComplete) {
        setTimeout(() => {
          this.simulateNextPossession();
        }, this.getEventDelay());
      }
    } catch (error) {
      console.error('Error simulating possession:', error);
    } finally {
      this.isProcessing = false;
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
      const eventQuarterTime = possessionEvent.stateUpdate?.quarterTimeRemaining ?? this.state.quarterTimeRemaining;

      // Determine which team this event belongs to
      const isDefensiveRebound = possessionEvent.rollResult?.outcome === 'defensive';
      const eventTeamId = isDefensiveRebound ? defensiveTeam.id : offensiveTeam.id;

      const gameEvent: GameEvent = {
        id: `event-${Date.now()}-${Math.random()}`,
        quarter: this.state.currentQuarter,
        time: formatGameClock(eventQuarterTime, this.state.currentQuarter),
        description: formatPossessionEvent(possessionEvent),
        homeScore: this.state.currentPossession === 'home' ? this.state.homeScore : this.state.awayScore,
        awayScore: this.state.currentPossession === 'home' ? this.state.awayScore : this.state.homeScore,
        eventType: this.mapEventType(possessionEvent),
        playerId: this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam),
        teamId: eventTeamId,
        gameTimeSeconds: (4 - this.state.currentQuarter) * 12 * 60 + eventQuarterTime,
        ballHandler: {
          id: this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam) || '',
          name: possessionEvent.ballHandler,
        },
        opennessScores: possessionEvent.opennessScores,
        decision: possessionEvent.decision,
        rollDetails: possessionEvent.rollResult
          ? {
              roll: possessionEvent.rollResult.roll,
              faces: possessionEvent.rollResult.faces,
              outcome: possessionEvent.rollResult.outcome,
              rawValue: possessionEvent.rollResult.rawValue,
            }
          : undefined,
      };

      this.state.events.push(gameEvent);
      this.state.currentEventIndex++;

      // Update player stats
      this.updatePlayerStats(possessionEvent, offensiveTeam, defensiveTeam);

      // Update minutes for active players
      this.updatePlayerMinutes(possessionEvent);

      // Wait for animation delay
      await this.waitForEventDelay();
    }
  }

  /**
   * Update game state after possession
   */
  private updateGameState(possessionResult: PossessionResult, offensiveTeam: GameSimulationTeam): void {
    // Update scores
    if (possessionResult.finalScore > 0) {
      if (this.state.currentPossession === 'home') {
        this.state.homeScore += possessionResult.finalScore;
      } else {
        this.state.awayScore += possessionResult.finalScore;
      }
    }

    // Update quarter time (use the updated time from possession result)
    this.state.quarterTimeRemaining = possessionResult.quarterTimeRemaining;
    this.state.gameClock = formatGameClock(this.state.quarterTimeRemaining, this.state.currentQuarter);

    // Change possession
    if (possessionResult.changePossession) {
      this.state.currentPossession = this.state.currentPossession === 'home' ? 'away' : 'home';
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
      gameTimeSeconds: (4 - this.state.currentQuarter) * 12 * 60,
    };
    this.state.events.push(quarterEndEvent);

    if (this.state.currentQuarter < 4) {
      this.state.currentQuarter++;
      this.state.quarterTimeRemaining = 12 * 60;
      this.state.gameClock = formatGameClock(this.state.quarterTimeRemaining, this.state.currentQuarter);

      // Add quarter start event
      const quarterStartEvent: GameEvent = {
        id: `quarter-start-${this.state.currentQuarter}`,
        quarter: this.state.currentQuarter,
        time: formatGameClock(this.state.quarterTimeRemaining, this.state.currentQuarter),
        description: `Start of Quarter ${this.state.currentQuarter}`,
        homeScore: this.state.homeScore,
        awayScore: this.state.awayScore,
        eventType: 'timeout',
        gameTimeSeconds: (4 - this.state.currentQuarter) * 12 * 60 + this.state.quarterTimeRemaining,
      };

      this.state.events.push(quarterStartEvent);
    } else {
      // Game is over after Q4
      this.state.isComplete = true;
      this.state.isPlaying = false;
    }
  }

  /**
   * Update player stats based on possession event
   */
  private updatePlayerStats(
    possessionEvent: any,
    offensiveTeam: GameSimulationTeam,
    defensiveTeam: GameSimulationTeam
  ): void {
    const rollResult = possessionEvent.rollResult;

    // Handle rebounds specially - rebounder can be on either team
    if (rollResult?.outcome === 'offensive' || rollResult?.outcome === 'defensive') {
      const rebounderName = rollResult.rebounder;
      const rebounderId =
        this.findPlayerIdByName(rebounderName, offensiveTeam) || this.findPlayerIdByName(rebounderName, defensiveTeam);

      if (rebounderId) {
        const rebounderStats = this.state.playerStats.get(rebounderId);
        if (rebounderStats) {
          if (rollResult.outcome === 'offensive') {
            rebounderStats.offensiveRebound++;
          } else {
            rebounderStats.defensiveRebound++;
          }
          rebounderStats.rebounds = rebounderStats.offensiveRebound + rebounderStats.defensiveRebound;
        }
      }
      return; // Rebound handling is complete, no need to process other stats
    }

    // For non-rebound events, find the player in the offensive team
    const playerId = this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam);
    if (!playerId) return;

    const playerStats = this.state.playerStats.get(playerId);
    if (!playerStats) return;

    // Handle shot attempts and makes
    if (rollResult?.outcome === 'success' && rollResult.points) {
      playerStats.points += rollResult.points;
      playerStats.fieldGoalsMade++;
      playerStats.fieldGoalsAttempted++;
      if (rollResult.isThreePointer) {
        playerStats.threePointersMade++;
        playerStats.threePointersAttempted++;
      }

      // Check for assist - only if last action was a pass and we have a previous ball handler
      if (
        this.state.lastActionWasPass &&
        this.state.previousBallHandler &&
        this.state.previousBallHandler !== playerId
      ) {
        const passerStats = this.state.playerStats.get(this.state.previousBallHandler);
        if (passerStats) {
          passerStats.assists++;
        }
      }

      // Reset assist tracking after successful shot
      this.state.lastActionWasPass = false;
      this.state.previousBallHandler = undefined;
    } else if (rollResult?.outcome === 'failure') {
      playerStats.fieldGoalsAttempted++;
      if (rollResult.isThreePointer) {
        playerStats.threePointersAttempted++;
      }
    }

    // Handle turnovers and steals
    if (rollResult?.outcome === 'intercepted' || rollResult?.outcome === 'steal') {
      // Turnover for ball handler
      playerStats.turnovers++;

      // Steal for defensive player
      // For simplicity, we'll credit the steal to a random defensive player
      // In a more sophisticated system, we'd track which specific defender made the steal
      const defensivePlayers = defensiveTeam.players.filter((p) => p.is_starter === 1);
      if (defensivePlayers.length > 0) {
        const randomDefender = defensivePlayers[Math.floor(Math.random() * defensivePlayers.length)];
        const defenderStats = this.state.playerStats.get(randomDefender.id);
        if (defenderStats) {
          defenderStats.steals++;
        }
      }

      // Reset assist tracking on turnover
      this.state.lastActionWasPass = false;
      this.state.previousBallHandler = undefined;
    }

    // Handle passes
    if (rollResult?.outcome === 'complete') {
      // Track previous ball handler for assist potential
      this.state.previousBallHandler = playerId;
      this.state.lastActionWasPass = true;
    }

    // Handle skill moves - reset assist tracking
    if (possessionEvent.decision?.action === 'skill_move') {
      this.state.lastActionWasPass = false;
    }
  }

  /**
   * Update player minutes based on possession event
   */
  private updatePlayerMinutes(possessionEvent: any): void {
    // Calculate time elapsed for this event (simplified - assume 3 seconds per event)
    const timeElapsed = 3;

    // Get currently active players from rotation managers
    const activeHomePlayerIds = this.getActivePlayerIds('home');
    const activeAwayPlayerIds = this.getActivePlayerIds('away');
    const activePlayerIds = [...activeHomePlayerIds, ...activeAwayPlayerIds];

    // Update minutes for all active players
    activePlayerIds.forEach((playerId) => {
      const playerIdStr = playerId.toString();
      const currentMinutes = this.state.playerMinutes.get(playerIdStr) || 0;
      this.state.playerMinutes.set(playerIdStr, currentMinutes + timeElapsed);

      // Update the player stats minutes as well
      const playerStats = this.state.playerStats.get(playerIdStr);
      if (playerStats) {
        playerStats.minutes = Math.round((currentMinutes + timeElapsed) / 60); // Convert to minutes
      }
    });
  }

  /**
   * Map possession event type to game event type
   */
  private mapEventType(possessionEvent: any): GameEvent['eventType'] {
    if (possessionEvent.rollResult?.outcome === 'success' && possessionEvent.rollResult.points) {
      return 'shot';
    } else if (possessionEvent.rollResult?.outcome === 'failure') {
      return 'shot';
    } else if (possessionEvent.rollResult?.outcome === 'complete') {
      return 'pass';
    } else if (possessionEvent.rollResult?.outcome === 'intercepted') {
      return 'steal';
    } else if (possessionEvent.rollResult?.outcome === 'steal') {
      return 'steal';
    }
    return 'shot';
  }

  /**
   * Find player ID by name
   */
  private findPlayerIdByName(playerName: string, team: GameSimulationTeam): string | undefined {
    return team.players.find((p) => p.name === playerName)?.id;
  }

  /**
   * Get event animation delay based on speed
   */
  private getEventDelay(): number {
    const baseDelay = 3000; // 3 seconds base
    return baseDelay / this.state.animationSpeed;
  }

  /**
   * Wait for event delay
   */
  private waitForEventDelay(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, this.getEventDelay());
    });
  }

  /**
   * Auto-simulate the rest of the game
   */
  async autoSimulateRemaining(): Promise<void> {
    // Use the existing GameEngine to simulate the rest
    const gameResult = GameEngine.simulateGame(this.state.homeTeam, this.state.awayTeam);

    // Update state with final results
    this.state.homeScore = gameResult.homeScore;
    this.state.awayScore = gameResult.awayScore;
    this.state.isComplete = true;
    this.state.isPlaying = false;

    // Add remaining events
    this.state.events.push(...gameResult.events.slice(this.state.currentEventIndex));
  }

  /**
   * Build complete game result for database logging
   */
  buildGameResult(): any {
    // Convert player stats to the format expected by the database
    const homePlayerStatsArray = this.state.homeTeam.players.map((player) => ({
      ...player,
      ...this.state.playerStats.get(player.id)!,
    }));

    const awayPlayerStatsArray = this.state.awayTeam.players.map((player) => ({
      ...player,
      ...this.state.playerStats.get(player.id)!,
    }));

    // Calculate MVP (player with highest impact score)
    const allPlayerStats = [...homePlayerStatsArray, ...awayPlayerStatsArray];
    const mvp = allPlayerStats.reduce((best, player) => {
      const playerScore = player.points + player.rebounds * 0.5 + player.assists * 0.7;
      const bestScore = best.points + best.rebounds * 0.5 + best.assists * 0.7;
      return playerScore > bestScore ? player : best;
    });

    return {
      homeTeam: this.state.homeTeam,
      awayTeam: this.state.awayTeam,
      homeScore: this.state.homeScore,
      awayScore: this.state.awayScore,
      events: this.state.events,
      winner: this.state.homeScore > this.state.awayScore ? this.state.homeTeam.name : this.state.awayTeam.name,
      homePlayerStats: homePlayerStatsArray,
      awayPlayerStats: awayPlayerStatsArray,
      mvp,
    };
  }
}
