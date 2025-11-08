/**
 * Database Schema Definitions
 *
 * This file contains the SQL schema definitions for the basketball simulation database.
 * It provides a centralized location for all table creation statements and can be
 * used for database migrations and documentation.
 */

/**
 * SQL schema for creating the players table
 * Contains all player information including personal details, attributes, and stats
 */
export const PLAYERS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS players (
    player_id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    
    -- Personal Details
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    position TEXT NOT NULL,
    is_starter INTEGER DEFAULT 0,
    height INTEGER NOT NULL,
    weight INTEGER NOT NULL,
    years_pro INTEGER NOT NULL,
    draft_info TEXT, -- JSON: {pick: 3, team: "MIN", year: 2020}
    
    -- Attributes (0-100 scale)
    speed INTEGER NOT NULL,
    ball_iq INTEGER NOT NULL,
    inside_shot INTEGER NOT NULL,
    three_point_shot INTEGER NOT NULL,
    pass INTEGER NOT NULL,
    skill_move INTEGER NOT NULL,
    on_ball_defense INTEGER NOT NULL,
    stamina INTEGER NOT NULL,
    block INTEGER NOT NULL,
    steal INTEGER NOT NULL,
    offensive_rebound INTEGER NOT NULL,
    defensive_rebound INTEGER NOT NULL,
    
    -- Stats (JSON)
    current_season_stats TEXT, -- {games: 10, ppg: 20.5, rpg: 5.2, apg: 3.1, ...}
    historical_stats TEXT, -- [{season: 2023, games: 82, ppg: 18.2, ...}, {...}]
    career_stats TEXT, -- {games: 328, ppg: 19.8, rpg: 5.5, apg: 3.2, ...}
    
    FOREIGN KEY (team_id) REFERENCES teams(team_id)
  );
`;

/**
 * SQL schema for creating the teams table
 * Contains team information including record, stats, and schedule
 */
export const TEAMS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS teams (
    team_id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT NOT NULL,
    name TEXT NOT NULL,
    conference TEXT NOT NULL, -- 'East' or 'West'
    
    -- Current Season Record
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    
    -- Stats (JSON)
    current_season_stats TEXT, -- {ppg: 110.5, opp_ppg: 105.2, fg_pct: 0.465, ...}
    historical_records TEXT, -- [{season: 2023, wins: 52, losses: 30, stats: {...}}, {...}]
    
    -- Schedule (JSON array)
    schedule TEXT, -- [{game_id: 1, opponent_id: 5, date: "2024-10-15", home: true, completed: false, result: null}, {...}]
    
    -- Rotation Configuration (JSON)
    rotation_config TEXT -- TeamRotationConfig object
  );
`;

/**
 * SQL schema for creating the games table
 * Contains detailed game history and box scores
 */
export const GAMES_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS games (
    game_id INTEGER PRIMARY KEY AUTOINCREMENT,
    season INTEGER NOT NULL,
    date TEXT NOT NULL,
    game_day INTEGER, -- NEW: Game day number (1-150)
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    completed BOOLEAN DEFAULT 0,
    box_score TEXT, -- JSON: detailed player stats
    
    FOREIGN KEY (home_team_id) REFERENCES teams(team_id),
    FOREIGN KEY (away_team_id) REFERENCES teams(team_id)
  );
`;

/**
 * SQL schema for creating the season_calendar table
 * Contains the in-game calendar system with game days and dates
 */
export const SEASON_CALENDAR_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS season_calendar (
    calendar_id INTEGER PRIMARY KEY AUTOINCREMENT,
    season INTEGER NOT NULL,
    game_day INTEGER NOT NULL,
    date_display TEXT NOT NULL, -- "October 15", "October 17", etc.
    games_scheduled INTEGER DEFAULT 0,
    UNIQUE(season, game_day)
  );
`;

/**
 * Index definitions for performance optimization
 * These indexes improve query performance for frequently accessed columns
 */
export const INDEX_DEFINITIONS = {
  // Player indexes
  PLAYER_TEAM_INDEX: 'CREATE INDEX IF NOT EXISTS idx_player_team ON players(team_id);',
  PLAYER_ID_INDEX: 'CREATE INDEX IF NOT EXISTS idx_player_id ON players(player_id);',

  // Team indexes
  TEAM_ID_INDEX: 'CREATE INDEX IF NOT EXISTS idx_team_id ON teams(team_id);',
  TEAM_CONFERENCE_INDEX: 'CREATE INDEX IF NOT EXISTS idx_team_conference ON teams(conference);',

  // Game indexes
  GAME_SEASON_INDEX: 'CREATE INDEX IF NOT EXISTS idx_game_season ON games(season);',
  GAME_TEAMS_INDEX: 'CREATE INDEX IF NOT EXISTS idx_game_teams ON games(home_team_id, away_team_id);',
  GAME_DAY_INDEX: 'CREATE INDEX IF NOT EXISTS idx_game_day ON games(season, game_day);',

  // Calendar indexes
  CALENDAR_SEASON_INDEX: 'CREATE INDEX IF NOT EXISTS idx_calendar_season ON season_calendar(season);',
  CALENDAR_GAME_DAY_INDEX: 'CREATE INDEX IF NOT EXISTS idx_calendar_game_day ON season_calendar(season, game_day);',
};

/**
 * Complete schema creation script
 * This can be used to create all tables and indexes in the correct order
 */
export const FULL_SCHEMA = `
  -- Create teams table first (due to foreign key constraints)
  ${TEAMS_TABLE_SCHEMA}
  
  -- Create players table (references teams)
  ${PLAYERS_TABLE_SCHEMA}
  
  -- Create games table (references teams)
  ${GAMES_TABLE_SCHEMA}
  
  -- Create season_calendar table (no foreign keys)
  ${SEASON_CALENDAR_TABLE_SCHEMA}
  
  -- Create all indexes
  ${INDEX_DEFINITIONS.PLAYER_TEAM_INDEX}
  ${INDEX_DEFINITIONS.PLAYER_ID_INDEX}
  ${INDEX_DEFINITIONS.TEAM_ID_INDEX}
  ${INDEX_DEFINITIONS.TEAM_CONFERENCE_INDEX}
  ${INDEX_DEFINITIONS.GAME_SEASON_INDEX}
  ${INDEX_DEFINITIONS.GAME_TEAMS_INDEX}
  ${INDEX_DEFINITIONS.GAME_DAY_INDEX}
  ${INDEX_DEFINITIONS.CALENDAR_SEASON_INDEX}
  ${INDEX_DEFINITIONS.CALENDAR_GAME_DAY_INDEX}
`;

/**
 * Database version for migration tracking
 */
export const DATABASE_VERSION = '1.1.0';

/**
 * Migration to add rotation_config column to teams table
 * This handles existing databases that don't have the rotation_config column
 */
export const MIGRATION_ADD_ROTATION_CONFIG = `
  ALTER TABLE teams ADD COLUMN rotation_config TEXT;
`;

/**
 * Get all table names in the database
 * @returns Array of table names
 */
export const getTableNames = (): string[] => {
  return ['players', 'teams', 'games', 'season_calendar'];
};

/**
 * Get all index names in the database
 * @returns Array of index names
 */
export const getIndexNames = (): string[] => {
  return [
    'idx_player_team',
    'idx_player_id',
    'idx_team_id',
    'idx_team_conference',
    'idx_game_season',
    'idx_game_teams',
    'idx_game_day',
    'idx_calendar_season',
    'idx_calendar_game_day',
  ];
};
