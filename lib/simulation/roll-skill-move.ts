/**
 * Skill Move Roll Resolution
 * 
 * Handles skill move attempts with D20 dice rolls, calculating outcomes
 * for success (gain openness), neutral (no change), or steal (turnover).
 */

import type { SimulationPlayer, SkillMoveRollResult } from '../types/simulation-engine'
import { getSkillMoveRollConfig } from './config-loader'
import { rollD20 } from './d20-rng'
import { allocateFaces, createThreeOutcomeCaps, getOutcomeFromRoll } from './probability-allocator'

/**
 * Roll for a skill move attempt
 * @param offensivePlayer Player attempting the skill move
 * @param defensivePlayer Player defending the skill move
 * @param openness Current openness score
 * @param context Additional context
 * @returns Skill move roll result
 */
export function rollSkillMove(
  offensivePlayer: SimulationPlayer,
  defensivePlayer: SimulationPlayer,
  openness: number,
  context: {
    passCount: number
    defensiveBreakdown: number
    staminaDecay: number
  }
): SkillMoveRollResult {
  const config = getSkillMoveRollConfig()
  
  // Calculate raw value from coefficients
  const rawValue = calculateSkillMoveRawValue(offensivePlayer, defensivePlayer, openness, context, config)
  
  // Normalize to probability (0-1) - using a simplified approach for now
  const normalizedProbability = Math.max(0, Math.min(1, rawValue / 100))
  
  // Calculate outcome probabilities
  const successProb = normalizedProbability * 0.6 // 60% of success chance goes to success
  const neutralProb = normalizedProbability * 0.3 // 30% goes to neutral
  const stealProb = Math.max(0.1, 1 - normalizedProbability) // Steal chance is inverse of success
  
  // Normalize probabilities to sum to 1
  const totalProb = successProb + neutralProb + stealProb
  const normalizedSuccessProb = successProb / totalProb
  const normalizedNeutralProb = neutralProb / totalProb
  const normalizedStealProb = stealProb / totalProb
  
  // Create face allocation caps
  const caps = createThreeOutcomeCaps(
    config.caps.min_faces,
    config.caps.max_faces,
    config.baseline.neutral_weight,
    config.caps.max_faces,
    config.caps.steal_cap,
    config.caps.steal_cap
  )
  
  // Allocate faces for success/neutral/steal
  const faces = allocateFaces([normalizedSuccessProb, normalizedNeutralProb, normalizedStealProb], caps)
  
  // Roll D20
  const roll = rollD20()
  
  // Determine outcome
  const outcomeIndex = getOutcomeFromRoll(roll, faces)
  const outcomes = ['success', 'neutral', 'steal'] as const
  const outcome = outcomes[outcomeIndex]
  
  // Calculate openness gain for success
  const opennessGain = outcome === 'success' ? calculateOpennessGain(offensivePlayer, context) : undefined
  
  // Create debug information
  const debug = {
    coefficients: {
      skill_move: config.coefficients.success.off_skill,
      speed: config.coefficients.success.off_speed,
      openness: config.coefficients.success.openness,
      defender_on_ball: config.coefficients.success.def_onball,
      defender_steal: config.coefficients.steal.def_steal
    },
    calculation: `Raw: ${rawValue.toFixed(2)}, Normalized: ${normalizedProbability.toFixed(3)}, Faces: [${faces.join(', ')}]`
  }
  
  return {
    outcome,
    roll,
    faces,
    rawValue,
    normalizedProbability,
    debug,
    opennessGain
  }
}

/**
 * Calculate raw value for skill move attempt
 * @param offensivePlayer Offensive player
 * @param defensivePlayer Defensive player
 * @param openness Current openness
 * @param context Skill move context
 * @param config Skill move configuration
 * @returns Raw value
 */
function calculateSkillMoveRawValue(
  offensivePlayer: SimulationPlayer,
  defensivePlayer: SimulationPlayer,
  openness: number,
  context: {
    passCount: number
    defensiveBreakdown: number
    staminaDecay: number
  },
  config: any
): number {
  // Apply stamina decay to offensive attributes
  const effectiveSkillMove = Math.max(0, offensivePlayer.skill_move - context.staminaDecay * 0.3)
  const effectiveSpeed = Math.max(0, offensivePlayer.speed - context.staminaDecay * 0.2)
  
  // Calculate offensive contribution using new coefficient structure
  const offensiveValue = 
    effectiveSkillMove * config.coefficients.success.off_skill +
    effectiveSpeed * config.coefficients.success.off_speed +
    openness * config.coefficients.success.openness +
    defensivePlayer.on_ball_defense * config.coefficients.success.def_onball +
    defensivePlayer.speed * config.coefficients.success.def_speed
  
  // Calculate defensive contribution for steal
  const stealValue = 
    defensivePlayer.steal * config.coefficients.steal.def_steal +
    defensivePlayer.speed * config.coefficients.steal.def_speed +
    effectiveSkillMove * config.coefficients.steal.off_skill
  
  // Apply context modifiers
  const passCountBonus = context.passCount * 1.5 // Bonus for ball movement
  const defensiveBreakdownPenalty = context.defensiveBreakdown * 2 // Penalty for team defensive issues
  
  // Calculate final raw value (using stealValue as defensive component)
  const rawValue = offensiveValue - stealValue + passCountBonus - defensiveBreakdownPenalty
  
  return Math.max(0, rawValue)
}

/**
 * Calculate openness gain for successful skill move
 * @param offensivePlayer Offensive player
 * @param context Skill move context
 * @returns Openness gain amount
 */
function calculateOpennessGain(
  offensivePlayer: SimulationPlayer,
  context: {
    passCount: number
    defensiveBreakdown: number
    staminaDecay: number
  }
): number {
  // Base openness gain from skill move ability
  const baseGain = offensivePlayer.skill_move * 0.3
  
  // Bonus for high speed (quicker moves create more space)
  const speedBonus = offensivePlayer.speed * 0.1
  
  // Penalty for stamina decay
  const staminaPenalty = context.staminaDecay * 0.5
  
  // Calculate final openness gain
  const opennessGain = Math.max(5, baseGain + speedBonus - staminaPenalty)
  
  return Math.round(opennessGain)
}

/**
 * Get skill move attempt description
 * @param offensivePlayer Offensive player
 * @param openness Current openness
 * @returns Skill move description
 */
export function getSkillMoveDescription(
  offensivePlayer: SimulationPlayer,
  openness: number
): string {
  const opennessDesc = openness > 60 ? 'open' : openness > 40 ? 'contested' : 'heavily contested'
  return `${offensivePlayer.name} attempts a skill move in a ${opennessDesc} situation`
}

/**
 * Get skill move result description
 * @param offensivePlayer Offensive player
 * @param result Skill move roll result
 * @returns Result description
 */
export function getSkillMoveResultDescription(
  offensivePlayer: SimulationPlayer,
  result: SkillMoveRollResult
): string {
  switch (result.outcome) {
    case 'success':
      return `${offensivePlayer.name} successfully executes the skill move! (+${result.opennessGain} openness)`
    case 'neutral':
      return `${offensivePlayer.name} attempts the skill move but it doesn't create space`
    case 'steal':
      return `${offensivePlayer.name} loses the ball on the skill move attempt!`
    default:
      return `${offensivePlayer.name} attempts a skill move`
  }
}

/**
 * Get skill move debug information
 * @param offensivePlayer Offensive player
 * @param defensivePlayer Defensive player
 * @param openness Current openness
 * @param context Skill move context
 * @returns Debug information
 */
export function getSkillMoveDebug(
  offensivePlayer: SimulationPlayer,
  defensivePlayer: SimulationPlayer,
  openness: number,
  context: {
    passCount: number
    defensiveBreakdown: number
    staminaDecay: number
  }
): {
  offensivePlayer: string
  defensivePlayer: string
  openness: number
  passCount: number
  defensiveBreakdown: number
  staminaDecay: number
  effectiveAttributes: {
    skill_move: number
    speed: number
  }
  defensiveAttributes: {
    on_ball_defense: number
    steal: number
  }
  rawValue: number
  normalizedProbability: number
  outcomeProbabilities: {
    success: number
    neutral: number
    steal: number
  }
  faces: number[]
  roll: number
  outcome: string
  opennessGain?: number
} {
  const config = getSkillMoveRollConfig()
  const rawValue = calculateSkillMoveRawValue(offensivePlayer, defensivePlayer, openness, context, config)
  const normalizedProbability = Math.max(0, Math.min(1, rawValue / 100))
  
  const successProb = normalizedProbability * 0.6
  const neutralProb = normalizedProbability * 0.3
  const stealProb = Math.max(0.1, 1 - normalizedProbability)
  
  const totalProb = successProb + neutralProb + stealProb
  const normalizedSuccessProb = successProb / totalProb
  const normalizedNeutralProb = neutralProb / totalProb
  const normalizedStealProb = stealProb / totalProb
  
  const caps = createThreeOutcomeCaps(
    config.caps.min_faces,
    config.caps.max_faces,
    config.baseline.neutral_weight,
    config.caps.max_faces,
    config.caps.steal_cap,
    config.caps.steal_cap
  )
  
  const faces = allocateFaces([normalizedSuccessProb, normalizedNeutralProb, normalizedStealProb], caps)
  const roll = rollD20()
  const outcomeIndex = getOutcomeFromRoll(roll, faces)
  const outcomes = ['success', 'neutral', 'steal'] as const
  const outcome = outcomes[outcomeIndex]
  const opennessGain = outcome === 'success' ? calculateOpennessGain(offensivePlayer, context) : undefined
  
  return {
    offensivePlayer: offensivePlayer.name,
    defensivePlayer: defensivePlayer.name,
    openness,
    passCount: context.passCount,
    defensiveBreakdown: context.defensiveBreakdown,
    staminaDecay: context.staminaDecay,
    effectiveAttributes: {
      skill_move: Math.max(0, offensivePlayer.skill_move - context.staminaDecay * 0.3),
      speed: Math.max(0, offensivePlayer.speed - context.staminaDecay * 0.2)
    },
    defensiveAttributes: {
      on_ball_defense: defensivePlayer.on_ball_defense,
      steal: defensivePlayer.steal
    },
    rawValue,
    normalizedProbability,
    outcomeProbabilities: {
      success: normalizedSuccessProb,
      neutral: normalizedNeutralProb,
      steal: normalizedStealProb
    },
    faces,
    roll,
    outcome,
    opennessGain
  }
}
