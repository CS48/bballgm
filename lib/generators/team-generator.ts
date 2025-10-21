"use client"

/**
 * Team Generator - Generate teams with rosters
 * 
 * This service generates the 30 NBA teams with their complete rosters,
 * ensuring proper conference distribution and realistic team composition.
 */

import { Team, Conference, TeamSeasonStats } from '../types/database';
import { playerGenerator } from './player-generator';

/**
 * TeamGenerator class that creates NBA teams with complete rosters
 */
export class TeamGenerator {
  private static instance: TeamGenerator;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of TeamGenerator
   * @returns TeamGenerator instance
   */
  public static getInstance(): TeamGenerator {
    if (!TeamGenerator.instance) {
      TeamGenerator.instance = new TeamGenerator();
    }
    return TeamGenerator.instance;
  }

  /**
   * Generate all 30 NBA teams with complete rosters
   * @param teamQualities Map of team ID to quality tier
   * @returns Array of generated teams with their rosters
   */
  public generateAllTeams(teamQualities?: Map<number, string>): { team: Omit<Team, 'team_id'>; players: Omit<any, 'player_id'>[] }[] {
    const teams = this.getNBATeams();
    const generatedTeams: { team: Omit<Team, 'team_id'>; players: Omit<any, 'player_id'>[] }[] = [];

    teams.forEach((teamData, index) => {
      const team = this.generateTeam(teamData.city, teamData.name, teamData.conference);
      const teamId = index + 1;
      const teamQuality = teamQualities?.get(teamId) || 'mid-tier';
      const players = playerGenerator.generateRoster(teamId, teamQuality);
      
      generatedTeams.push({ team, players });
    });

    return generatedTeams;
  }

  /**
   * Generate a single team with basic information
   * @param city Team city
   * @param name Team name
   * @param conference Team conference
   * @returns Generated team object
   */
  public generateTeam(city: string, name: string, conference: Conference): Omit<Team, 'team_id'> {
    const initialStats = this.generateInitialTeamStats();
    const initialSchedule = this.generateInitialSchedule();
    const abbreviation = this.getTeamAbbreviation(city, name);

    return {
      city,
      name,
      abbreviation,
      conference,
      wins: 0,
      losses: 0,
      current_season_stats: JSON.stringify(initialStats),
      historical_records: JSON.stringify([]),
      schedule: JSON.stringify(initialSchedule)
    };
  }

  /**
   * Get the list of all 30 NBA teams with their cities and conferences
   * @returns Array of team data objects
   */
  private getNBATeams(): Array<{ city: string; name: string; conference: Conference }> {
    return [
      // Eastern Conference
      { city: 'Atlanta', name: 'Hawks', conference: 'East' },
      { city: 'Boston', name: 'Celtics', conference: 'East' },
      { city: 'Brooklyn', name: 'Nets', conference: 'East' },
      { city: 'Charlotte', name: 'Hornets', conference: 'East' },
      { city: 'Chicago', name: 'Bulls', conference: 'East' },
      { city: 'Cleveland', name: 'Cavaliers', conference: 'East' },
      { city: 'Detroit', name: 'Pistons', conference: 'East' },
      { city: 'Indiana', name: 'Pacers', conference: 'East' },
      { city: 'Miami', name: 'Heat', conference: 'East' },
      { city: 'Milwaukee', name: 'Bucks', conference: 'East' },
      { city: 'New York', name: 'Knicks', conference: 'East' },
      { city: 'Orlando', name: 'Magic', conference: 'East' },
      { city: 'Philadelphia', name: '76ers', conference: 'East' },
      { city: 'Toronto', name: 'Raptors', conference: 'East' },
      { city: 'Washington', name: 'Wizards', conference: 'East' },
      
      // Western Conference
      { city: 'Dallas', name: 'Mavericks', conference: 'West' },
      { city: 'Denver', name: 'Nuggets', conference: 'West' },
      { city: 'Golden State', name: 'Warriors', conference: 'West' },
      { city: 'Houston', name: 'Rockets', conference: 'West' },
      { city: 'Los Angeles', name: 'Clippers', conference: 'West' },
      { city: 'Los Angeles', name: 'Lakers', conference: 'West' },
      { city: 'Memphis', name: 'Grizzlies', conference: 'West' },
      { city: 'Minnesota', name: 'Timberwolves', conference: 'West' },
      { city: 'New Orleans', name: 'Pelicans', conference: 'West' },
      { city: 'Oklahoma City', name: 'Thunder', conference: 'West' },
      { city: 'Phoenix', name: 'Suns', conference: 'West' },
      { city: 'Portland', name: 'Trail Blazers', conference: 'West' },
      { city: 'Sacramento', name: 'Kings', conference: 'West' },
      { city: 'San Antonio', name: 'Spurs', conference: 'West' },
      { city: 'Utah', name: 'Jazz', conference: 'West' }
    ];
  }

  /**
   * Generate initial team statistics (all zeros for new season)
   * @returns Initial team stats object
   */
  private generateInitialTeamStats(): TeamSeasonStats {
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
      tpg: 0
    };
  }

  /**
   * Generate initial empty schedule (will be populated by schedule generator)
   * @returns Empty schedule array
   */
  private generateInitialSchedule(): any[] {
    return [];
  }

  /**
   * Get teams by conference
   * @param conference Conference to filter by
   * @returns Array of teams in that conference
   */
  public getTeamsByConference(conference: Conference): Array<{ city: string; name: string; conference: Conference }> {
    return this.getNBATeams().filter(team => team.conference === conference);
  }

  /**
   * Get team abbreviation (3-letter code)
   * @param city Team city
   * @param name Team name
   * @returns 3-letter team abbreviation
   */
  public getTeamAbbreviation(city: string, name: string): string {
    const abbreviations: Record<string, string> = {
      'Atlanta Hawks': 'ATL',
      'Boston Celtics': 'BOS',
      'Brooklyn Nets': 'BKN',
      'Charlotte Hornets': 'CHA',
      'Chicago Bulls': 'CHI',
      'Cleveland Cavaliers': 'CLE',
      'Dallas Mavericks': 'DAL',
      'Denver Nuggets': 'DEN',
      'Detroit Pistons': 'DET',
      'Golden State Warriors': 'GSW',
      'Houston Rockets': 'HOU',
      'Indiana Pacers': 'IND',
      'Los Angeles Clippers': 'LAC',
      'Los Angeles Lakers': 'LAL',
      'Memphis Grizzlies': 'MEM',
      'Miami Heat': 'MIA',
      'Milwaukee Bucks': 'MIL',
      'Minnesota Timberwolves': 'MIN',
      'New Orleans Pelicans': 'NOP',
      'New York Knicks': 'NYK',
      'Oklahoma City Thunder': 'OKC',
      'Orlando Magic': 'ORL',
      'Philadelphia 76ers': 'PHI',
      'Phoenix Suns': 'PHX',
      'Portland Trail Blazers': 'POR',
      'Sacramento Kings': 'SAC',
      'San Antonio Spurs': 'SAS',
      'Toronto Raptors': 'TOR',
      'Utah Jazz': 'UTA',
      'Washington Wizards': 'WAS'
    };

    const fullName = `${city} ${name}`;
    return abbreviations[fullName] || 'UNK';
  }

  /**
   * Get team colors (primary and secondary)
   * @param city Team city
   * @param name Team name
   * @returns Object with primary and secondary colors
   */
  public getTeamColors(city: string, name: string): { primary: string; secondary: string } {
    const colors: Record<string, { primary: string; secondary: string }> = {
      'Atlanta Hawks': { primary: '#E03A3E', secondary: '#C1D32F' },
      'Boston Celtics': { primary: '#007A33', secondary: '#BA9653' },
      'Brooklyn Nets': { primary: '#000000', secondary: '#FFFFFF' },
      'Charlotte Hornets': { primary: '#1D1160', secondary: '#00788C' },
      'Chicago Bulls': { primary: '#CE1141', secondary: '#000000' },
      'Cleveland Cavaliers': { primary: '#860038', secondary: '#FDBB30' },
      'Dallas Mavericks': { primary: '#00538C', secondary: '#002B5C' },
      'Denver Nuggets': { primary: '#0E2240', secondary: '#FEC524' },
      'Detroit Pistons': { primary: '#C8102E', secondary: '#1D42BA' },
      'Golden State Warriors': { primary: '#1D428A', secondary: '#FFC72C' },
      'Houston Rockets': { primary: '#CE1141', secondary: '#000000' },
      'Indiana Pacers': { primary: '#002D62', secondary: '#FDBB30' },
      'Los Angeles Clippers': { primary: '#C8102E', secondary: '#1D428A' },
      'Los Angeles Lakers': { primary: '#552583', secondary: '#FDB927' },
      'Memphis Grizzlies': { primary: '#5D76A9', secondary: '#12173F' },
      'Miami Heat': { primary: '#98002E', secondary: '#F9A01B' },
      'Milwaukee Bucks': { primary: '#00471B', secondary: '#EEE1C6' },
      'Minnesota Timberwolves': { primary: '#0C2340', secondary: '#236192' },
      'New Orleans Pelicans': { primary: '#0C2340', secondary: '#C8102E' },
      'New York Knicks': { primary: '#006BB6', secondary: '#F58426' },
      'Oklahoma City Thunder': { primary: '#007AC1', secondary: '#EF3B24' },
      'Orlando Magic': { primary: '#0077C0', secondary: '#C4CED4' },
      'Philadelphia 76ers': { primary: '#006BB6', secondary: '#ED174C' },
      'Phoenix Suns': { primary: '#1D1160', secondary: '#E56020' },
      'Portland Trail Blazers': { primary: '#E03A3E', secondary: '#000000' },
      'Sacramento Kings': { primary: '#5A2D81', secondary: '#63727A' },
      'San Antonio Spurs': { primary: '#C4CED4', secondary: '#000000' },
      'Toronto Raptors': { primary: '#CE1141', secondary: '#000000' },
      'Utah Jazz': { primary: '#002B5C', secondary: '#F9A01B' },
      'Washington Wizards': { primary: '#002B5C', secondary: '#E31837' }
    };

    const fullName = `${city} ${name}`;
    return colors[fullName] || { primary: '#000000', secondary: '#FFFFFF' };
  }

  /**
   * Get team arena information
   * @param city Team city
   * @param name Team name
   * @returns Arena name and capacity
   */
  public getTeamArena(city: string, name: string): { name: string; capacity: number } {
    const arenas: Record<string, { name: string; capacity: number }> = {
      'Atlanta Hawks': { name: 'State Farm Arena', capacity: 18118 },
      'Boston Celtics': { name: 'TD Garden', capacity: 19156 },
      'Brooklyn Nets': { name: 'Barclays Center', capacity: 17732 },
      'Charlotte Hornets': { name: 'Spectrum Center', capacity: 19077 },
      'Chicago Bulls': { name: 'United Center', capacity: 20917 },
      'Cleveland Cavaliers': { name: 'Rocket Mortgage FieldHouse', capacity: 19432 },
      'Dallas Mavericks': { name: 'American Airlines Center', capacity: 19200 },
      'Denver Nuggets': { name: 'Ball Arena', capacity: 19520 },
      'Detroit Pistons': { name: 'Little Caesars Arena', capacity: 20491 },
      'Golden State Warriors': { name: 'Chase Center', capacity: 18064 },
      'Houston Rockets': { name: 'Toyota Center', capacity: 18055 },
      'Indiana Pacers': { name: 'Gainbridge Fieldhouse', capacity: 17923 },
      'Los Angeles Clippers': { name: 'Crypto.com Arena', capacity: 19068 },
      'Los Angeles Lakers': { name: 'Crypto.com Arena', capacity: 19068 },
      'Memphis Grizzlies': { name: 'FedExForum', capacity: 18119 },
      'Miami Heat': { name: 'FTX Arena', capacity: 19600 },
      'Milwaukee Bucks': { name: 'Fiserv Forum', capacity: 17500 },
      'Minnesota Timberwolves': { name: 'Target Center', capacity: 19356 },
      'New Orleans Pelicans': { name: 'Smoothie King Center', capacity: 16867 },
      'New York Knicks': { name: 'Madison Square Garden', capacity: 20789 },
      'Oklahoma City Thunder': { name: 'Paycom Center', capacity: 18203 },
      'Orlando Magic': { name: 'Amway Center', capacity: 18846 },
      'Philadelphia 76ers': { name: 'Wells Fargo Center', capacity: 20478 },
      'Phoenix Suns': { name: 'Footprint Center', capacity: 18055 },
      'Portland Trail Blazers': { name: 'Moda Center', capacity: 19393 },
      'Sacramento Kings': { name: 'Golden 1 Center', capacity: 17608 },
      'San Antonio Spurs': { name: 'AT&T Center', capacity: 18418 },
      'Toronto Raptors': { name: 'Scotiabank Arena', capacity: 19800 },
      'Utah Jazz': { name: 'Vivint Arena', capacity: 18306 },
      'Washington Wizards': { name: 'Capital One Arena', capacity: 20356 }
    };

    const fullName = `${city} ${name}`;
    return arenas[fullName] || { name: 'Unknown Arena', capacity: 18000 };
  }

  /**
   * Validate team roster composition
   * @param players Array of players to validate
   * @returns Object with validation results
   */
  public validateRoster(players: any[]): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check roster size
    if (players.length !== 15) {
      issues.push(`Roster size is ${players.length}, expected 15`);
    }

    // Check position distribution
    const positionCounts = players.reduce((acc, player) => {
      acc[player.position] = (acc[player.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const expectedPositions = { 'PG': 3, 'SG': 3, 'SF': 3, 'PF': 3, 'C': 3 };
    Object.entries(expectedPositions).forEach(([position, expected]) => {
      const actual = positionCounts[position] || 0;
      if (actual !== expected) {
        issues.push(`${position}: ${actual} players, expected ${expected}`);
      }
    });

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Assign team quality tiers to all 30 teams
   * @returns Map of team ID to quality tier
   */
  public assignTeamQualities(): Map<number, string> {
    const qualities: string[] = [
      // 3 championship contenders
      'championship', 'championship', 'championship',
      // 8 playoff teams
      'playoff', 'playoff', 'playoff', 'playoff', 
      'playoff', 'playoff', 'playoff', 'playoff',
      // 10 mid-tier teams
      'mid-tier', 'mid-tier', 'mid-tier', 'mid-tier', 'mid-tier',
      'mid-tier', 'mid-tier', 'mid-tier', 'mid-tier', 'mid-tier',
      // 6 rebuilding teams
      'rebuilding', 'rebuilding', 'rebuilding', 
      'rebuilding', 'rebuilding', 'rebuilding',
      // 3 lottery teams
      'lottery', 'lottery', 'lottery'
    ];
    
    // Shuffle to randomize which teams get which tier
    const shuffled = qualities.sort(() => Math.random() - 0.5);
    
    const teamQualities = new Map<number, string>();
    for (let i = 0; i < 30; i++) {
      teamQualities.set(i + 1, shuffled[i]);
    }
    
    return teamQualities;
  }

  /**
   * Get team market size (affects free agency, revenue, etc.)
   * @param city Team city
   * @returns Market size category
   */
  public getTeamMarketSize(city: string): 'large' | 'medium' | 'small' {
    const largeMarkets = ['Los Angeles', 'New York', 'Chicago', 'Boston', 'Philadelphia', 'Dallas', 'Houston', 'Miami'];
    const mediumMarkets = ['Atlanta', 'Phoenix', 'Detroit', 'Seattle', 'Denver', 'Minneapolis', 'Cleveland', 'Orlando'];
    
    if (largeMarkets.includes(city)) {
      return 'large';
    } else if (mediumMarkets.includes(city)) {
      return 'medium';
    } else {
      return 'small';
    }
  }
}

/**
 * Export singleton instance for easy access
 */
export const teamGenerator = TeamGenerator.getInstance();
