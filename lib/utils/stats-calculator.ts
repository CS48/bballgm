'use client';

/**
 * Stats Calculator - Calculate aggregated statistics
 *
 * This utility provides functions for calculating various statistical
 * aggregations, including career stats, team stats, and league-wide
 * statistical analysis.
 */

import { PlayerSeasonStats, PlayerCareerStats, TeamSeasonStats } from '../types/database';

/**
 * StatsCalculator class that handles statistical calculations
 */
export class StatsCalculator {
  private static instance: StatsCalculator;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of StatsCalculator
   * @returns StatsCalculator instance
   */
  public static getInstance(): StatsCalculator {
    if (!StatsCalculator.instance) {
      StatsCalculator.instance = new StatsCalculator();
    }
    return StatsCalculator.instance;
  }

  /**
   * Calculate career statistics from historical seasons
   * @param historicalSeasons Array of historical season stats
   * @returns Career statistics object
   */
  public calculateCareerStats(historicalSeasons: PlayerSeasonStats[]): PlayerCareerStats {
    if (historicalSeasons.length === 0) {
      return this.getEmptyCareerStats();
    }

    // Calculate totals across all seasons
    const totals = historicalSeasons.reduce(
      (acc, season) => ({
        games: acc.games + season.games,
        minutes: acc.minutes + season.minutes,
        points: acc.points + season.points,
        rebounds: acc.rebounds + season.rebounds,
        assists: acc.assists + season.assists,
        steals: acc.steals + season.steals,
        blocks: acc.blocks + season.blocks,
        turnovers: acc.turnovers + season.turnovers,
        fg_made: acc.fg_made + season.fg_made,
        fg_attempted: acc.fg_attempted + season.fg_attempted,
        three_made: acc.three_made + season.three_made,
        three_attempted: acc.three_attempted + season.three_attempted,
        ft_made: acc.ft_made + season.ft_made,
        ft_attempted: acc.ft_attempted + season.ft_attempted,
      }),
      {
        games: 0,
        minutes: 0,
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        fg_made: 0,
        fg_attempted: 0,
        three_made: 0,
        three_attempted: 0,
        ft_made: 0,
        ft_attempted: 0,
      }
    );

    // Calculate career averages
    const careerStats: PlayerCareerStats = {
      seasons: historicalSeasons.length,
      games: totals.games,
      minutes: totals.minutes,
      points: totals.points,
      ppg: totals.games > 0 ? this.roundToDecimal(totals.points / totals.games, 1) : 0,
      rebounds: totals.rebounds,
      rpg: totals.games > 0 ? this.roundToDecimal(totals.rebounds / totals.games, 1) : 0,
      assists: totals.assists,
      apg: totals.games > 0 ? this.roundToDecimal(totals.assists / totals.games, 1) : 0,
      steals: totals.steals,
      spg: totals.games > 0 ? this.roundToDecimal(totals.steals / totals.games, 1) : 0,
      blocks: totals.blocks,
      bpg: totals.games > 0 ? this.roundToDecimal(totals.blocks / totals.games, 1) : 0,
      turnovers: totals.turnovers,
      tpg: totals.games > 0 ? this.roundToDecimal(totals.turnovers / totals.games, 1) : 0,
      fg_pct: totals.fg_attempted > 0 ? this.roundToDecimal(totals.fg_made / totals.fg_attempted, 3) : 0,
      three_pct: totals.three_attempted > 0 ? this.roundToDecimal(totals.three_made / totals.three_attempted, 3) : 0,
      ft_pct: totals.ft_attempted > 0 ? this.roundToDecimal(totals.ft_made / totals.ft_attempted, 3) : 0,
    };

    return careerStats;
  }

  /**
   * Calculate team statistics from player stats
   * @param playerStats Array of player season stats
   * @returns Team season statistics
   */
  public calculateTeamStats(playerStats: PlayerSeasonStats[]): TeamSeasonStats {
    if (playerStats.length === 0) {
      return this.getEmptyTeamStats();
    }

    // Calculate team totals
    const totals = playerStats.reduce(
      (acc, player) => ({
        games: Math.max(acc.games, player.games), // Use max games (all players should have same games)
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
        ft_attempted: acc.ft_attempted + player.ft_attempted,
      }),
      {
        games: 0,
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        fg_made: 0,
        fg_attempted: 0,
        three_made: 0,
        three_attempted: 0,
        ft_made: 0,
        ft_attempted: 0,
      }
    );

    // Calculate team averages per game
    const teamStats: TeamSeasonStats = {
      games: totals.games,
      wins: 0, // This would be passed in or calculated separately
      losses: 0, // This would be passed in or calculated separately
      ppg: totals.games > 0 ? this.roundToDecimal(totals.points / totals.games, 1) : 0,
      opp_ppg: 0, // This would be calculated from opponent scores
      fg_pct: totals.fg_attempted > 0 ? this.roundToDecimal(totals.fg_made / totals.fg_attempted, 3) : 0,
      three_pct: totals.three_attempted > 0 ? this.roundToDecimal(totals.three_made / totals.three_attempted, 3) : 0,
      ft_pct: totals.ft_attempted > 0 ? this.roundToDecimal(totals.ft_made / totals.ft_attempted, 3) : 0,
      rpg: totals.games > 0 ? this.roundToDecimal(totals.rebounds / totals.games, 1) : 0,
      apg: totals.games > 0 ? this.roundToDecimal(totals.assists / totals.games, 1) : 0,
      spg: totals.games > 0 ? this.roundToDecimal(totals.steals / totals.games, 1) : 0,
      bpg: totals.games > 0 ? this.roundToDecimal(totals.blocks / totals.games, 1) : 0,
      tpg: totals.games > 0 ? this.roundToDecimal(totals.turnovers / totals.games, 1) : 0,
    };

    return teamStats;
  }

  /**
   * Update running season statistics for a player
   * @param currentStats Current season stats
   * @param gameStats Stats from a single game
   * @returns Updated season stats
   */
  public updateSeasonStats(
    currentStats: PlayerSeasonStats,
    gameStats: {
      minutes: number;
      points: number;
      rebounds: number;
      assists: number;
      steals: number;
      blocks: number;
      turnovers: number;
      fg_made: number;
      fg_attempted: number;
      three_made: number;
      three_attempted: number;
      ft_made: number;
      ft_attempted: number;
    }
  ): PlayerSeasonStats {
    const updatedStats: PlayerSeasonStats = {
      games: currentStats.games + 1,
      minutes: currentStats.minutes + gameStats.minutes,
      points: currentStats.points + gameStats.points,
      rebounds: currentStats.rebounds + gameStats.rebounds,
      assists: currentStats.assists + gameStats.assists,
      steals: currentStats.steals + gameStats.steals,
      blocks: currentStats.blocks + gameStats.blocks,
      turnovers: currentStats.turnovers + gameStats.turnovers,
      fg_made: currentStats.fg_made + gameStats.fg_made,
      fg_attempted: currentStats.fg_attempted + gameStats.fg_attempted,
      three_made: currentStats.three_made + gameStats.three_made,
      three_attempted: currentStats.three_attempted + gameStats.three_attempted,
      ft_made: currentStats.ft_made + gameStats.ft_made,
      ft_attempted: currentStats.ft_attempted + gameStats.ft_attempted,
    };

    // Recalculate averages
    updatedStats.ppg = updatedStats.games > 0 ? this.roundToDecimal(updatedStats.points / updatedStats.games, 1) : 0;
    updatedStats.rpg = updatedStats.games > 0 ? this.roundToDecimal(updatedStats.rebounds / updatedStats.games, 1) : 0;
    updatedStats.apg = updatedStats.games > 0 ? this.roundToDecimal(updatedStats.assists / updatedStats.games, 1) : 0;
    updatedStats.spg = updatedStats.games > 0 ? this.roundToDecimal(updatedStats.steals / updatedStats.games, 1) : 0;
    updatedStats.bpg = updatedStats.games > 0 ? this.roundToDecimal(updatedStats.blocks / updatedStats.games, 1) : 0;
    updatedStats.tpg = updatedStats.games > 0 ? this.roundToDecimal(updatedStats.turnovers / updatedStats.games, 1) : 0;
    updatedStats.fg_pct =
      updatedStats.fg_attempted > 0 ? this.roundToDecimal(updatedStats.fg_made / updatedStats.fg_attempted, 3) : 0;
    updatedStats.three_pct =
      updatedStats.three_attempted > 0
        ? this.roundToDecimal(updatedStats.three_made / updatedStats.three_attempted, 3)
        : 0;
    updatedStats.ft_pct =
      updatedStats.ft_attempted > 0 ? this.roundToDecimal(updatedStats.ft_made / updatedStats.ft_attempted, 3) : 0;

    return updatedStats;
  }

  /**
   * Calculate league-wide statistics
   * @param allTeamStats Array of all team season stats
   * @returns League statistics
   */
  public calculateLeagueStats(allTeamStats: TeamSeasonStats[]): {
    league_ppg: number;
    league_fg_pct: number;
    league_three_pct: number;
    league_ft_pct: number;
    league_rpg: number;
    league_apg: number;
    league_spg: number;
    league_bpg: number;
    league_tpg: number;
  } {
    if (allTeamStats.length === 0) {
      return {
        league_ppg: 0,
        league_fg_pct: 0,
        league_three_pct: 0,
        league_ft_pct: 0,
        league_rpg: 0,
        league_apg: 0,
        league_spg: 0,
        league_bpg: 0,
        league_tpg: 0,
      };
    }

    const totals = allTeamStats.reduce(
      (acc, team) => ({
        ppg: acc.ppg + team.ppg,
        fg_pct: acc.fg_pct + team.fg_pct,
        three_pct: acc.three_pct + team.three_pct,
        ft_pct: acc.ft_pct + team.ft_pct,
        rpg: acc.rpg + team.rpg,
        apg: acc.apg + team.apg,
        spg: acc.spg + team.spg,
        bpg: acc.bpg + team.bpg,
        tpg: acc.tpg + team.tpg,
      }),
      {
        ppg: 0,
        fg_pct: 0,
        three_pct: 0,
        ft_pct: 0,
        rpg: 0,
        apg: 0,
        spg: 0,
        bpg: 0,
        tpg: 0,
      }
    );

    return {
      league_ppg: this.roundToDecimal(totals.ppg / allTeamStats.length, 1),
      league_fg_pct: this.roundToDecimal(totals.fg_pct / allTeamStats.length, 3),
      league_three_pct: this.roundToDecimal(totals.three_pct / allTeamStats.length, 3),
      league_ft_pct: this.roundToDecimal(totals.ft_pct / allTeamStats.length, 3),
      league_rpg: this.roundToDecimal(totals.rpg / allTeamStats.length, 1),
      league_apg: this.roundToDecimal(totals.apg / allTeamStats.length, 1),
      league_spg: this.roundToDecimal(totals.spg / allTeamStats.length, 1),
      league_bpg: this.roundToDecimal(totals.bpg / allTeamStats.length, 1),
      league_tpg: this.roundToDecimal(totals.tpg / allTeamStats.length, 1),
    };
  }

  /**
   * Calculate player efficiency rating (PER)
   * @param playerStats Player season statistics
   * @returns Player efficiency rating
   */
  public calculatePER(playerStats: PlayerSeasonStats): number {
    if (playerStats.games === 0) return 0;

    // Simplified PER calculation
    const per =
      (playerStats.points +
        playerStats.rebounds +
        playerStats.assists +
        playerStats.steals +
        playerStats.blocks -
        playerStats.turnovers) /
      playerStats.games;

    return this.roundToDecimal(per, 1);
  }

  /**
   * Calculate true shooting percentage
   * @param points Points scored
   * @param fg_attempted Field goals attempted
   * @param ft_attempted Free throws attempted
   * @returns True shooting percentage
   */
  public calculateTrueShootingPercentage(points: number, fg_attempted: number, ft_attempted: number): number {
    if (fg_attempted === 0 && ft_attempted === 0) return 0;

    const tsPct = points / (2 * (fg_attempted + 0.44 * ft_attempted));
    return this.roundToDecimal(tsPct, 3);
  }

  /**
   * Calculate usage rate for a player
   * @param playerStats Player statistics
   * @param teamStats Team statistics
   * @returns Usage rate percentage
   */
  public calculateUsageRate(playerStats: PlayerSeasonStats, teamStats: TeamSeasonStats): number {
    if (teamStats.games === 0 || playerStats.games === 0) return 0;

    const teamMinutes = teamStats.games * 240; // 5 players * 48 minutes
    const playerMinutes = playerStats.minutes;
    const usageRate =
      (playerStats.fg_attempted + 0.44 * playerStats.ft_attempted + playerStats.turnovers) /
      ((playerMinutes / teamMinutes) * (teamStats.fg_attempted + 0.44 * teamStats.ft_attempted + teamStats.turnovers));

    return this.roundToDecimal(usageRate * 100, 1);
  }

  /**
   * Calculate win shares for a player
   * @param playerStats Player statistics
   * @param teamWins Team wins
   * @param teamGames Team games
   * @returns Win shares
   */
  public calculateWinShares(playerStats: PlayerSeasonStats, teamWins: number, teamGames: number): number {
    if (teamGames === 0 || playerStats.games === 0) return 0;

    // Simplified win shares calculation
    const teamWinPct = teamWins / teamGames;
    const playerContribution =
      (playerStats.points + playerStats.rebounds + playerStats.assists) / (playerStats.games * 20); // Normalize to per-game contribution

    const winShares = playerContribution * teamWinPct * playerStats.games;
    return this.roundToDecimal(winShares, 1);
  }

  /**
   * Get empty career statistics object
   * @returns Empty career stats
   */
  private getEmptyCareerStats(): PlayerCareerStats {
    return {
      seasons: 0,
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
      fg_pct: 0,
      three_pct: 0,
      ft_pct: 0,
    };
  }

  /**
   * Get empty team statistics object
   * @returns Empty team stats
   */
  private getEmptyTeamStats(): TeamSeasonStats {
    return {
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
    };
  }

  /**
   * Round number to specified decimal places
   * @param num Number to round
   * @param decimals Number of decimal places
   * @returns Rounded number
   */
  private roundToDecimal(num: number, decimals: number): number {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Calculate advanced statistics for a player
   * @param playerStats Player season statistics
   * @returns Advanced statistics object
   */
  public calculateAdvancedStats(playerStats: PlayerSeasonStats): {
    per: number;
    tsPct: number;
    efgPct: number;
    pace: number;
  } {
    const per = this.calculatePER(playerStats);
    const tsPct = this.calculateTrueShootingPercentage(
      playerStats.points,
      playerStats.fg_attempted,
      playerStats.ft_attempted
    );

    // Effective field goal percentage
    const efgPct =
      playerStats.fg_attempted > 0
        ? (playerStats.fg_made + 0.5 * playerStats.three_made) / playerStats.fg_attempted
        : 0;

    // Pace (simplified)
    const pace = playerStats.games > 0 ? playerStats.fg_attempted / playerStats.games : 0;

    return {
      per: this.roundToDecimal(per, 1),
      tsPct: this.roundToDecimal(tsPct, 3),
      efgPct: this.roundToDecimal(efgPct, 3),
      pace: this.roundToDecimal(pace, 1),
    };
  }

  /**
   * Calculate team advanced statistics
   * @param teamStats Team season statistics
   * @returns Team advanced statistics
   */
  public calculateTeamAdvancedStats(teamStats: TeamSeasonStats): {
    offensiveRating: number;
    defensiveRating: number;
    netRating: number;
    pace: number;
  } {
    // Simplified calculations
    const offensiveRating = teamStats.ppg;
    const defensiveRating = teamStats.opp_ppg;
    const netRating = offensiveRating - defensiveRating;
    const pace = teamStats.games > 0 ? (teamStats.fg_attempted + teamStats.ft_attempted) / teamStats.games : 0;

    return {
      offensiveRating: this.roundToDecimal(offensiveRating, 1),
      defensiveRating: this.roundToDecimal(defensiveRating, 1),
      netRating: this.roundToDecimal(netRating, 1),
      pace: this.roundToDecimal(pace, 1),
    };
  }
}

/**
 * Export singleton instance for easy access
 */
export const statsCalculator = StatsCalculator.getInstance();
