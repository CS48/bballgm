"use client"

/**
 * Calendar Service - Season calendar management
 * 
 * This service handles the in-game calendar system, including game day tracking,
 * season progression, and calendar navigation for the basketball simulation.
 */

import { dbService } from '../database/db-service';
import { dateGenerator } from '../utils/date-generator';
import { GameDay, SeasonCalendar, TeamSeasonProgress, GameDayResults, SeasonProgress } from '../types/calendar';
import { GameScheduleEntry } from '../types/database';

/**
 * CalendarService class that manages the season calendar
 */
export class CalendarService {
  private static instance: CalendarService;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of CalendarService
   * @returns CalendarService instance
   */
  public static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService();
    }
    return CalendarService.instance;
  }

  /**
   * Generate full season calendar (150 days)
   * @param season Season year
   * @returns Array of game days with display dates
   */
  public generateSeasonCalendar(season: number): GameDay[] {
    try {
      const calendarData = dateGenerator.generateSeasonCalendar();
      
      const mappedData = calendarData.map(day => ({
        game_day: day.game_day,
        date_display: day.display, // Fix: use 'display' instead of 'date_display'
        month: day.month,
        day: day.day,
        games: [] // Will be populated when games are scheduled
      }));
      
      return mappedData;
    } catch (error) {
      console.error('Failed to generate season calendar:', error);
      throw new Error('Failed to generate season calendar');
    }
  }

  /**
   * Get current game day information
   * @param season Season year
   * @returns Current game day or null if not found
   */
  public async getCurrentGameDay(season: number): Promise<GameDay | null> {
    try {
      // Use a simpler query without subquery to avoid SQL.js issues
      const sql = `
        SELECT game_day, date_display, games_scheduled 
        FROM season_calendar 
        WHERE season = ? AND games_scheduled > 0
        ORDER BY game_day ASC
        LIMIT 1
      `;
      
      const results = dbService.exec(sql, [season]);
      
      if (results.length === 0) {
        return null;
      }
      
      const currentDay = results[0];
      const games = await this.getGamesByDay(season, currentDay.game_day);
      
      return {
        game_day: currentDay.game_day,
        date_display: currentDay.date_display,
        month: dateGenerator.getMonthForGameDay(currentDay.game_day),
        day: parseInt(currentDay.date_display.split(' ')[1]),
        games: games
      };
    } catch (error) {
      console.error('Failed to get current game day:', error);
      throw new Error('Failed to get current game day');
    }
  }

  /**
   * Get next game day with scheduled games
   * @param season Season year
   * @param currentDay Current game day
   * @returns Next game day or null if none
   */
  public async getNextGameDay(season: number, currentDay: number): Promise<GameDay | null> {
    try {
      const sql = `
        SELECT game_day, date_display, games_scheduled 
        FROM season_calendar 
        WHERE season = ? AND game_day > ? AND games_scheduled > 0
        ORDER BY game_day ASC 
        LIMIT 1
      `;
      
      const results = dbService.exec(sql, [season, currentDay]);
      
      if (results.length === 0) {
        return null;
      }
      
      const nextDay = results[0];
      const games = await this.getGamesByDay(season, nextDay.game_day);
      
      return {
        game_day: nextDay.game_day,
        date_display: nextDay.date_display,
        month: dateGenerator.getMonthForGameDay(nextDay.game_day),
        day: parseInt(nextDay.date_display.split(' ')[1]),
        games: games
      };
    } catch (error) {
      console.error('Failed to get next game day:', error);
      throw new Error('Failed to get next game day');
    }
  }

  /**
   * Get all games scheduled for a specific day
   * @param season Season year
   * @param gameDay Game day number
   * @returns Array of games scheduled for that day
   */
  public async getGamesByDay(season: number, gameDay: number): Promise<GameScheduleEntry[]> {
    try {
      const sql = `
        SELECT g.game_id, g.home_team_id, g.away_team_id, g.home_score, g.away_score, g.completed,
               ht.city as home_city, ht.name as home_name,
               at.city as away_city, at.name as away_name
        FROM games g
        LEFT JOIN teams ht ON g.home_team_id = ht.team_id
        LEFT JOIN teams at ON g.away_team_id = at.team_id
        WHERE g.season = ? AND g.game_day = ?
        ORDER BY g.game_id
      `;
      
      const results = dbService.exec(sql, [season, gameDay]);
      
      return results.map(game => ({
        game_id: game.game_id,
        home_team_id: game.home_team_id,
        away_team_id: game.away_team_id,
        opponent_id: game.home_team_id, // This will be adjusted based on perspective
        game_day: gameDay,
        date_display: dateGenerator.generateGameDayDate(gameDay, season).display,
        home: true, // This will be determined by team perspective
        completed: Boolean(game.completed),
        result: game.completed ? (game.home_score > game.away_score ? 'win' : 'loss') : null,
        score: game.completed ? {
          home: game.home_score,
          away: game.away_score
        } : undefined
      }));
    } catch (error) {
      console.error('Failed to get games by day:', error);
      throw new Error('Failed to get games by day');
    }
  }

  /**
   * Advance to next game day
   * @param season Season year
   * @returns Promise that resolves when advance is complete
   */
  public async advanceGameDay(season: number): Promise<void> {
    try {
      const currentDay = await this.getCurrentGameDay(season);
      if (!currentDay) {
        throw new Error('No current game day found');
      }

      // Mark current day as completed
      const updateSql = `
        UPDATE season_calendar 
        SET games_scheduled = 0 
        WHERE season = ? AND game_day = ?
      `;
      dbService.run(updateSql, [season, currentDay.game_day]);

    } catch (error) {
      console.error('Failed to advance game day:', error);
      throw new Error('Failed to advance game day');
    }
  }

  /**
   * Get team's next scheduled game
   * @param teamId Team ID
   * @returns Next scheduled game or null if none
   */
  public async getTeamNextGame(teamId: number): Promise<GameScheduleEntry | null> {
    try {
      const sql = `
        SELECT g.game_id, g.home_team_id, g.away_team_id, g.game_day, g.completed,
               ht.city as home_city, ht.name as home_name,
               at.city as away_city, at.name as away_name
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.team_id
        JOIN teams at ON g.away_team_id = at.team_id
        WHERE (g.home_team_id = ? OR g.away_team_id = ?) 
        AND g.completed = 0
        ORDER BY g.game_day ASC
        LIMIT 1
      `;
      
      const results = dbService.exec(sql, [teamId, teamId]);
      
      if (results.length === 0) {
        return null;
      }
      
      const game = results[0];
      const isHome = game.home_team_id === teamId;
      
      return {
        game_id: game.game_id,
        opponent_id: isHome ? game.away_team_id : game.home_team_id,
        game_day: game.game_day,
        date_display: dateGenerator.generateGameDayDate(game.game_day, 2025).display,
        home: isHome,
        completed: Boolean(game.completed),
        result: null
      };
    } catch (error) {
      console.error('Failed to get team next game:', error);
      throw new Error('Failed to get team next game');
    }
  }

  /**
   * Get season progress
   * @param season Season year
   * @returns Season progress information
   */
  public async getSeasonProgress(season: number): Promise<SeasonProgress> {
    try {
      const sql = `
        SELECT 
          MIN(game_day) as current_day,
          MAX(game_day) as total_days,
          COUNT(*) as total_calendar_days
        FROM season_calendar 
        WHERE season = ?
      `;
      
      const results = dbService.exec(sql, [season]);
      
      if (results.length === 0) {
        return {
          current: 1,
          total: 150,
          percent: 0,
          days_remaining: 150,
          estimated_completion: dateGenerator.getSeasonEndDate()
        };
      }
      
      const progress = results[0];
      const current = progress.current_day || 1;
      const total = 150; // Fixed season length
      const percent = Math.round((current / total) * 100);
      const days_remaining = Math.max(0, total - current);
      const estimated_completion = dateGenerator.getEstimatedCompletionDate(current);
      
      return {
        current,
        total,
        percent,
        days_remaining,
        estimated_completion
      };
    } catch (error) {
      console.error('Failed to get season progress:', error);
      throw new Error('Failed to get season progress');
    }
  }

  /**
   * Get team season progress
   * @param teamId Team ID
   * @returns Team season progress information
   */
  public async getTeamSeasonProgress(teamId: number): Promise<TeamSeasonProgress> {
    try {
      // Get team's games played
      const gamesPlayedSql = `
        SELECT COUNT(*) as games_played
        FROM games 
        WHERE (home_team_id = ? OR away_team_id = ?) 
        AND completed = 1
      `;
      
      const gamesPlayedResult = dbService.exec(gamesPlayedSql, [teamId, teamId]);
      const gamesPlayed = gamesPlayedResult[0]?.games_played || 0;
      
      // Get team's next game
      const nextGame = await this.getTeamNextGame(teamId);
      const nextGameDay = nextGame ? nextGame.game_day : null;
      
      // Get current game day
      const currentDaySql = `
        SELECT MIN(game_day) as current_day
        FROM season_calendar 
        WHERE games_scheduled > 0
      `;
      
      const currentDayResult = dbService.exec(currentDaySql);
      const currentDay = currentDayResult[0]?.current_day || 1;
      
      // Calculate days since last game
      const lastGameSql = `
        SELECT MAX(game_day) as last_game_day
        FROM games 
        WHERE (home_team_id = ? OR away_team_id = ?) 
        AND completed = 1
      `;
      
      const lastGameResult = dbService.exec(lastGameSql, [teamId, teamId]);
      const lastGameDay = lastGameResult[0]?.last_game_day || 0;
      const daysSinceLastGame = Math.max(0, currentDay - lastGameDay);
      
      return {
        team_id: teamId,
        games_played: gamesPlayed,
        games_remaining: 82 - gamesPlayed,
        total_games: 82,
        next_game_day: nextGameDay,
        days_since_last_game: daysSinceLastGame
      };
    } catch (error) {
      console.error('Failed to get team season progress:', error);
      throw new Error('Failed to get team season progress');
    }
  }

  /**
   * Initialize calendar for a season
   * @param season Season year
   * @returns Promise that resolves when calendar is initialized
   */
  public async initializeSeasonCalendar(season: number): Promise<void> {
    try {
      const calendar = this.generateSeasonCalendar(season);
      
      // Insert calendar entries into database
      for (const day of calendar) {
        const sql = `
          INSERT INTO season_calendar (season, game_day, date_display, games_scheduled)
          VALUES (?, ?, ?, 0)
        `;
        dbService.run(sql, [season, day.game_day, day.date_display]);
      }
    } catch (error) {
      console.error('Failed to initialize season calendar:', error);
      throw new Error('Failed to initialize season calendar');
    }
  }

  /**
   * Update games scheduled count for a game day
   * @param season Season year
   * @param gameDay Game day number
   * @param gamesCount Number of games scheduled
   */
  public async updateGamesScheduled(season: number, gameDay: number, gamesCount: number): Promise<void> {
    try {
      const sql = `
        UPDATE season_calendar 
        SET games_scheduled = ? 
        WHERE season = ? AND game_day = ?
      `;
      dbService.run(sql, [gamesCount, season, gameDay]);
    } catch (error) {
      console.error('Failed to update games scheduled:', error);
      throw new Error('Failed to update games scheduled');
    }
  }

  /**
   * Get calendar navigation options
   * @param season Season year
   * @returns Navigation options available
   */
  public async getNavigationOptions(season: number): Promise<{
    can_advance: boolean;
    can_simulate_to: boolean;
    can_simulate_to_team_game: boolean;
    can_simulate_rest_of_season: boolean;
  }> {
    try {
      const currentDay = await this.getCurrentGameDay(season);
      const progress = await this.getSeasonProgress(season);
      
      return {
        can_advance: currentDay !== null && progress.percent < 100,
        can_simulate_to: true,
        can_simulate_to_team_game: true,
        can_simulate_rest_of_season: progress.percent < 100
      };
    } catch (error) {
      console.error('Failed to get navigation options:', error);
      return {
        can_advance: false,
        can_simulate_to: false,
        can_simulate_to_team_game: false,
        can_simulate_rest_of_season: false
      };
    }
  }
}

/**
 * Export singleton instance for easy access
 */
export const calendarService = CalendarService.getInstance();
