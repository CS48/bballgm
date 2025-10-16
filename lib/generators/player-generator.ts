"use client"

/**
 * Player Generator - Generate realistic players
 * 
 * This service generates realistic basketball players with appropriate
 * attributes, names, and statistical profiles based on their position.
 * It ensures balanced rosters and realistic player development.
 */

import { Player, PlayerPosition, PlayerAttributes, DraftInfo, PlayerSeasonStats } from '../types/database';

/**
 * PlayerGenerator class that creates realistic basketball players
 */
export class PlayerGenerator {
  private static instance: PlayerGenerator;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of PlayerGenerator
   * @returns PlayerGenerator instance
   */
  public static getInstance(): PlayerGenerator {
    if (!PlayerGenerator.instance) {
      PlayerGenerator.instance = new PlayerGenerator();
    }
    return PlayerGenerator.instance;
  }

  /**
   * Generate a complete player with all attributes and initial stats
   * @param teamId Team ID to assign player to
   * @param position Player position
   * @param age Player age (optional, will be generated if not provided)
   * @returns Generated player object
   */
  public generatePlayer(teamId: number, position: PlayerPosition, age?: number): Omit<Player, 'player_id'> {
    const playerAge = age || this.generateAge();
    const name = this.generateName();
    const physical = this.generatePhysicalAttributes(position);
    const attributes = this.generateAttributes(position, playerAge);
    const draftInfo = this.generateDraftInfo(playerAge);
    const initialStats = this.generateInitialStats();

    return {
      team_id: teamId,
      first_name: name.first,
      last_name: name.last,
      age: playerAge,
      position,
      height: physical.height,
      weight: physical.weight,
      years_pro: Math.max(0, playerAge - 19), // Assume players start at 19
      draft_info: JSON.stringify(draftInfo),
      speed: attributes.speed,
      ball_iq: attributes.ball_iq,
      inside_shot: attributes.inside_shot,
      three_point_shot: attributes.three_point_shot,
      pass: attributes.pass,
      skill_move: attributes.skill_move,
      on_ball_defense: attributes.on_ball_defense,
      stamina: attributes.stamina,
      block: attributes.block,
      steal: attributes.steal,
      offensive_rebound: attributes.offensive_rebound,
      defensive_rebound: attributes.defensive_rebound,
      current_season_stats: JSON.stringify(initialStats),
      historical_stats: JSON.stringify([]),
      career_stats: JSON.stringify(this.calculateCareerStats([]))
    };
  }

  /**
   * Generate a complete roster for a team
   * @param teamId Team ID to assign players to
   * @returns Array of generated players
   */
  public generateRoster(teamId: number): Omit<Player, 'player_id'>[] {
    const roster: Omit<Player, 'player_id'>[] = [];
    
    // Position distribution for a 15-player roster
    const positionCounts = {
      'PG': 3,  // 3 point guards
      'SG': 3,  // 3 shooting guards
      'SF': 3,  // 3 small forwards
      'PF': 3,  // 3 power forwards
      'C': 3    // 3 centers
    };

    // Generate players for each position
    Object.entries(positionCounts).forEach(([position, count]) => {
      for (let i = 0; i < count; i++) {
        const player = this.generatePlayer(teamId, position as PlayerPosition);
        roster.push(player);
      }
    });

    return roster;
  }

  /**
   * Generate a realistic player name
   * @returns Object with first and last name
   */
  private generateName(): { first: string; last: string } {
    const firstNames = [
      'James', 'Michael', 'LeBron', 'Kobe', 'Kevin', 'Stephen', 'Russell', 'Magic',
      'Larry', 'Tim', 'Kareem', 'Shaquille', 'Allen', 'Paul', 'Chris', 'Derrick',
      'Dwyane', 'Carmelo', 'Dwight', 'Blake', 'Anthony', 'Damian', 'Kyle', 'Jimmy',
      'Kawhi', 'Giannis', 'Joel', 'Jayson', 'Luka', 'Trae', 'Zion', 'Ja', 'Devin',
      'Bradley', 'Jrue', 'Khris', 'Brook', 'Eric', 'Tobias', 'Ben', 'Joel',
      'Jayson', 'Jaylen', 'Marcus', 'Al', 'Kemba', 'Gordon', 'Terry', 'Daniel',
      'Robert', 'Grant', 'Semi', 'Enes', 'Brad', 'Carsen', 'Tremont', 'Vincent'
    ];

    const lastNames = [
      'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez',
      'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
      'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris',
      'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen',
      'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
      'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter',
      'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz'
    ];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    return { first: firstName, last: lastName };
  }

  /**
   * Generate realistic age for a player
   * @returns Player age (19-40)
   */
  private generateAge(): number {
    // Weighted distribution: more young players, fewer old players
    const weights = [
      { age: 19, weight: 5 },
      { age: 20, weight: 8 },
      { age: 21, weight: 10 },
      { age: 22, weight: 12 },
      { age: 23, weight: 15 },
      { age: 24, weight: 15 },
      { age: 25, weight: 12 },
      { age: 26, weight: 10 },
      { age: 27, weight: 8 },
      { age: 28, weight: 5 },
      { age: 29, weight: 3 },
      { age: 30, weight: 2 },
      { age: 31, weight: 1 },
      { age: 32, weight: 1 },
      { age: 33, weight: 1 },
      { age: 34, weight: 1 },
      { age: 35, weight: 1 },
      { age: 36, weight: 1 },
      { age: 37, weight: 1 },
      { age: 38, weight: 1 },
      { age: 39, weight: 1 },
      { age: 40, weight: 1 }
    ];

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;

    for (const weight of weights) {
      random -= weight.weight;
      if (random <= 0) {
        return weight.age;
      }
    }

    return 25; // Fallback
  }

  /**
   * Generate physical attributes based on position
   * @param position Player position
   * @returns Object with height and weight
   */
  private generatePhysicalAttributes(position: PlayerPosition): { height: number; weight: number } {
    const positionRanges = {
      'PG': { height: [70, 78], weight: [160, 200] },
      'SG': { height: [74, 80], weight: [180, 220] },
      'SF': { height: [78, 84], weight: [200, 240] },
      'PF': { height: [80, 86], weight: [220, 260] },
      'C': { height: [82, 88], weight: [240, 280] }
    };

    const range = positionRanges[position];
    const height = Math.floor(Math.random() * (range.height[1] - range.height[0] + 1)) + range.height[0];
    const weight = Math.floor(Math.random() * (range.weight[1] - range.weight[0] + 1)) + range.weight[0];

    return { height, weight };
  }

  /**
   * Generate player attributes based on position and age
   * @param position Player position
   * @param age Player age
   * @returns Player attributes object
   */
  private generateAttributes(position: PlayerPosition, age: number): PlayerAttributes {
    const baseAttributes = this.getPositionBaseAttributes(position);
    const ageModifier = this.getAgeModifier(age);
    
    const attributes: PlayerAttributes = {
      speed: this.applyModifier(baseAttributes.speed, ageModifier.speed),
      ball_iq: this.applyModifier(baseAttributes.ball_iq, ageModifier.ball_iq),
      inside_shot: this.applyModifier(baseAttributes.inside_shot, ageModifier.inside_shot),
      three_point_shot: this.applyModifier(baseAttributes.three_point_shot, ageModifier.three_point_shot),
      pass: this.applyModifier(baseAttributes.pass, ageModifier.pass),
      skill_move: this.applyModifier(baseAttributes.skill_move, ageModifier.skill_move),
      on_ball_defense: this.applyModifier(baseAttributes.on_ball_defense, ageModifier.on_ball_defense),
      stamina: this.applyModifier(baseAttributes.stamina, ageModifier.stamina),
      block: this.applyModifier(baseAttributes.block, ageModifier.block),
      steal: this.applyModifier(baseAttributes.steal, ageModifier.steal),
      offensive_rebound: this.applyModifier(baseAttributes.offensive_rebound, ageModifier.offensive_rebound),
      defensive_rebound: this.applyModifier(baseAttributes.defensive_rebound, ageModifier.defensive_rebound)
    };

    // Ensure all attributes are within 0-100 range
    Object.keys(attributes).forEach(key => {
      attributes[key as keyof PlayerAttributes] = Math.max(0, Math.min(100, attributes[key as keyof PlayerAttributes]));
    });

    return attributes;
  }

  /**
   * Get base attributes for a position
   * @param position Player position
   * @returns Base attributes for the position
   */
  private getPositionBaseAttributes(position: PlayerPosition): PlayerAttributes {
    const positionAttributes = {
      'PG': {
        speed: 75, ball_iq: 80, inside_shot: 60, three_point_shot: 70,
        pass: 85, skill_move: 80, on_ball_defense: 70, stamina: 75,
        block: 30, steal: 75, offensive_rebound: 40, defensive_rebound: 50
      },
      'SG': {
        speed: 70, ball_iq: 75, inside_shot: 70, three_point_shot: 80,
        pass: 70, skill_move: 75, on_ball_defense: 70, stamina: 70,
        block: 40, steal: 70, offensive_rebound: 45, defensive_rebound: 55
      },
      'SF': {
        speed: 65, ball_iq: 70, inside_shot: 75, three_point_shot: 75,
        pass: 65, skill_move: 70, on_ball_defense: 75, stamina: 70,
        block: 60, steal: 65, offensive_rebound: 60, defensive_rebound: 70
      },
      'PF': {
        speed: 55, ball_iq: 65, inside_shot: 80, three_point_shot: 60,
        pass: 55, skill_move: 60, on_ball_defense: 70, stamina: 65,
        block: 75, steal: 55, offensive_rebound: 80, defensive_rebound: 85
      },
      'C': {
        speed: 45, ball_iq: 60, inside_shot: 85, three_point_shot: 40,
        pass: 50, skill_move: 50, on_ball_defense: 75, stamina: 60,
        block: 85, steal: 45, offensive_rebound: 85, defensive_rebound: 90
      }
    };

    return positionAttributes[position];
  }

  /**
   * Get age modifier for attributes
   * @param age Player age
   * @returns Modifier object for each attribute
   */
  private getAgeModifier(age: number): PlayerAttributes {
    // Young players (19-22): High potential, lower current ability
    if (age <= 22) {
      return {
        speed: 10, ball_iq: -15, inside_shot: -10, three_point_shot: -10,
        pass: -10, skill_move: 5, on_ball_defense: -10, stamina: 10,
        block: -5, steal: -5, offensive_rebound: -5, defensive_rebound: -5
      };
    }
    // Prime players (23-29): Peak performance
    else if (age <= 29) {
      return {
        speed: 5, ball_iq: 10, inside_shot: 5, three_point_shot: 5,
        pass: 10, skill_move: 5, on_ball_defense: 5, stamina: 5,
        block: 5, steal: 5, offensive_rebound: 5, defensive_rebound: 5
      };
    }
    // Veteran players (30-35): Experience, declining physical
    else if (age <= 35) {
      return {
        speed: -10, ball_iq: 15, inside_shot: 5, three_point_shot: 5,
        pass: 10, skill_move: -5, on_ball_defense: 5, stamina: -10,
        block: 0, steal: -5, offensive_rebound: 0, defensive_rebound: 0
      };
    }
    // Old players (36+): Significant decline
    else {
      return {
        speed: -20, ball_iq: 10, inside_shot: -10, three_point_shot: -5,
        pass: 5, skill_move: -15, on_ball_defense: -10, stamina: -20,
        block: -10, steal: -15, offensive_rebound: -10, defensive_rebound: -5
      };
    }
  }

  /**
   * Apply modifier to base attribute with randomness
   * @param base Base attribute value
   * @param modifier Modifier to apply
   * @returns Modified attribute value
   */
  private applyModifier(base: number, modifier: number): number {
    const randomVariation = (Math.random() - 0.5) * 20; // ±10 random variation
    return Math.round(base + modifier + randomVariation);
  }

  /**
   * Generate draft information for a player
   * @param age Player age
   * @returns Draft information object
   */
  private generateDraftInfo(age: number): DraftInfo {
    const draftYear = new Date().getFullYear() - (age - 19); // Assume drafted at 19
    const pick = Math.floor(Math.random() * 60) + 1; // 1-60 draft picks
    
    const teams = [
      'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
      'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
      'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS'
    ];
    
    const team = teams[Math.floor(Math.random() * teams.length)];
    
    return {
      pick,
      team,
      year: draftYear
    };
  }

  /**
   * Generate initial season statistics (all zeros for new season)
   * @returns Initial stats object
   */
  private generateInitialStats(): PlayerSeasonStats {
    return {
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
      plus_minus: 0
    };
  }

  /**
   * Calculate career statistics from historical seasons
   * @param historicalSeasons Array of historical season stats
   * @returns Career statistics object
   */
  private calculateCareerStats(historicalSeasons: PlayerSeasonStats[]): any {
    if (historicalSeasons.length === 0) {
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
        ft_pct: 0
      };
    }

    const totals = historicalSeasons.reduce((acc, season) => ({
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
      ft_attempted: acc.ft_attempted + season.ft_attempted
    }), {
      games: 0, minutes: 0, points: 0, rebounds: 0, assists: 0,
      steals: 0, blocks: 0, turnovers: 0, fg_made: 0, fg_attempted: 0,
      three_made: 0, three_attempted: 0, ft_made: 0, ft_attempted: 0
    });

    return {
      seasons: historicalSeasons.length,
      games: totals.games,
      minutes: totals.minutes,
      points: totals.points,
      ppg: totals.games > 0 ? totals.points / totals.games : 0,
      rebounds: totals.rebounds,
      rpg: totals.games > 0 ? totals.rebounds / totals.games : 0,
      assists: totals.assists,
      apg: totals.games > 0 ? totals.assists / totals.games : 0,
      steals: totals.steals,
      spg: totals.games > 0 ? totals.steals / totals.games : 0,
      blocks: totals.blocks,
      bpg: totals.games > 0 ? totals.blocks / totals.games : 0,
      turnovers: totals.turnovers,
      tpg: totals.games > 0 ? totals.turnovers / totals.games : 0,
      fg_pct: totals.fg_attempted > 0 ? totals.fg_made / totals.fg_attempted : 0,
      three_pct: totals.three_attempted > 0 ? totals.three_made / totals.three_attempted : 0,
      ft_pct: totals.ft_attempted > 0 ? totals.ft_made / totals.ft_attempted : 0
    };
  }
}

/**
 * Export singleton instance for easy access
 */
export const playerGenerator = PlayerGenerator.getInstance();
