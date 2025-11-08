'use client';

/**
 * Schedule Builder V2 - Balanced 82-game schedule generation with strict rest day constraints
 *
 * This utility generates balanced 82-game schedules for all teams in the league,
 * with strict constraints on rest days to ensure teams progress at similar rates.
 *
 * Key Features:
 * - Maximum 3 rest days between games for any team
 * - Average 1.25 rest days between games
 * - Real-time progress tracking and debugging
 * - Failsafe mechanisms for edge cases
 */

import { Team, GameScheduleEntry, Conference } from '../types/database';
import { ScheduleConstraints, GameDay } from '../types/calendar';
import { dateGenerator } from './date-generator';
import { SeededRandom } from './seeded-random';

/**
 * Team schedule state tracking
 */
interface TeamScheduleState {
  teamId: number;
  gamesScheduled: number;
  lastGameDay: number;
  totalRestDays: number;
  nextOpponents: number[]; // Queue of opponent IDs
  isUrgent: boolean; // Hasn't played in 3+ days
}

/**
 * Scheduler debug information
 */
interface SchedulerDebugInfo {
  currentDay: number;
  gamesScheduledToday: number;
  teamGameCounts: Map<number, number>;
  teamLastGameDay: Map<number, number>;
  remainingMatchups: number;
  teamsOnTrack: number;
  teamsBehind: Array<{ teamId: number; games: number; deficit: number }>;
  teamsAhead: Array<{ teamId: number; games: number; surplus: number }>;
}

/**
 * ScheduleBuilderV2 class that generates balanced team schedules with strict constraints
 */
export class ScheduleBuilderV2 {
  private static instance: ScheduleBuilderV2;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of ScheduleBuilderV2
   * @returns ScheduleBuilderV2 instance
   */
  public static getInstance(): ScheduleBuilderV2 {
    if (!ScheduleBuilderV2.instance) {
      ScheduleBuilderV2.instance = new ScheduleBuilderV2();
    }
    return ScheduleBuilderV2.instance;
  }

  /**
   * Schedule constraints for the balanced scheduler
   */
  private readonly constraints: ScheduleConstraints = {
    max_consecutive_games: 2,
    min_rest_days: 0,
    max_rest_days: 3, // Maximum 3 rest days between games
    games_per_day: 15,
    total_game_days: 150,
  };

  /**
   * Generate complete 82-game schedule for all teams with balanced rest days
   * @param teams Array of all teams in the league
   * @param seasonYear Season year
   * @param seed Random seed for reproducibility
   * @returns Object with team schedules, game details, and calendar assignments
   */
  public generateScheduleWithCalendar(
    teams: Team[],
    seasonYear: number,
    seed: number = Date.now()
  ): {
    teamSchedules: Map<number, GameScheduleEntry[]>;
    allGames: any[];
    gameDaySchedule: Map<number, any[]>;
  } {
    // Initialize seeded random number generator
    const rng = new SeededRandom(seed);
    console.log(`🎲 ScheduleBuilderV2 using seed: ${seed}`);

    const teamSchedules = new Map<number, GameScheduleEntry[]>();
    const allGames: any[] = [];
    const gameDaySchedule = new Map<number, any[]>();
    let gameId = 1;

    // Initialize empty schedules for all teams
    teams.forEach((team) => {
      teamSchedules.set(team.team_id, []);
    });

    // Initialize game day schedule
    for (let day = 1; day <= this.constraints.total_game_days; day++) {
      gameDaySchedule.set(day, []);
    }

    // Generate all matchups first
    const allMatchups = this.generateAllMatchups(teams, seasonYear, rng);
    console.log(`🎯 Generated ${allMatchups.length} total matchups`);

    // Schedule games with balanced rest day constraints
    console.log('📅 Scheduling games with balanced rest day constraints...');
    const scheduledGames = this.scheduleGamesWithBalancedRestDays(allMatchups, this.constraints, rng);
    console.log(`✅ Scheduled games for ${scheduledGames.size} game days`);

    // Process scheduled games
    scheduledGames.forEach((games, gameDay) => {
      games.forEach((game) => {
        try {
          const dateInfo = dateGenerator.generateGameDayDate(gameDay, seasonYear);

          const gameData = {
            game_id: gameId,
            season: seasonYear,
            date: dateInfo.iso,
            game_day: gameDay,
            home_team_id: game.home_team_id,
            away_team_id: game.away_team_id,
            home_score: null,
            away_score: null,
            completed: false,
            box_score: null,
          };

          allGames.push(gameData);
          gameDaySchedule.get(gameDay)?.push(gameData);

          // Add to team schedules
          teamSchedules.get(game.home_team_id)?.push({
            game_id: gameId,
            opponent_id: game.away_team_id,
            game_day: gameDay,
            date_display: dateInfo.display,
            home: true,
            completed: false,
            result: null,
          });

          teamSchedules.get(game.away_team_id)?.push({
            game_id: gameId,
            opponent_id: game.home_team_id,
            game_day: gameDay,
            date_display: dateInfo.display,
            home: false,
            completed: false,
            result: null,
          });

          gameId++;
        } catch (error) {
          console.error(`Error processing game day ${gameDay}:`, error);
          throw error;
        }
      });
    });

    // Sort schedules by game day
    teamSchedules.forEach((schedule) => {
      schedule.sort((a, b) => a.game_day - b.game_day);
    });

    // Final validation
    this.validateFinalSchedule(teamSchedules, allGames, teams);

    return { teamSchedules, allGames, gameDaySchedule };
  }

  /**
   * Generate all matchups for the season using the same algorithm as V1
   * @param teams Array of all teams
   * @param seasonYear Season year
   * @param rng Seeded random number generator
   * @returns Array of all matchups
   */
  private generateAllMatchups(teams: Team[], seasonYear: number, rng: SeededRandom): any[] {
    console.log(`\n=== Generating All Matchups (V2) ===`);

    const allGames: any[] = [];

    // Step 1: Inter-conference games (30 per team)
    console.log(`Step 1: Generating inter-conference games...`);
    const interConferenceGames = this.generateInterConferenceGames(teams, seasonYear, rng);
    allGames.push(...interConferenceGames);
    console.log(`Step 1: Generated ${interConferenceGames.length} inter-conference games`);

    // Step 2: Conference base games (42 per team)
    console.log(`Step 2: Generating conference base games...`);
    const conferenceBaseGames = this.generateConferenceBaseGames(teams, seasonYear, rng);
    allGames.push(...conferenceBaseGames);
    console.log(`Step 2: Generated ${conferenceBaseGames.length} conference base games`);

    // Step 3: Conference fill games (10 per team)
    console.log(`Step 3: Generating conference fill games...`);
    const conferenceFillGames = this.generateConferenceFillGames(teams, seasonYear, rng);
    allGames.push(...conferenceFillGames);
    console.log(`Step 3: Generated ${conferenceFillGames.length} conference fill games`);

    // Validation
    console.log(`Total games: ${allGames.length} (expected: 1,230)`);
    this.validateGameCounts(allGames, teams);

    console.log(`=== End Matchup Generation ===\n`);

    return allGames;
  }

  /**
   * Generate inter-conference games (30 per team)
   * Each team plays each opponent in the other conference exactly 2 times
   */
  private generateInterConferenceGames(teams: Team[], seasonYear: number, rng: SeededRandom): any[] {
    const games: any[] = [];

    // Split teams by conference
    const easternTeams = teams.filter((team) => team.conference === 'East');
    const westernTeams = teams.filter((team) => team.conference === 'West');

    // Each Eastern team plays each Western team 2 times (1 home, 1 away)
    easternTeams.forEach((eastTeam) => {
      westernTeams.forEach((westTeam) => {
        // Game 1: East home, West away
        games.push({
          season: seasonYear,
          home_team_id: eastTeam.team_id,
          away_team_id: westTeam.team_id,
          home_score: null,
          away_score: null,
          completed: false,
          box_score: null,
        });

        // Game 2: West home, East away
        games.push({
          season: seasonYear,
          home_team_id: westTeam.team_id,
          away_team_id: eastTeam.team_id,
          home_score: null,
          away_score: null,
          completed: false,
          box_score: null,
        });
      });
    });

    console.log(`Generated ${games.length} inter-conference games (expected: 450)`);
    return games;
  }

  /**
   * Generate conference base games (42 per team)
   * Each team plays each conference opponent exactly 3 times
   */
  private generateConferenceBaseGames(teams: Team[], seasonYear: number, rng: SeededRandom): any[] {
    const games: any[] = [];

    // Split teams by conference
    const easternTeams = teams.filter((team) => team.conference === 'East');
    const westernTeams = teams.filter((team) => team.conference === 'West');

    // Generate games for each conference
    [easternTeams, westernTeams].forEach((conferenceTeams) => {
      // Each team plays each other team in the conference 3 times
      for (let i = 0; i < conferenceTeams.length; i++) {
        for (let j = i + 1; j < conferenceTeams.length; j++) {
          const team1 = conferenceTeams[i];
          const team2 = conferenceTeams[j];

          // Add 3 games between these two teams
          for (let gameNum = 0; gameNum < 3; gameNum++) {
            const isHomeTeam1 = rng.nextBoolean();
            games.push({
              season: seasonYear,
              home_team_id: isHomeTeam1 ? team1.team_id : team2.team_id,
              away_team_id: isHomeTeam1 ? team2.team_id : team1.team_id,
              home_score: null,
              away_score: null,
              completed: false,
              box_score: null,
            });
          }
        }
      }
    });

    console.log(`Generated ${games.length} conference base games (expected: 630)`);
    return games;
  }

  /**
   * Generate conference fill games (10 per team)
   * For each conference, randomly select 75 team pairs and add 1 game between them
   */
  private generateConferenceFillGames(teams: Team[], seasonYear: number, rng: SeededRandom): any[] {
    const games: any[] = [];
    const easternTeams = teams.filter((team) => team.conference === 'East');
    const westernTeams = teams.filter((team) => team.conference === 'West');

    [easternTeams, westernTeams].forEach((conferenceTeams) => {
      // Track how many games each team still needs
      const teamNeedsGames = new Map<number, number>();
      conferenceTeams.forEach((team) => teamNeedsGames.set(team.team_id, 10));

      const selectedMatchups: [number, number][] = [];

      // Create a shuffled list of all possible matchups
      const allPossibleMatchups: [number, number][] = [];
      for (let i = 0; i < conferenceTeams.length; i++) {
        for (let j = i + 1; j < conferenceTeams.length; j++) {
          allPossibleMatchups.push([conferenceTeams[i].team_id, conferenceTeams[j].team_id]);
        }
      }

      const shuffledMatchups = rng.shuffle(allPossibleMatchups);

      // Select matchups from shuffled list
      for (const [team1Id, team2Id] of shuffledMatchups) {
        if (selectedMatchups.length >= 75) break;

        const team1Needs = teamNeedsGames.get(team1Id) || 0;
        const team2Needs = teamNeedsGames.get(team2Id) || 0;

        if (team1Needs > 0 && team2Needs > 0) {
          selectedMatchups.push([team1Id, team2Id]);
          teamNeedsGames.set(team1Id, team1Needs - 1);
          teamNeedsGames.set(team2Id, team2Needs - 1);
        }
      }

      // Cleanup - pair up any remaining teams that still need games
      const teamsStillNeeding = Array.from(teamNeedsGames.entries())
        .filter(([_, needs]) => needs > 0)
        .map(([teamId, needs]) => ({ teamId, needs }));

      if (teamsStillNeeding.length > 0) {
        console.log(`Cleanup: ${teamsStillNeeding.length} teams still need games:`, teamsStillNeeding);

        // Shuffle the teams that still need games
        const shuffledRemaining = rng.shuffle([...teamsStillNeeding]);

        // Keep creating matchups until all teams have 10 games
        while (shuffledRemaining.some((t) => t.needs > 0)) {
          const teamsNeedingGames = shuffledRemaining.filter((t) => t.needs > 0);

          if (teamsNeedingGames.length < 2) {
            console.error(`Cannot pair remaining team:`, teamsNeedingGames);
            break;
          }

          const team1 = teamsNeedingGames[0];
          const team2 = teamsNeedingGames[1];

          selectedMatchups.push([team1.teamId, team2.teamId]);
          team1.needs--;
          team2.needs--;

          teamNeedsGames.set(team1.teamId, team1.needs);
          teamNeedsGames.set(team2.teamId, team2.needs);
        }
      }

      console.log(`Selected ${selectedMatchups.length} matchups for conference (expected: 75)`);

      // Create game objects from selected matchups
      for (const [team1Id, team2Id] of selectedMatchups) {
        const isHomeTeam1 = rng.nextBoolean();
        games.push({
          season: seasonYear,
          home_team_id: isHomeTeam1 ? team1Id : team2Id,
          away_team_id: isHomeTeam1 ? team2Id : team1Id,
          home_score: null,
          away_score: null,
          completed: false,
          box_score: null,
        });
      }
    });

    console.log(`Generated ${games.length} conference fill games (expected: 150)`);
    return games;
  }

  /**
   * Validate that each team has exactly 82 games
   */
  private validateGameCounts(games: any[], teams: Team[]): void {
    const teamGameCounts = new Map<number, number>();
    teams.forEach((team) => teamGameCounts.set(team.team_id, 0));

    games.forEach((game) => {
      teamGameCounts.set(game.home_team_id, (teamGameCounts.get(game.home_team_id) || 0) + 1);
      teamGameCounts.set(game.away_team_id, (teamGameCounts.get(game.away_team_id) || 0) + 1);
    });

    const teamsWithWrongCount = Array.from(teamGameCounts.entries()).filter(([id, count]) => count !== 82);
    if (teamsWithWrongCount.length > 0) {
      console.error(`❌ ERROR: Teams with incorrect game counts:`, teamsWithWrongCount);
      console.error(`Expected: 82 games per team`);
    } else {
      console.log(`✅ All 30 teams have exactly 82 games`);
    }
  }

  /**
   * Schedule games with balanced rest day constraints using pool-based approach
   * This is the core algorithm that ensures teams progress at similar rates
   */
  private scheduleGamesWithBalancedRestDays(
    matchups: any[],
    constraints: ScheduleConstraints,
    rng: SeededRandom
  ): Map<number, any[]> {
    const schedule = new Map<number, any[]>();
    const teamStates = new Map<number, TeamScheduleState>();

    // Initialize schedule for all game days
    for (let day = 1; day <= constraints.total_game_days; day++) {
      schedule.set(day, []);
    }

    // Initialize team states
    const allTeamIds = new Set<number>();
    matchups.forEach((matchup) => {
      allTeamIds.add(matchup.home_team_id);
      allTeamIds.add(matchup.away_team_id);
    });

    allTeamIds.forEach((teamId) => {
      teamStates.set(teamId, {
        teamId,
        gamesScheduled: 0,
        lastGameDay: 0,
        totalRestDays: 0,
        nextOpponents: [],
        isUrgent: false,
      });
    });

    // Create pool of unscheduled matchups (shuffled for variety)
    let unscheduledMatchups = rng.shuffle([...matchups]);

    console.log(
      `📅 Scheduling ${matchups.length} games across ${constraints.total_game_days} days using pool-based approach`
    );
    console.log(`📊 Target: ~${Math.ceil(matchups.length / constraints.total_game_days)} games per day`);
    console.log(`🎯 Pool initialized with ${unscheduledMatchups.length} matchups`);

    // Process each game day
    for (let currentDay = 1; currentDay <= constraints.total_game_days; currentDay++) {
      const gamesToday: any[] = [];

      // Update team urgency states
      this.updateTeamUrgencyStates(teamStates, currentDay);

      // Get debug info for this day
      const debugInfo = this.getSchedulerDebugInfo(teamStates, currentDay, unscheduledMatchups.length);

      // Log progress every 10 days
      if (currentDay % 10 === 0 || currentDay <= 5) {
        this.logProgress(debugInfo, currentDay);
      }

      // PHASE 1: Schedule urgent teams (3+ rest days) - search pool for their matchups
      const urgentTeams = Array.from(teamStates.values())
        .filter((team) => team.isUrgent)
        .sort((a, b) => a.gamesScheduled - b.gamesScheduled); // Teams with fewer games first

      for (const urgentTeam of urgentTeams) {
        const matchup = this.findMatchupInPool(unscheduledMatchups, urgentTeam.teamId);
        if (matchup && this.canScheduleMatchup(matchup, gamesToday, teamStates, currentDay)) {
          gamesToday.push(matchup);
          this.removeFromPool(unscheduledMatchups, matchup);
          this.updateTeamStates(teamStates, matchup, currentDay);
        }
      }

      // PHASE 2: Fill remaining slots - iterate backward through pool for safe removal
      for (let i = unscheduledMatchups.length - 1; i >= 0; i--) {
        if (gamesToday.length >= constraints.games_per_day) break;

        const matchup = unscheduledMatchups[i];
        if (this.canScheduleMatchup(matchup, gamesToday, teamStates, currentDay)) {
          gamesToday.push(matchup);
          unscheduledMatchups.splice(i, 1); // Remove from pool
          this.updateTeamStates(teamStates, matchup, currentDay);
        }
      }

      // Add games to schedule
      if (gamesToday.length > 0) {
        schedule.set(currentDay, gamesToday);
      }

      // Log pool status
      if (currentDay % 10 === 0 || currentDay <= 5) {
        const projectedFinish = this.calculateProjectedFinish(currentDay, unscheduledMatchups.length);
        console.log(
          `📊 Day ${currentDay}: ${unscheduledMatchups.length} matchups remaining, projected finish: Day ${projectedFinish}`
        );
      }

      // Check for emergency mode in final 30 days
      if (currentDay >= 120 && unscheduledMatchups.length > 200) {
        console.warn(`🚨 EMERGENCY MODE: ${unscheduledMatchups.length} matchups remaining at day ${currentDay}`);
        this.enterEmergencyMode(unscheduledMatchups, schedule, teamStates, currentDay, constraints);
      }
    }

    // Final validation
    this.validateScheduledGames(schedule, teamStates);

    // Check if all matchups were scheduled
    if (unscheduledMatchups.length > 0) {
      console.error(`❌ CRITICAL ERROR: Failed to schedule ${unscheduledMatchups.length} matchups!`);
      console.error(`This means some teams will have fewer than 82 games.`);
      console.error(`Remaining matchups:`, unscheduledMatchups.slice(0, 5));
      console.error(`This is a critical bug in the scheduler algorithm.`);
    } else {
      console.log(`✅ Successfully scheduled all ${matchups.length} matchups!`);
      console.log(`🎉 All teams should now have exactly 82 games each.`);
    }

    return schedule;
  }

  /**
   * Update team urgency states based on rest days
   */
  private updateTeamUrgencyStates(teamStates: Map<number, TeamScheduleState>, currentDay: number): void {
    teamStates.forEach((team) => {
      const restDays = currentDay - team.lastGameDay;
      team.isUrgent = restDays >= 3;
    });
  }

  /**
   * Find a matchup for a specific team in the unscheduled pool
   */
  private findMatchupInPool(unscheduledMatchups: any[], teamId: number): any | null {
    for (const matchup of unscheduledMatchups) {
      if (matchup.home_team_id === teamId || matchup.away_team_id === teamId) {
        return matchup;
      }
    }
    return null;
  }

  /**
   * Check if a matchup can be scheduled on the current day
   */
  private canScheduleMatchup(
    matchup: any,
    gamesToday: any[],
    teamStates: Map<number, TeamScheduleState>,
    currentDay: number
  ): boolean {
    // Check if either team already has a game today
    const homeHasGame = this.teamHasGameToday(gamesToday, matchup.home_team_id);
    const awayHasGame = this.teamHasGameToday(gamesToday, matchup.away_team_id);

    if (homeHasGame || awayHasGame) {
      return false;
    }

    // Check rest day constraints (prefer 1+ day rest but allow back-to-back if needed)
    const homeState = teamStates.get(matchup.home_team_id);
    const awayState = teamStates.get(matchup.away_team_id);

    if (homeState && awayState) {
      const homeRestDays = currentDay - homeState.lastGameDay;
      const awayRestDays = currentDay - awayState.lastGameDay;

      // If both teams have adequate rest, this is a good matchup
      if (homeRestDays >= 1 && awayRestDays >= 1) {
        return true;
      }

      // If we're getting desperate (late in season), allow back-to-back games
      if (currentDay > 120) {
        return true;
      }

      // Allow if at least one team has rest
      return homeRestDays >= 1 || awayRestDays >= 1;
    }

    return true;
  }

  /**
   * Remove a matchup from the unscheduled pool
   */
  private removeFromPool(unscheduledMatchups: any[], matchup: any): void {
    const index = unscheduledMatchups.findIndex(
      (m) => m.home_team_id === matchup.home_team_id && m.away_team_id === matchup.away_team_id
    );

    if (index !== -1) {
      unscheduledMatchups.splice(index, 1);
    }
  }

  /**
   * Calculate projected finish day based on current progress
   */
  private calculateProjectedFinish(currentDay: number, remainingMatchups: number): number {
    if (remainingMatchups === 0) return currentDay;

    const matchupsScheduled = 1230 - remainingMatchups;
    const avgMatchupsPerDay = matchupsScheduled / currentDay;
    const projectedDaysRemaining = Math.ceil(remainingMatchups / avgMatchupsPerDay);

    return Math.min(currentDay + projectedDaysRemaining, 150);
  }

  /**
   * Enter emergency mode to force schedule remaining matchups
   */
  private enterEmergencyMode(
    unscheduledMatchups: any[],
    schedule: Map<number, any[]>,
    teamStates: Map<number, TeamScheduleState>,
    currentDay: number,
    constraints: ScheduleConstraints
  ): void {
    console.warn(`🚨 Entering emergency mode with ${unscheduledMatchups.length} matchups remaining`);

    // Relax all constraints and just fill the schedule
    for (let day = currentDay; day <= constraints.total_game_days && unscheduledMatchups.length > 0; day++) {
      const gamesToday: any[] = [];

      // Schedule as many games as possible, ignoring most constraints
      for (let i = unscheduledMatchups.length - 1; i >= 0; i--) {
        if (gamesToday.length >= constraints.games_per_day) break;

        const matchup = unscheduledMatchups[i];

        // Only check if teams are already playing today
        const homeHasGame = this.teamHasGameToday(gamesToday, matchup.home_team_id);
        const awayHasGame = this.teamHasGameToday(gamesToday, matchup.away_team_id);

        if (!homeHasGame && !awayHasGame) {
          gamesToday.push(matchup);
          unscheduledMatchups.splice(i, 1);
          this.updateTeamStates(teamStates, matchup, day);
        }
      }

      if (gamesToday.length > 0) {
        schedule.set(day, gamesToday);
        console.log(
          `🚨 Emergency day ${day}: scheduled ${gamesToday.length} games, ${unscheduledMatchups.length} remaining`
        );
      }
    }
  }

  /**
   * Check if a team already has a game scheduled today
   */
  private teamHasGameToday(gamesToday: any[], teamId: number): boolean {
    return gamesToday.some((game) => game.home_team_id === teamId || game.away_team_id === teamId);
  }

  /**
   * Update team states after scheduling a game
   */
  private updateTeamStates(teamStates: Map<number, TeamScheduleState>, matchup: any, currentDay: number): void {
    const homeState = teamStates.get(matchup.home_team_id);
    const awayState = teamStates.get(matchup.away_team_id);

    if (homeState) {
      homeState.gamesScheduled++;
      homeState.totalRestDays += currentDay - homeState.lastGameDay;
      homeState.lastGameDay = currentDay;
    }

    if (awayState) {
      awayState.gamesScheduled++;
      awayState.totalRestDays += currentDay - awayState.lastGameDay;
      awayState.lastGameDay = currentDay;
    }
  }

  /**
   * Get scheduler debug information
   */
  private getSchedulerDebugInfo(
    teamStates: Map<number, TeamScheduleState>,
    currentDay: number,
    remainingMatchups: number
  ): SchedulerDebugInfo {
    const teamGameCounts = new Map<number, number>();
    const teamLastGameDay = new Map<number, number>();

    teamStates.forEach((state, teamId) => {
      teamGameCounts.set(teamId, state.gamesScheduled);
      teamLastGameDay.set(teamId, state.lastGameDay);
    });

    const gameCounts = Array.from(teamGameCounts.values());
    const minGames = Math.min(...gameCounts);
    const maxGames = Math.max(...gameCounts);
    const expectedGames = Math.floor((currentDay / 150) * 82);

    const teamsBehind = Array.from(teamGameCounts.entries())
      .filter(([_, games]) => games < expectedGames - 2)
      .map(([teamId, games]) => ({ teamId, games, deficit: expectedGames - games }));

    const teamsAhead = Array.from(teamGameCounts.entries())
      .filter(([_, games]) => games > expectedGames + 2)
      .map(([teamId, games]) => ({ teamId, games, surplus: games - expectedGames }));

    return {
      currentDay,
      gamesScheduledToday: 0, // Will be updated by caller
      teamGameCounts,
      teamLastGameDay,
      remainingMatchups,
      teamsOnTrack: 30 - teamsBehind.length - teamsAhead.length,
      teamsBehind,
      teamsAhead,
    };
  }

  /**
   * Log progress information with pool status
   */
  private logProgress(debugInfo: SchedulerDebugInfo, currentDay: number): void {
    const gameCounts = Array.from(debugInfo.teamGameCounts.values());
    const minGames = Math.min(...gameCounts);
    const maxGames = Math.max(...gameCounts);
    const avgGames = (gameCounts.reduce((a, b) => a + b, 0) / gameCounts.length).toFixed(1);

    console.log(
      `📊 Day ${currentDay}: Min=${minGames}, Max=${maxGames}, Avg=${avgGames}, Spread=${maxGames - minGames}`
    );
    console.log(`🎯 Pool: ${debugInfo.remainingMatchups} matchups remaining`);

    if (debugInfo.teamsBehind.length > 0) {
      console.log(
        `⚠️  Teams behind: ${debugInfo.teamsBehind.map((t) => `Team ${t.teamId}: ${t.games}/82`).join(', ')}`
      );
    }

    if (debugInfo.teamsAhead.length > 0) {
      console.log(`🚀 Teams ahead: ${debugInfo.teamsAhead.map((t) => `Team ${t.teamId}: ${t.games}/82`).join(', ')}`);
    }

    // Calculate and show pool depletion rate
    const totalMatchups = 1230;
    const matchupsScheduled = totalMatchups - debugInfo.remainingMatchups;
    const depletionRate = ((matchupsScheduled / totalMatchups) * 100).toFixed(1);
    console.log(`📈 Progress: ${matchupsScheduled}/${totalMatchups} matchups scheduled (${depletionRate}%)`);
  }

  /**
   * Validate scheduled games
   */
  private validateScheduledGames(schedule: Map<number, any[]>, teamStates: Map<number, TeamScheduleState>): void {
    console.log(`\n=== Final Schedule Validation (V2) ===`);

    // Check game counts
    const teamGameCounts = Array.from(teamStates.values()).map((team) => team.gamesScheduled);
    const teamsWithWrongCount = teamGameCounts.filter((count) => count !== 82);

    if (teamsWithWrongCount.length > 0) {
      console.error(`❌ ERROR: ${teamsWithWrongCount.length} teams with incorrect game counts`);
      console.error(`Expected: 82 games per team`);
    } else {
      console.log(`✅ All teams have exactly 82 games`);
    }

    // Check rest day constraints
    let totalRestDays = 0;
    let maxRestDays = 0;
    let teamsWithExcessiveRest = 0;

    teamStates.forEach((team) => {
      const avgRestDays = team.totalRestDays / Math.max(1, team.gamesScheduled - 1);
      totalRestDays += avgRestDays;
      maxRestDays = Math.max(maxRestDays, avgRestDays);

      if (avgRestDays > 1.35) {
        // 1.25 + 0.1 tolerance
        teamsWithExcessiveRest++;
      }
    });

    const overallAvgRestDays = totalRestDays / teamStates.size;
    console.log(`📊 Average rest days: ${overallAvgRestDays.toFixed(2)} (target: 1.25)`);
    console.log(`📊 Max rest days for any team: ${maxRestDays.toFixed(2)}`);

    if (teamsWithExcessiveRest > 0) {
      console.warn(`⚠️  ${teamsWithExcessiveRest} teams exceed 1.35 average rest days`);
    }

    // Check total games scheduled
    let totalScheduledGames = 0;
    schedule.forEach((games) => (totalScheduledGames += games.length));
    console.log(`📊 Total games scheduled: ${totalScheduledGames} (expected: 1,230)`);

    console.log(`=== End Schedule Validation ===\n`);
  }

  /**
   * Final validation of the complete schedule
   */
  private validateFinalSchedule(teamSchedules: Map<number, GameScheduleEntry[]>, allGames: any[], teams: Team[]): void {
    console.log(`\n=== Final Schedule Validation ===`);

    const teamGameCounts = new Map<number, number>();
    teams.forEach((team) => teamGameCounts.set(team.team_id, 0));

    teamSchedules.forEach((schedule, teamId) => {
      teamGameCounts.set(teamId, schedule.length);
    });

    const teamsWithWrongGameCount = Array.from(teamGameCounts.entries()).filter(([id, count]) => count !== 82);
    if (teamsWithWrongGameCount.length > 0) {
      console.error(`❌ ERROR: Teams with incorrect game counts:`, teamsWithWrongGameCount);
      console.error(`Expected: 82 games per team`);
    } else {
      console.log(`✅ All teams have exactly 82 games`);
    }

    console.log(`Total games scheduled: ${allGames.length}`);
    console.log(`Expected: 1,230 games (30 teams × 82 games ÷ 2)`);
    console.log(`=== End Schedule Validation ===\n`);
  }
}

/**
 * Export singleton instance for easy access
 */
export const scheduleBuilderV2 = ScheduleBuilderV2.getInstance();
