/**
 * Pass Roll Resolution
 * 
 * Handles pass attempts with D20 dice rolls, calculating outcomes
 * for complete pass or interception based on passer attributes,
 * target openness, and defensive pressure.
 */

import type { SimulationPlayer, PassRollResult } from '../types/simulation-engine'
import { getPassRollConfig } from './config-loader'
import { rollD20 } from './d20-rng'
import { allocateFaces, createTwoOutcomeCaps, getOutcomeFromRoll } from './probability-allocator'

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
    passCount: number
    defensiveBreakdown: number
    staminaDecay: number
    targetPlayer: SimulationPlayer
  }
): PassRollResult {
  // Flat 19:1 ratio - 95% completion, 5% steal
  const faces = [19, 1] // Complete: 19, Intercepted: 1
  
  // Roll D20
  const roll = rollD20()
  
  // Determine outcome (rolls 1-19 = complete, roll 20 = intercepted)
  const complete = roll <= 19
  const intercepted = !complete
  
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
        defender_steal: 0
      },
      calculation: 'Flat 19:1 ratio (95% completion)'
    },
    complete,
    intercepted,
    newBallHandler: complete ? context.targetPlayer : undefined
  }
}

/**
 * Calculate raw value for pass attempt
 * @param passer Passing player
 * @param defender Defensive player
 * @param targetOpenness Target player openness
 * @param context Pass context
 * @param config Pass configuration
 * @returns Raw value
 * 
 * NOTE: This function is no longer used with the flat 19:1 pass ratio.
 * Kept for reference but commented out.
 */
/*
function calculatePassRawValue(
  passer: SimulationPlayer,
  defender: SimulationPlayer,
  targetOpenness: number,
  context: {
    passCount: number
    defensiveBreakdown: number
    staminaDecay: number
    targetPlayer: SimulationPlayer
  },
  config: any
): number {
  // Apply stamina decay to passer attributes
  const effectivePass = Math.max(0, passer.pass - context.staminaDecay * 0.2)
  const effectiveBallIQ = Math.max(0, passer.ball_iq - context.staminaDecay * 0.3)
  
  // Calculate offensive contribution using new coefficient structure
  const offensiveValue = 
    effectivePass * config.coefficients.off_pass +
    targetOpenness * config.coefficients.target_openness +
    effectiveBallIQ * config.coefficients.ball_iq
  
  // Calculate defensive contribution (only steal attempts, defensive positioning already in targetOpenness)
  const defensiveValue = 
    defender.steal * config.coefficients.def_steal
  
  // Apply context modifiers
  const passCountBonus = context.passCount * 1.2 // Bonus for ball movement
  const defensiveBreakdownPenalty = context.defensiveBreakdown * 1.5 // Penalty for team defensive issues
  
  // Bonus for target player's receiving ability (ball IQ)
  const targetReceivingBonus = context.targetPlayer.ball_iq * 0.1
  
  // Calculate final raw value
  const rawValue = offensiveValue - defensiveValue + passCountBonus - defensiveBreakdownPenalty + targetReceivingBonus
  
  return Math.max(0, rawValue)
}
*/

/**
 * Get pass attempt description
 * @param passer Passing player
 * @param target Target player
 * @param targetOpenness Target player openness
 * @returns Pass description
 */
export function getPassDescription(
  passer: SimulationPlayer,
  target: SimulationPlayer,
  targetOpenness: number
): string {
  const opennessDesc = targetOpenness > 70 ? 'wide open' : targetOpenness > 50 ? 'open' : targetOpenness > 30 ? 'contested' : 'heavily contested'
  return `${passer.name} passes to ${target.name} who is ${opennessDesc}`
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
    return `${passer.name} completes the pass to ${target.name}!`
  } else {
    return `${passer.name}'s pass is intercepted!`
  }
}

/**
 * Get pass debug information
 * @param passer Passing player
 * @param defender Defensive player
 * @param target Target player
 * @param targetOpenness Target player openness
 * @param context Pass context
 * @returns Debug information
 */
export function getPassDebug(
  passer: SimulationPlayer,
  defender: SimulationPlayer,
  target: SimulationPlayer,
  targetOpenness: number,
  context: {
    passCount: number
    defensiveBreakdown: number
    staminaDecay: number
  }
): {
  passer: string
  defender: string
  target: string
  targetOpenness: number
  passCount: number
  defensiveBreakdown: number
  staminaDecay: number
  effectiveAttributes: {
    pass: number
    ball_iq: number
  }
  defensiveAttributes: {
    on_ball_defense: number
    steal: number
  }
  targetAttributes: {
    ball_iq: number
  }
  rawValue: number
  normalizedProbability: number
  successProbability: number
  faces: number[]
  roll: number
  outcome: string
  complete: boolean
  intercepted: boolean
} {
  const config = getPassRollConfig()
  const rawValue = calculatePassRawValue(passer, defender, targetOpenness, { ...context, targetPlayer: target }, config)
  const normalizedProbability = 0.20 + (Math.max(0, Math.min(100, rawValue)) / 100) * 0.6
  
  const caps = createTwoOutcomeCaps(config.caps.min_faces, 20 - config.caps.steal_cap)
  const faces = allocateFaces([normalizedProbability, 1 - normalizedProbability], caps)
  const roll = rollD20()
  const outcomeIndex = getOutcomeFromRoll(roll, faces)
  const complete = outcomeIndex === 0
  
  return {
    passer: passer.name,
    defender: defender.name,
    target: target.name,
    targetOpenness,
    passCount: context.passCount,
    defensiveBreakdown: context.defensiveBreakdown,
    staminaDecay: context.staminaDecay,
    effectiveAttributes: {
      pass: Math.max(0, passer.pass - context.staminaDecay * 0.2),
      ball_iq: Math.max(0, passer.ball_iq - context.staminaDecay * 0.3)
    },
    defensiveAttributes: {
      on_ball_defense: defender.on_ball_defense,
      steal: defender.steal
    },
    targetAttributes: {
      ball_iq: target.ball_iq
    },
    rawValue,
    normalizedProbability,
    successProbability: normalizedProbability,
    faces,
    roll,
    outcome: complete ? 'complete' : 'intercepted',
    complete,
    intercepted
  }
}
