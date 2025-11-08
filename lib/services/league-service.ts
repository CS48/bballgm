'use client';

/**
 * League Service - League generation and management
 *
 * This service orchestrates the creation and management of the entire league,
 * including teams, players, schedules, and league-wide operations.
 */

import { dbService } from '../database/db-service';
import { playerService } from './player-service';
import { teamService } from './team-service';
import { calendarService } from './calendar-service';
import { playerGenerator } from '../generators/player-generator';
import { teamGenerator } from '../generators/team-generator';
import { scheduleBuilderV2 } from '../utils/schedule-builder-v2';
import { Team, Player, Conference, LeagueState, SeasonInfo } from '../types/database';
import { LeagueConfig, LeagueInitOptions } from '../types/league';

/**
 * LeagueService class that manages the entire league
 */
export class LeagueService {
  private static instance: LeagueService;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of LeagueService
   * @returns LeagueService instance
   */
  public static getInstance(): LeagueService {
    if (!LeagueService.instance) {
      LeagueService.instance = new LeagueService();
    }
    return LeagueService.instance;
  }

  /**
   * Generate a complete new league with all teams, players, and schedules
   * @param options League initialization options
   * @returns Promise that resolves when league generation is complete
   */
  public async generateLeague(options: LeagueInitOptions): Promise<void> {
    try {
      // Assign team quality tiers
      const teamQualities = teamGenerator.assignTeamQualities();

      // Generate all teams with rosters using team qualities
      const generatedTeams = teamGenerator.generateAllTeams(teamQualities);

      // Insert teams into database
      const teamIds: number[] = [];
      for (const { team } of generatedTeams) {
        const teamId = await teamService.createTeam(team);
        teamIds.push(teamId);
      }

      // Insert players into database
      let totalPlayers = 0;
      for (let i = 0; i < generatedTeams.length; i++) {
        const { players } = generatedTeams[i];
        const teamId = teamIds[i];

        for (const player of players) {
          const playerWithTeamId = { ...player, team_id: teamId };
          await playerService.createPlayer(playerWithTeamId);
          totalPlayers++;
        }
      }

      // Initialize calendar for the season
      const currentYear = new Date().getFullYear();
      await calendarService.initializeSeasonCalendar(currentYear);

      // Generate schedules for all teams with calendar integration
      const allTeams = await teamService.getAllTeams();
      // Enhanced seed generation to ensure uniqueness even for rapid refreshes
      const scheduleSeed = Date.now() + Math.floor(Math.random() * 10000) + Math.floor(Math.random() * 1000);

      const { teamSchedules, allGames, gameDaySchedule } = scheduleBuilderV2.generateScheduleWithCalendar(
        allTeams,
        currentYear,
        scheduleSeed
      );

      // Insert games into database with game day assignments
      for (let i = 0; i < allGames.length; i++) {
        const game = allGames[i];
        const sql = `
          INSERT INTO games (season, date, game_day, home_team_id, away_team_id, home_score, away_score, completed, box_score)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        // Date is already in ISO format from DateGenerator
        console.log(`Using ISO date: ${game.date}`);

        dbService.run(sql, [
          game.season,
          game.date,
          game.game_day,
          game.home_team_id,
          game.away_team_id,
          game.home_score,
          game.away_score,
          game.completed,
          game.box_score,
        ]);
      }

      // Update calendar with games scheduled count
      for (const [gameDay, games] of gameDaySchedule) {
        if (games.length > 0) {
          await calendarService.updateGamesScheduled(currentYear, gameDay, games.length);
        }
      }

      // Update team schedules in database
      for (const [teamId, schedule] of teamSchedules) {
        // Validate game count per team
        if (schedule.length !== 82) {
          console.error(`❌ ERROR: Team ${teamId} has ${schedule.length} games, expected 82!`);
        }

        await teamService.updateTeamSchedule(teamId, schedule);
      }

      console.log('League generation completed successfully!');
    } catch (error) {
      console.error('Failed to generate league:', error);
      throw new Error('League generation failed');
    }
  }

  /**
   * Get current season information
   * @returns Promise that resolves to current season info
   */
  public async getCurrentSeason(): Promise<SeasonInfo> {
    try {
      // Query the most recent season from season_calendar
      const sql = `
        SELECT DISTINCT season 
        FROM season_calendar 
        ORDER BY season DESC 
        LIMIT 1
      `;

      const results = dbService.exec(sql);

      if (results.length === 0) {
        // Fallback to current year if no season found
        const currentYear = new Date().getFullYear();
        return {
          year: currentYear,
          start_date: `${currentYear}-10-15`,
          end_date: `${currentYear + 1}-04-15`,
          games_per_team: 82,
          playoffs_enabled: false,
          playoff_teams_per_conference: 8,
        };
      }

      const season = results[0].season;
      return {
        year: season,
        start_date: `${season}-10-15`,
        end_date: `${season + 1}-04-15`,
        games_per_team: 82,
        playoffs_enabled: false,
        playoff_teams_per_conference: 8,
      };
    } catch (error) {
      console.error('Failed to get current season:', error);
      // Fallback to current year
      const currentYear = new Date().getFullYear();
      return {
        year: currentYear,
        start_date: `${currentYear}-10-15`,
        end_date: `${currentYear + 1}-04-15`,
        games_per_team: 82,
        playoffs_enabled: false,
        playoff_teams_per_conference: 8,
      };
    }
  }

  /**
   * Get league standings for a specific conference or overall
   * @param conference Conference to get standings for (null for overall)
   * @returns Promise that resolves to standings array
   */
  public async getStandings(conference?: Conference | null): Promise<any[]> {
    try {
      return await teamService.getStandings(conference);
    } catch (error) {
      console.error('Failed to get standings:', error);
      throw new Error('Failed to get standings');
    }
  }

  /**
   * Get league state information
   * @returns Promise that resolves to league state
   */
  public async getLeagueState(): Promise<LeagueState> {
    try {
      const teams = await teamService.getAllTeams();
      const totalGames = teams.reduce((sum, team) => sum + team.wins + team.losses, 0);
      const currentDate = new Date().toISOString().split('T')[0];

      return {
        current_season: new Date().getFullYear(),
        current_date: currentDate,
        season_phase: this.determineSeasonPhase(currentDate),
        games_played: Math.floor(totalGames / 2), // Each game involves 2 teams
        total_games: (82 * 30) / 2, // 82 games per team, 30 teams, each game counted once
        is_active: true,
      };
    } catch (error) {
      console.error('Failed to get league state:', error);
      throw new Error('Failed to get league state');
    }
  }

  /**
   * Determine current season phase based on date
   * @param currentDate Current date (YYYY-MM-DD)
   * @returns Season phase
   */
  private determineSeasonPhase(currentDate: string): 'preseason' | 'regular_season' | 'playoffs' | 'offseason' {
    const date = new Date(currentDate);
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();

    // Preseason: September-October 15
    if (month === 9 || (month === 10 && day <= 15)) {
      return 'preseason';
    }
    // Regular season: October 16 - April 15
    else if (
      (month === 10 && day >= 16) ||
      month === 11 ||
      month === 12 ||
      month === 1 ||
      month === 2 ||
      month === 3 ||
      (month === 4 && day <= 15)
    ) {
      return 'regular_season';
    }
    // Playoffs: April 16 - June 15
    else if ((month === 4 && day >= 16) || month === 5 || (month === 6 && day <= 15)) {
      return 'playoffs';
    }
    // Offseason: June 16 - August
    else {
      return 'offseason';
    }
  }

  /**
   * Get league statistics summary
   * @returns Promise that resolves to league stats
   */
  public async getLeagueStats(): Promise<any> {
    try {
      const teams = await teamService.getAllTeams();
      const players = await playerService.getAllPlayers();

      const totalGames = teams.reduce((sum, team) => sum + team.wins + team.losses, 0);
      const totalWins = teams.reduce((sum, team) => sum + team.wins, 0);
      const totalLosses = teams.reduce((sum, team) => sum + team.losses, 0);

      return {
        totalTeams: teams.length,
        totalPlayers: players.length,
        totalGames,
        totalWins,
        totalLosses,
        averageWinPercentage: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
        teamsByConference: {
          east: teams.filter((team) => team.conference === 'East').length,
          west: teams.filter((team) => team.conference === 'West').length,
        },
      };
    } catch (error) {
      console.error('Failed to get league stats:', error);
      throw new Error('Failed to get league stats');
    }
  }

  /**
   * Get top teams by wins
   * @param limit Number of teams to return
   * @returns Promise that resolves to top teams
   */
  public async getTopTeams(limit: number = 10): Promise<any[]> {
    try {
      return await teamService.getTopTeams(limit);
    } catch (error) {
      console.error('Failed to get top teams:', error);
      throw new Error('Failed to get top teams');
    }
  }

  /**
   * Get teams by conference
   * @param conference Conference to filter by
   * @returns Promise that resolves to teams in that conference
   */
  public async getTeamsByConference(conference: Conference): Promise<Team[]> {
    try {
      return await teamService.getTeamsByConference(conference);
    } catch (error) {
      console.error('Failed to get teams by conference:', error);
      throw new Error('Failed to get teams by conference');
    }
  }

  /**
   * Get all teams in the league
   * @returns Promise that resolves to all teams
   */
  public async getAllTeams(): Promise<Team[]> {
    try {
      return await teamService.getAllTeams();
    } catch (error) {
      console.error('Failed to get all teams:', error);
      throw new Error('Failed to get all teams');
    }
  }

  /**
   * Get all players in the league
   * @returns Promise that resolves to all players
   */
  public async getAllPlayers(): Promise<Player[]> {
    try {
      return await playerService.getAllPlayers();
    } catch (error) {
      console.error('Failed to get all players:', error);
      throw new Error('Failed to get all players');
    }
  }

  /**
   * Update a team's information
   * @param teamId Team ID to update
   * @param updateData Data to update
   * @returns Promise that resolves when update is complete
   */
  public async updateTeam(teamId: number, updateData: Partial<Team>): Promise<void> {
    try {
      return await teamService.updateTeam(teamId, updateData);
    } catch (error) {
      console.error('Failed to update team:', error);
      throw new Error('Failed to update team');
    }
  }

  /**
   * Get team roster with player details
   * @param teamId Team ID to get roster for
   * @returns Promise that resolves to team roster
   */
  public async getTeamRoster(teamId: number): Promise<any> {
    try {
      const team = await teamService.getTeam(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      const players = await playerService.getPlayersByTeam(teamId);

      return {
        team: {
          team_id: team.team_id,
          city: team.city,
          name: team.name,
          conference: team.conference,
        },
        players: players.map((player) => ({
          player_id: player.player_id,
          name: `${player.first_name} ${player.last_name}`,
          position: player.position,
          is_starter: player.is_starter,
          age: player.age,
          height: player.height,
          weight: player.weight,
          years_pro: player.years_pro,
          overall_rating: playerService.calculateOverallRating(player),
          current_stats: player.current_season_stats ? JSON.parse(player.current_season_stats) : null,
          // Include player attributes for rating calculations
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
        })),
      };
    } catch (error) {
      console.error('Failed to get team roster:', error);
      throw new Error('Failed to get team roster');
    }
  }

  /**
   * Advance to the next season
   * @returns Promise that resolves when season advance is complete
   */
  public async advanceSeason(): Promise<void> {
    try {
      console.log('Advancing to next season...');

      // Get all teams and players
      const teams = await teamService.getAllTeams();
      const players = await playerService.getAllPlayers();

      // Archive current season data
      for (const team of teams) {
        const currentStats = team.current_season_stats ? JSON.parse(team.current_season_stats) : null;
        const historicalRecords = team.historical_records ? JSON.parse(team.historical_records) : [];

        // Add current season to historical records
        historicalRecords.push({
          season: new Date().getFullYear(),
          wins: team.wins,
          losses: team.losses,
          stats: currentStats,
        });

        // Reset team for new season
        await teamService.updateTeam(team.team_id, {
          wins: 0,
          losses: 0,
          current_season_stats: JSON.stringify({
            games: 0,
            wins: 0,
            losses: 0,
            ppg: 0,
            opp_ppg: 0,
            fg_pct: 0,
            three_pct: 0,
            ft_pct: 0,
            rpg: 0,
            apg: 0,
            spg: 0,
            bpg: 0,
            tpg: 0,
            fg_made: 0,
            fg_attempted: 0,
            three_made: 0,
            three_attempted: 0,
            ft_made: 0,
            ft_attempted: 0,
            oreb: 0,
            dreb: 0,
            pf: 0,
            dd: 0,
            td: 0,
            plus_minus: 0,
          }),
          historical_records: JSON.stringify(historicalRecords),
          schedule: JSON.stringify([]),
        });
      }

      // Archive player data
      for (const player of players) {
        const currentStats = player.current_season_stats ? JSON.parse(player.current_season_stats) : null;
        const historicalStats = player.historical_stats ? JSON.parse(player.historical_stats) : [];

        // Add current season to historical stats
        if (currentStats && currentStats.games > 0) {
          historicalStats.push({
            season: new Date().getFullYear(),
            ...currentStats,
          });
        }

        // Reset player for new season
        await playerService.updatePlayer(player.player_id, {
          current_season_stats: JSON.stringify({
            games: 0,
            minutes: 0,
            points: 0,
            ppg: 0,
            rebounds: 0,
            rpg: 0,
            assists: 0,
            apg: 0,
            steals: 0,
            spg: 0,
            blocks: 0,
            bpg: 0,
            turnovers: 0,
            tpg: 0,
            fg_made: 0,
            fg_attempted: 0,
            fg_pct: 0,
            three_made: 0,
            three_attempted: 0,
            three_pct: 0,
            ft_made: 0,
            ft_attempted: 0,
            ft_pct: 0,
            plus_minus: 0,
          }),
          historical_stats: JSON.stringify(historicalStats),
        });

        // Recalculate career stats
        await playerService.calculateCareerStats(player.player_id);
      }

      // Generate new schedules using V2 scheduler
      const currentYear = new Date().getFullYear() + 1;
      const scheduleSeed = Date.now() + Math.floor(Math.random() * 10000);

      const { teamSchedules } = scheduleBuilderV2.generateScheduleWithCalendar(teams, currentYear, scheduleSeed);

      // Update team schedules
      for (const [teamId, schedule] of teamSchedules) {
        await teamService.updateTeamSchedule(teamId, schedule);
      }

      console.log('Season advance completed successfully!');
    } catch (error) {
      console.error('Failed to advance season:', error);
      throw new Error('Season advance failed');
    }
  }

  /**
   * Check if league is properly initialized
   * @returns Promise that resolves to boolean indicating if league is ready
   */
  public async isLeagueReady(): Promise<boolean> {
    try {
      const teams = await teamService.getAllTeams();
      const players = await playerService.getAllPlayers();

      // Check if we have the expected number of teams and players
      const expectedTeams = 30;
      const expectedPlayers = 30 * 15; // 15 players per team

      return teams.length === expectedTeams && players.length === expectedPlayers;
    } catch (error) {
      console.error('Failed to check league readiness:', error);
      return false;
    }
  }

  /**
   * Delete all league data from database
   * @returns Promise that resolves when deletion is complete
   */
  public async deleteLeague(): Promise<void> {
    try {
      console.log('🗑️ Deleting league data...');

      // Delete in reverse order of foreign key dependencies
      await dbService.run('DELETE FROM games');
      await dbService.run('DELETE FROM season_calendar');
      await dbService.run('DELETE FROM players');
      await dbService.run('DELETE FROM teams');

      console.log('✅ League data deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete league:', error);
      throw new Error('Failed to delete league');
    }
  }

  /**
   * Get league export data for backup
   * @returns Promise that resolves to league export data
   */
  public async exportLeague(): Promise<any> {
    try {
      const teams = await teamService.getAllTeams();
      const players = await playerService.getAllPlayers();
      const state = await this.getLeagueState();
      const season = await this.getCurrentSeason();

      return {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        league: {
          state,
          season,
          teams,
          players,
        },
      };
    } catch (error) {
      console.error('Failed to export league:', error);
      throw new Error('League export failed');
    }
  }
}

/**
 * Export singleton instance for easy access
 */
export const leagueService = LeagueService.getInstance();
