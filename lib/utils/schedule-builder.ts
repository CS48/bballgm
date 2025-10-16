"use client"

/**
 * Schedule Builder - 82-game schedule generation algorithm with calendar system
 * 
 * This utility generates balanced 82-game schedules for all teams in the league,
 * following NBA scheduling rules adapted for a division-less structure.
 * Now includes calendar integration with game days and rest day constraints.
 */

import { Team, GameScheduleEntry, Conference } from '../types/database';
import { ScheduleConstraints, GameDay } from '../types/calendar';
import { dateGenerator } from './date-generator';
import { SeededRandom } from './seeded-random';

/**
 * ScheduleBuilder class that generates balanced team schedules
 */
export class ScheduleBuilder {
  private static instance: ScheduleBuilder;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of ScheduleBuilder
   * @returns ScheduleBuilder instance
   */
  public static getInstance(): ScheduleBuilder {
    if (!ScheduleBuilder.instance) {
      ScheduleBuilder.instance = new ScheduleBuilder();
    }
    return ScheduleBuilder.instance;
  }

  /**
   * Schedule constraints for the calendar system
   */
  private readonly constraints: ScheduleConstraints = {
    max_consecutive_games: 2,
    min_rest_days: 0,
    max_rest_days: 4,
    games_per_day: 15,
    total_game_days: 150
  };

  /**
   * Generate complete 82-game schedule for all teams with calendar integration
   * @param teams Array of all teams in the league
   * @param seasonYear Season year
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
    console.log(`🎲 Using seed: ${seed} for schedule generation`);
    
    const teamSchedules = new Map<number, GameScheduleEntry[]>();
    const allGames: any[] = [];
    const gameDaySchedule = new Map<number, any[]>();
    let gameId = 1;

    // Initialize empty schedules for all teams
    teams.forEach(team => {
      teamSchedules.set(team.team_id, []);
    });

    // Initialize game day schedule
    for (let day = 1; day <= this.constraints.total_game_days; day++) {
      gameDaySchedule.set(day, []);
    }

    // Generate all matchups first
    const allMatchups = this.generateAllMatchups(teams, seasonYear, rng);
    
    // Log first few matchups for verification
    console.log(`🎯 Generated ${allMatchups.length} total matchups`);
    console.log(`🎯 First 5 matchups:`, allMatchups.slice(0, 5).map(m => 
      `Team ${m.home_team_id} vs Team ${m.away_team_id}`
    ));
    
    // Assign game days with rest day constraints
    console.log('Scheduling games with rest day constraints...');
    const scheduledGames = this.scheduleGamesWithRestDays(allMatchups, this.constraints, rng);
    console.log(`Scheduled games for ${scheduledGames.size} game days`);
    
    // Debug: Check how many games were actually scheduled
    let totalScheduledGames = 0;
    scheduledGames.forEach((games, day) => {
      totalScheduledGames += games.length;
      if (games.length > 0) {
        console.log(`Day ${day}: ${games.length} games`);
      }
    });
    console.log(`Total scheduled games: ${totalScheduledGames}`);
    
    // Verify all games were scheduled
    console.log(`✓ Scheduled ${totalScheduledGames} of ${allMatchups.length} games`);
    const gameCounts = Array.from(scheduledGames.values()).map(g => g.length);
    const minGames = Math.min(...gameCounts);
    const maxGames = Math.max(...gameCounts);
    const avgGames = (totalScheduledGames / 150).toFixed(1);
    console.log(`✓ Games per day: min=${minGames}, max=${maxGames}, avg=${avgGames}`);
    
    // Process scheduled games
    scheduledGames.forEach((games, gameDay) => {
      games.forEach(game => {
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
            box_score: null
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
            result: null
          });
          
          teamSchedules.get(game.away_team_id)?.push({
            game_id: gameId,
            opponent_id: game.home_team_id,
            game_day: gameDay,
            date_display: dateInfo.display,
            home: false,
            completed: false,
            result: null
          });
          
          gameId++;
        } catch (error) {
          console.error(`Error processing game day ${gameDay}:`, error);
          throw error;
        }
      });
    });

    // Sort schedules by game day
    teamSchedules.forEach(schedule => {
      schedule.sort((a, b) => a.game_day - b.game_day);
    });

    // Final validation: Check that each team has exactly 82 games
    console.log(`\n=== Final Schedule Validation ===`);
    const teamGameCounts = new Map<number, number>();
    teams.forEach(team => teamGameCounts.set(team.team_id, 0));
    
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
    
    // CHECKPOINT 1: After Schedule Generation
    console.log(`\n🔍 CHECKPOINT 1: Schedule generation complete`);
    console.log(`Total games with game_day assigned: ${allGames.filter(g => g.game_day != null).length}`);
    console.log(`Games WITHOUT game_day: ${allGames.filter(g => g.game_day == null).length}`);
    console.log(`Sample game with day 1:`, allGames.find(g => g.game_day === 1));
    console.log(`All day 1 games count:`, allGames.filter(g => g.game_day === 1).length);
    
    return { teamSchedules, allGames, gameDaySchedule };
  }

  /**
   * Generate all matchups for the season using simple "Fill-to-82" algorithm
   * @param teams Array of all teams
   * @param seasonYear Season year
   * @returns Array of all matchups
   */
  private generateAllMatchups(teams: Team[], seasonYear: number, rng: SeededRandom): any[] {
    console.log(`\n=== Simple Fill-to-82 Schedule Generation ===`);
    console.log(`RNG object:`, rng);
    console.log(`RNG next method:`, typeof rng?.next);
    
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
    
    console.log(`=== End Schedule Generation ===\n`);
    
    return allGames;
  }

  /**
   * Generate inter-conference games (30 per team)
   * Each team plays each opponent in the other conference exactly 2 times
   * @param teams Array of all teams
   * @param seasonYear Season year
   * @param rng Seeded random number generator
   * @returns Array of inter-conference games
   */
  private generateInterConferenceGames(teams: Team[], seasonYear: number, rng: SeededRandom): any[] {
    console.log(`generateInterConferenceGames called`);
    console.log(`  - teams:`, teams?.length);
    console.log(`  - seasonYear:`, seasonYear);
    console.log(`  - rng:`, rng);
    console.log(`  - rng.next type:`, typeof rng?.next);
    
    const games: any[] = [];
    
    // Split teams by conference
    const easternTeams = teams.filter(team => team.conference === 'East');
    const westernTeams = teams.filter(team => team.conference === 'West');
    
    console.log(`Eastern teams: ${easternTeams.length}, Western teams: ${westernTeams.length}`);
    
    // Each Eastern team plays each Western team 2 times (1 home, 1 away)
    easternTeams.forEach(eastTeam => {
      westernTeams.forEach(westTeam => {
        // Game 1: East home, West away
        games.push({
          season: seasonYear,
          home_team_id: eastTeam.team_id,
          away_team_id: westTeam.team_id,
          home_score: null,
          away_score: null,
          completed: false,
          box_score: null
        });
        
        // Game 2: West home, East away
        games.push({
          season: seasonYear,
          home_team_id: westTeam.team_id,
          away_team_id: eastTeam.team_id,
          home_score: null,
          away_score: null,
          completed: false,
          box_score: null
        });
      });
    });
    
    console.log(`Generated ${games.length} inter-conference games (expected: 450)`);
    return games;
  }

  /**
   * Generate conference base games (42 per team)
   * Each team plays each conference opponent exactly 3 times
   * @param teams Array of all teams
   * @param seasonYear Season year
   * @param rng Seeded random number generator
   * @returns Array of conference base games
   */
  private generateConferenceBaseGames(teams: Team[], seasonYear: number, rng: SeededRandom): any[] {
    console.log(`generateConferenceBaseGames called`);
    console.log(`  - teams:`, teams?.length);
    console.log(`  - seasonYear:`, seasonYear);
    console.log(`  - rng:`, rng);
    console.log(`  - rng.nextBoolean type:`, typeof rng?.nextBoolean);
    
    const games: any[] = [];
    
    // Split teams by conference
    const easternTeams = teams.filter(team => team.conference === 'East');
    const westernTeams = teams.filter(team => team.conference === 'West');
    
    console.log(`About to generate games for ${easternTeams.length} Eastern + ${westernTeams.length} Western teams`);
    
    // Generate games for each conference
    [easternTeams, westernTeams].forEach((conferenceTeams, confIndex) => {
      console.log(`Processing conference ${confIndex}, ${conferenceTeams.length} teams`);
      // Each team plays each other team in the conference 3 times
      for (let i = 0; i < conferenceTeams.length; i++) {
        for (let j = i + 1; j < conferenceTeams.length; j++) {
          const team1 = conferenceTeams[i];
          const team2 = conferenceTeams[j];
          
          // Add 3 games between these two teams
          for (let gameNum = 0; gameNum < 3; gameNum++) {
            console.log(`About to call rng.nextBoolean() for team ${team1.team_id} vs ${team2.team_id}, game ${gameNum}`);
            const isHomeTeam1 = rng.nextBoolean();
            games.push({
              season: seasonYear,
              home_team_id: isHomeTeam1 ? team1.team_id : team2.team_id,
              away_team_id: isHomeTeam1 ? team2.team_id : team1.team_id,
              home_score: null,
              away_score: null,
              completed: false,
              box_score: null
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
   * @param teams Array of all teams
   * @param seasonYear Season year
   * @param rng Seeded random number generator
   * @returns Array of conference fill games
   */
  private generateConferenceFillGames(teams: Team[], seasonYear: number, rng: SeededRandom): any[] {
    console.log(`generateConferenceFillGames called with rng:`, rng);
    console.log(`rng.next type:`, typeof rng?.next);
    
    const games: any[] = [];
    const easternTeams = teams.filter(team => team.conference === 'East');
    const westernTeams = teams.filter(team => team.conference === 'West');
    
    console.log(`Generating fill games for ${easternTeams.length} Eastern teams and ${westernTeams.length} Western teams`);
    
    [easternTeams, westernTeams].forEach((conferenceTeams, confIndex) => {
      console.log(`Processing conference ${confIndex} for fill games, ${conferenceTeams.length} teams`);
      
      // Track how many games each team still needs
      const teamNeedsGames = new Map<number, number>();
      conferenceTeams.forEach(team => teamNeedsGames.set(team.team_id, 10));
      
      const selectedMatchups: [number, number][] = [];
      
      // STEP 1: Create a shuffled list of all possible matchups
      const allPossibleMatchups: [number, number][] = [];
      for (let i = 0; i < conferenceTeams.length; i++) {
        for (let j = i + 1; j < conferenceTeams.length; j++) {
          allPossibleMatchups.push([
            conferenceTeams[i].team_id,
            conferenceTeams[j].team_id
          ]);
        }
      }
      
      const shuffledMatchups = rng.shuffle(allPossibleMatchups);
      
      // STEP 2: Select matchups from shuffled list
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
      
      // STEP 3: Cleanup - pair up any remaining teams that still need games
      const teamsStillNeeding = Array.from(teamNeedsGames.entries())
        .filter(([_, needs]) => needs > 0)
        .map(([teamId, needs]) => ({ teamId, needs }));
      
      if (teamsStillNeeding.length > 0) {
        console.log(`Cleanup: ${teamsStillNeeding.length} teams still need games:`, teamsStillNeeding);
        
        // Shuffle the teams that still need games
        const shuffledRemaining = rng.shuffle([...teamsStillNeeding]);
        
        // Keep creating matchups until all teams have 10 games
        while (shuffledRemaining.some(t => t.needs > 0)) {
          // Filter teams that still need games
          const teamsNeedingGames = shuffledRemaining.filter(t => t.needs > 0);
          
          if (teamsNeedingGames.length < 2) {
            console.error(`Cannot pair remaining team:`, teamsNeedingGames);
            break;
          }
          
          // Take first two teams that need games and create ONE matchup
          const team1 = teamsNeedingGames[0];
          const team2 = teamsNeedingGames[1];
          
          selectedMatchups.push([team1.teamId, team2.teamId]);
          team1.needs--;
          team2.needs--;
          
          // Update the map as well
          teamNeedsGames.set(team1.teamId, team1.needs);
          teamNeedsGames.set(team2.teamId, team2.needs);
        }
      }
      
      console.log(`Selected ${selectedMatchups.length} matchups for conference ${confIndex} (expected: 75)`);
      
      // STEP 4: Create game objects from selected matchups
      for (const [team1Id, team2Id] of selectedMatchups) {
        const isHomeTeam1 = rng.nextBoolean();
        games.push({
          season: seasonYear,
          home_team_id: isHomeTeam1 ? team1Id : team2Id,
          away_team_id: isHomeTeam1 ? team2Id : team1Id,
          home_score: null,
          away_score: null,
          completed: false,
          box_score: null
        });
      }
    });
    
    console.log(`Generated ${games.length} conference fill games (expected: 150)`);
    return games;
  }

  /**
   * Validate that each team has exactly 82 games
   * @param games Array of all games
   * @param teams Array of all teams
   */
  private validateGameCounts(games: any[], teams: Team[]): void {
    const teamGameCounts = new Map<number, number>();
    teams.forEach(team => teamGameCounts.set(team.team_id, 0));
    
    games.forEach(game => {
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
   * Select random pairs from a list
   * @param pairs Array of team pairs
   * @param count Number of pairs to select
   * @returns Array of selected pairs
   */
  private selectRandomPairs<T>(pairs: T[], count: number, rng: SeededRandom): T[] {
    const shuffled = rng.shuffle([...pairs]);
    return shuffled.slice(0, count);
  }

  /**
   * Select random opponents from a list
   * @param opponents Array of opponent teams
   * @param count Number of opponents to select
   * @returns Array of selected opponents
   */
  private selectRandomOpponents(opponents: Team[], count: number, rng: SeededRandom): Team[] {
    console.log(`Selecting ${count} opponents from ${opponents.length} available`);
    const shuffled = rng.shuffle([...opponents]);
    const selected = shuffled.slice(0, count);
    console.log(`Selected ${selected.length} opponents:`, selected.map(t => `${t.city} ${t.name}`));
    return selected;
  }

  /**
   * Generate a random date within the season
   * @param startDate Season start date
   * @param totalDays Total days in season
   * @returns Random date string (YYYY-MM-DD)
   */
  private generateRandomDate(startDate: string, totalDays: number, rng: SeededRandom): string {
    const start = new Date(startDate);
    const randomDays = Math.floor(rng.next() * totalDays);
    const gameDate = new Date(start.getTime() + randomDays * 24 * 60 * 60 * 1000);
    return gameDate.toISOString().split('T')[0];
  }

  /**
   * Validate schedule balance
   * @param teamSchedules Map of team schedules
   * @returns Validation results
   */
  public validateSchedule(teamSchedules: Map<number, GameScheduleEntry[]>): {
    isValid: boolean;
    issues: string[];
    stats: any;
  } {
    const issues: string[] = [];
    const stats: any = {
      totalGames: 0,
      homeGames: 0,
      awayGames: 0,
      gamesPerTeam: new Map<number, number>(),
      consecutiveHomeGames: new Map<number, number>(),
      consecutiveAwayGames: new Map<number, number>()
    };

    // Check each team's schedule
    teamSchedules.forEach((schedule, teamId) => {
      const gameCount = schedule.length;
      stats.gamesPerTeam.set(teamId, gameCount);
      stats.totalGames += gameCount;

      // Check for 82 games
      if (gameCount !== 82) {
        issues.push(`Team ${teamId}: ${gameCount} games, expected 82`);
      }

      // Count home/away games
      const homeGames = schedule.filter(game => game.home).length;
      const awayGames = schedule.filter(game => !game.home).length;
      stats.homeGames += homeGames;
      stats.awayGames += awayGames;

      // Check home/away balance (should be close to 41-41)
      if (Math.abs(homeGames - awayGames) > 2) {
        issues.push(`Team ${teamId}: Home/Away imbalance (${homeGames}H/${awayGames}A)`);
      }

      // Check for consecutive games
      let consecutiveHome = 0;
      let consecutiveAway = 0;
      let maxConsecutiveHome = 0;
      let maxConsecutiveAway = 0;

      schedule.forEach(game => {
        if (game.home) {
          consecutiveHome++;
          consecutiveAway = 0;
          maxConsecutiveHome = Math.max(maxConsecutiveHome, consecutiveHome);
        } else {
          consecutiveAway++;
          consecutiveHome = 0;
          maxConsecutiveAway = Math.max(maxConsecutiveAway, consecutiveAway);
        }
      });

      stats.consecutiveHomeGames.set(teamId, maxConsecutiveHome);
      stats.consecutiveAwayGames.set(teamId, maxConsecutiveAway);

      // Check for excessive consecutive games
      if (maxConsecutiveHome > 5) {
        issues.push(`Team ${teamId}: ${maxConsecutiveHome} consecutive home games`);
      }
      if (maxConsecutiveAway > 5) {
        issues.push(`Team ${teamId}: ${maxConsecutiveAway} consecutive away games`);
      }
    });

    return {
      isValid: issues.length === 0,
      issues,
      stats
    };
  }

  /**
   * Get schedule statistics
   * @param teamSchedules Map of team schedules
   * @returns Schedule statistics
   */
  public getScheduleStats(teamSchedules: Map<number, GameScheduleEntry[]>): any {
    const stats = {
      totalTeams: teamSchedules.size,
      totalGames: 0,
      averageGamesPerTeam: 0,
      homeAwayBalance: { home: 0, away: 0 },
      dateRange: { earliest: '', latest: '' },
      gamesByMonth: {} as Record<string, number>
    };

    let allDates: string[] = [];

    teamSchedules.forEach((schedule, teamId) => {
      stats.totalGames += schedule.length;
      
      schedule.forEach(game => {
        allDates.push(game.date);
        
        if (game.home) {
          stats.homeAwayBalance.home++;
        } else {
          stats.homeAwayBalance.away++;
        }

        // Count games by month
        const month = game.date.substring(0, 7); // YYYY-MM
        stats.gamesByMonth[month] = (stats.gamesByMonth[month] || 0) + 1;
      });
    });

    stats.averageGamesPerTeam = stats.totalGames / stats.totalTeams;
    
    if (allDates.length > 0) {
      allDates.sort();
      stats.dateRange.earliest = allDates[0];
      stats.dateRange.latest = allDates[allDates.length - 1];
    }

    return stats;
  }

  /**
   * Schedule games with rest day constraints
   * @param matchups Array of all matchups
   * @param constraints Schedule constraints
   * @returns Map of game day to games
   */
  private scheduleGamesWithRestDays(
    matchups: any[],
    constraints: ScheduleConstraints,
    rng: SeededRandom
  ): Map<number, any[]> {
    const schedule = new Map<number, any[]>();
    const teamLastGameDay = new Map<number, number>();
    const teamGameCount = new Map<number, number>();
    
    // Initialize schedule for all game days
    for (let day = 1; day <= constraints.total_game_days; day++) {
      schedule.set(day, []);
    }
    
    // Initialize team game counts
    const allTeamIds = new Set<number>();
    matchups.forEach(matchup => {
      allTeamIds.add(matchup.home_team_id);
      allTeamIds.add(matchup.away_team_id);
    });
    allTeamIds.forEach(teamId => {
      teamGameCount.set(teamId, 0);
    });
    
    // Shuffle matchups for better distribution
    const shuffledMatchups = rng.shuffle([...matchups]);
    
    console.log(`📅 Scheduling ${matchups.length} games across ${constraints.total_game_days} days`);
    console.log(`📊 Target: ~${Math.ceil(matchups.length / constraints.total_game_days)} games per day`);
    
    let scheduledCount = 0;
    let failedCount = 0;
    
    for (const matchup of shuffledMatchups) {
      let scheduled = false;
      let attempts = 0;
      const maxAttempts = constraints.total_game_days * 3; // Increased attempts
      
      // Try to find a suitable day for this matchup
      while (!scheduled && attempts < maxAttempts) {
        // Use a more intelligent day selection strategy
        const day = this.findBestDayForMatchup(
          matchup, 
          schedule, 
          teamLastGameDay, 
          constraints,
          rng
        );
        
        if (day && day <= constraints.total_game_days) {
          const dayGames = schedule.get(day) || [];
          
          // Check if either team already has a game on this day
          const homeHasGame = dayGames.some(g => 
            g.home_team_id === matchup.home_team_id || g.away_team_id === matchup.home_team_id
          );
          const awayHasGame = dayGames.some(g => 
            g.home_team_id === matchup.away_team_id || g.away_team_id === matchup.away_team_id
          );
          
          if (!homeHasGame && !awayHasGame) {
            // Schedule the game
            schedule.get(day)?.push(matchup);
            teamLastGameDay.set(matchup.home_team_id, day);
            teamLastGameDay.set(matchup.away_team_id, day);
            teamGameCount.set(matchup.home_team_id, (teamGameCount.get(matchup.home_team_id) || 0) + 1);
            teamGameCount.set(matchup.away_team_id, (teamGameCount.get(matchup.away_team_id) || 0) + 1);
            scheduled = true;
            scheduledCount++;
          }
        }
        
        attempts++;
      }
      
      if (!scheduled) {
        failedCount++;
        // Force schedule on the least busy day
        const leastBusyDay = this.findLeastBusyDay(schedule, constraints);
        if (leastBusyDay) {
          schedule.get(leastBusyDay)?.push(matchup);
          teamLastGameDay.set(matchup.home_team_id, leastBusyDay);
          teamLastGameDay.set(matchup.away_team_id, leastBusyDay);
          teamGameCount.set(matchup.home_team_id, (teamGameCount.get(matchup.home_team_id) || 0) + 1);
          teamGameCount.set(matchup.away_team_id, (teamGameCount.get(matchup.away_team_id) || 0) + 1);
          scheduledCount++;
        }
      }
    }
    
    console.log(`✅ Successfully scheduled ${scheduledCount} games`);
    if (failedCount > 0) {
      console.warn(`⚠️ ${failedCount} games failed to schedule with rest constraints`);
    }
    
    return schedule;
  }
  
  /**
   * Find the best day for a matchup considering rest days and team schedules
   */
  private findBestDayForMatchup(
    matchup: any,
    schedule: Map<number, any[]>,
    teamLastGameDay: Map<number, number>,
    constraints: ScheduleConstraints,
    rng: SeededRandom
  ): number | null {
    const homeLastDay = teamLastGameDay.get(matchup.home_team_id) || 0;
    const awayLastDay = teamLastGameDay.get(matchup.away_team_id) || 0;
    
    // Start from day 1 and find the first suitable day
    for (let day = 1; day <= constraints.total_game_days; day++) {
      const dayGames = schedule.get(day) || [];
      
      // Check if either team already has a game on this day
      const homeHasGame = dayGames.some(g => 
        g.home_team_id === matchup.home_team_id || g.away_team_id === matchup.home_team_id
      );
      const awayHasGame = dayGames.some(g => 
        g.home_team_id === matchup.away_team_id || g.away_team_id === matchup.away_team_id
      );
      
      if (!homeHasGame && !awayHasGame) {
        // Check rest day constraints (prefer 1+ day rest but allow back-to-back if needed)
        const homeRestDays = day - homeLastDay;
        const awayRestDays = day - awayLastDay;
        
        // If both teams have adequate rest, this is a good day
        if (homeRestDays >= 1 && awayRestDays >= 1) {
          return day;
        }
        
        // If we're getting desperate, allow back-to-back games
        if (day > constraints.total_game_days * 0.8) {
          return day;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Find the least busy day to force schedule games
   */
  private findLeastBusyDay(schedule: Map<number, any[]>, constraints: ScheduleConstraints): number | null {
    let leastBusyDay = 1;
    let minGames = schedule.get(1)?.length || 0;
    
    for (let day = 2; day <= constraints.total_game_days; day++) {
      const dayGames = schedule.get(day)?.length || 0;
      if (dayGames < minGames) {
        minGames = dayGames;
        leastBusyDay = day;
      }
    }
    
    return leastBusyDay;
  }


  /**
   * Generate a balanced schedule with no back-to-backs
   * @param teams Array of all teams
   * @param seasonYear Season year
   * @param startDate Season start date
   * @param endDate Season end date
   * @returns Balanced schedule
   */
  public generateBalancedSchedule(
    teams: Team[],
    seasonYear: number,
    startDate: string,
    endDate: string
  ): { teamSchedules: Map<number, GameScheduleEntry[]>; allGames: any[] } {
    // This is a simplified version - in practice, you'd want more sophisticated
    // algorithms to avoid back-to-backs and ensure proper rest days
    return this.generateSchedule(teams, seasonYear, startDate, endDate);
  }
}

/**
 * Export singleton instance for easy access
 */
export const scheduleBuilder = ScheduleBuilder.getInstance();
