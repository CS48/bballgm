"use client"

/**
 * League Context - React Context for state management
 * 
 * This context provides global state management for the basketball simulation
 * league, including teams, players, standings, and game simulation functionality.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dbService } from '../database/db-service';
import { leagueService } from '../services/league-service';
import { simulationService } from '../services/simulation-service';
import { calendarService } from '../services/calendar-service';
import { Team, Player } from '../types/database';
import { LeagueState, SeasonInfo, LeagueConfig, LeagueInitOptions } from '../types/league';
import { GameDay, SeasonProgress, TeamSeasonProgress } from '../types/calendar';

/**
 * League context interface
 */
interface LeagueContextType {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // League data
  teams: Team[];
  players: Player[];
  currentSeason: SeasonInfo | null;
  leagueState: LeagueState | null;
  
  // Standings
  easternStandings: any[];
  westernStandings: any[];
  overallStandings: any[];
  
  // Calendar
  currentGameDay: GameDay | null;
  seasonProgress: SeasonProgress | null;
  teamProgress: TeamSeasonProgress | null;
  
  // Actions
  initializeLeague: (options: LeagueInitOptions) => Promise<void>;
  deleteLeague: () => Promise<void>;
  simulateGame: (homeTeamId: number, awayTeamId: number) => Promise<{ homeScore: number; awayScore: number }>;
  simulateMultipleGames: (games: Array<{ homeTeamId: number; awayTeamId: number }>) => Promise<void>;
  advanceToNextGameDay: () => Promise<void>;
  simulateToGameDay: (gameDay: number) => Promise<void>;
  refreshData: () => Promise<void>;
  advanceSeason: () => Promise<void>;
  
  // Utility functions
  getTeamById: (teamId: number) => Team | null;
  getPlayersByTeam: (teamId: number) => Player[];
  getTeamRoster: (teamId: number) => Promise<any>;
}

/**
 * Create the league context
 */
const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

/**
 * League provider component props
 */
interface LeagueProviderProps {
  children: ReactNode;
}

/**
 * League provider component that manages global league state
 */
export function LeagueProvider({ children }: LeagueProviderProps) {
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // League data
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentSeason, setCurrentSeason] = useState<SeasonInfo | null>(null);
  const [leagueState, setLeagueState] = useState<LeagueState | null>(null);
  
  // Standings
  const [easternStandings, setEasternStandings] = useState<any[]>([]);
  const [westernStandings, setWesternStandings] = useState<any[]>([]);
  const [overallStandings, setOverallStandings] = useState<any[]>([]);
  
  // Calendar
  const [currentGameDay, setCurrentGameDay] = useState<GameDay | null>(null);
  const [seasonProgress, setSeasonProgress] = useState<SeasonProgress | null>(null);
  const [teamProgress, setTeamProgress] = useState<TeamSeasonProgress | null>(null);

  /**
   * Initialize the database and load league data
   */
  const initializeDatabase = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Initialize database
      await dbService.initialize();
      console.log('Database initialized successfully');
      
      setIsInitialized(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize database';
      setError(errorMessage);
      console.error('Database initialization failed:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load all league data from database
   */
  const loadLeagueData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load teams and players
      const [teamsData, playersData, seasonData, stateData] = await Promise.all([
        leagueService.getAllTeams(),
        leagueService.getAllPlayers(),
        leagueService.getCurrentSeason(),
        leagueService.getLeagueState()
      ]);
      
      setTeams(teamsData);
      setPlayers(playersData);
      setCurrentSeason(seasonData);
      setLeagueState(stateData);
      
      // Load standings
      const [eastern, western, overall] = await Promise.all([
        leagueService.getStandings('East'),
        leagueService.getStandings('West'),
        leagueService.getStandings(null)
      ]);
      
      setEasternStandings(eastern);
      setWesternStandings(western);
      setOverallStandings(overall);
      
      // Load calendar data
      const currentYear = new Date().getFullYear();
      const [gameDay, progress] = await Promise.all([
        calendarService.getCurrentGameDay(currentYear),
        calendarService.getSeasonProgress(currentYear)
      ]);
      
      setCurrentGameDay(gameDay);
      setSeasonProgress(progress);
      
      console.log('League data loaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load league data';
      setError(errorMessage);
      console.error('Failed to load league data:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initialize a new league
   */
  const initializeLeague = async (options: LeagueInitOptions): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Initialize database if not already done
      if (!isInitialized) {
        await initializeDatabase();
      }
      
      // Generate new league
      await leagueService.generateLeague(options);
      
      // Load the new league data
      await loadLeagueData();
      
      console.log('New league created successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize league';
      setError(errorMessage);
      console.error('League initialization failed:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete all league data
   */
  const deleteLeague = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await leagueService.deleteLeague();
      
      // Clear local state
      setTeams([]);
      setPlayers([]);
      setEasternStandings([]);
      setWesternStandings([]);
      setOverallStandings([]);
      setCurrentGameDay(null);
      setSeasonProgress(null);
      setTeamProgress(null);
      setLeagueState(null);
      setCurrentSeason(null);
      
      console.log('✅ League deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete league';
      setError(errorMessage);
      console.error('Failed to delete league:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Simulate a single game
   */
  const simulateGame = async (homeTeamId: number, awayTeamId: number): Promise<{ homeScore: number; awayScore: number }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await simulationService.simulateGame(homeTeamId, awayTeamId);
      
      // Refresh data after simulation
      await refreshData();
      
      console.log(`Game simulated: Team ${homeTeamId} vs Team ${awayTeamId}`);
      
      // Return the actual scores
      return {
        homeScore: result.home_score,
        awayScore: result.away_score
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Game simulation failed';
      setError(errorMessage);
      console.error('Game simulation failed:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Simulate multiple games
   */
  const simulateMultipleGames = async (games: Array<{ homeTeamId: number; awayTeamId: number }>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await simulationService.simulateMultipleGames(games);
      
      // Refresh data after simulations
      await refreshData();
      
      console.log(`${games.length} games simulated successfully`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Multiple game simulation failed';
      setError(errorMessage);
      console.error('Multiple game simulation failed:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Advance to the next game day
   */
  const advanceToNextGameDay = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentYear = new Date().getFullYear();
      await calendarService.advanceGameDay(currentYear);
      
      // Refresh data after advance
      await refreshData();
      
      console.log('Advanced to next game day');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to advance game day';
      setError(errorMessage);
      console.error('Failed to advance game day:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Simulate to a specific game day
   */
  const simulateToGameDay = async (gameDay: number): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // For now, just log the request
      console.log(`Simulating to game day ${gameDay}`);
      
      // Refresh data after simulation
      await refreshData();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to simulate to game day';
      setError(errorMessage);
      console.error('Failed to simulate to game day:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh all league data
   */
  const refreshData = async (): Promise<void> => {
    try {
      await loadLeagueData();
      console.log('League data refreshed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      setError(errorMessage);
      console.error('Failed to refresh data:', err);
      throw new Error(errorMessage);
    }
  };

  /**
   * Advance to the next season
   */
  const advanceSeason = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await leagueService.advanceSeason();
      
      // Refresh data after season advance
      await refreshData();
      
      console.log('Season advanced successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Season advance failed';
      setError(errorMessage);
      console.error('Season advance failed:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get team by ID
   */
  const getTeamById = (teamId: number): Team | null => {
    return teams.find(team => team.team_id === teamId) || null;
  };

  /**
   * Get players by team ID
   */
  const getPlayersByTeam = (teamId: number): Player[] => {
    return players.filter(player => player.team_id === teamId);
  };

  /**
   * Get team roster with detailed player information
   */
  const getTeamRoster = async (teamId: number): Promise<any> => {
    try {
      return await leagueService.getTeamRoster(teamId);
    } catch (err) {
      console.error('Failed to get team roster:', err);
      throw err;
    }
  };

  /**
   * Initialize database on component mount with timeout
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Starting database initialization...');
        await initializeDatabase();
        console.log('Database initialized, checking for existing league...');
        
        // Check if league data exists
        const isLeagueReady = await leagueService.isLeagueReady();
        console.log('League ready check result:', isLeagueReady);
        
        if (isLeagueReady) {
          console.log('Loading existing league data...');
          await loadLeagueData();
          console.log('League data loaded successfully');
        } else {
          console.log('No existing league found, ready for new league creation');
        }
      } catch (err) {
        console.error('Initialization failed:', err);
        setError(`Initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        // Don't set error state here as this is expected for new installations
      }
    };

    // Add timeout to detect stuck initialization
    const timeoutId = setTimeout(() => {
      if (!isInitialized) {
        console.warn('Initialization is taking longer than expected...');
        setError('Initialization is taking longer than expected. Please refresh the page.');
      }
    }, 10000); // 10 second timeout

    initialize().finally(() => {
      clearTimeout(timeoutId);
    });
  }, []);

  /**
   * Context value
   */
  const contextValue: LeagueContextType = {
    // State
    isInitialized,
    isLoading,
    error,
    
    // League data
    teams,
    players,
    currentSeason,
    leagueState,
    
    // Standings
    easternStandings,
    westernStandings,
    overallStandings,
    
    // Calendar
    currentGameDay,
    seasonProgress,
    teamProgress,
    
    // Actions
    initializeLeague,
    deleteLeague,
    simulateGame,
    simulateMultipleGames,
    advanceToNextGameDay,
    simulateToGameDay,
    refreshData,
    advanceSeason,
    
    // Utility functions
    getTeamById,
    getPlayersByTeam,
    getTeamRoster
  };

  // Show loading screen until context is fully initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Initializing...</h2>
          <p className="text-gray-600">Setting up the basketball simulation engine...</p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <LeagueContext.Provider value={contextValue}>
      {children}
    </LeagueContext.Provider>
  );
}

/**
 * Hook to use the league context
 */
export function useLeague(): LeagueContextType {
  const context = useContext(LeagueContext);
  if (context === undefined) {
    throw new Error('useLeague must be used within a LeagueProvider');
  }
  return context;
}

/**
 * Hook to check if league is ready
 */
export function useLeagueReady(): boolean {
  const { isInitialized, teams, players } = useLeague();
  return isInitialized && teams.length > 0 && players.length > 0;
}

/**
 * Hook to get loading state
 */
export function useLeagueLoading(): boolean {
  const { isLoading } = useLeague();
  return isLoading;
}

/**
 * Hook to get error state
 */
export function useLeagueError(): string | null {
  const { error } = useLeague();
  return error;
}

/**
 * Hook to get teams data
 */
export function useTeams(): Team[] {
  const { teams } = useLeague();
  return teams;
}

/**
 * Hook to get players data
 */
export function usePlayers(): Player[] {
  const { players } = useLeague();
  return players;
}

/**
 * Hook to get standings data
 */
export function useStandings(): {
  eastern: any[];
  western: any[];
  overall: any[];
} {
  const { easternStandings, westernStandings, overallStandings } = useLeague();
  return {
    eastern: easternStandings,
    western: westernStandings,
    overall: overallStandings
  };
}

/**
 * Hook to get league state
 */
export function useLeagueState(): LeagueState | null {
  const { leagueState } = useLeague();
  return leagueState;
}

/**
 * Hook to get current season
 */
export function useCurrentSeason(): SeasonInfo | null {
  const { currentSeason } = useLeague();
  return currentSeason;
}
