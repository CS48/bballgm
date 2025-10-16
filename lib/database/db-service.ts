"use client"

/**
 * Database Service - SQL.js initialization and connection management
 * 
 * This service handles the initialization of the SQLite database using SQL.js,
 * provides connection management, and includes utility functions for database
 * operations like export/import.
 */

import initSqlJs from 'sql.js';
import { Database } from 'sql.js';

/**
 * Database service class that manages SQL.js connection and provides
 * utility methods for database operations
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database | null = null;
  private isInitialized: boolean = false;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of DatabaseService
   * @returns DatabaseService instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the SQLite database with schema
   * This method must be called before any database operations
   * @returns Promise that resolves when database is ready
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize SQL.js for client-side usage
      const SQL = await initSqlJs({
        // Use CDN for WASM file in production
        locateFile: file => {
          if (file.endsWith('.wasm')) {
            return `https://sql.js.org/dist/${file}`;
          }
          return file;
        }
      });

      // Create new database instance
      this.db = new SQL.Database();

      // Create tables using the schema
      await this.createTables();

      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error('Database initialization failed');
    }
  }

  /**
   * Get the database instance
   * @returns Database instance or throws error if not initialized
   */
  public getDatabase(): Database {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Create all database tables with proper schema
   * This method defines the structure for players, teams, and games tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      // Create players table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS players (
          player_id INTEGER PRIMARY KEY AUTOINCREMENT,
          team_id INTEGER NOT NULL,
          
          -- Personal Details
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          age INTEGER NOT NULL,
          position TEXT NOT NULL,
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
      `);

      // Create teams table
      this.db.exec(`
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
          schedule TEXT -- [{game_id: 1, opponent_id: 5, date: "2024-10-15", home: true, completed: false, result: null}, {...}]
        );
      `);

      // Create games table for detailed game history
      this.db.exec(`
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
      `);

      // Create season_calendar table for in-game calendar system
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS season_calendar (
          calendar_id INTEGER PRIMARY KEY AUTOINCREMENT,
          season INTEGER NOT NULL,
          game_day INTEGER NOT NULL,
          date_display TEXT NOT NULL, -- "October 15", "October 17", etc.
          games_scheduled INTEGER DEFAULT 0,
          UNIQUE(season, game_day)
        );
      `);

      // Create indexes for performance optimization
      this.createIndexes();

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Failed to create database tables:', error);
      throw error;
    }
  }

  /**
   * Create database indexes for frequently queried columns
   * These indexes improve query performance for common operations
   */
  private createIndexes(): void {
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      // Player indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_player_team ON players(team_id);');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_player_id ON players(player_id);');
      
      // Team indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_team_id ON teams(team_id);');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_team_conference ON teams(conference);');
      
      // Game indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_game_season ON games(season);');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_game_teams ON games(home_team_id, away_team_id);');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_game_day ON games(season, game_day);');
      
      // Calendar indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_calendar_season ON season_calendar(season);');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_calendar_game_day ON season_calendar(season, game_day);');

      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Failed to create database indexes:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL query and return results
   * @param sql SQL query string
   * @param params Optional parameters for prepared statements
   * @returns Query results
   */
  public exec(sql: string, params: any[] = []): any[] {
    const db = this.getDatabase();
    
    try {
      if (params.length > 0) {
        // Use prepared statement for parameterized queries
        const stmt = db.prepare(sql);
        
        // Bind parameters to the prepared statement
        stmt.bind(params);
        
        const results: any[] = [];
        
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        
        stmt.free();
        return results;
      } else {
        // Execute direct SQL
        const result = db.exec(sql);
        if (result.length > 0 && result[0].columns && result[0].values) {
          // Convert to objects with column names
          const columns = result[0].columns;
          const values = result[0].values;
          return values.map((row: any[]) => {
            const obj: any = {};
            columns.forEach((col: string, index: number) => {
              obj[col] = row[index];
            });
            return obj;
          });
        }
        return [];
      }
    } catch (error) {
      console.error('Database query failed:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL statement that doesn't return results (INSERT, UPDATE, DELETE)
   * @param sql SQL statement string
   * @param params Optional parameters for prepared statements
   * @returns Number of affected rows
   */
  public run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
    const db = this.getDatabase();
    
    try {
      if (params.length > 0) {
        // Use prepared statement for parameterized queries
        const stmt = db.prepare(sql);
        stmt.run(params);
        const result = { changes: db.getRowsModified(), lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0].values[0][0] };
        stmt.free();
        return result;
      } else {
        // Execute direct SQL
        db.exec(sql);
        return { changes: db.getRowsModified(), lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0].values[0][0] };
      }
    } catch (error) {
      console.error('Database statement failed:', error);
      throw error;
    }
  }

  /**
   * Export database to JSON format for backup/transfer
   * @returns JSON string representation of database
   */
  public exportToJSON(): string {
    const db = this.getDatabase();
    
    try {
      // Get all data from each table
      const players = this.exec('SELECT * FROM players');
      const teams = this.exec('SELECT * FROM teams');
      const games = this.exec('SELECT * FROM games');
      
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        data: {
          players,
          teams,
          games
        }
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export database:', error);
      throw error;
    }
  }

  /**
   * Import database from JSON format
   * @param jsonData JSON string containing database data
   * @returns Promise that resolves when import is complete
   */
  public async importFromJSON(jsonData: string): Promise<void> {
    const db = this.getDatabase();
    
    try {
      const importData = JSON.parse(jsonData);
      
      // Clear existing data
      db.exec('DELETE FROM games');
      db.exec('DELETE FROM players');
      db.exec('DELETE FROM teams');
      
      // Import teams first (due to foreign key constraints)
      if (importData.data.teams) {
        for (const team of importData.data.teams) {
          const { team_id, ...teamData } = team;
          const columns = Object.keys(teamData).join(', ');
          const values = Object.values(teamData).map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ');
          db.exec(`INSERT INTO teams (${columns}) VALUES (${values})`);
        }
      }
      
      // Import players
      if (importData.data.players) {
        for (const player of importData.data.players) {
          const { player_id, ...playerData } = player;
          const columns = Object.keys(playerData).join(', ');
          const values = Object.values(playerData).map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ');
          db.exec(`INSERT INTO players (${columns}) VALUES (${values})`);
        }
      }
      
      // Import games
      if (importData.data.games) {
        for (const game of importData.data.games) {
          const { game_id, ...gameData } = game;
          const columns = Object.keys(gameData).join(', ');
          const values = Object.values(gameData).map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ');
          db.exec(`INSERT INTO games (${columns}) VALUES (${values})`);
        }
      }
      
      console.log('Database imported successfully');
    } catch (error) {
      console.error('Failed to import database:', error);
      throw error;
    }
  }

  /**
   * Check if database is initialized
   * @returns True if database is ready for use
   */
  public isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Close database connection and cleanup
   * This should be called when the application is shutting down
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('Database connection closed');
    }
  }
}

/**
 * Export singleton instance for easy access
 */
export const dbService = DatabaseService.getInstance();
