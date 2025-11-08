/**
 * Shot Roll Resolution
 *
 * Handles shot attempts with D20 dice rolls, calculating success probability
 * based on player attributes, openness, and defensive pressure.
 */

import type { SimulationPlayer, ShotRollResult } from '../types/simulation-engine';
import { getShotRollConfig } from './config-loader';
import { rollD20 } from './d20-rng';
import { allocateFaces, createTwoOutcomeCaps, getOutcomeFromRoll } from './probability-allocator';

/**
 * Roll for a shot attempt
 * @param shooter Offensive player taking the shot
 * @param defender Defensive player guarding the shot
 * @param openness Openness score for the shot
 * @param isThreePointer Whether this is a three-point attempt
 * @param context Additional context (shot clock, etc.)
 * @returns Shot roll result
 */
export function rollShot(
  shooter: SimulationPlayer,
  defender: SimulationPlayer,
  openness: number,
  isThreePointer: boolean,
  context: {
    shotClock: number;
    passCount: number;
    defensiveBreakdown: number;
  }
): ShotRollResult {
  const config = getShotRollConfig();

  // Calculate raw value from coefficients
  const rawValue = calculateShotRawValue(shooter, defender, openness, isThreePointer, context, config);

  // Normalize to probability (0-1) - map to realistic 15-65% range
  const normalizedProbability = 0.15 + (Math.max(0, Math.min(100, rawValue)) / 100) * 0.5;

  // Calculate success probability
  const successProbability = normalizedProbability;

  // Create face allocation caps
  const caps = createTwoOutcomeCaps(config.caps.min_faces, config.caps.max_faces);

  // Allocate faces for success/failure
  const faces = allocateFaces([successProbability, 1 - successProbability], caps);

  // Roll D20
  const roll = rollD20();

  // Determine outcome
  const outcomeIndex = getOutcomeFromRoll(roll, faces);
  const made = outcomeIndex === 0; // First outcome is success

  // Calculate points
  const points = made ? (isThreePointer ? 3 : 2) : 0;

  // Create debug information
  const debug = {
    coefficients: {
      openness: config.coefficients.openness,
      defender_on_ball: config.coefficients.def_onball,
    },
    calculation: `Raw: ${rawValue.toFixed(2)}, Normalized: ${normalizedProbability.toFixed(3)}, Faces: [${faces.join(', ')}]`,
  };

  return {
    outcome: made ? 'success' : 'failure',
    roll,
    faces,
    rawValue,
    normalizedProbability,
    debug,
    made,
    isThreePointer,
    points,
  };
}

/**
 * Calculate raw value for shot attempt
 * @param shooter Offensive player
 * @param defender Defensive player
 * @param openness Openness score
 * @param isThreePointer Whether it's a three-pointer
 * @param context Shot context
 * @param config Shot configuration
 * @returns Raw value
 */
function calculateShotRawValue(
  shooter: SimulationPlayer,
  defender: SimulationPlayer,
  openness: number,
  isThreePointer: boolean,
  context: {
    shotClock: number;
    passCount: number;
    defensiveBreakdown: number;
  },
  config: any
): number {
  // Base shooting attribute
  const shootingAttribute = isThreePointer ? shooter.three_point_shot : shooter.inside_shot;

  // Calculate offensive contribution using new coefficient structure
  const offensiveValue =
    shootingAttribute * config.coefficients.off_shot +
    openness * config.coefficients.openness +
    shooter.speed * config.coefficients.off_speed +
    shooter.stamina * config.coefficients.stamina;

  // Calculate defensive contribution
  const defensiveValue =
    defender.on_ball_defense * config.coefficients.def_onball + defender.speed * config.coefficients.def_speed;

  // Apply context modifiers using new coefficient structure
  const shotClockPressure = context.shotClock <= 4 ? config.coefficients.shot_clock_pressure : 0;
  const contextModifier = config.coefficients.context_modifier;

  // Calculate final raw value
  const rawValue = offensiveValue - defensiveValue + shotClockPressure + contextModifier;

  return Math.max(0, rawValue);
}

/**
 * Determine if a shot should be a three-pointer based on player attributes and context
 * @param shooter Offensive player
 * @param openness Openness score
 * @param context Shot context
 * @returns Whether to attempt three-pointer
 */
export function shouldAttemptThreePointer(
  shooter: SimulationPlayer,
  openness: number,
  context: {
    shotClock: number;
    passCount: number;
    defensiveBreakdown: number;
  }
): boolean {
  // Base three-point attempt rate (reduced from /150 to /200)
  const baseThreePointRate = shooter.three_point_shot / 200;

  // Bonus for high openness (reduced)
  const opennessBonus = openness > 60 ? 0.08 : 0;

  // Removed shot clock bonus entirely
  const shotClockBonus = 0;

  // Bonus for ball movement (reduced)
  const passCountBonus = context.passCount > 2 ? 0.05 : 0;

  // Position-based multiplier for three-point attempts
  const positionMultiplier = getThreePointPositionMultiplier(shooter.position);

  // Calculate final three-point attempt probability
  const threePointProb = Math.min(
    0.5,
    (baseThreePointRate + opennessBonus + shotClockBonus + passCountBonus) * positionMultiplier
  );

  const willAttemptThree = Math.random() < threePointProb;

  console.log('\n--- Shot Type Decision ---');
  console.log(`Shooter: ${shooter.name} (${shooter.position})`);
  console.log(`3PT Rating: ${shooter.three_point_shot}`);
  console.log(`Openness: ${openness}`);
  console.log(`Base Rate: ${baseThreePointRate.toFixed(3)}`);
  console.log(`Openness Bonus: ${opennessBonus.toFixed(3)}`);
  console.log(`Shot Clock Bonus: ${shotClockBonus.toFixed(3)}`);
  console.log(`Pass Count Bonus: ${passCountBonus.toFixed(3)}`);
  console.log(`Position Multiplier: ${positionMultiplier.toFixed(2)}`);
  console.log(`Final 3PT Probability: ${(threePointProb * 100).toFixed(1)}%`);
  console.log(`Result: ${willAttemptThree ? '3-POINTER' : '2-POINTER'}`);

  return willAttemptThree;
}

/**
 * Get position-based three-point multiplier
 * @param position Player position
 * @returns Multiplier for three-point attempt rate
 */
function getThreePointPositionMultiplier(position: string): number {
  const modifiers = getShotRollConfig().three_pointer_modifiers;
  return modifiers[position] || 1.0;
}

/**
 * Get shot attempt description
 * @param shooter Offensive player
 * @param isThreePointer Whether it's a three-pointer
 * @param openness Openness score
 * @returns Shot description
 */
export function getShotDescription(shooter: SimulationPlayer, isThreePointer: boolean, openness: number): string {
  const shotType = isThreePointer ? 'three-pointer' : 'two-pointer';
  const opennessDesc =
    openness > 70 ? 'wide open' : openness > 50 ? 'open' : openness > 30 ? 'contested' : 'heavily contested';

  return `${shooter.name} attempts a ${opennessDesc} ${shotType}`;
}

/**
 * Get shot result description
 * @param shooter Offensive player
 * @param result Shot roll result
 * @returns Result description
 */
export function getShotResultDescription(shooter: SimulationPlayer, result: ShotRollResult): string {
  if (result.made) {
    const shotType = result.isThreePointer ? 'three-pointer' : 'two-pointer';
    return `${shooter.name} makes the ${shotType}! (+${result.points} points)`;
  } else {
    const shotType = result.isThreePointer ? 'three-pointer' : 'shot';
    return `${shooter.name} misses the ${shotType}`;
  }
}

/**
 * Get shot debug information
 * @param shooter Offensive player
 * @param defender Defensive player
 * @param openness Openness score
 * @param isThreePointer Whether it's a three-pointer
 * @param context Shot context
 * @returns Debug information
 */
export function getShotDebug(
  shooter: SimulationPlayer,
  defender: SimulationPlayer,
  openness: number,
  isThreePointer: boolean,
  context: {
    shotClock: number;
    passCount: number;
    defensiveBreakdown: number;
  }
): {
  shooter: string;
  defender: string;
  openness: number;
  isThreePointer: boolean;
  shotClock: number;
  passCount: number;
  defensiveBreakdown: number;
  shootingAttribute: number;
  defensiveAttributes: {
    on_ball_defense: number;
    block: number;
  };
  rawValue: number;
  normalizedProbability: number;
  successProbability: number;
  faces: number[];
  roll: number;
  outcome: string;
  made: boolean;
  points: number;
} {
  const config = getShotRollConfig();
  const rawValue = calculateShotRawValue(shooter, defender, openness, isThreePointer, context, config);
  const normalizedProbability = 0.15 + (Math.max(0, Math.min(100, rawValue)) / 100) * 0.5;

  const caps = createTwoOutcomeCaps(config.caps.min_faces, config.caps.max_faces);
  const faces = allocateFaces([normalizedProbability, 1 - normalizedProbability], caps);
  const roll = rollD20();
  const outcomeIndex = getOutcomeFromRoll(roll, faces);
  const made = outcomeIndex === 0;
  const points = made ? (isThreePointer ? 3 : 2) : 0;

  return {
    shooter: shooter.name,
    defender: defender.name,
    openness,
    isThreePointer,
    shotClock: context.shotClock,
    passCount: context.passCount,
    defensiveBreakdown: context.defensiveBreakdown,
    shootingAttribute: isThreePointer ? shooter.three_point_shot : shooter.inside_shot,
    defensiveAttributes: {
      on_ball_defense: defender.on_ball_defense,
      block: defender.block,
    },
    rawValue,
    normalizedProbability,
    successProbability: normalizedProbability,
    faces,
    roll,
    outcome: made ? 'success' : 'failure',
    made,
    points,
  };
}
