/**
 * Calendar Type Definitions
 *
 * This file contains TypeScript interfaces and types for the in-game
 * calendar system, including game days, season calendars, and team progress.
 */

import { GameScheduleEntry } from './database';

/**
 * Game day entry in the season calendar
 */
export interface GameDay {
  /** Game day number (1-150) */
  game_day: number;
  /** Display date (e.g., "October 15") */
  date_display: string;
  /** Month name (e.g., "October") */
  month: string;
  /** Day number (e.g., 15) */
  day: number;
  /** All games scheduled for this day */
  games: GameScheduleEntry[];
}

/**
 * Season calendar tracking
 */
export interface SeasonCalendar {
  /** Season year */
  season: number;
  /** Current game day number */
  current_game_day: number;
  /** Total game days in season (~150) */
  total_game_days: number;
  /** Season start date display */
  start_date: string;
  /** Season end date display */
  end_date: string;
  /** All game days in the season */
  game_days: GameDay[];
}

/**
 * Team season progress tracking
 */
export interface TeamSeasonProgress {
  /** Team ID */
  team_id: number;
  /** Games played this season */
  games_played: number;
  /** Games remaining this season */
  games_remaining: number;
  /** Total games in season (82) */
  total_games: number;
  /** Next scheduled game day */
  next_game_day: number | null;
  /** Days since last game */
  days_since_last_game: number;
}

/**
 * Game day results from simulation
 */
export interface GameDayResults {
  /** Game day number */
  game_day: number;
  /** Date display */
  date_display: string;
  /** Games played on this day */
  games_played: any[];
  /** Updated standings after games */
  updated_standings: any[];
  /** Teams that played */
  teams_played: number[];
}

/**
 * Calendar navigation options
 */
export interface CalendarNavigation {
  /** Can advance to next game day */
  can_advance: boolean;
  /** Can simulate to specific game day */
  can_simulate_to: boolean;
  /** Can fast-forward to team's next game */
  can_simulate_to_team_game: boolean;
  /** Can simulate rest of season */
  can_simulate_rest_of_season: boolean;
}

/**
 * Season progress information
 */
export interface SeasonProgress {
  /** Current game day */
  current: number;
  /** Total game days */
  total: number;
  /** Progress percentage (0-100) */
  percent: number;
  /** Days remaining */
  days_remaining: number;
  /** Estimated completion date */
  estimated_completion: string;
}

/**
 * Game day constraints for scheduling
 */
export interface ScheduleConstraints {
  /** Maximum consecutive games (2) */
  max_consecutive_games: number;
  /** Minimum rest days (0) */
  min_rest_days: number;
  /** Maximum rest days (4) */
  max_rest_days: number;
  /** Target games per day */
  games_per_day: number;
  /** Total game days in season */
  total_game_days: number;
}

/**
 * Calendar configuration
 */
export interface CalendarConfig {
  /** Season start month */
  start_month: string;
  /** Season start day */
  start_day: number;
  /** Month configurations */
  months: Array<{
    name: string;
    days: number;
    start_day: number;
  }>;
  /** Total calendar days */
  total_calendar_days: number;
  /** Game days (with rest) */
  total_game_days: number;
  /** Rest day ratio */
  rest_day_ratio: number;
}
