/**
 * Database Type Definitions
 *
 * This file contains TypeScript interfaces and types for all database models
 * used in the basketball simulation system. These types ensure type safety
 * and provide clear documentation of the data structures.
 */

/**
 * Player position enumeration
 * Defines the five standard basketball positions
 */
export type PlayerPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

/**
 * Conference enumeration
 * Defines the two conferences in the league
 */
export type Conference = 'East' | 'West';

/**
 * Draft information interface
 * Contains details about when and how a player was drafted
 */
export interface DraftInfo {
  /** Draft pick number (1-60) */
  pick: number;
  /** Team that drafted the player (3-letter abbreviation) */
  team: string;
  /** Year the player was drafted */
  year: number;
}

/**
 * Player attributes interface
 * Contains all skill ratings for a player (0-100 scale)
 */
export interface PlayerAttributes {
  /** Speed and quickness rating */
  speed: number;
  /** Basketball IQ and decision making */
  ball_iq: number;
  /** Inside/close-range shooting ability */
  inside_shot: number;
  /** Three-point shooting ability */
  three_point_shot: number;
  /** Passing ability and vision */
  pass: number;
  /** Ball handling and skill moves */
  skill_move: number;
  /** On-ball defensive ability */
  on_ball_defense: number;
  /** Stamina and endurance */
  stamina: number;
  /** Shot blocking ability */
  block: number;
  /** Stealing ability */
  steal: number;
  /** Offensive rebounding */
  offensive_rebound: number;
  /** Defensive rebounding */
  defensive_rebound: number;
}

/**
 * Player season statistics interface
 * Contains all statistical data for a single season
 */
export interface PlayerSeasonStats {
  /** Games played this season */
  games: number;
  /** Total minutes played */
  minutes: number;
  /** Minutes per game (calculated) */
  mpg?: number;
  /** Total points scored */
  points: number;
  /** Points per game (calculated) */
  ppg: number;
  /** Total rebounds */
  rebounds: number;
  /** Rebounds per game */
  rpg: number;
  /** Total assists */
  assists: number;
  /** Assists per game */
  apg: number;
  /** Total steals */
  steals: number;
  /** Steals per game */
  spg: number;
  /** Total blocks */
  blocks: number;
  /** Blocks per game */
  bpg: number;
  /** Total turnovers */
  turnovers: number;
  /** Turnovers per game */
  tpg: number;
  /** Field goals made */
  fg_made: number;
  /** Field goals attempted */
  fg_attempted: number;
  /** Field goal percentage */
  fg_pct: number;
  /** Three-pointers made */
  three_made: number;
  /** Three-pointers attempted */
  three_attempted: number;
  /** Three-point percentage */
  three_pct: number;
  /** Free throws made */
  ft_made: number;
  /** Free throws attempted */
  ft_attempted: number;
  /** Free throw percentage */
  ft_pct: number;
  /** Offensive rebounds */
  oreb?: number;
  /** Offensive rebounds per game (calculated) */
  oreb_pg?: number;
  /** Defensive rebounds */
  dreb?: number;
  /** Defensive rebounds per game (calculated) */
  dreb_pg?: number;
  /** Personal fouls */
  pf?: number;
  /** Plus/minus rating */
  plus_minus?: number;
}

/**
 * Player career statistics interface
 * Contains aggregated statistics across all seasons
 */
export interface PlayerCareerStats {
  /** Number of seasons played */
  seasons: number;
  /** Total career games */
  games: number;
  /** Total career minutes */
  minutes: number;
  /** Total career points */
  points: number;
  /** Career points per game */
  ppg: number;
  /** Total career rebounds */
  rebounds: number;
  /** Career rebounds per game */
  rpg: number;
  /** Total career assists */
  assists: number;
  /** Career assists per game */
  apg: number;
  /** Total career steals */
  steals: number;
  /** Career steals per game */
  spg: number;
  /** Total career blocks */
  blocks: number;
  /** Career blocks per game */
  bpg: number;
  /** Total career turnovers */
  turnovers: number;
  /** Career turnovers per game */
  tpg: number;
  /** Career field goal percentage */
  fg_pct: number;
  /** Career three-point percentage */
  three_pct: number;
  /** Career free throw percentage */
  ft_pct: number;
  /** Total career offensive rebounds */
  oreb?: number;
  /** Total career defensive rebounds */
  dreb?: number;
  /** Total career personal fouls */
  pf?: number;
  /** Career plus/minus rating */
  plus_minus?: number;
}

/**
 * Player database model interface
 * Represents a player record in the database
 */
export interface Player {
  /** Unique player identifier */
  player_id: number;
  /** ID of the team this player belongs to */
  team_id: number;
  /** Player's first name */
  first_name: string;
  /** Player's last name */
  last_name: string;
  /** Player's age */
  age: number;
  /** Player's position */
  position: PlayerPosition;
  /** Whether this player is a starter (0 = bench, 1 = starter) */
  is_starter: number;
  /** Player's height in inches */
  height: number;
  /** Player's weight in pounds */
  weight: number;
  /** Years of professional experience */
  years_pro: number;
  /** Draft information (JSON string) */
  draft_info: string | null;
  /** Player skill attributes */
  speed: number;
  ball_iq: number;
  inside_shot: number;
  three_point_shot: number;
  pass: number;
  skill_move: number;
  on_ball_defense: number;
  stamina: number;
  block: number;
  steal: number;
  offensive_rebound: number;
  defensive_rebound: number;
  /** Current season stats (JSON string) */
  current_season_stats: string | null;
  /** Historical season stats (JSON string) */
  historical_stats: string | null;
  /** Career stats (JSON string) */
  career_stats: string | null;
}

/**
 * Team season statistics interface
 * Contains team statistical data for a single season
 */
export interface TeamSeasonStats {
  /** Games played this season */
  games: number;
  /** Team wins */
  wins: number;
  /** Team losses */
  losses: number;
  /** Points per game */
  ppg: number;
  /** Opponent points per game */
  opp_ppg: number;
  /** Field goal percentage */
  fg_pct: number;
  /** Three-point percentage */
  three_pct: number;
  /** Free throw percentage */
  ft_pct: number;
  /** Rebounds per game */
  rpg: number;
  /** Assists per game */
  apg: number;
  /** Steals per game */
  spg: number;
  /** Blocks per game */
  bpg: number;
  /** Turnovers per game */
  tpg: number;
  /** Field goals made (total) */
  fg_made?: number;
  /** Field goals attempted (total) */
  fg_attempted?: number;
  /** Three-pointers made (total) */
  three_made?: number;
  /** Three-pointers attempted (total) */
  three_attempted?: number;
  /** Free throws made (total) */
  ft_made?: number;
  /** Free throws attempted (total) */
  ft_attempted?: number;
  /** Offensive rebounds per game */
  oreb?: number;
  /** Defensive rebounds per game */
  dreb?: number;
  /** Personal fouls per game */
  pf?: number;
  /** Plus/minus rating */
  plus_minus?: number;
}

/**
 * Team historical record interface
 * Contains team record and stats for a single season
 */
export interface TeamHistoricalRecord {
  /** Season year */
  season: number;
  /** Wins this season */
  wins: number;
  /** Losses this season */
  losses: number;
  /** Playoff result (if applicable) */
  playoff_result?: string;
  /** Team stats for this season */
  stats: TeamSeasonStats;
}

/**
 * Game schedule entry interface
 * Represents a single game in a team's schedule
 */
export interface GameScheduleEntry {
  /** Unique game identifier */
  game_id: number;
  /** ID of the opponent team */
  opponent_id: number;
  /** Game date (YYYY-MM-DD format) */
  date: string;
  /** Whether this is a home game */
  home: boolean;
  /** Whether the game has been completed */
  completed: boolean;
  /** Game result (win/loss) */
  result: 'win' | 'loss' | null;
  /** Final score (if completed) */
  score?: {
    home: number;
    away: number;
  };
}

/**
 * Team database model interface
 * Represents a team record in the database
 */
export interface Team {
  /** Unique team identifier */
  team_id: number;
  /** Team city */
  city: string;
  /** Team name */
  name: string;
  /** Team abbreviation (3 letters) */
  abbreviation: string;
  /** Conference (East or West) */
  conference: Conference;
  /** Current season wins */
  wins: number;
  /** Current season losses */
  losses: number;
  /** Current season stats (JSON string) */
  current_season_stats: string | null;
  /** Historical records (JSON string) */
  historical_records: string | null;
  /** Team schedule (JSON string) */
  schedule: string | null;
  /** Team rotation configuration (JSON string) */
  rotation_config: string | null;
}

/**
 * Player box score interface
 * Contains individual player stats for a single game
 */
export interface PlayerBoxScore {
  /** Player ID */
  player_id: number;
  /** Player name */
  name: string;
  /** Player position */
  position: PlayerPosition;
  /** Minutes played */
  minutes: number;
  /** Points scored */
  points: number;
  /** Rebounds */
  rebounds: number;
  /** Assists */
  assists: number;
  /** Steals */
  steals: number;
  /** Blocks */
  blocks: number;
  /** Turnovers */
  turnovers: number;
  /** Field goals made */
  fg_made: number;
  /** Field goals attempted */
  fg_attempted: number;
  /** Field goal percentage */
  fg_pct: number;
  /** Three-pointers made */
  three_made: number;
  /** Three-pointers attempted */
  three_attempted: number;
  /** Three-point percentage */
  three_pct: number;
  /** Free throws made */
  ft_made: number;
  /** Free throws attempted */
  ft_attempted: number;
  /** Free throw percentage */
  ft_pct: number;
  /** Offensive rebounds */
  oreb?: number;
  /** Defensive rebounds */
  dreb?: number;
  /** Personal fouls */
  pf?: number;
  /** Plus/minus rating */
  plus_minus: number;
}

/**
 * Team box score interface
 * Contains team stats for a single game
 */
export interface TeamBoxScore {
  /** Team ID */
  team_id: number;
  /** Team name */
  team_name: string;
  /** Total points scored */
  total_points: number;
  /** Individual player stats */
  players: PlayerBoxScore[];
}

/**
 * Game box score interface
 * Contains complete box score for a single game
 */
export interface GameBoxScore {
  /** Home team box score */
  home_team: TeamBoxScore;
  /** Away team box score */
  away_team: TeamBoxScore;
}

/**
 * Game database model interface
 * Represents a game record in the database
 */
export interface Game {
  /** Unique game identifier */
  game_id: number;
  /** Season year */
  season: number;
  /** Game date (YYYY-MM-DD format) */
  date: string;
  /** Home team ID */
  home_team_id: number;
  /** Away team ID */
  away_team_id: number;
  /** Home team final score */
  home_score: number | null;
  /** Away team final score */
  away_score: number | null;
  /** Whether the game is completed */
  completed: boolean;
  /** Detailed box score (JSON string) */
  box_score: string | null;
}

/**
 * Database query result interface
 * Generic interface for database query results
 */
export interface DatabaseResult<T> {
  /** Query results */
  data: T[];
  /** Number of rows affected */
  changes: number;
  /** Last inserted row ID (for INSERT operations) */
  lastInsertRowid: number;
}

/**
 * Player rotation interface
 * Defines minute ranges when a player is active during a game
 */
export interface PlayerRotation {
  /** Player ID */
  player_id: number;
  /** Minute ranges when player is active (e.g., [[0, 6], [18, 24], [36, 42]]) */
  active_minutes: number[][];
  /** Total minutes this player should play */
  total_minutes: number;
}

/**
 * Team rotation configuration interface
 * Stores the complete rotation pattern for a team
 */
export interface TeamRotationConfig {
  /** Team ID */
  team_id: number;
  /** Array of player rotations */
  player_rotations: PlayerRotation[];
  /** Whether this is a custom rotation or default */
  is_custom: boolean;
  /** Last updated timestamp */
  last_updated: string;
}

/**
 * Database export/import interface
 * Structure for database backup and restore operations
 */
export interface DatabaseExport {
  /** Export timestamp */
  timestamp: string;
  /** Database version */
  version: string;
  /** Exported data */
  data: {
    players: Player[];
    teams: Team[];
    games: Game[];
  };
}
