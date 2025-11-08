/**
 * Game Service
 *
 * Handles retrieval and management of completed games from the database
 */

import { dbService } from '../database/db-service';
import { teamService } from './team-service';
import { playerService } from './player-service';
import { convertDatabaseTeamToGameTeam } from '../types/game-simulation';
import type { GameSimulationResult, GameSimulationTeam, PlayerGameStats } from '../types/game-simulation';
import type { Team, Player } from '../types/database';

export class GameService {
  private static instance: GameService;

  public static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  /**
   * Get a completed game result by game ID
   * @param gameId Game ID to retrieve
   * @returns Promise that resolves to game simulation result or null if not found
   */
  public async getGameResult(gameId: number): Promise<GameSimulationResult | null> {
    try {
      // Query the games table for the specific game
      const sql = `
        SELECT g.*, 
               ht.city as home_city, ht.name as home_name, ht.abbreviation as home_abbreviation,
               at.city as away_city, at.name as away_name, at.abbreviation as away_abbreviation
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.team_id
        JOIN teams at ON g.away_team_id = at.team_id
        WHERE g.game_id = ? AND g.completed = 1
      `;

      const results = dbService.exec(sql, [gameId]);

      if (results.length === 0) {
        return null;
      }

      const game = results[0];

      // Parse the box score JSON
      let boxScore;
      try {
        boxScore = JSON.parse(game.box_score);
      } catch (error) {
        console.error('Failed to parse box score JSON:', error);
        return null;
      }

      // Get team data
      const homeTeam = await teamService.getTeam(game.home_team_id);
      const awayTeam = await teamService.getTeam(game.away_team_id);

      if (!homeTeam || !awayTeam) {
        console.error('Could not find team data for game');
        return null;
      }

      // Get player data for both teams
      const homePlayers = await playerService.getPlayersByTeam(game.home_team_id);
      const awayPlayers = await playerService.getPlayersByTeam(game.away_team_id);

      // Convert to GameSimulationTeam format
      const homeGameTeam = convertDatabaseTeamToGameTeam(homeTeam, homePlayers);
      const awayGameTeam = convertDatabaseTeamToGameTeam(awayTeam, awayPlayers);

      // Convert box score player stats to PlayerGameStats format
      const homePlayerStats: PlayerGameStats[] = boxScore.home_team.players.map((player: any) => ({
        id: player.id.toString(),
        name: player.name,
        position: player.position as 'PG' | 'SG' | 'SF' | 'PF' | 'C',
        teamId: homeTeam.team_id.toString(),
        is_starter: 0, // Not stored in box score
        attributes: {
          shooting: 0,
          defense: 0,
          rebounding: 0,
          passing: 0,
          athleticism: 0,
        },
        overall: 0, // Not stored in box score
        descriptor: `${player.position} - 0 OVR`,
        // Individual attributes (not stored in box score)
        speed: 0,
        ball_iq: 0,
        inside_shot: 0,
        three_point_shot: 0,
        pass: 0,
        skill_move: 0,
        on_ball_defense: 0,
        stamina: 0,
        block: 0,
        steal: 0,
        offensive_rebound: 0,
        defensive_rebound: 0,
        // Game stats from box score
        points: player.points || 0,
        rebounds: player.rebounds || 0,
        assists: player.assists || 0,
        steals: player.steals || 0,
        blocks: player.blocks || 0,
        fieldGoalsMade: player.fg_made || 0,
        fieldGoalsAttempted: player.fg_attempted || 0,
        threePointersMade: player.three_made || 0,
        threePointersAttempted: player.three_attempted || 0,
        turnovers: player.turnovers || 0,
        fouls: 0, // Not tracked in current system
        offensiveRebound: 0, // Not tracked separately
        defensiveRebound: 0, // Not tracked separately
        minutes: player.minutes || 0,
      }));

      const awayPlayerStats: PlayerGameStats[] = boxScore.away_team.players.map((player: any) => ({
        id: player.id.toString(),
        name: player.name,
        position: player.position as 'PG' | 'SG' | 'SF' | 'PF' | 'C',
        teamId: awayTeam.team_id.toString(),
        is_starter: 0, // Not stored in box score
        attributes: {
          shooting: 0,
          defense: 0,
          rebounding: 0,
          passing: 0,
          athleticism: 0,
        },
        overall: 0, // Not stored in box score
        descriptor: `${player.position} - 0 OVR`,
        // Individual attributes (not stored in box score)
        speed: 0,
        ball_iq: 0,
        inside_shot: 0,
        three_point_shot: 0,
        pass: 0,
        skill_move: 0,
        on_ball_defense: 0,
        stamina: 0,
        block: 0,
        steal: 0,
        offensive_rebound: 0,
        defensive_rebound: 0,
        // Game stats from box score
        points: player.points || 0,
        rebounds: player.rebounds || 0,
        assists: player.assists || 0,
        steals: player.steals || 0,
        blocks: player.blocks || 0,
        fieldGoalsMade: player.fg_made || 0,
        fieldGoalsAttempted: player.fg_attempted || 0,
        threePointersMade: player.three_made || 0,
        threePointersAttempted: player.three_attempted || 0,
        turnovers: player.turnovers || 0,
        fouls: 0, // Not tracked in current system
        offensiveRebound: 0, // Not tracked separately
        defensiveRebound: 0, // Not tracked separately
        minutes: player.minutes || 0,
      }));

      // Calculate MVP (player with highest impact score from winning team)
      const winningTeamStats = game.home_score > game.away_score ? homePlayerStats : awayPlayerStats;
      const mvp = winningTeamStats.reduce((best, player) => {
        const playerScore = player.points + player.rebounds * 0.5 + player.assists * 0.7;
        const bestScore = best.points + best.rebounds * 0.5 + best.assists * 0.7;
        return playerScore > bestScore ? player : best;
      });

      return {
        homeTeam: homeGameTeam,
        awayTeam: awayGameTeam,
        homeScore: game.home_score,
        awayScore: game.away_score,
        events: [], // Events not stored in database
        winner: game.home_score > game.away_score ? homeTeam.name : awayTeam.name,
        homePlayerStats,
        awayPlayerStats,
        mvp,
      };
    } catch (error) {
      console.error('Failed to get game result:', error);
      throw new Error('Failed to get game result');
    }
  }

  /**
   * Get game ID by team matchup
   * @param homeTeamId Home team ID
   * @param awayTeamId Away team ID
   * @returns Promise that resolves to game ID or null if not found
   */
  public async getGameIdByMatchup(homeTeamId: number, awayTeamId: number): Promise<number | null> {
    try {
      const sql = `
        SELECT game_id FROM games 
        WHERE home_team_id = ? AND away_team_id = ? AND completed = 1
        ORDER BY game_id DESC
        LIMIT 1
      `;

      const results = dbService.exec(sql, [homeTeamId, awayTeamId]);

      if (results.length === 0) {
        return null;
      }

      return results[0].game_id;
    } catch (error) {
      console.error('Failed to get game ID by matchup:', error);
      throw new Error('Failed to get game ID by matchup');
    }
  }

  /**
   * Check if a game has been completed
   * @param homeTeamId Home team ID
   * @param awayTeamId Away team ID
   * @returns Promise that resolves to true if game is completed
   */
  public async isGameCompleted(homeTeamId: number, awayTeamId: number): Promise<boolean> {
    const gameId = await this.getGameIdByMatchup(homeTeamId, awayTeamId);
    return gameId !== null;
  }
}

/**
 * Export singleton instance for easy access
 */
export const gameService = GameService.getInstance();
