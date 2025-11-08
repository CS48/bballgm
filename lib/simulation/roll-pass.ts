/**
 * Pass Roll Resolution
 *
 * Handles pass attempts with D20 dice rolls, calculating outcomes
 * for complete pass or interception based on passer attributes,
 * target openness, and defensive pressure.
 */

import type { PassRollResult, SimulationPlayer } from '../types/simulation-engine';
import { rollD20 } from './d20-rng';

/**
 * Roll for a pass attempt
 * @param passer Player making the pass
 * @param defender Player defending the pass
 * @param targetOpenness Openness score of the target player
 * @param context Additional context
 * @returns Pass roll result
 */
export function rollPass(
  passer: SimulationPlayer,
  defender: SimulationPlayer,
  targetOpenness: number,
  context: {
    passCount: number;
    defensiveBreakdown: number;
    staminaDecay: number;
    targetPlayer: SimulationPlayer;
  }
): PassRollResult {
  // Flat 19:1 ratio - 95% completion, 5% steal
  const faces = [19, 1]; // Complete: 19, Intercepted: 1

  // Roll D20
  const roll = rollD20();

  // Determine outcome (rolls 1-19 = complete, roll 20 = intercepted)
  const complete = roll <= 19;
  const intercepted = !complete;

  return {
    outcome: complete ? 'complete' : 'intercepted',
    roll,
    faces,
    rawValue: 95, // Fixed value for display purposes
    normalizedProbability: 0.95,
    debug: {
      coefficients: {
        pass: 0,
        ball_iq: 0,
        target_openness: 0,
        defender_on_ball: 0,
        defender_steal: 0,
      },
      calculation: 'Flat 19:1 ratio (95% completion)',
    },
    complete,
    intercepted,
    newBallHandler: complete ? context.targetPlayer : undefined,
  };
}

/**
 * Get pass attempt description
 * @param passer Passing player
 * @param target Target player
 * @param targetOpenness Target player openness
 * @returns Pass description
 */
export function getPassDescription(passer: SimulationPlayer, target: SimulationPlayer, targetOpenness: number): string {
  const opennessDesc =
    targetOpenness > 70
      ? 'wide open'
      : targetOpenness > 50
        ? 'open'
        : targetOpenness > 30
          ? 'contested'
          : 'heavily contested';
  return `${passer.name} passes to ${target.name} who is ${opennessDesc}`;
}

/**
 * Get pass result description
 * @param passer Passing player
 * @param target Target player
 * @param result Pass roll result
 * @returns Result description
 */
export function getPassResultDescription(
  passer: SimulationPlayer,
  target: SimulationPlayer,
  result: PassRollResult
): string {
  if (result.complete) {
    return `${passer.name} completes the pass to ${target.name}!`;
  } else {
    return `${passer.name}'s pass is intercepted!`;
  }
}
