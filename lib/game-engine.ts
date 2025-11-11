import type {
  GameSimulationPlayer,
  GameSimulationTeam,
  GameEvent,
  GameSimulationResult,
  StrategicAdjustments,
} from '@/lib/types/game-simulation';
import type { SimulationTeam, D20GameEvent } from '@/lib/types/simulation-engine';
import type { TeamRotationConfig } from '@/lib/types/database';
import { GameClock } from './game-clock';
import { simulatePossession } from './simulation/possession-engine';
import { convertToSimulationTeam, convertToSimulationPlayer } from './types/simulation-engine';
import { initializeD20RNG } from './simulation/d20-rng';
import { getConfig } from './simulation/config-loader';
import { RotationManager } from './simulation/rotation-manager';
import { FatigueCalculator } from './simulation/fatigue-calculator';

export interface GameSegmentResult {
  events: GameEvent[];
  homeScore: number;
  awayScore: number;
  homePlayerStats: Map<string, any>;
  awayPlayerStats: Map<string, any>;
  finalPossession: GameSimulationTeam;
  homePossessions: number;
  awayPossessions: number;
  eventId: number;
}

export class GameEngine {
  public static simulateGame(
    homeTeam: GameSimulationTeam,
    awayTeam: GameSimulationTeam,
    homeRotationConfig: TeamRotationConfig | null = null,
    awayRotationConfig: TeamRotationConfig | null = null
  ): GameSimulationResult {
    console.log('🏀 Starting full game simulation:', homeTeam.name, 'vs', awayTeam.name);

    // Simulate full game (quarters 1-4)
    console.log('⏰ Starting game simulation...');
    const gameResult = this.simulateGameSegment(
      homeTeam,
      awayTeam,
      1, // start quarter
      4, // end quarter
      0, // starting home score
      0, // starting away score
      new Map(), // starting player stats
      new Map(),
      0, // starting home possessions
      0, // starting away possessions
      homeTeam, // starting possession
      1, // starting event ID
      homeRotationConfig,
      awayRotationConfig
    );

    console.log('🏁 Game complete - Home:', gameResult.homeScore, 'Away:', gameResult.awayScore);

    // Check for overtime
    if (gameResult.homeScore === gameResult.awayScore) {
      console.log('⏰ Game tied - starting overtime...');
      const overtimeResult = this.simulateOvertime(
        homeTeam,
        awayTeam,
        gameResult.homeScore,
        gameResult.awayScore,
        gameResult.homePlayerStats,
        gameResult.awayPlayerStats,
        gameResult.homePossessions,
        gameResult.awayPossessions,
        gameResult.finalPossession,
        gameResult.eventId,
        homeRotationConfig,
        awayRotationConfig
      );

      gameResult.events.push(...overtimeResult.events);
      gameResult.homeScore = overtimeResult.homeScore;
      gameResult.awayScore = overtimeResult.awayScore;
    }

    console.log('🏆 Final Score - Home:', gameResult.homeScore, 'Away:', gameResult.awayScore);

    return this.buildGameResult(
      homeTeam,
      awayTeam,
      gameResult.homeScore,
      gameResult.awayScore,
      gameResult.events,
      gameResult.homePlayerStats,
      gameResult.awayPlayerStats
    );
  }

  public static simulateGameSegment(
    homeTeam: GameSimulationTeam,
    awayTeam: GameSimulationTeam,
    startQuarter: number,
    endQuarter: number,
    startingHomeScore: number,
    startingAwayScore: number,
    startingHomePlayerStats: Map<string, any>,
    startingAwayPlayerStats: Map<string, any>,
    startingHomePossessions: number,
    startingAwayPossessions: number,
    startingPossession: GameSimulationTeam,
    startingEventId: number,
    homeRotationConfig: TeamRotationConfig | null = null,
    awayRotationConfig: TeamRotationConfig | null = null
  ): GameSegmentResult {
    console.log(`🎯 Simulating quarters ${startQuarter}-${endQuarter}`);

    const events: GameEvent[] = [];
    let homeScore = startingHomeScore;
    let awayScore = startingAwayScore;
    let eventId = startingEventId; // FIXED: Use starting event ID instead of hardcoded 1
    let currentPossession = startingPossession;
    let homePossessions = startingHomePossessions;
    let awayPossessions = startingAwayPossessions;

    const gameClock = new GameClock();

    // Set game clock to start of the segment
    gameClock.setStartingQuarter(startQuarter);

    // Disable automatic quarter advancement - we'll handle it manually
    gameClock.setAutoAdvanceQuarters(false);

    // Initialize rotation managers
    const simHomeTeam = convertToSimulationTeam(homeTeam);
    const simAwayTeam = convertToSimulationTeam(awayTeam);

    const homeRotationManager = new RotationManager(simHomeTeam, homeRotationConfig);
    const awayRotationManager = new RotationManager(simAwayTeam, awayRotationConfig);

    // Initialize fatigue calculators
    const homeFatigueCalculator = new FatigueCalculator();
    const awayFatigueCalculator = new FatigueCalculator();

    // Initialize or copy player stats
    const playerStats = new Map<string, any>();

    // Copy starting stats or initialize new ones
    homeTeam.players.forEach((player) => {
      const existingStats = startingHomePlayerStats.get(player.id);
      const stats = existingStats || {
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
      };
      // Ensure rebound fields exist even if copying existing stats
      if (stats.offensiveRebound === undefined) stats.offensiveRebound = 0;
      if (stats.defensiveRebound === undefined) stats.defensiveRebound = 0;
      if (stats.minutes === undefined) stats.minutes = 0;
      playerStats.set(player.id, stats);
    });

    awayTeam.players.forEach((player) => {
      const existingStats = startingAwayPlayerStats.get(player.id);
      const stats = existingStats || {
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        fieldGoalsMade: 0,
        fieldGoalsAttempted: 0,
        turnovers: 0,
        fouls: 0,
        offensiveRebound: 0,
        defensiveRebound: 0,
        minutes: 0,
      };
      // Ensure rebound fields exist even if copying existing stats
      if (stats.offensiveRebound === undefined) stats.offensiveRebound = 0;
      if (stats.defensiveRebound === undefined) stats.defensiveRebound = 0;
      if (stats.minutes === undefined) stats.minutes = 0;
      playerStats.set(player.id, stats);
    });

    // Start first possession
    gameClock.startShotClock();

    // Simulate segment until completion
    while (gameClock.getCurrentTime().quarter <= endQuarter) {
      const currentTime = gameClock.getCurrentTime();

      // Check if quarter is over
      if (gameClock.getQuarterTimeRemaining() <= 0) {
        console.log(`⏰ Quarter ${currentTime.quarter} complete`);
        if (currentTime.quarter < endQuarter) {
          // Move to next quarter manually
          gameClock.advanceToNextQuarter();
          continue;
        } else {
          // End of segment
          break;
        }
      }

      // Get quarter time remaining before simulating possession
      const quarterTimeRemaining = gameClock.getQuarterTimeRemaining();

      // Get active lineups from rotation managers
      const gameState = {
        quarter: currentTime.quarter,
        quarterTimeRemaining,
        homeScore,
        awayScore,
        playerFouls: new Map<string, number>(),
        playerMinutes: new Map<string, number>(),
      };

      const activeHomePlayers = homeRotationManager.getActiveLineup(gameState);
      const activeAwayPlayers = awayRotationManager.getActiveLineup(gameState);

      // Update fatigue calculators
      homeFatigueCalculator.updateFatigue(activeHomePlayers, 3); // Assume 3 seconds per possession
      awayFatigueCalculator.updateFatigue(activeAwayPlayers, 3);

      // Apply fatigue to players
      const fatiguedHomePlayers = homeFatigueCalculator.applyFatigueToLineup(activeHomePlayers);
      const fatiguedAwayPlayers = awayFatigueCalculator.applyFatigueToLineup(activeAwayPlayers);

      // Simulate a possession
      const possessionResult = this.simulatePossession(
        currentPossession,
        currentPossession === homeTeam ? awayTeam : homeTeam,
        homeTeam,
        gameClock,
        playerStats,
        homeScore,
        awayScore,
        eventId,
        quarterTimeRemaining,
        fatiguedHomePlayers,
        fatiguedAwayPlayers
      );

      // Add events from this possession
      events.push(...possessionResult.events);
      eventId += possessionResult.events.length;

      // Update scores
      homeScore = possessionResult.homeScore;
      awayScore = possessionResult.awayScore;

      // Update possession count
      if (currentPossession === homeTeam) {
        homePossessions++;
      } else {
        awayPossessions++;
      }

      // Change possession (unless it's an offensive rebound)
      if (possessionResult.changePossession) {
        currentPossession = currentPossession === homeTeam ? awayTeam : homeTeam;
        gameClock.resetShotClock('full');
      } else if (possessionResult.offensiveRebound) {
        gameClock.resetShotClock('offensive_rebound');
      }
    }

    console.log(`🏁 Segment complete - Home: ${homeScore}, Away: ${awayScore}, Events: ${events.length}`);

    return {
      events,
      homeScore,
      awayScore,
      homePlayerStats: new Map(playerStats),
      awayPlayerStats: new Map(playerStats),
      finalPossession: currentPossession,
      homePossessions,
      awayPossessions,
      eventId,
    };
  }

  private static simulatePossession(
    offensiveTeam: GameSimulationTeam,
    defensiveTeam: GameSimulationTeam,
    homeTeam: GameSimulationTeam,
    gameClock: GameClock,
    playerStats: Map<string, any>,
    currentHomeScore: number,
    currentAwayScore: number,
    startEventId: number,
    quarterTimeRemaining: number,
    activeHomePlayers: any[],
    activeAwayPlayers: any[]
  ): {
    events: GameEvent[];
    homeScore: number;
    awayScore: number;
    changePossession: boolean;
    offensiveRebound: boolean;
  } {
    // Convert to simulation teams
    const simOffensiveTeam = convertToSimulationTeam(offensiveTeam);
    const simDefensiveTeam = convertToSimulationTeam(defensiveTeam);

    // Initialize D20 RNG with game time as seed for deterministic results
    const seed = Math.floor(gameClock.getTotalGameTime() * 1000) + startEventId;
    initializeD20RNG(seed);

    // Use provided active players instead of filtering starters
    const activeOffensivePlayers = offensiveTeam === homeTeam ? activeHomePlayers : activeAwayPlayers;
    const activeDefensivePlayers = offensiveTeam === homeTeam ? activeAwayPlayers : activeHomePlayers;

    // Start with point guard as ball handler FROM ACTIVE PLAYERS
    const ballHandler = activeOffensivePlayers.find((p) => p.position === 'PG') || activeOffensivePlayers[0];

    // Simulate possession using D20 engine
    const possessionResult = simulatePossession(
      simOffensiveTeam,
      simDefensiveTeam,
      ballHandler,
      seed,
      quarterTimeRemaining,
      activeOffensivePlayers,
      activeDefensivePlayers
    );

    // Log possession summary
    const config = getConfig();
    const shouldLog = config.logging?.verbose_possession_logs !== false;

    if (shouldLog) {
      const scoreChange = possessionResult.finalScore;
      const teamName = offensiveTeam === homeTeam ? 'Home' : 'Away';
      const newHomeScore = offensiveTeam === homeTeam ? currentHomeScore + scoreChange : currentHomeScore;
      const newAwayScore = offensiveTeam === homeTeam ? currentAwayScore : currentAwayScore + scoreChange;

      const currentTime = gameClock.getCurrentTime();
      console.log(
        `📊 Possession Summary: ${teamName} ${scoreChange > 0 ? '+' : ''}${scoreChange} pts (Score: ${newHomeScore}-${newAwayScore})`
      );
      console.log(`   Quarter ${currentTime.quarter}, Time: ${gameClock.getFormattedTime()}`);
      console.log(
        `   Duration: ${possessionResult.possessionDuration}s, ${possessionResult.events.length} actions, changed possession: ${possessionResult.changePossession}`
      );
      console.log('');
    }

    // Convert possession result to game events
    const events: GameEvent[] = [];
    let eventId = startEventId;
    let homeScore = currentHomeScore;
    let awayScore = currentAwayScore;
    let changePossession = true;
    let offensiveRebound = false;

    // Process each possession event with proper time advancement
    let timeElapsed = 0;
    const timePerEvent = possessionResult.possessionDuration / Math.max(1, possessionResult.events.length);

    // Track assist state (previous ball handler and whether last action was a pass)
    let previousBallHandler: string | undefined = undefined;
    let lastActionWasPass = false;

    // Track active player IDs for minutes calculation
    const activePlayerIds = [
      ...activeOffensivePlayers.map((p) => p.id),
      ...activeDefensivePlayers.map((p) => p.id),
    ];

    for (const possessionEvent of possessionResult.events) {
      // Advance clock before creating event
      gameClock.advanceTime(timePerEvent);
      const currentTime = gameClock.getCurrentTime();

      // Create enhanced game event with D20 details
      const gameEvent: D20GameEvent = {
        id: eventId.toString(),
        quarter: currentTime.quarter,
        time: gameClock.getFormattedTime(),
        description: possessionEvent.description,
        homeScore: offensiveTeam === homeTeam ? homeScore : awayScore,
        awayScore: offensiveTeam === homeTeam ? awayScore : homeScore,
        eventType: this.mapPossessionEventType(possessionEvent),
        playerId: this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam),
        teamId: offensiveTeam.id,
        shotClockRemaining: gameClock.getShotClock().timeRemaining,
        gameTimeSeconds: gameClock.getTotalGameTime(),

        // D20 simulation details
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

      events.push(gameEvent);
      eventId++;
      timeElapsed += timePerEvent;

      // Update minutes for all active players
      activePlayerIds.forEach((playerId) => {
        const playerStat = playerStats.get(playerId);
        if (playerStat) {
          if (playerStat.minutes === undefined) playerStat.minutes = 0;
          playerStat.minutes += timePerEvent / 60; // Convert seconds to minutes
        }
      });

      // Update scores and stats based on possession result
      if (possessionEvent.rollResult?.outcome === 'success' && possessionEvent.rollResult.points) {
        const points = possessionEvent.rollResult.points;
        if (offensiveTeam === homeTeam) {
          homeScore += points;
        } else {
          awayScore += points;
        }

        // Update player stats
        const shooterId = this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam);
        if (shooterId) {
          const shooterStats = playerStats.get(shooterId)!;
          shooterStats.points += points;
          shooterStats.fieldGoalsMade++;
          shooterStats.fieldGoalsAttempted++;
          if (possessionEvent.rollResult.isThreePointer) {
            shooterStats.threePointersMade++;
            shooterStats.threePointersAttempted++;
          }

          // Check for assist - only if last action was a pass and we have a previous ball handler
          if (lastActionWasPass && previousBallHandler && previousBallHandler !== shooterId) {
            const passerStats = playerStats.get(previousBallHandler);
            if (passerStats) {
              passerStats.assists++;
            }
          }

          // Reset assist tracking after successful shot
          lastActionWasPass = false;
          previousBallHandler = undefined;
        }
      } else if (possessionEvent.rollResult?.outcome === 'failure') {
        // Missed shot - update attempts
        const shooterId = this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam);
        if (shooterId) {
          const shooterStats = playerStats.get(shooterId)!;
          shooterStats.fieldGoalsAttempted++;
          if (possessionEvent.rollResult.isThreePointer) {
            shooterStats.threePointersAttempted++;
          }
        }
      } else if (possessionEvent.rollResult?.outcome === 'intercepted' || possessionEvent.rollResult?.outcome === 'steal') {
        // Handle turnovers and steals
        const ballHandlerId = this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam);
        if (ballHandlerId) {
          const ballHandlerStats = playerStats.get(ballHandlerId);
          if (ballHandlerStats) {
            ballHandlerStats.turnovers++;
          }
        }

        // Steal for defensive player
        // For simplicity, we'll credit the steal to a random defensive player
        // In a more sophisticated system, we'd track which specific defender made the steal
        if (activeDefensivePlayers.length > 0) {
          const randomDefender = activeDefensivePlayers[Math.floor(Math.random() * activeDefensivePlayers.length)];
          const defenderStats = playerStats.get(randomDefender.id);
          if (defenderStats) {
            defenderStats.steals++;
          }
        }

        // Reset assist tracking on turnover
        lastActionWasPass = false;
        previousBallHandler = undefined;
      } else if (possessionEvent.rollResult?.outcome === 'complete') {
        // Handle passes - track previous ball handler for assist potential
        const passerId = this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam);
        if (passerId) {
          previousBallHandler = passerId;
          lastActionWasPass = true;
        }
      } else if (possessionEvent.decision?.action === 'skill_move') {
        // Handle skill moves - reset assist tracking
        lastActionWasPass = false;
      } else if (possessionEvent.rollResult?.outcome === 'offensive' || possessionEvent.rollResult?.outcome === 'defensive') {
        // Handle rebound events
        const rebounderName = possessionEvent.rollResult.rebounder;
        if (rebounderName) {
          // Find rebounder on either team (rebounds can be on either team)
          const rebounderId =
            this.findPlayerIdByName(rebounderName, offensiveTeam) ||
            this.findPlayerIdByName(rebounderName, defensiveTeam);

          if (rebounderId) {
            const rebounderStats = playerStats.get(rebounderId);
            if (rebounderStats) {
              // Initialize rebound fields if they don't exist
              if (rebounderStats.offensiveRebound === undefined) rebounderStats.offensiveRebound = 0;
              if (rebounderStats.defensiveRebound === undefined) rebounderStats.defensiveRebound = 0;

              // Update rebound stats
              if (possessionEvent.rollResult.outcome === 'offensive') {
                rebounderStats.offensiveRebound++;
              } else {
                rebounderStats.defensiveRebound++;
              }

              // Update total rebounds
              rebounderStats.rebounds = (rebounderStats.rebounds || 0) + 1;
            }
          }
        }
      }
    }

    // Handle possession result
    changePossession = possessionResult.changePossession;
    offensiveRebound = possessionResult.offensiveRebound;

    // Note: Quarter advancement is handled by the main loop in simulateGameSegment
    // The possession engine just tracks and returns quarter time remaining

    // Game clock already advanced during event processing

    return { events, homeScore, awayScore, changePossession, offensiveRebound };
  }

  private static mapPossessionEventType(possessionEvent: any): GameEvent['eventType'] {
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
    } else if (possessionEvent.rollResult?.outcome === 'rebound') {
      return 'rebound';
    }
    return 'shot';
  }

  private static findPlayerIdByName(playerName: string, team: GameSimulationTeam): string | undefined {
    return team.players.find((p) => p.name === playerName)?.id;
  }

  private static simulateOvertime(
    homeTeam: GameSimulationTeam,
    awayTeam: GameSimulationTeam,
    startingHomeScore: number,
    startingAwayScore: number,
    startingHomePlayerStats: Map<string, any>,
    startingAwayPlayerStats: Map<string, any>,
    startingHomePossessions: number,
    startingAwayPossessions: number,
    startingPossession: GameSimulationTeam,
    startingEventId: number,
    homeRotationConfig: TeamRotationConfig | null = null,
    awayRotationConfig: TeamRotationConfig | null = null
  ): GameSegmentResult {
    console.log('⏰ Starting overtime simulation...');

    return this.simulateGameSegment(
      homeTeam,
      awayTeam,
      5, // overtime quarter
      5, // end at overtime
      startingHomeScore,
      startingAwayScore,
      startingHomePlayerStats,
      startingAwayPlayerStats,
      startingHomePossessions,
      startingAwayPossessions,
      startingPossession,
      startingEventId, // Continue event ID sequence
      homeRotationConfig,
      awayRotationConfig
    );
  }

  private static buildGameResult(
    homeTeam: GameSimulationTeam,
    awayTeam: GameSimulationTeam,
    homeScore: number,
    awayScore: number,
    events: GameEvent[],
    homePlayerStats: Map<string, any>,
    awayPlayerStats: Map<string, any>
  ): GameSimulationResult {
    const homePlayerStatsArray = homeTeam.players.map((player) => {
      const stats = homePlayerStats.get(player.id)!;
      return {
        ...player,
        ...stats,
        minutes: stats.minutes || 0, // Ensure minutes is set
      };
    });

    const awayPlayerStatsArray = awayTeam.players.map((player) => {
      const stats = awayPlayerStats.get(player.id)!;
      return {
        ...player,
        ...stats,
        minutes: stats.minutes || 0, // Ensure minutes is set
      };
    });

    // Use the actual game scores passed in, not calculated from player stats
    const winningTeamStats = homeScore > awayScore ? homePlayerStatsArray : awayPlayerStatsArray;
    const mvp = winningTeamStats.reduce((best, player) => {
      const playerScore = player.points + player.rebounds * 0.5 + player.assists * 0.7;
      const bestScore = best.points + best.rebounds * 0.5 + best.assists * 0.7;
      return playerScore > bestScore ? player : best;
    });

    return {
      homeTeam,
      awayTeam,
      homeScore: homeScore,
      awayScore: awayScore,
      events,
      winner: homeScore > awayScore ? homeTeam.name : awayTeam.name,
      homePlayerStats: homePlayerStatsArray,
      awayPlayerStats: awayPlayerStatsArray,
      mvp,
    };
  }
}
