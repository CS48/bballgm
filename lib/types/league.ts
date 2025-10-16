/**
 * League Type Definitions
 * 
 * This file contains TypeScript interfaces and types for league-related
 * data structures used in the basketball simulation system. These types
 * define the overall league structure, standings, and related functionality.
 */

import { Conference, PlayerPosition } from './database';

/**
 * League standings entry interface
 * Represents a team's position in the standings
 */
export interface StandingsEntry {
  /** Team ID */
  team_id: number;
  /** Team name */
  team_name: string;
  /** Team city */
  city: string;
  /** Conference */
  conference: Conference;
  /** Games played */
  games: number;
  /** Wins */
  wins: number;
  /** Losses */
  losses: number;
  /** Win percentage */
  win_pct: number;
  /** Games behind first place */
  games_behind: number;
  /** Current streak (W3, L2, etc.) */
  streak: string;
  /** Home record */
  home_record: string;
  /** Away record */
  away_record: string;
  /** Conference record */
  conf_record: string;
  /** Last 10 games record */
  last_10: string;
}

/**
 * League standings interface
 * Contains complete standings for the league
 */
export interface LeagueStandings {
  /** Eastern Conference standings */
  eastern: StandingsEntry[];
  /** Western Conference standings */
  western: StandingsEntry[];
  /** Overall league standings */
  overall: StandingsEntry[];
}

/**
 * Season information interface
 * Contains details about the current or specified season
 */
export interface SeasonInfo {
  /** Season year */
  year: number;
  /** Season start date */
  start_date: string;
  /** Season end date */
  end_date: string;
  /** Number of games per team */
  games_per_team: number;
  /** Whether playoffs are enabled */
  playoffs_enabled: boolean;
  /** Number of playoff teams per conference */
  playoff_teams_per_conference: number;
}

/**
 * League configuration interface
 * Contains settings for league structure and rules
 */
export interface LeagueConfig {
  /** Number of teams in the league */
  total_teams: number;
  /** Number of teams per conference */
  teams_per_conference: number;
  /** Number of divisions per conference */
  divisions_per_conference: number;
  /** Number of teams per division */
  teams_per_division: number;
  /** Number of players per team */
  players_per_team: number;
  /** Number of games per season */
  games_per_season: number;
  /** Whether to use divisions for scheduling */
  use_divisions: boolean;
  /** Whether playoffs are enabled */
  playoffs_enabled: boolean;
  /** Number of playoff teams per conference */
  playoff_teams_per_conference: number;
}

/**
 * Team roster interface
 * Contains a team's complete roster with player details
 */
export interface TeamRoster {
  /** Team information */
  team: {
    team_id: number;
    city: string;
    name: string;
    conference: Conference;
  };
  /** Roster players */
  players: {
    /** Player ID */
    player_id: number;
    /** Player name */
    name: string;
    /** Position */
    position: PlayerPosition;
    /** Age */
    age: number;
    /** Height in inches */
    height: number;
    /** Weight in pounds */
    weight: number;
    /** Years of experience */
    years_pro: number;
    /** Overall rating (calculated from attributes) */
    overall_rating: number;
    /** Current season stats */
    current_stats: {
      games: number;
      ppg: number;
      rpg: number;
      apg: number;
    };
  }[];
}

/**
 * League statistics interface
 * Contains league-wide statistical information
 */
export interface LeagueStats {
  /** League-wide points per game */
  league_ppg: number;
  /** League-wide field goal percentage */
  league_fg_pct: number;
  /** League-wide three-point percentage */
  league_three_pct: number;
  /** League-wide free throw percentage */
  league_ft_pct: number;
  /** League-wide rebounds per game */
  league_rpg: number;
  /** League-wide assists per game */
  league_apg: number;
  /** League-wide steals per game */
  league_spg: number;
  /** League-wide blocks per game */
  league_bpg: number;
  /** League-wide turnovers per game */
  league_tpg: number;
}

/**
 * Schedule generation options interface
 * Contains parameters for generating team schedules
 */
export interface ScheduleOptions {
  /** Season year */
  season: number;
  /** Season start date */
  start_date: string;
  /** Season end date */
  end_date: string;
  /** Number of games per team */
  games_per_team: number;
  /** Conference games (games vs same conference) */
  conference_games: number;
  /** Inter-conference games (games vs other conference) */
  inter_conference_games: number;
  /** Whether to randomize home/away */
  randomize_home_away: boolean;
  /** Whether to avoid consecutive games vs same opponent */
  avoid_consecutive_opponents: boolean;
}

/**
 * Game simulation options interface
 * Contains parameters for game simulation
 */
export interface SimulationOptions {
  /** Whether to use detailed simulation (slower but more accurate) */
  detailed_simulation: boolean;
  /** Random seed for reproducible results */
  random_seed?: number;
  /** Home court advantage factor (0.0-1.0) */
  home_court_advantage: number;
  /** Whether to include injuries */
  include_injuries: boolean;
  /** Whether to include fatigue effects */
  include_fatigue: boolean;
}

/**
 * League state interface
 * Contains the current state of the league
 */
export interface LeagueState {
  /** Current season */
  current_season: number;
  /** Current date in the season */
  current_date: string;
  /** Season phase */
  season_phase: 'preseason' | 'regular_season' | 'playoffs' | 'offseason';
  /** Number of games played */
  games_played: number;
  /** Total games in season */
  total_games: number;
  /** Whether league is active */
  is_active: boolean;
}

/**
 * League export interface
 * Structure for exporting complete league data
 */
export interface LeagueExport {
  /** Export timestamp */
  timestamp: string;
  /** League version */
  version: string;
  /** League configuration */
  config: LeagueConfig;
  /** Current season info */
  season: SeasonInfo;
  /** League state */
  state: LeagueState;
  /** All teams */
  teams: any[]; // Will be populated with Team[] from database
  /** All players */
  players: any[]; // Will be populated with Player[] from database
  /** All games */
  games: any[]; // Will be populated with Game[] from database
}

/**
 * League initialization options interface
 * Contains parameters for creating a new league
 */
export interface LeagueInitOptions {
  /** League name */
  league_name: string;
  /** Starting season year */
  start_season: number;
  /** League configuration */
  config: LeagueConfig;
  /** Whether to generate initial rosters */
  generate_rosters: boolean;
  /** Whether to generate initial schedule */
  generate_schedule: boolean;
  /** Random seed for reproducible generation */
  random_seed?: number;
}

/**
 * Team matchup interface
 * Represents a matchup between two teams
 */
export interface TeamMatchup {
  /** Home team ID */
  home_team_id: number;
  /** Away team ID */
  away_team_id: number;
  /** Home team name */
  home_team_name: string;
  /** Away team name */
  away_team_name: string;
  /** Game date */
  date: string;
  /** Whether game is completed */
  completed: boolean;
  /** Home team score (if completed) */
  home_score?: number;
  /** Away team score (if completed) */
  away_score?: number;
  /** Game result */
  result?: 'home_win' | 'away_win';
}

/**
 * League standings calculation options interface
 * Contains parameters for calculating standings
 */
export interface StandingsOptions {
  /** Conference to calculate standings for (null for overall) */
  conference?: Conference | null;
  /** Whether to include tiebreakers */
  include_tiebreakers: boolean;
  /** Whether to include additional stats */
  include_stats: boolean;
  /** Whether to include recent form */
  include_recent_form: boolean;
}
