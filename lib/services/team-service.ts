"use client"

/**
 * Team Service - CRUD operations for teams
 * 
 * This service handles all database operations related to teams,
 * including creating, reading, updating, and deleting team records.
 * It also provides utility functions for team statistics and standings.
 */

import { dbService } from '../database/db-service';
import { Team, TeamSeasonStats, TeamHistoricalRecord, GameScheduleEntry, Conference } from '../types/database';

/**
 * TeamService class that provides all team-related database operations
 */
export class TeamService {
  private static instance: TeamService;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of TeamService
   * @returns TeamService instance
   */
  public static getInstance(): TeamService {
    if (!TeamService.instance) {
      TeamService.instance = new TeamService();
    }
    return TeamService.instance;
  }

  /**
   * Create a new team in the database
   * @param teamData Team data to insert
   * @returns Promise that resolves to the created team ID
   */
  public async createTeam(teamData: Omit<Team, 'team_id'>): Promise<number> {
    try {
      const sql = `
        INSERT INTO teams (
          city, name, conference, wins, losses, 
          current_season_stats, historical_records, schedule
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        teamData.city,
        teamData.name,
        teamData.conference,
        teamData.wins,
        teamData.losses,
        teamData.current_season_stats,
        teamData.historical_records,
        teamData.schedule
      ];

      const result = dbService.run(sql, params);
      return result.lastInsertRowid;
    } catch (error) {
      console.error('Failed to create team:', error);
      throw new Error('Failed to create team');
    }
  }

  /**
   * Get a team by their ID
   * @param teamId Team ID to fetch
   * @returns Promise that resolves to the team data or null if not found
   */
  public async getTeam(teamId: number): Promise<Team | null> {
    try {
      const sql = 'SELECT * FROM teams WHERE team_id = ?';
      const results = dbService.exec(sql, [teamId]);
      
      if (results.length === 0) {
        return null;
      }
      
      return results[0] as Team;
    } catch (error) {
      console.error('Failed to get team:', error);
      throw new Error('Failed to get team');
    }
  }

  /**
   * Get all teams in the league
   * @returns Promise that resolves to array of all teams
   */
  public async getAllTeams(): Promise<Team[]> {
    try {
      const sql = 'SELECT * FROM teams ORDER BY conference, city';
      const results = dbService.exec(sql);
      console.log(`Retrieved ${results.length} teams from database`);
      console.log('First few teams:', results.slice(0, 3).map(t => ({ city: t.city, name: t.name, conference: t.conference })));
      return results as Team[];
    } catch (error) {
      console.error('Failed to get all teams:', error);
      throw new Error('Failed to get all teams');
    }
  }

  /**
   * Get teams by conference
   * @param conference Conference to filter by
   * @returns Promise that resolves to array of teams in that conference
   */
  public async getTeamsByConference(conference: Conference): Promise<Team[]> {
    try {
      const sql = 'SELECT * FROM teams WHERE conference = ? ORDER BY wins DESC, losses ASC';
      const results = dbService.exec(sql, [conference]);
      return results as Team[];
    } catch (error) {
      console.error('Failed to get teams by conference:', error);
      throw new Error('Failed to get teams by conference');
    }
  }

  /**
   * Update a team's basic information
   * @param teamId Team ID to update
   * @param updateData Data to update
   * @returns Promise that resolves when update is complete
   */
  public async updateTeam(teamId: number, updateData: Partial<Team>): Promise<void> {
    try {
      const fields = Object.keys(updateData).filter(key => key !== 'team_id');
      const values = fields.map(field => updateData[field as keyof Team]);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      const sql = `UPDATE teams SET ${setClause} WHERE team_id = ?`;
      const params = [...values, teamId];
      
      dbService.run(sql, params);
    } catch (error) {
      console.error('Failed to update team:', error);
      throw new Error('Failed to update team');
    }
  }

  /**
   * Update a team's record (wins/losses)
   * @param teamId Team ID to update
   * @param result Game result ('win' or 'loss')
   * @returns Promise that resolves when update is complete
   */
  public async updateTeamRecord(teamId: number, result: 'win' | 'loss'): Promise<void> {
    try {
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      const newWins = result === 'win' ? team.wins + 1 : team.wins;
      const newLosses = result === 'loss' ? team.losses + 1 : team.losses;

      const sql = 'UPDATE teams SET wins = ?, losses = ? WHERE team_id = ?';
      dbService.run(sql, [newWins, newLosses, teamId]);
    } catch (error) {
      console.error('Failed to update team record:', error);
      throw new Error('Failed to update team record');
    }
  }

  /**
   * Update a team's current season statistics
   * @param teamId Team ID to update
   * @param stats New season statistics
   * @returns Promise that resolves when update is complete
   */
  public async updateTeamStats(teamId: number, stats: TeamSeasonStats): Promise<void> {
    try {
      const statsJson = JSON.stringify(stats);
      const sql = 'UPDATE teams SET current_season_stats = ? WHERE team_id = ?';
      dbService.run(sql, [statsJson, teamId]);
    } catch (error) {
      console.error('Failed to update team stats:', error);
      throw new Error('Failed to update team stats');
    }
  }

  /**
   * Add a new season to a team's historical records
   * @param teamId Team ID to update
   * @param seasonRecord Record for the new season
   * @returns Promise that resolves when update is complete
   */
  public async addHistoricalSeason(teamId: number, seasonRecord: TeamHistoricalRecord): Promise<void> {
    try {
      // Get current historical records
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      let historicalRecords: TeamHistoricalRecord[] = [];
      if (team.historical_records) {
        historicalRecords = JSON.parse(team.historical_records);
      }

      // Add new season
      historicalRecords.push(seasonRecord);

      // Update database
      const sql = 'UPDATE teams SET historical_records = ? WHERE team_id = ?';
      dbService.run(sql, [JSON.stringify(historicalRecords), teamId]);
    } catch (error) {
      console.error('Failed to add historical season:', error);
      throw new Error('Failed to add historical season');
    }
  }

  /**
   * Get a team's current season statistics
   * @param teamId Team ID to get stats for
   * @returns Promise that resolves to season stats or null if not found
   */
  public async getTeamSeasonStats(teamId: number): Promise<TeamSeasonStats | null> {
    try {
      const team = await this.getTeam(teamId);
      if (!team || !team.current_season_stats) {
        return null;
      }
      return JSON.parse(team.current_season_stats);
    } catch (error) {
      console.error('Failed to get team season stats:', error);
      throw new Error('Failed to get team season stats');
    }
  }

  /**
   * Get a team's historical records
   * @param teamId Team ID to get records for
   * @returns Promise that resolves to array of historical records
   */
  public async getTeamHistoricalRecords(teamId: number): Promise<TeamHistoricalRecord[]> {
    try {
      const team = await this.getTeam(teamId);
      if (!team || !team.historical_records) {
        return [];
      }
      return JSON.parse(team.historical_records);
    } catch (error) {
      console.error('Failed to get team historical records:', error);
      throw new Error('Failed to get team historical records');
    }
  }

  /**
   * Get a team's schedule
   * @param teamId Team ID to get schedule for
   * @returns Promise that resolves to array of schedule entries
   */
  public async getTeamSchedule(teamId: number): Promise<GameScheduleEntry[]> {
    try {
      const team = await this.getTeam(teamId);
      if (!team || !team.schedule) {
        return [];
      }
      return JSON.parse(team.schedule);
    } catch (error) {
      console.error('Failed to get team schedule:', error);
      throw new Error('Failed to get team schedule');
    }
  }

  /**
   * Update a team's schedule
   * @param teamId Team ID to update schedule for
   * @param schedule New schedule array
   * @returns Promise that resolves when update is complete
   */
  public async updateTeamSchedule(teamId: number, schedule: GameScheduleEntry[]): Promise<void> {
    try {
      console.log(`Updating team schedule for team ${teamId} with ${schedule.length} games`);
      const scheduleJson = JSON.stringify(schedule);
      const sql = 'UPDATE teams SET schedule = ? WHERE team_id = ?';
      dbService.run(sql, [scheduleJson, teamId]);
      console.log(`Successfully updated schedule for team ${teamId}`);
    } catch (error) {
      console.error('Failed to update team schedule:', error);
      throw new Error('Failed to update team schedule');
    }
  }

  /**
   * Get league standings for a specific conference
   * @param conference Conference to get standings for (null for overall)
   * @returns Promise that resolves to array of standings entries
   */
  public async getStandings(conference?: Conference | null): Promise<any[]> {
    try {
      let sql: string;
      let params: any[] = [];

      if (conference) {
        sql = `
          SELECT team_id, city, name, conference, wins, losses,
                 (wins + losses) as games,
                 CASE 
                   WHEN (wins + losses) > 0 THEN ROUND(wins * 100.0 / (wins + losses), 1)
                   ELSE 0 
                 END as win_pct
          FROM teams 
          WHERE conference = ?
          ORDER BY wins DESC, losses ASC, city ASC
        `;
        params = [conference];
      } else {
        sql = `
          SELECT team_id, city, name, conference, wins, losses,
                 (wins + losses) as games,
                 CASE 
                   WHEN (wins + losses) > 0 THEN ROUND(wins * 100.0 / (wins + losses), 1)
                   ELSE 0 
                 END as win_pct
          FROM teams 
          ORDER BY wins DESC, losses ASC, conference ASC, city ASC
        `;
      }

      const results = dbService.exec(sql, params);
      return results;
    } catch (error) {
      console.error('Failed to get standings:', error);
      throw new Error('Failed to get standings');
    }
  }

  /**
   * Get teams with the best records
   * @param limit Number of teams to return
   * @returns Promise that resolves to array of top teams
   */
  public async getTopTeams(limit: number = 10): Promise<any[]> {
    try {
      const sql = `
        SELECT team_id, city, name, conference, wins, losses,
               (wins + losses) as games,
               CASE 
                 WHEN (wins + losses) > 0 THEN ROUND(wins * 100.0 / (wins + losses), 1)
                 ELSE 0 
               END as win_pct
        FROM teams 
        ORDER BY wins DESC, losses ASC
        LIMIT ?
      `;
      const results = dbService.exec(sql, [limit]);
      return results;
    } catch (error) {
      console.error('Failed to get top teams:', error);
      throw new Error('Failed to get top teams');
    }
  }

  /**
   * Calculate a team's win percentage
   * @param wins Number of wins
   * @param losses Number of losses
   * @returns Win percentage (0-100)
   */
  public calculateWinPercentage(wins: number, losses: number): number {
    const totalGames = wins + losses;
    if (totalGames === 0) {
      return 0;
    }
    return Math.round((wins / totalGames) * 100 * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Get teams with the most wins in a season
   * @param season Season year to check
   * @param limit Number of teams to return
   * @returns Promise that resolves to array of teams
   */
  public async getTeamsByWins(season: number, limit: number = 10): Promise<any[]> {
    try {
      // This would require parsing historical records JSON
      // For now, return current season data
      const sql = `
        SELECT team_id, city, name, conference, wins, losses
        FROM teams 
        ORDER BY wins DESC, losses ASC
        LIMIT ?
      `;
      const results = dbService.exec(sql, [limit]);
      return results;
    } catch (error) {
      console.error('Failed to get teams by wins:', error);
      throw new Error('Failed to get teams by wins');
    }
  }

  /**
   * Get upcoming games for a team
   * @param teamId Team ID to get games for
   * @param limit Number of games to return
   * @returns Promise that resolves to array of upcoming games
   */
  public async getUpcomingGames(teamId: number, limit: number = 5): Promise<GameScheduleEntry[]> {
    try {
      const schedule = await this.getTeamSchedule(teamId);
      const upcomingGames = schedule
        .filter(game => !game.completed)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, limit);
      
      return upcomingGames;
    } catch (error) {
      console.error('Failed to get upcoming games:', error);
      throw new Error('Failed to get upcoming games');
    }
  }

  /**
   * Get recent games for a team
   * @param teamId Team ID to get games for
   * @param limit Number of games to return
   * @returns Promise that resolves to array of recent games
   */
  public async getRecentGames(teamId: number, limit: number = 5): Promise<GameScheduleEntry[]> {
    try {
      const schedule = await this.getTeamSchedule(teamId);
      const recentGames = schedule
        .filter(game => game.completed)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
      
      return recentGames;
    } catch (error) {
      console.error('Failed to get recent games:', error);
      throw new Error('Failed to get recent games');
    }
  }

  /**
   * Delete a team from the database
   * @param teamId Team ID to delete
   * @returns Promise that resolves when deletion is complete
   */
  public async deleteTeam(teamId: number): Promise<void> {
    try {
      const sql = 'DELETE FROM teams WHERE team_id = ?';
      dbService.run(sql, [teamId]);
    } catch (error) {
      console.error('Failed to delete team:', error);
      throw new Error('Failed to delete team');
    }
  }

  /**
   * Get team statistics summary
   * @param teamId Team ID to get summary for
   * @returns Promise that resolves to team summary object
   */
  public async getTeamSummary(teamId: number): Promise<any> {
    try {
      const team = await this.getTeam(teamId);
      if (!team) {
        return null;
      }

      const seasonStats = await this.getTeamSeasonStats(teamId);
      const schedule = await this.getTeamSchedule(teamId);
      const upcomingGames = await this.getUpcomingGames(teamId, 3);
      const recentGames = await this.getRecentGames(teamId, 3);

      return {
        team,
        seasonStats,
        schedule: {
          total: schedule.length,
          completed: schedule.filter(g => g.completed).length,
          remaining: schedule.filter(g => !g.completed).length
        },
        upcomingGames,
        recentGames,
        winPercentage: this.calculateWinPercentage(team.wins, team.losses)
      };
    } catch (error) {
      console.error('Failed to get team summary:', error);
      throw new Error('Failed to get team summary');
    }
  }
}

/**
 * Export singleton instance for easy access
 */
export const teamService = TeamService.getInstance();
