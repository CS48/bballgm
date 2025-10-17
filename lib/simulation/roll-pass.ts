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
  const config = getPassRollConfig()
  
  // Calculate raw value from coefficients
  const rawValue = calculatePassRawValue(passer, defender, targetOpenness, context, config)
  
  // Normalize to probability (0-1) - using a simplified approach for now
  const normalizedProbability = Math.max(0, Math.min(1, rawValue / 100))
  
  // Calculate success probability (complete pass)
  const successProbability = normalizedProbability
  
  // Create face allocation caps
  const caps = createTwoOutcomeCaps(config.caps.min_faces, 20 - config.caps.steal_cap)
  
  // Allocate faces for complete/intercepted
  const faces = allocateFaces([successProbability, 1 - successProbability], caps)
  
  // Roll D20
  const roll = rollD20()
  
  // Determine outcome
  const outcomeIndex = getOutcomeFromRoll(roll, faces)
  const complete = outcomeIndex === 0 // First outcome is complete
  const intercepted = !complete
  
  // Create debug information
  const debug = {
    coefficients: {
      pass: config.pass_coef,
      ball_iq: config.ball_iq_coef,
      target_openness: config.target_openness_coef,
      defender_on_ball: config.defender_on_ball_coef,
      defender_steal: config.defender_steal_coef
    },
    calculation: `Raw: ${rawValue.toFixed(2)}, Normalized: ${normalizedProbability.toFixed(3)}, Faces: [${faces.join(', ')}]`
  }
  
  return {
    outcome: complete ? 'complete' : 'intercepted',
    roll,
    faces,
    rawValue,
    normalizedProbability,
    debug,
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
 */
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
  
  // Calculate defensive contribution
  const defensiveValue = 
    defender.on_ball_defense * config.coefficients.def_openness +
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
  const normalizedProbability = Math.max(0, Math.min(1, rawValue / 100))
  
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
