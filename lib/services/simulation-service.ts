"use client"

/**
 * Simulation Service - Game simulation engine
 * 
 * This service handles the core game simulation logic, calculating game results
 * based on team and player attributes, generating box scores, and updating
 * all relevant statistics in the database.
 */

import { dbService } from '../database/db-service';
import { playerService } from './player-service';
import { teamService } from './team-service';
import { Player, Team, GameBoxScore, PlayerBoxScore, TeamBoxScore } from '../types/database';

/**
 * Game simulation result interface
 */
interface GameSimulationResult {
  home_score: number;
  away_score: number;
  box_score: GameBoxScore;
  game_stats: {
    home_team_stats: any;
    away_team_stats: any;
  };
}

/**
 * SimulationService class that handles game simulation
 */
export class SimulationService {
  private static instance: SimulationService;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of SimulationService
   * @returns SimulationService instance
   */
  public static getInstance(): SimulationService {
    if (!SimulationService.instance) {
      SimulationService.instance = new SimulationService();
    }
    return SimulationService.instance;
  }

  /**
   * Simulate a complete game between two teams
   * @param homeTeamId Home team ID
   * @param awayTeamId Away team ID
   * @returns Promise that resolves to game simulation result
   */
  public async simulateGame(homeTeamId: number, awayTeamId: number): Promise<GameSimulationResult> {
    try {
      console.log(`Simulating game: Team ${homeTeamId} vs Team ${awayTeamId}`);

      // Get team data
      const homeTeam = await teamService.getTeam(homeTeamId);
      const awayTeam = await teamService.getTeam(awayTeamId);

      if (!homeTeam || !awayTeam) {
        throw new Error('One or both teams not found');
      }

      // Get team rosters
      const homePlayers = await playerService.getPlayersByTeam(homeTeamId);
      const awayPlayers = await playerService.getPlayersByTeam(awayTeamId);

      // Simulate the game
      const gameResult = await this.runGameSimulation(homeTeam, awayTeam, homePlayers, awayPlayers);

      // Update database with results
      await this.updateGameResults(homeTeamId, awayTeamId, gameResult);

      console.log(`Game completed: ${homeTeam.city} ${homeTeam.name} ${gameResult.home_score} - ${gameResult.away_score} ${awayTeam.city} ${awayTeam.name}`);
      
      return gameResult;
    } catch (error) {
      console.error('Game simulation failed:', error);
      throw new Error('Game simulation failed');
    }
  }

  /**
   * Run the core game simulation logic
   * @param homeTeam Home team data
   * @param awayTeam Away team data
   * @param homePlayers Home team players
   * @param awayPlayers Away team players
   * @returns Game simulation result
   */
  private async runGameSimulation(
    homeTeam: Team,
    awayTeam: Team,
    homePlayers: Player[],
    awayPlayers: Player[]
  ): Promise<GameSimulationResult> {
    // Calculate team overall ratings
    const homeTeamRating = this.calculateTeamRating(homePlayers);
    const awayTeamRating = this.calculateTeamRating(awayPlayers);

    // Apply home court advantage
    const homeCourtAdvantage = 5; // +5 point advantage for home team
    const adjustedHomeRating = homeTeamRating + homeCourtAdvantage;

    // Calculate base scores using team ratings
    const baseHomeScore = this.calculateBaseScore(adjustedHomeRating);
    const baseAwayScore = this.calculateBaseScore(awayTeamRating);

    // Add randomness to scores
    const homeScore = Math.max(60, Math.min(150, baseHomeScore + this.getRandomVariation()));
    const awayScore = Math.max(60, Math.min(150, baseAwayScore + this.getRandomVariation()));

    // Generate individual player box scores
    const homeBoxScore = await this.generatePlayerBoxScores(homePlayers, homeScore, true);
    const awayBoxScore = await this.generatePlayerBoxScores(awayPlayers, awayScore, false);

    // Create complete box score
    const boxScore: GameBoxScore = {
      home_team: {
        team_id: homeTeam.team_id,
        team_name: `${homeTeam.city} ${homeTeam.name}`,
        total_points: homeScore,
        players: homeBoxScore
      },
      away_team: {
        team_id: awayTeam.team_id,
        team_name: `${awayTeam.city} ${awayTeam.name}`,
        total_points: awayScore,
        players: awayBoxScore
      }
    };

    // Calculate team stats for the game
    const homeTeamStats = this.calculateTeamGameStats(homeBoxScore);
    const awayTeamStats = this.calculateTeamGameStats(awayBoxScore);

    return {
      home_score: homeScore,
      away_score: awayScore,
      box_score: boxScore,
      game_stats: {
        home_team_stats: homeTeamStats,
        away_team_stats: awayTeamStats
      }
    };
  }

  /**
   * Calculate team overall rating based on player attributes
   * @param players Array of team players
   * @returns Team overall rating
   */
  private calculateTeamRating(players: Player[]): number {
    if (players.length === 0) return 50;

    // Calculate average of all player overall ratings
    const totalRating = players.reduce((sum, player) => {
      return sum + playerService.calculateOverallRating(player);
    }, 0);

    return Math.round(totalRating / players.length);
  }

  /**
   * Calculate base score for a team based on their rating
   * @param teamRating Team overall rating
   * @returns Base score (before randomness)
   */
  private calculateBaseScore(teamRating: number): number {
    // Scale rating to realistic NBA score range (80-130)
    const minScore = 80;
    const maxScore = 130;
    const scoreRange = maxScore - minScore;
    
    // Convert 0-100 rating to score range
    const normalizedRating = Math.max(0, Math.min(100, teamRating)) / 100;
    return Math.round(minScore + (normalizedRating * scoreRange));
  }

  /**
   * Get random variation for score (adds realism)
   * @returns Random variation (-15 to +15)
   */
  private getRandomVariation(): number {
    return Math.floor(Math.random() * 31) - 15; // -15 to +15
  }

  /**
   * Generate individual player box scores for a team
   * @param players Team players
   * @param teamScore Total team score
   * @param isHome Whether this is the home team
   * @returns Array of player box scores
   */
  private async generatePlayerBoxScores(
    players: Player[],
    teamScore: number,
    isHome: boolean
  ): Promise<PlayerBoxScore[]> {
    const boxScores: PlayerBoxScore[] = [];
    
    // Sort players by overall rating (best players get more minutes)
    const sortedPlayers = [...players].sort((a, b) => 
      playerService.calculateOverallRating(b) - playerService.calculateOverallRating(a)
    );

    // Distribute minutes and stats among players
    let remainingPoints = teamScore;
    let remainingMinutes = 240; // 48 minutes * 5 players

    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      const overallRating = playerService.calculateOverallRating(player);
      
      // Calculate minutes based on player rating and position
      const minutes = this.calculatePlayerMinutes(player, overallRating, i < 5);
      const points = this.calculatePlayerPoints(player, overallRating, remainingPoints, i < 5);
      
      // Calculate other stats based on player attributes and minutes
      const rebounds = this.calculatePlayerRebounds(player, minutes);
      const assists = this.calculatePlayerAssists(player, minutes);
      const steals = this.calculatePlayerSteals(player, minutes);
      const blocks = this.calculatePlayerBlocks(player, minutes);
      const turnovers = this.calculatePlayerTurnovers(player, minutes);
      
      // Calculate shooting stats
      const shootingStats = this.calculatePlayerShooting(player, points, minutes);
      
      // Calculate plus/minus (simplified)
      const plusMinus = this.calculatePlusMinus(player, teamScore, isHome);

      const boxScore: PlayerBoxScore = {
        player_id: player.player_id,
        name: `${player.first_name} ${player.last_name}`,
        position: player.position,
        minutes: Math.round(minutes),
        points: Math.round(points),
        rebounds: Math.round(rebounds),
        assists: Math.round(assists),
        steals: Math.round(steals),
        blocks: Math.round(blocks),
        turnovers: Math.round(turnovers),
        fg_made: Math.round(shootingStats.fg_made),
        fg_attempted: Math.round(shootingStats.fg_attempted),
        fg_pct: shootingStats.fg_pct,
        three_made: Math.round(shootingStats.three_made),
        three_attempted: Math.round(shootingStats.three_attempted),
        three_pct: shootingStats.three_pct,
        ft_made: Math.round(shootingStats.ft_made),
        ft_attempted: Math.round(shootingStats.ft_attempted),
        ft_pct: shootingStats.ft_pct,
        plus_minus: Math.round(plusMinus)
      };

      boxScores.push(boxScore);
      
      // Update remaining resources
      remainingPoints = Math.max(0, remainingPoints - points);
      remainingMinutes = Math.max(0, remainingMinutes - minutes);
    }

    return boxScores;
  }

  /**
   * Calculate minutes for a player based on their rating and role
   * @param player Player data
   * @param overallRating Player's overall rating
   * @param isStarter Whether player is a starter
   * @returns Minutes played
   */
  private calculatePlayerMinutes(player: Player, overallRating: number, isStarter: boolean): number {
    const baseMinutes = isStarter ? 30 : 15; // Starters get more minutes
    const ratingBonus = (overallRating - 50) * 0.3; // Higher rated players get more minutes
    const randomVariation = (Math.random() - 0.5) * 10; // ±5 minutes variation
    
    return Math.max(0, Math.min(48, baseMinutes + ratingBonus + randomVariation));
  }

  /**
   * Calculate points for a player
   * @param player Player data
   * @param overallRating Player's overall rating
   * @param remainingPoints Points left to distribute
   * @param isStarter Whether player is a starter
   * @returns Points scored
   */
  private calculatePlayerPoints(player: Player, overallRating: number, remainingPoints: number, isStarter: boolean): number {
    const basePoints = isStarter ? 12 : 6; // Starters score more
    const ratingBonus = (overallRating - 50) * 0.4; // Higher rated players score more
    const randomVariation = (Math.random() - 0.5) * 8; // ±4 points variation
    
    const calculatedPoints = Math.max(0, basePoints + ratingBonus + randomVariation);
    return Math.min(calculatedPoints, remainingPoints);
  }

  /**
   * Calculate rebounds for a player
   * @param player Player data
   * @param minutes Minutes played
   * @returns Rebounds
   */
  private calculatePlayerRebounds(player: Player, minutes: number): number {
    const baseRate = (player.offensive_rebound + player.defensive_rebound) / 200; // Convert to rate
    const minutesFactor = minutes / 48; // Normalize to 48 minutes
    const randomVariation = (Math.random() - 0.5) * 4; // ±2 rebounds variation
    
    return Math.max(0, baseRate * minutesFactor * 15 + randomVariation);
  }

  /**
   * Calculate assists for a player
   * @param player Player data
   * @param minutes Minutes played
   * @returns Assists
   */
  private calculatePlayerAssists(player: Player, minutes: number): number {
    const baseRate = player.pass / 100; // Convert to rate
    const minutesFactor = minutes / 48; // Normalize to 48 minutes
    const randomVariation = (Math.random() - 0.5) * 3; // ±1.5 assists variation
    
    return Math.max(0, baseRate * minutesFactor * 8 + randomVariation);
  }

  /**
   * Calculate steals for a player
   * @param player Player data
   * @param minutes Minutes played
   * @returns Steals
   */
  private calculatePlayerSteals(player: Player, minutes: number): number {
    const baseRate = player.steal / 100; // Convert to rate
    const minutesFactor = minutes / 48; // Normalize to 48 minutes
    const randomVariation = (Math.random() - 0.5) * 2; // ±1 steal variation
    
    return Math.max(0, baseRate * minutesFactor * 3 + randomVariation);
  }

  /**
   * Calculate blocks for a player
   * @param player Player data
   * @param minutes Minutes played
   * @returns Blocks
   */
  private calculatePlayerBlocks(player: Player, minutes: number): number {
    const baseRate = player.block / 100; // Convert to rate
    const minutesFactor = minutes / 48; // Normalize to 48 minutes
    const randomVariation = (Math.random() - 0.5) * 2; // ±1 block variation
    
    return Math.max(0, baseRate * minutesFactor * 3 + randomVariation);
  }

  /**
   * Calculate turnovers for a player
   * @param player Player data
   * @param minutes Minutes played
   * @returns Turnovers
   */
  private calculatePlayerTurnovers(player: Player, minutes: number): number {
    const baseRate = (100 - player.ball_iq) / 100; // Lower ball IQ = more turnovers
    const minutesFactor = minutes / 48; // Normalize to 48 minutes
    const randomVariation = (Math.random() - 0.5) * 2; // ±1 turnover variation
    
    return Math.max(0, baseRate * minutesFactor * 4 + randomVariation);
  }

  /**
   * Calculate shooting statistics for a player
   * @param player Player data
   * @param points Points scored
   * @param minutes Minutes played
   * @returns Shooting statistics
   */
  private calculatePlayerShooting(player: Player, points: number, minutes: number): {
    fg_made: number;
    fg_attempted: number;
    fg_pct: number;
    three_made: number;
    three_attempted: number;
    three_pct: number;
    ft_made: number;
    ft_attempted: number;
    ft_pct: number;
  } {
    // Calculate field goal attempts based on points and shooting ability
    const shootingAbility = (player.inside_shot + player.three_point_shot) / 200;
    const baseAttempts = points / shootingAbility;
    const fg_attempted = Math.max(1, Math.round(baseAttempts + (Math.random() - 0.5) * 4));
    const fg_made = Math.min(fg_attempted, Math.round(points * 0.4)); // Assume 40% of points from FGs
    const fg_pct = fg_attempted > 0 ? fg_made / fg_attempted : 0;

    // Calculate three-point attempts (position-based)
    const threePointRate = this.getThreePointRate(player.position);
    const three_attempted = Math.round(fg_attempted * threePointRate);
    const three_made = Math.round(three_attempted * (player.three_point_shot / 100));
    const three_pct = three_attempted > 0 ? three_made / three_attempted : 0;

    // Calculate free throw attempts and makes
    const ft_attempted = Math.round(points * 0.3); // Assume 30% of points from FTs
    const ft_made = Math.round(ft_attempted * (player.three_point_shot / 100)); // Use 3P rating as FT proxy
    const ft_pct = ft_attempted > 0 ? ft_made / ft_attempted : 0;

    return {
      fg_made,
      fg_attempted,
      fg_pct,
      three_made,
      three_attempted,
      three_pct,
      ft_made,
      ft_attempted,
      ft_pct
    };
  }

  /**
   * Get three-point attempt rate by position
   * @param position Player position
   * @returns Three-point attempt rate (0-1)
   */
  private getThreePointRate(position: string): number {
    const rates: Record<string, number> = {
      'PG': 0.4, // Point guards shoot more threes
      'SG': 0.5, // Shooting guards shoot the most threes
      'SF': 0.3, // Small forwards shoot some threes
      'PF': 0.2, // Power forwards shoot fewer threes
      'C': 0.1  // Centers shoot the fewest threes
    };
    return rates[position] || 0.3;
  }

  /**
   * Calculate plus/minus for a player
   * @param player Player data
   * @param teamScore Team's total score
   * @param isHome Whether this is the home team
   * @returns Plus/minus value
   */
  private calculatePlusMinus(player: Player, teamScore: number, isHome: boolean): number {
    // Simplified plus/minus calculation
    const basePlusMinus = (Math.random() - 0.5) * 20; // -10 to +10
    const ratingBonus = (playerService.calculateOverallRating(player) - 50) * 0.2;
    return Math.round(basePlusMinus + ratingBonus);
  }

  /**
   * Calculate team game statistics
   * @param playerBoxScores Array of player box scores
   * @returns Team game statistics
   */
  private calculateTeamGameStats(playerBoxScores: PlayerBoxScore[]): any {
    const totals = playerBoxScores.reduce((acc, player) => ({
      points: acc.points + player.points,
      rebounds: acc.rebounds + player.rebounds,
      assists: acc.assists + player.assists,
      steals: acc.steals + player.steals,
      blocks: acc.blocks + player.blocks,
      turnovers: acc.turnovers + player.turnovers,
      fg_made: acc.fg_made + player.fg_made,
      fg_attempted: acc.fg_attempted + player.fg_attempted,
      three_made: acc.three_made + player.three_made,
      three_attempted: acc.three_attempted + player.three_attempted,
      ft_made: acc.ft_made + player.ft_made,
      ft_attempted: acc.ft_attempted + player.ft_attempted
    }), {
      points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
      fg_made: 0, fg_attempted: 0, three_made: 0, three_attempted: 0,
      ft_made: 0, ft_attempted: 0
    });

    return {
      ...totals,
      fg_pct: totals.fg_attempted > 0 ? totals.fg_made / totals.fg_attempted : 0,
      three_pct: totals.three_attempted > 0 ? totals.three_made / totals.three_attempted : 0,
      ft_pct: totals.ft_attempted > 0 ? totals.ft_made / totals.ft_attempted : 0
    };
  }

  /**
   * Update database with game results
   * @param homeTeamId Home team ID
   * @param awayTeamId Away team ID
   * @param gameResult Game simulation result
   */
  private async updateGameResults(
    homeTeamId: number,
    awayTeamId: number,
    gameResult: GameSimulationResult
  ): Promise<void> {
    try {
      // Update team records
      const homeWon = gameResult.home_score > gameResult.away_score;
      await teamService.updateTeamRecord(homeTeamId, homeWon ? 'win' : 'loss');
      await teamService.updateTeamRecord(awayTeamId, homeWon ? 'loss' : 'win');

      // Update player statistics
      await this.updatePlayerStats(gameResult.box_score.home_team.players, gameResult.home_score > gameResult.away_score);
      await this.updatePlayerStats(gameResult.box_score.away_team.players, gameResult.away_score > gameResult.home_score);

      // Update team statistics
      await this.updateTeamStats(homeTeamId, gameResult.game_stats.home_team_stats);
      await this.updateTeamStats(awayTeamId, gameResult.game_stats.away_team_stats);

      // Store game in database
      await this.storeGameResult(homeTeamId, awayTeamId, gameResult);

      console.log('Game results updated in database');
    } catch (error) {
      console.error('Failed to update game results:', error);
      throw error;
    }
  }

  /**
   * Update player statistics after a game
   * @param playerBoxScores Array of player box scores
   * @param teamWon Whether the team won
   */
  private async updatePlayerStats(playerBoxScores: PlayerBoxScore[], teamWon: boolean): Promise<void> {
    for (const boxScore of playerBoxScores) {
      try {
        // Get current player stats
        const currentStats = await playerService.getPlayerSeasonStats(boxScore.player_id);
        if (!currentStats) continue;

        // Update stats with game performance
        const updatedStats = {
          games: currentStats.games + 1,
          minutes: currentStats.minutes + boxScore.minutes,
          points: currentStats.points + boxScore.points,
          rebounds: currentStats.rebounds + boxScore.rebounds,
          assists: currentStats.assists + boxScore.assists,
          steals: currentStats.steals + boxScore.steals,
          blocks: currentStats.blocks + boxScore.blocks,
          turnovers: currentStats.turnovers + boxScore.turnovers,
          fg_made: currentStats.fg_made + boxScore.fg_made,
          fg_attempted: currentStats.fg_attempted + boxScore.fg_attempted,
          three_made: currentStats.three_made + boxScore.three_made,
          three_attempted: currentStats.three_attempted + boxScore.three_attempted,
          ft_made: currentStats.ft_made + boxScore.ft_made,
          ft_attempted: currentStats.ft_attempted + boxScore.ft_attempted
        };

        // Recalculate averages
        updatedStats.ppg = updatedStats.games > 0 ? updatedStats.points / updatedStats.games : 0;
        updatedStats.rpg = updatedStats.games > 0 ? updatedStats.rebounds / updatedStats.games : 0;
        updatedStats.apg = updatedStats.games > 0 ? updatedStats.assists / updatedStats.games : 0;
        updatedStats.spg = updatedStats.games > 0 ? updatedStats.steals / updatedStats.games : 0;
        updatedStats.bpg = updatedStats.games > 0 ? updatedStats.blocks / updatedStats.games : 0;
        updatedStats.tpg = updatedStats.games > 0 ? updatedStats.turnovers / updatedStats.games : 0;
        updatedStats.fg_pct = updatedStats.fg_attempted > 0 ? updatedStats.fg_made / updatedStats.fg_attempted : 0;
        updatedStats.three_pct = updatedStats.three_attempted > 0 ? updatedStats.three_made / updatedStats.three_attempted : 0;
        updatedStats.ft_pct = updatedStats.ft_attempted > 0 ? updatedStats.ft_made / updatedStats.ft_attempted : 0;

        // Update player stats in database
        await playerService.updatePlayerStats(boxScore.player_id, updatedStats);
      } catch (error) {
        console.error(`Failed to update stats for player ${boxScore.player_id}:`, error);
      }
    }
  }

  /**
   * Update team statistics after a game
   * @param teamId Team ID
   * @param teamStats Team game statistics
   */
  private async updateTeamStats(teamId: number, teamStats: any): Promise<void> {
    try {
      const currentStats = await teamService.getTeamSeasonStats(teamId);
      if (!currentStats) return;

      const updatedStats = {
        games: currentStats.games + 1,
        ppg: ((currentStats.ppg * currentStats.games) + teamStats.points) / (currentStats.games + 1),
        rpg: ((currentStats.rpg * currentStats.games) + teamStats.rebounds) / (currentStats.games + 1),
        apg: ((currentStats.apg * currentStats.games) + teamStats.assists) / (currentStats.games + 1),
        spg: ((currentStats.spg * currentStats.games) + teamStats.steals) / (currentStats.games + 1),
        bpg: ((currentStats.bpg * currentStats.games) + teamStats.blocks) / (currentStats.games + 1),
        tpg: ((currentStats.tpg * currentStats.games) + teamStats.turnovers) / (currentStats.games + 1),
        fg_pct: teamStats.fg_pct,
        three_pct: teamStats.three_pct,
        ft_pct: teamStats.ft_pct
      };

      await teamService.updateTeamStats(teamId, updatedStats);
    } catch (error) {
      console.error(`Failed to update team stats for team ${teamId}:`, error);
    }
  }

  /**
   * Store game result in database
   * @param homeTeamId Home team ID
   * @param awayTeamId Away team ID
   * @param gameResult Game simulation result
   */
  private async storeGameResult(
    homeTeamId: number,
    awayTeamId: number,
    gameResult: GameSimulationResult
  ): Promise<void> {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const currentYear = new Date().getFullYear();

      const sql = `
        INSERT INTO games (season, date, home_team_id, away_team_id, home_score, away_score, completed, box_score)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `;

      const params = [
        currentYear,
        currentDate,
        homeTeamId,
        awayTeamId,
        gameResult.home_score,
        gameResult.away_score,
        JSON.stringify(gameResult.box_score)
      ];

      dbService.run(sql, params);
    } catch (error) {
      console.error('Failed to store game result:', error);
      throw error;
    }
  }

  /**
   * Simulate multiple games in sequence
   * @param games Array of game matchups
   * @returns Promise that resolves when all games are simulated
   */
  public async simulateMultipleGames(games: Array<{ homeTeamId: number; awayTeamId: number }>): Promise<void> {
    try {
      console.log(`Simulating ${games.length} games...`);

      for (const game of games) {
        await this.simulateGame(game.homeTeamId, game.awayTeamId);
        // Add small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('All games simulated successfully');
    } catch (error) {
      console.error('Failed to simulate multiple games:', error);
      throw new Error('Multiple game simulation failed');
    }
  }

  /**
   * Get simulation statistics
   * @returns Simulation statistics
   */
  public getSimulationStats(): any {
    return {
      totalGamesSimulated: 0, // This would be tracked in a real implementation
      averageScore: 110, // This would be calculated from actual games
      simulationVersion: '1.0.0'
    };
  }
}

/**
 * Export singleton instance for easy access
 */
export const simulationService = SimulationService.getInstance();
