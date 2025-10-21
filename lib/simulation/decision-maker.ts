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
  
  // Apply position-based multiplier
  weight *= getShootPositionMultiplier(ballHandler.position)
  
  return Math.max(0, weight)
}

/**
 * Get position-based shooting multiplier
 * @param position Player position
 * @returns Multiplier for shooting tendency
 */
function getShootPositionMultiplier(position: string): number {
  switch (position) {
    case 'PG': return 0.3   // Point guards are facilitators
    case 'SG': return 1.2   // Shooting guards are primary scorers
    case 'SF': return 1.1   // Small forwards are versatile scorers
    case 'PF': return 0.9   // Power forwards focus on inside game
    case 'C':  return 0.7   // Centers get fewer perimeter touches
    default:   return 1.0
  }
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
  
  // Base weight from ball handler's openness - REDUCED from 0.3 to 0.2
  let weight = ballHandlerOpenness * 0.2
  
  // Bonus for high skill move attribute - REDUCED from 0.4 to 0.3
  weight += ballHandler.skill_move * 0.3
  
  // Bonus for high speed - REDUCED from 0.2 to 0.15
  weight += ballHandler.speed * 0.15
  
  // Penalty for low openness
  if (ballHandlerOpenness < 20) {
    weight *= 0.3
  }
  
  // Bonus if teammates are not very open - REDUCED from +15 to +8
  const teamAverageOpenness = getTeamAverageOpenness(opennessScores)
  if (teamAverageOpenness < 40) {
    weight += 8  // Changed from 15
  }
  
  // Penalty for high openness - should shoot/pass instead of skill move
  if (ballHandlerOpenness > 70) {
    weight *= 0.5  // Reduce by 50% when very open
  } else if (ballHandlerOpenness > 50) {
    weight *= 0.7  // Reduce by 30% when moderately open
  }
  
  // Apply position-based multiplier
  weight *= getSkillMovePositionMultiplier(ballHandler.position)
  
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
  
  // Apply position-based multiplier
  weight *= getPassPositionMultiplier(ballHandler.position)
  
  return Math.max(0, weight)
}

/**
 * Get position-based passing multiplier
 * @param position Player position
 * @returns Multiplier for passing tendency
 */
function getPassPositionMultiplier(position: string): number {
  switch (position) {
    case 'PG': return 1.8   // Point guards are primary distributors
    case 'C':  return 0.7   // Centers have limited passing range
    default:   return 1.0   // Other positions unchanged
  }
}

/**
 * Get position-based skill move multiplier
 * @param position Player position
 * @returns Multiplier for skill move tendency
 */
function getSkillMovePositionMultiplier(position: string): number {
  switch (position) {
    case 'PG': return 0.7   // Ball handlers use skill moves moderately
    case 'SG': return 1.0   // Wing players have balanced usage
    case 'SF': return 0.9   // Balanced
    case 'PF': return 0.5   // Big men rarely use skill moves
    case 'C':  return 0.4   // Centers almost never use skill moves
    default:   return 1.0
  }
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
    
    // Calculate target's scoring ability (average of inside and three-point shooting)
    const scoringAbility = (teammate.inside_shot + teammate.three_point_shot) / 2
    
    // Passer's Ball IQ determines how much they value scoring ability vs openness
    // High IQ passers (90+) will pass to good scorers even if less open
    // Low IQ passers (50-) will just pass to whoever is most open
    const ballIQFactor = ballHandler.ball_iq / 100 // 0.5 to 1.0
    
    // Formula:
    // - Openness weighted by (1.0 - ballIQFactor * 0.4)
    // - Scoring ability weighted by (ballIQFactor * 0.4)
    // This means:
    //   - Low IQ (50): openness 80%, scoring 20%
    //   - High IQ (100): openness 60%, scoring 40%
    const opennessWeight = 1.0 - (ballIQFactor * 0.4)
    const scoringWeight = ballIQFactor * 0.4
    
    const score = (openness * opennessWeight) + (scoringAbility * scoringWeight)
    
    return { player: teammate, score }
  })
  
  // Sort by weighted score (highest first)
  weightedScores.sort((a, b) => b.score - a.score)
  
  // Randomly select from all teammates, with probability weighted by score
  // This gives better targets higher chance but doesn't exclude anyone
  const totalScore = weightedScores.reduce((sum, ws) => sum + ws.score, 0)
  const rand = Math.random() * totalScore
  
  let cumulative = 0
  for (const ws of weightedScores) {
    cumulative += ws.score
    if (rand <= cumulative) {
      return ws.player
    }
  }
  
  // Fallback (should never reach here)
  return weightedScores[0].player
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
