/**
 * Ball Handler Decision Maker
 * 
 * AI logic for ball handler decisions during possession.
 * Evaluates Pass, Skill Move, and Shoot options based on player attributes,
 * openness scores, shot clock, and configurable thresholds.
 */

import type { SimulationPlayer, BallHandlerDecision, PossessionState } from '../types/simulation-engine'
import { getDecisionLogicConfig } from './config-loader'

/**
 * Make a decision for the ball handler
 * @param ballHandler Current ball handler
 * @param teammates Offensive teammates
 * @param shotClock Current shot clock
 * @param opennessScores Map of player ID to openness score
 * @param state Current possession state
 * @returns Ball handler decision
 */
export function decideAction(
  ballHandler: SimulationPlayer,
  teammates: SimulationPlayer[],
  shotClock: number,
  opennessScores: Map<string, number>,
  state: PossessionState
): BallHandlerDecision {
  const config = getDecisionLogicConfig()
  
  // Force shoot if shot clock is low
  if (shotClock <= config.forced_shot_threshold) {
    return {
      action: 'shoot',
      reasoning: `Shot clock at ${shotClock}s - forced to shoot`,
      opennessScore: opennessScores.get(ballHandler.id) || 0
    }
  }
  
  // Calculate decision weights
  const shootWeight = calculateShootWeight(ballHandler, opennessScores, state)
  const skillMoveWeight = calculateSkillMoveWeight(ballHandler, opennessScores, state)
  const passWeight = calculatePassWeight(ballHandler, teammates, opennessScores, state)
  
  // Normalize weights to probabilities
  const totalWeight = shootWeight + skillMoveWeight + passWeight
  if (totalWeight === 0) {
    // Fallback to shoot if no clear decision
    return {
      action: 'shoot',
      reasoning: 'No clear decision - defaulting to shoot',
      opennessScore: opennessScores.get(ballHandler.id) || 0
    }
  }
  
  const shootProb = shootWeight / totalWeight
  const skillMoveProb = skillMoveWeight / totalWeight
  const passProb = passWeight / totalWeight
  
  // Make decision based on probabilities
  const decision = makeWeightedDecision(shootProb, skillMoveProb, passProb)
  
  if (decision.action === 'pass') {
    const target = selectPassTarget(teammates, opennessScores, ballHandler)
    return {
      action: 'pass',
      target,
      reasoning: `Pass to ${target.name} (openness: ${opennessScores.get(target.id) || 0})`,
      opennessScore: opennessScores.get(ballHandler.id) || 0
    }
  }
  
  return {
    action: decision.action,
    reasoning: decision.reasoning,
    opennessScore: opennessScores.get(ballHandler.id) || 0
  }
}

/**
 * Calculate weight for shoot decision
 * @param ballHandler Ball handler
 * @param opennessScores Openness scores
 * @param state Possession state
 * @returns Shoot weight
 */
function calculateShootWeight(
  ballHandler: SimulationPlayer,
  opennessScores: Map<string, number>,
  state: PossessionState
): number {
  const ballHandlerOpenness = opennessScores.get(ballHandler.id) || 0
  
  // Base weight from ball handler's openness
  let weight = ballHandlerOpenness * 0.4
  
  // Bonus for high shooting attributes
  const shootingAbility = (ballHandler.inside_shot + ballHandler.three_point_shot) / 2
  weight += shootingAbility * 0.3
  
  // Bonus for high ball IQ (better shot selection)
  weight += ballHandler.ball_iq * 0.2
  
  // Penalty for low openness
  if (ballHandlerOpenness < 30) {
    weight *= 0.5
  }
  
  // Bonus for high pass count (team is struggling to find open shots)
  if (state.passCount > 3) {
    weight += 20
  }
  
  return Math.max(0, weight)
}

/**
 * Calculate weight for skill move decision
 * @param ballHandler Ball handler
 * @param opennessScores Openness scores
 * @param state Possession state
 * @returns Skill move weight
 */
function calculateSkillMoveWeight(
  ballHandler: SimulationPlayer,
  opennessScores: Map<string, number>,
  state: PossessionState
): number {
  const ballHandlerOpenness = opennessScores.get(ballHandler.id) || 0
  
  // Base weight from ball handler's openness
  let weight = ballHandlerOpenness * 0.3
  
  // Bonus for high skill move attribute
  weight += ballHandler.skill_move * 0.4
  
  // Bonus for high speed (helps with skill moves)
  weight += ballHandler.speed * 0.2
  
  // Penalty for low openness
  if (ballHandlerOpenness < 20) {
    weight *= 0.3
  }
  
  // Bonus if teammates are not very open
  const teamAverageOpenness = getTeamAverageOpenness(opennessScores)
  if (teamAverageOpenness < 40) {
    weight += 15
  }
  
  return Math.max(0, weight)
}

/**
 * Calculate weight for pass decision
 * @param ballHandler Ball handler
 * @param teammates Offensive teammates
 * @param opennessScores Openness scores
 * @param state Possession state
 * @returns Pass weight
 */
function calculatePassWeight(
  ballHandler: SimulationPlayer,
  teammates: SimulationPlayer[],
  opennessScores: Map<string, number>,
  state: PossessionState
): number {
  // Base weight from ball handler's passing ability
  let weight = ballHandler.pass * 0.3
  
  // Bonus for high ball IQ
  weight += ballHandler.ball_iq * 0.2
  
  // Bonus if teammates are more open than ball handler
  const ballHandlerOpenness = opennessScores.get(ballHandler.id) || 0
  const teamAverageOpenness = getTeamAverageOpenness(opennessScores)
  
  if (teamAverageOpenness > ballHandlerOpenness + 10) {
    weight += 25
  }
  
  // Penalty for low ball handler openness (harder to pass when guarded)
  if (ballHandlerOpenness < 20) {
    weight *= 0.6
  }
  
  // Bonus for high pass count (team is moving the ball well)
  if (state.passCount > 2) {
    weight += 10
  }
  
  return Math.max(0, weight)
}

/**
 * Make weighted decision between three options
 * @param shootProb Shoot probability
 * @param skillMoveProb Skill move probability
 * @param passProb Pass probability
 * @returns Decision result
 */
function makeWeightedDecision(
  shootProb: number,
  skillMoveProb: number,
  passProb: number
): { action: 'shoot' | 'skill_move' | 'pass', reasoning: string } {
  // Use a simple random selection based on probabilities
  const random = Math.random()
  
  if (random < shootProb) {
    return {
      action: 'shoot',
      reasoning: `Shoot decision (prob: ${(shootProb * 100).toFixed(1)}%)`
    }
  } else if (random < shootProb + skillMoveProb) {
    return {
      action: 'skill_move',
      reasoning: `Skill move decision (prob: ${(skillMoveProb * 100).toFixed(1)}%)`
    }
  } else {
    return {
      action: 'pass',
      reasoning: `Pass decision (prob: ${(passProb * 100).toFixed(1)}%)`
    }
  }
}

/**
 * Select pass target based on teammate openness and ball IQ
 * @param teammates Offensive teammates
 * @param opennessScores Openness scores
 * @param ballHandler Ball handler
 * @returns Selected pass target
 */
function selectPassTarget(
  teammates: SimulationPlayer[],
  opennessScores: Map<string, number>,
  ballHandler: SimulationPlayer
): SimulationPlayer {
  // Calculate weighted scores for each teammate
  const weightedScores = teammates.map(teammate => {
    const openness = opennessScores.get(teammate.id) || 0
    const ballIQ = teammate.ball_iq
    const passAbility = teammate.pass
    
    // Weighted score: openness * ball IQ * pass ability
    const score = openness * ballIQ * passAbility / 10000
    
    return { player: teammate, score }
  })
  
  // Sort by weighted score (highest first)
  weightedScores.sort((a, b) => b.score - a.score)
  
  // Select from top candidates (top 3 or all if less than 3)
  const topCandidates = weightedScores.slice(0, Math.min(3, weightedScores.length))
  
  // Random selection from top candidates
  const randomIndex = Math.floor(Math.random() * topCandidates.length)
  return topCandidates[randomIndex].player
}

/**
 * Get team average openness
 * @param opennessScores Openness scores
 * @returns Average openness
 */
function getTeamAverageOpenness(opennessScores: Map<string, number>): number {
  const scores = Array.from(opennessScores.values())
  if (scores.length === 0) return 0
  
  const total = scores.reduce((sum, score) => sum + score, 0)
  return total / scores.length
}

/**
 * Get decision debug information
 * @param ballHandler Ball handler
 * @param teammates Offensive teammates
 * @param shotClock Shot clock
 * @param opennessScores Openness scores
 * @param state Possession state
 * @returns Debug information
 */
export function getDecisionDebug(
  ballHandler: SimulationPlayer,
  teammates: SimulationPlayer[],
  shotClock: number,
  opennessScores: Map<string, number>,
  state: PossessionState
): {
  ballHandler: string
  shotClock: number
  passCount: number
  defensiveBreakdown: number
  ballHandlerOpenness: number
  teamAverageOpenness: number
  shootWeight: number
  skillMoveWeight: number
  passWeight: number
  totalWeight: number
  shootProb: number
  skillMoveProb: number
  passProb: number
  decision: BallHandlerDecision
} {
  const shootWeight = calculateShootWeight(ballHandler, opennessScores, state)
  const skillMoveWeight = calculateSkillMoveWeight(ballHandler, opennessScores, state)
  const passWeight = calculatePassWeight(ballHandler, teammates, opennessScores, state)
  
  const totalWeight = shootWeight + skillMoveWeight + passWeight
  const shootProb = totalWeight > 0 ? shootWeight / totalWeight : 0
  const skillMoveProb = totalWeight > 0 ? skillMoveWeight / totalWeight : 0
  const passProb = totalWeight > 0 ? passWeight / totalWeight : 0
  
  const decision = decideAction(ballHandler, teammates, shotClock, opennessScores, state)
  const teamAverageOpenness = getTeamAverageOpenness(opennessScores)
  
  return {
    ballHandler: ballHandler.name,
    shotClock,
    passCount: state.passCount,
    defensiveBreakdown: state.defensiveBreakdown,
    ballHandlerOpenness: opennessScores.get(ballHandler.id) || 0,
    teamAverageOpenness,
    shootWeight,
    skillMoveWeight,
    passWeight,
    totalWeight,
    shootProb,
    skillMoveProb,
    passProb,
    decision
  }
}
