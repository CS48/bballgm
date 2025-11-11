'use client';

/**
 * Player Service - CRUD operations for players
 *
 * This service handles all database operations related to players,
 * including creating, reading, updating, and deleting player records.
 * It also provides utility functions for player statistics and roster management.
 */

import { dbService } from '../database/db-service';
import { Player, PlayerSeasonStats, PlayerCareerStats, PlayerAttributes, DraftInfo } from '../types/database';

/**
 * PlayerService class that provides all player-related database operations
 */
export class PlayerService {
  private static instance: PlayerService;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of PlayerService
   * @returns PlayerService instance
   */
  public static getInstance(): PlayerService {
    if (!PlayerService.instance) {
      PlayerService.instance = new PlayerService();
    }
    return PlayerService.instance;
  }

  /**
   * Create a new player in the database
   * @param playerData Player data to insert
   * @returns Promise that resolves to the created player ID
   */
  public async createPlayer(playerData: Omit<Player, 'player_id'>): Promise<number> {
    try {
      const sql = `
        INSERT INTO players (
          team_id, first_name, last_name, age, position, is_starter, height, weight, years_pro,
          draft_info, speed, ball_iq, inside_shot, three_point_shot, pass, skill_move,
          on_ball_defense, stamina, block, steal, offensive_rebound, defensive_rebound,
          current_season_stats, historical_stats, career_stats
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        playerData.team_id,
        playerData.first_name,
        playerData.last_name,
        playerData.age,
        playerData.position,
        playerData.is_starter,
        playerData.height,
        playerData.weight,
        playerData.years_pro,
        playerData.draft_info,
        playerData.speed,
        playerData.ball_iq,
        playerData.inside_shot,
        playerData.three_point_shot,
        playerData.pass,
        playerData.skill_move,
        playerData.on_ball_defense,
        playerData.stamina,
        playerData.block,
        playerData.steal,
        playerData.offensive_rebound,
        playerData.defensive_rebound,
        playerData.current_season_stats,
        playerData.historical_stats,
        playerData.career_stats,
      ];

      const result = dbService.run(sql, params);
      return result.lastInsertRowid;
    } catch (error) {
      console.error('Failed to create player:', error);
      throw new Error('Failed to create player');
    }
  }

  /**
   * Get a player by their ID
   * @param playerId Player ID to fetch
   * @returns Promise that resolves to the player data or null if not found
   */
  public async getPlayer(playerId: number): Promise<Player | null> {
    try {
      const sql = 'SELECT * FROM players WHERE player_id = ?';
      const results = dbService.exec(sql, [playerId]);

      if (results.length === 0) {
        return null;
      }

      return results[0] as Player;
    } catch (error) {
      console.error('Failed to get player:', error);
      throw new Error('Failed to get player');
    }
  }

  /**
   * Get all players for a specific team
   * @param teamId Team ID to get players for
   * @returns Promise that resolves to array of players
   */
  public async getPlayersByTeam(teamId: number): Promise<Player[]> {
    try {
      const sql = 'SELECT * FROM players WHERE team_id = ? ORDER BY position, last_name';
      const results = dbService.exec(sql, [teamId]);
      return results as Player[];
    } catch (error) {
      console.error('Failed to get players by team:', error);
      throw new Error('Failed to get players by team');
    }
  }

  /**
   * Get all players in the league
   * @returns Promise that resolves to array of all players
   */
  public async getAllPlayers(): Promise<Player[]> {
    try {
      const sql = 'SELECT * FROM players ORDER BY team_id, position, last_name';
      const results = dbService.exec(sql);
      return results as Player[];
    } catch (error) {
      console.error('Failed to get all players:', error);
      throw new Error('Failed to get all players');
    }
  }

  /**
   * Get players by position
   * @param position Player position to filter by
   * @returns Promise that resolves to array of players at that position
   */
  public async getPlayersByPosition(position: string): Promise<Player[]> {
    try {
      const sql = 'SELECT * FROM players WHERE position = ? ORDER BY team_id, last_name';
      const results = dbService.exec(sql, [position]);
      return results as Player[];
    } catch (error) {
      console.error('Failed to get players by position:', error);
      throw new Error('Failed to get players by position');
    }
  }

  /**
   * Update a player's basic information
   * @param playerId Player ID to update
   * @param updateData Data to update
   * @returns Promise that resolves when update is complete
   */
  public async updatePlayer(playerId: number, updateData: Partial<Player>): Promise<void> {
    try {
      const fields = Object.keys(updateData).filter((key) => key !== 'player_id');
      const values = fields.map((field) => updateData[field as keyof Player]);
      const setClause = fields.map((field) => `${field} = ?`).join(', ');

      const sql = `UPDATE players SET ${setClause} WHERE player_id = ?`;
      const params = [...values, playerId];

      dbService.run(sql, params);
    } catch (error) {
      console.error('Failed to update player:', error);
      throw new Error('Failed to update player');
    }
  }

  /**
   * Update a player's current season statistics
   * @param playerId Player ID to update
   * @param stats New season statistics
   * @returns Promise that resolves when update is complete
   */
  public async updatePlayerStats(playerId: number, stats: PlayerSeasonStats): Promise<void> {
    try {
      const statsJson = JSON.stringify(stats);
      const sql = 'UPDATE players SET current_season_stats = ? WHERE player_id = ?';
      dbService.run(sql, [statsJson, playerId]);
    } catch (error) {
      console.error('Failed to update player stats:', error);
      throw new Error('Failed to update player stats');
    }
  }

  /**
   * Add a new season to a player's historical stats
   * @param playerId Player ID to update
   * @param seasonStats Stats for the new season
   * @returns Promise that resolves when update is complete
   */
  public async addHistoricalSeason(playerId: number, seasonStats: PlayerSeasonStats): Promise<void> {
    try {
      // Get current historical stats
      const player = await this.getPlayer(playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      let historicalStats: PlayerSeasonStats[] = [];
      if (player.historical_stats) {
        historicalStats = JSON.parse(player.historical_stats);
      }

      // Add new season
      historicalStats.push(seasonStats);

      // Update database
      const sql = 'UPDATE players SET historical_stats = ? WHERE player_id = ?';
      dbService.run(sql, [JSON.stringify(historicalStats), playerId]);

      // Recalculate career stats
      await this.calculateCareerStats(playerId);
    } catch (error) {
      console.error('Failed to add historical season:', error);
      throw new Error('Failed to add historical season');
    }
  }

  /**
   * Calculate and update a player's career statistics
   * @param playerId Player ID to calculate stats for
   * @returns Promise that resolves when calculation is complete
   */
  public async calculateCareerStats(playerId: number): Promise<void> {
    try {
      const player = await this.getPlayer(playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      let historicalStats: PlayerSeasonStats[] = [];
      if (player.historical_stats) {
        historicalStats = JSON.parse(player.historical_stats);
      }

      if (historicalStats.length === 0) {
        return;
      }

      // Calculate career totals
      const careerStats: PlayerCareerStats = {
        seasons: historicalStats.length,
        games: historicalStats.reduce((sum, season) => sum + season.games, 0),
        minutes: historicalStats.reduce((sum, season) => sum + season.minutes, 0),
        points: historicalStats.reduce((sum, season) => sum + season.points, 0),
        rebounds: historicalStats.reduce((sum, season) => sum + season.rebounds, 0),
        assists: historicalStats.reduce((sum, season) => sum + season.assists, 0),
        steals: historicalStats.reduce((sum, season) => sum + season.steals, 0),
        blocks: historicalStats.reduce((sum, season) => sum + season.blocks, 0),
        turnovers: historicalStats.reduce((sum, season) => sum + season.turnovers, 0),
        fg_made: historicalStats.reduce((sum, season) => sum + season.fg_made, 0),
        fg_attempted: historicalStats.reduce((sum, season) => sum + season.fg_attempted, 0),
        three_made: historicalStats.reduce((sum, season) => sum + season.three_made, 0),
        three_attempted: historicalStats.reduce((sum, season) => sum + season.three_attempted, 0),
        ft_made: historicalStats.reduce((sum, season) => sum + season.ft_made, 0),
        ft_attempted: historicalStats.reduce((sum, season) => sum + season.ft_attempted, 0),
        oreb: historicalStats.reduce((sum, season) => sum + (season.oreb || 0), 0),
        dreb: historicalStats.reduce((sum, season) => sum + (season.dreb || 0), 0),
        pf: historicalStats.reduce((sum, season) => sum + (season.pf || 0), 0),
      };

      // Calculate averages
      careerStats.ppg = careerStats.games > 0 ? careerStats.points / careerStats.games : 0;
      careerStats.rpg = careerStats.games > 0 ? careerStats.rebounds / careerStats.games : 0;
      careerStats.apg = careerStats.games > 0 ? careerStats.assists / careerStats.games : 0;
      careerStats.spg = careerStats.games > 0 ? careerStats.steals / careerStats.games : 0;
      careerStats.bpg = careerStats.games > 0 ? careerStats.blocks / careerStats.games : 0;
      careerStats.tpg = careerStats.games > 0 ? careerStats.turnovers / careerStats.games : 0;
      careerStats.fg_pct = careerStats.fg_attempted > 0 ? careerStats.fg_made / careerStats.fg_attempted : 0;
      careerStats.three_pct =
        careerStats.three_attempted > 0 ? careerStats.three_made / careerStats.three_attempted : 0;
      careerStats.ft_pct = careerStats.ft_attempted > 0 ? careerStats.ft_made / careerStats.ft_attempted : 0;

      // Update database
      const sql = 'UPDATE players SET career_stats = ? WHERE player_id = ?';
      dbService.run(sql, [JSON.stringify(careerStats), playerId]);
    } catch (error) {
      console.error('Failed to calculate career stats:', error);
      throw new Error('Failed to calculate career stats');
    }
  }

  /**
   * Get a player's current season statistics
   * @param playerId Player ID to get stats for
   * @returns Promise that resolves to season stats or null if not found
   */
  public async getPlayerSeasonStats(playerId: number): Promise<PlayerSeasonStats | null> {
    try {
      const player = await this.getPlayer(playerId);
      if (!player || !player.current_season_stats) {
        return null;
      }
      return JSON.parse(player.current_season_stats);
    } catch (error) {
      console.error('Failed to get player season stats:', error);
      throw new Error('Failed to get player season stats');
    }
  }

  /**
   * Get a player's career statistics
   * @param playerId Player ID to get stats for
   * @returns Promise that resolves to career stats or null if not found
   */
  public async getPlayerCareerStats(playerId: number): Promise<PlayerCareerStats | null> {
    try {
      const player = await this.getPlayer(playerId);
      if (!player || !player.career_stats) {
        return null;
      }
      return JSON.parse(player.career_stats);
    } catch (error) {
      console.error('Failed to get player career stats:', error);
      throw new Error('Failed to get player career stats');
    }
  }

  /**
   * Get a player's historical season statistics
   * @param playerId Player ID to get stats for
   * @returns Promise that resolves to array of historical season stats
   */
  public async getPlayerHistoricalStats(playerId: number): Promise<PlayerSeasonStats[]> {
    try {
      const player = await this.getPlayer(playerId);
      if (!player || !player.historical_stats) {
        return [];
      }
      return JSON.parse(player.historical_stats);
    } catch (error) {
      console.error('Failed to get player historical stats:', error);
      throw new Error('Failed to get player historical stats');
    }
  }

  /**
   * Calculate a player's overall rating based on their attributes
   * @param player Player to calculate rating for
   * @returns Overall rating (50-99, never 100)
   */
  public calculateOverallRating(player: Player): number {
    const weights = {
      speed: 1.0,
      ball_iq: 1.2,
      inside_shot: 1.0,
      three_point_shot: 1.0,
      pass: 0.8,
      skill_move: 0.8,
      on_ball_defense: 1.0,
      stamina: 0.6,
      block: 0.8,
      steal: 0.8,
      offensive_rebound: 0.7,
      defensive_rebound: 0.9,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    Object.keys(weights).forEach((attr) => {
      const value = player[attr as keyof Player] as number;
      const weight = weights[attr as keyof typeof weights];
      weightedSum += value * weight;
      totalWeight += weight;
    });

    const rawOverall = weightedSum / totalWeight;

    // No random variation here - this is for display/calculation of existing players
    // Random variation only happens during generation
    const finalOverall = Math.round(rawOverall);

    // Clamp to 50-99 range (100 is impossible)
    return Math.max(50, Math.min(99, finalOverall));
  }

  /**
   * Delete a player from the database
   * @param playerId Player ID to delete
   * @returns Promise that resolves when deletion is complete
   */
  public async deletePlayer(playerId: number): Promise<void> {
    try {
      const sql = 'DELETE FROM players WHERE player_id = ?';
      dbService.run(sql, [playerId]);
    } catch (error) {
      console.error('Failed to delete player:', error);
      throw new Error('Failed to delete player');
    }
  }

  /**
   * Get players with the highest stats in a specific category
   * @param statCategory Stat category to sort by
   * @param limit Number of players to return
   * @returns Promise that resolves to array of players with stats
   */
  public async getTopPlayersByStat(statCategory: string, limit: number = 10): Promise<any[]> {
    try {
      // This would require parsing JSON stats, which is complex in SQL
      // For now, return a placeholder implementation
      const sql = 'SELECT * FROM players LIMIT ?';
      const results = dbService.exec(sql, [limit]);
      return results;
    } catch (error) {
      console.error('Failed to get top players by stat:', error);
      throw new Error('Failed to get top players by stat');
    }
  }
}

/**
 * Export singleton instance for easy access
 */
export const playerService = PlayerService.getInstance();
