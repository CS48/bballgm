/**
 * Openness Calculator
 * 
 * Calculates matchup openness scores for all 5v5 player matchups.
 * Uses player attributes, context (pass count, defensive breakdown), and
 * configurable coefficients to determine how "open" each offensive player is.
 */

import type { SimulationPlayer, PossessionState } from '../types/simulation-engine'
import { getDecisionLogicConfig } from './config-loader'

/**
 * Calculate openness score for a single matchup
 * @param offensivePlayer Offensive player
 * @param defensivePlayer Defensive player
 * @param passCount Current pass count in possession
 * @param defensiveBreakdown Team defensive breakdown level
 * @param staminaDecay Stamina decay penalty for offensive player
 * @returns Openness score (0-100)
 */
export function calculateOpenness(
  offensivePlayer: SimulationPlayer,
  defensivePlayer: SimulationPlayer,
  passCount: number,
  defensiveBreakdown: number,
  staminaDecay: number = 0
): number {
  const config = getDecisionLogicConfig()
  
  // Apply stamina decay to offensive attributes
  const effectiveSpeed = Math.max(0, offensivePlayer.speed - staminaDecay)
  const effectiveBallIQ = Math.max(0, offensivePlayer.ball_iq - staminaDecay * 0.5)
  const effectiveSkillMove = Math.max(0, offensivePlayer.skill_move - staminaDecay * 0.3)
  const effectivePass = Math.max(0, offensivePlayer.pass - staminaDecay * 0.2)
  
  // Calculate offensive contribution using simplified coefficients
  const offensiveValue = 
    effectiveSpeed * 0.3 +
    effectiveBallIQ * 0.2 +
    effectiveSkillMove * 0.15 +
    effectivePass * 0.1
  
  // Calculate defensive contribution
  const defensiveValue = 
    defensivePlayer.speed * 0.25 +
    defensivePlayer.on_ball_defense * 0.4
  
  // Apply context modifiers
  const passCountBonus = passCount * 1.5
  const defensiveBreakdownPenalty = defensiveBreakdown * 2.0
  
  // Calculate raw openness value
  const rawValue = offensiveValue - defensiveValue + passCountBonus - defensiveBreakdownPenalty
  
  // Normalize to 0-100 range using simplified approach
  const normalized = Math.max(0, Math.min(100, rawValue))
  
  return Math.round(normalized)
}

/**
 * Calculate openness scores for all 5v5 matchups
 * @param offensiveTeam Offensive team players
 * @param defensiveTeam Defensive team players
 * @param state Current possession state
 * @returns Map of player ID to openness score
 */
export function calculateAllOpennessScores(
  offensiveTeam: SimulationPlayer[],
  defensiveTeam: SimulationPlayer[],
  state: PossessionState
): Map<string, number> {
  const opennessScores = new Map<string, number>()
  
  // Calculate openness for each offensive player against each defensive player
  for (const offensivePlayer of offensiveTeam) {
    let totalOpenness = 0
    let matchupCount = 0
    
    for (const defensivePlayer of defensiveTeam) {
      const staminaDecay = state.staminaDecay.get(offensivePlayer.id) || 0
      const openness = calculateOpenness(
        offensivePlayer,
        defensivePlayer,
        state.passCount,
        state.defensiveBreakdown,
        staminaDecay
      )
      
      totalOpenness += openness
      matchupCount++
    }
    
    // Average openness across all defensive matchups
    const averageOpenness = totalOpenness / matchupCount
    opennessScores.set(offensivePlayer.id, averageOpenness)
  }
  
  return opennessScores
}

/**
 * Get the most open offensive player
 * @param opennessScores Map of player ID to openness score
 * @param offensiveTeam Offensive team players
 * @returns Most open player
 */
export function getMostOpenPlayer(
  opennessScores: Map<string, number>,
  offensiveTeam: SimulationPlayer[]
): SimulationPlayer {
  let mostOpenPlayer = offensiveTeam[0]
  let highestOpenness = opennessScores.get(mostOpenPlayer.id) || 0
  
  for (const player of offensiveTeam) {
    const openness = opennessScores.get(player.id) || 0
    if (openness > highestOpenness) {
      highestOpenness = openness
      mostOpenPlayer = player
    }
  }
  
  return mostOpenPlayer
}

/**
 * Get openness score for a specific player
 * @param playerId Player ID
 * @param opennessScores Map of player ID to openness score
 * @returns Openness score or 0 if not found
 */
export function getPlayerOpenness(playerId: string, opennessScores: Map<string, number>): number {
  return opennessScores.get(playerId) || 0
}

/**
 * Get players sorted by openness (highest first)
 * @param opennessScores Map of player ID to openness score
 * @param offensiveTeam Offensive team players
 * @returns Players sorted by openness
 */
export function getPlayersByOpenness(
  opennessScores: Map<string, number>,
  offensiveTeam: SimulationPlayer[]
): SimulationPlayer[] {
  return [...offensiveTeam].sort((a, b) => {
    const opennessA = opennessScores.get(a.id) || 0
    const opennessB = opennessScores.get(b.id) || 0
    return opennessB - opennessA
  })
}

/**
 * Calculate team average openness
 * @param opennessScores Map of player ID to openness score
 * @returns Average openness score
 */
export function getTeamAverageOpenness(opennessScores: Map<string, number>): number {
  const scores = Array.from(opennessScores.values())
  if (scores.length === 0) return 0
  
  const total = scores.reduce((sum, score) => sum + score, 0)
  return total / scores.length
}

/**
 * Get openness distribution statistics
 * @param opennessScores Map of player ID to openness score
 * @returns Openness statistics
 */
export function getOpennessStats(opennessScores: Map<string, number>): {
  min: number
  max: number
  average: number
  median: number
  standardDeviation: number
} {
  const scores = Array.from(opennessScores.values())
  
  if (scores.length === 0) {
    return { min: 0, max: 0, average: 0, median: 0, standardDeviation: 0 }
  }
  
  const sorted = [...scores].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
  const median = sorted.length % 2 === 0 
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]
  
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length
  const standardDeviation = Math.sqrt(variance)
  
  return { min, max, average, median, standardDeviation }
}

/**
 * Debug information for openness calculation
 * @param offensivePlayer Offensive player
 * @param defensivePlayer Defensive player
 * @param passCount Pass count
 * @param defensiveBreakdown Defensive breakdown
 * @param staminaDecay Stamina decay
 * @returns Debug information
 */
export function getOpennessDebug(
  offensivePlayer: SimulationPlayer,
  defensivePlayer: SimulationPlayer,
  passCount: number,
  defensiveBreakdown: number,
  staminaDecay: number = 0
): {
  offensivePlayer: string
  defensivePlayer: string
  passCount: number
  defensiveBreakdown: number
  staminaDecay: number
  effectiveAttributes: {
    speed: number
    ball_iq: number
    skill_move: number
    pass: number
  }
  offensiveValue: number
  defensiveValue: number
  contextModifiers: {
    passCountBonus: number
    defensiveBreakdownPenalty: number
  }
  rawValue: number
  finalOpenness: number
} {
  const config = getDecisionLogicConfig()
  
  const effectiveSpeed = Math.max(0, offensivePlayer.speed - staminaDecay)
  const effectiveBallIQ = Math.max(0, offensivePlayer.ball_iq - staminaDecay * 0.5)
  const effectiveSkillMove = Math.max(0, offensivePlayer.skill_move - staminaDecay * 0.3)
  const effectivePass = Math.max(0, offensivePlayer.pass - staminaDecay * 0.2)
  
  const offensiveValue = 
    effectiveSpeed * 0.3 +
    effectiveBallIQ * 0.2 +
    effectiveSkillMove * 0.15 +
    effectivePass * 0.1
  
  const defensiveValue = 
    defensivePlayer.speed * 0.25 +
    defensivePlayer.on_ball_defense * 0.4
  
  const passCountBonus = passCount * 1.5
  const defensiveBreakdownPenalty = defensiveBreakdown * 2.0
  
  const rawValue = offensiveValue - defensiveValue + passCountBonus - defensiveBreakdownPenalty
  const finalOpenness = calculateOpenness(
    offensivePlayer,
    defensivePlayer,
    passCount,
    defensiveBreakdown,
    staminaDecay
  )
  
  return {
    offensivePlayer: offensivePlayer.name,
    defensivePlayer: defensivePlayer.name,
    passCount,
    defensiveBreakdown,
    staminaDecay,
    effectiveAttributes: {
      speed: effectiveSpeed,
      ball_iq: effectiveBallIQ,
      skill_move: effectiveSkillMove,
      pass: effectivePass
    },
    offensiveValue,
    defensiveValue,
    contextModifiers: {
      passCountBonus,
      defensiveBreakdownPenalty
    },
    rawValue,
    finalOpenness
  }
}
