/**
 * Rebound Roll Resolution
 *
 * Handles rebound contests with D20 dice rolls, calculating which player
 * gets the rebound based on rebounding attributes, position, and context.
 */

import type { RollResult, SimulationPlayer } from '../types/simulation-engine';
import { getReboundRollConfig } from './config-loader';
import { rollD20 } from './d20-rng';
import { allocateFaces } from './probability-allocator';

export interface ReboundRollResult extends RollResult {
  rebounder: SimulationPlayer;
  isOffensive: boolean;
  teamId: string;
}

/**
 * Roll for a rebound contest
 * @param allPlayers All 10 players on the court (5 offensive, 5 defensive)
 * @param context Rebound context
 * @returns Rebound roll result
 */
export function rollRebound(
  allPlayers: SimulationPlayer[],
  context: {
    shotDistance: 'close' | 'mid' | 'long';
    isThreePointer: boolean;
    offensiveTeamId: string;
    defensiveTeamId: string;
  }
): ReboundRollResult {
  const config = getReboundRollConfig();

  if (allPlayers.length !== 10) {
    console.error('Rebound contest player count mismatch:', {
      expected: 10,
      actual: allPlayers.length,
      players: allPlayers.map((p) => ({ id: p.id, name: p.name, team: p.teamId })),
    });
    throw new Error(`Rebound contest requires exactly 10 players, got ${allPlayers.length}`);
  }

  // Separate offensive and defensive players
  const offensivePlayers = allPlayers.filter((p) => p.teamId === context.offensiveTeamId);
  const defensivePlayers = allPlayers.filter((p) => p.teamId === context.defensiveTeamId);

  if (offensivePlayers.length !== 5 || defensivePlayers.length !== 5) {
    console.error('Player team distribution mismatch:', {
      offensive: offensivePlayers.length,
      defensive: defensivePlayers.length,
      offensiveTeamId: context.offensiveTeamId,
      defensiveTeamId: context.defensiveTeamId,
    });
    throw new Error(`Expected 5 offensive and 5 defensive players`);
  }

  // Calculate raw values for each player
  const playerRawValues = allPlayers.map((player) => calculatePlayerReboundValue(player, context, config));

  // Calculate total raw value for normalization
  const totalRawValue = playerRawValues.reduce((sum, value) => sum + value, 0);

  // Normalize to probabilities
  const probabilities = playerRawValues.map((value) =>
    totalRawValue > 0 ? value / totalRawValue : 1 / allPlayers.length
  );

  // Create face caps for 10 outcomes
  const caps = {
    min: Array(10).fill(config.caps.min_faces),
    max: Array(10).fill(config.caps.max_faces),
  };

  // Allocate faces for each player
  const faces = allocateFaces(probabilities, caps);

  // Roll D20
  const roll = rollD20();

  // Determine which player gets the rebound
  let cumulativeFaces = 0;
  let rebounderIndex = 0;

  for (let i = 0; i < allPlayers.length; i++) {
    cumulativeFaces += faces[i];

    if (roll <= cumulativeFaces) {
      rebounderIndex = i;
      break;
    }
  }

  const rebounder = allPlayers[rebounderIndex];
  const isOffensive = rebounder.teamId === context.offensiveTeamId;

  return {
    roll,
    faces: faces,
    outcome: 'rebound',
    rawValue: totalRawValue,
    description: `${rebounder.name} grabs the ${isOffensive ? 'offensive' : 'defensive'} rebound!`,
    rebounder,
    isOffensive,
    teamId: rebounder.teamId,
  };
}

/**
 * Calculate rebound value for a single player
 * @param player Player to calculate for
 * @param context Rebound context
 * @param config Simulation configuration
 * @returns Raw rebound value
 */
function calculatePlayerReboundValue(
  player: SimulationPlayer,
  context: {
    shotDistance: 'close' | 'mid' | 'long';
    isThreePointer: boolean;
    offensiveTeamId: string;
    defensiveTeamId: string;
  },
  config: any
): number {
  // Determine if player is on offensive or defensive team
  const isOffensive = player.teamId === context.offensiveTeamId;

  // Get appropriate rebounding attribute
  const reboundingAttribute = isOffensive ? player.offensive_rebound : player.defensive_rebound;

  // Base rebound value using config coefficients
  let rawValue = reboundingAttribute * (isOffensive ? config.coefficients.off_reb : config.coefficients.def_reb);

  // Add position bonus using the coefficient
  rawValue += config.coefficients.position_bonus;

  // Add team bias
  rawValue += config.coefficients.team_bias;

  // Position bonus
  const positionBonus = getPositionBonus(player.position);
  rawValue += positionBonus;

  // Shot distance modifier
  const distanceModifier = getDistanceModifier(context.shotDistance, player.position);
  rawValue += distanceModifier;

  // Three-pointer modifier (longer rebounds)
  if (context.isThreePointer) {
    rawValue += getThreePointerModifier(player.position);
  }

  // Ensure minimum value
  return Math.max(1, rawValue);
}

/**
 * Get position bonus for rebounding
 * @param position Player position
 * @returns Position bonus
 */
function getPositionBonus(position: string): number {
  const bonuses = getReboundRollConfig().position_bonuses;

  return bonuses[position] || 0;
}

/**
 * Get distance modifier for rebound
 * @param shotDistance Shot distance
 * @param position Player position
 * @returns Distance modifier
 */
function getDistanceModifier(shotDistance: string, position: string): number {
  const modifiers = getReboundRollConfig().distance_modifiers;

  return modifiers[shotDistance]?.[position] || 0;
}

/**
 * Get three-pointer modifier for rebound
 * @param position Player position
 * @returns Three-pointer modifier
 */
function getThreePointerModifier(position: string): number {
  const modifiers = getReboundRollConfig().three_pointer_modifiers;

  return modifiers[position] || 0;
}
