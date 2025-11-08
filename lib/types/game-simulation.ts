/**
 * Game Simulation Types
 *
 * This file contains types specifically for game simulation that bridge
 * database types with the game engine needs.
 */

import type { Team as DatabaseTeam, Player as DatabasePlayer } from './database';

/**
 * Simplified player for game engine
 */
export interface GameSimulationPlayer {
  id: string;
  name: string;
  position: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
  teamId?: string; // Optional but recommended
  is_starter: number;
  attributes: {
    shooting: number;
    defense: number;
    rebounding: number;
    passing: number;
    athleticism: number;
  };
  overall: number;
  descriptor: string;
  // Individual attributes for D20 simulation engine
  speed?: number;
  ball_iq?: number;
  inside_shot?: number;
  three_point_shot?: number;
  pass?: number;
  skill_move?: number;
  on_ball_defense?: number;
  stamina?: number;
  block?: number;
  steal?: number;
  offensive_rebound?: number;
  defensive_rebound?: number;
}

/**
 * Team wrapper for game simulation with players array
 */
export interface GameSimulationTeam {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  players: GameSimulationPlayer[];
  record: { wins: number; losses: number };
}

/**
 * Game event during simulation
 */
export interface GameEvent {
  id: string;
  quarter: number;
  time: string;
  description: string;
  homeScore: number;
  awayScore: number;
  eventType:
    | 'shot'
    | 'rebound'
    | 'assist'
    | 'steal'
    | 'block'
    | 'foul'
    | 'timeout'
    | 'substitution'
    | 'turnover'
    | 'pass'
    | 'skill_move';
  playerId?: string;
  teamId?: string;
  shotClockRemaining?: number;
  gameTimeSeconds: number;

  // D20 simulation details
  ballHandler?: {
    id: string;
    name: string;
  };
  opennessScores?: Record<string, number>;
  decision?: {
    action: 'pass' | 'skill_move' | 'shoot';
    target?: string;
    reasoning: string;
    opennessScore: number;
  };
  rollDetails?: {
    roll: number;
    faces: number[];
    outcome: string;
    rawValue: number;
  };
}

/**
 * Player game stats during simulation
 */
export interface PlayerGameStats extends GameSimulationPlayer {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  turnovers: number;
  fouls: number;
  offensiveRebound: number;
  defensiveRebound: number;
  minutes: number;
}

/**
 * Game simulation result
 */
export interface GameSimulationResult {
  homeTeam: GameSimulationTeam;
  awayTeam: GameSimulationTeam;
  homeScore: number;
  awayScore: number;
  events: GameEvent[];
  winner: string;
  homePlayerStats: PlayerGameStats[];
  awayPlayerStats: PlayerGameStats[];
  mvp?: PlayerGameStats;
}

/**
 * Game mode selection
 */
export type GameMode = 'sim' | 'watch';

/**
 * Animation speed options
 */
export type AnimationSpeed = 1 | 2 | 4 | 8;

/**
 * Watch mode game state
 */
export interface WatchGameState {
  homeTeam: GameSimulationTeam;
  awayTeam: GameSimulationTeam;
  homeScore: number;
  awayScore: number;
  currentQuarter: number;
  quarterTimeRemaining: number;
  gameClock: string;
  currentPossession: 'home' | 'away';
  events: GameEvent[];
  isPlaying: boolean;
  isPaused: boolean;
  isComplete: boolean;
  animationSpeed: AnimationSpeed;
  playerStats: Map<string, PlayerGameStats>;
  currentEventIndex: number;
  playerMinutes: Map<string, number>;
  previousBallHandler: string | undefined;
  lastActionWasPass: boolean;
}

/**
 * Convert database team to game simulation team
 */
export function convertDatabaseTeamToGameTeam(dbTeam: DatabaseTeam, players: DatabasePlayer[]): GameSimulationTeam {
  const gamePlayers: GameSimulationPlayer[] = players.map((player) => ({
    id: player.player_id.toString(),
    name: `${player.first_name} ${player.last_name}`,
    position: player.position as 'PG' | 'SG' | 'SF' | 'PF' | 'C',
    teamId: dbTeam.team_id.toString(), // Add teamId
    is_starter: player.is_starter,
    attributes: {
      shooting: Math.round((player.inside_shot + player.three_point_shot) / 2),
      defense: Math.round((player.on_ball_defense + player.block + player.steal) / 3),
      rebounding: Math.round((player.offensive_rebound + player.defensive_rebound) / 2),
      passing: player.pass,
      athleticism: Math.round((player.speed + player.stamina) / 2),
    },
    overall: player.overall_rating,
    descriptor: `${player.position} - ${player.overall_rating} OVR`,
    // Add individual attributes for D20 engine
    speed: player.speed,
    ball_iq: player.ball_iq,
    inside_shot: player.inside_shot,
    three_point_shot: player.three_point_shot,
    pass: player.pass,
    skill_move: player.skill_move,
    on_ball_defense: player.on_ball_defense,
    stamina: player.stamina,
    block: player.block,
    steal: player.steal,
    offensive_rebound: player.offensive_rebound,
    defensive_rebound: player.defensive_rebound,
  }));

  return {
    id: dbTeam.team_id.toString(),
    name: dbTeam.name,
    city: dbTeam.city,
    players: gamePlayers,
    record: { wins: dbTeam.wins, losses: dbTeam.losses },
  };
}
