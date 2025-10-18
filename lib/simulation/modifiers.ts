/**
 * State Modifiers System
 * 
 * Handles state updates between events, including pass count increments,
 * defensive breakdown changes, stamina decay, and shot clock management.
 */

import type { PossessionState, SimulationPlayer } from '../types/simulation-engine'
import { getDecisionLogicConfig } from './config-loader'

/**
 * Apply modifiers after an event
 * @param state Current possession state
 * @param eventResult Result of the event that occurred
 * @param allPlayers All players on the court
 * @returns Updated possession state
 */
export function applyModifiers(
  state: PossessionState,
  eventResult: any,
  allPlayers: SimulationPlayer[]
): PossessionState {
  const config = getDecisionLogicConfig()
  
  // Create new state object
  const newState: PossessionState = {
    ballHandler: state.ballHandler,
    passCount: state.passCount,
    defensiveBreakdown: state.defensiveBreakdown,
    shotClock: state.shotClock,
    quarterTimeRemaining: state.quarterTimeRemaining,
    opennessScores: new Map(state.opennessScores),
    staminaDecay: new Map(state.staminaDecay)
  }
  
  // Apply event-specific modifiers
  switch (eventResult.outcome) {
    case 'complete':
      // Successful pass
      newState.passCount = state.passCount + 1
      newState.defensiveBreakdown = Math.min(1.0, 
        state.defensiveBreakdown + config.def_breakdown_increment
      )
      if (eventResult.newBallHandler) {
        newState.ballHandler = eventResult.newBallHandler
      }
      break
      
    case 'success':
      // Successful skill move
      if (eventResult.opennessGain) {
        // Increase openness for the ball handler
        const currentOpenness = newState.opennessScores.get(newState.ballHandler.id) || 0
        newState.opennessScores.set(
          newState.ballHandler.id, 
          Math.min(100, currentOpenness + eventResult.opennessGain)
        )
      }
      break
      
    case 'intercepted':
    case 'steal':
      // Turnover - no state changes needed as possession will change
      break
      
    case 'rebound':
      // Rebound - handle shot clock reset
      if (eventResult.isOffensive) {
        // Offensive rebound - reset shot clock to 14 if below 14
        if (newState.shotClock < 14) {
          newState.shotClock = 14
        }
      }
      break
      
    case 'success':
      // Made shot - no state changes needed as possession will change
      break
      
    case 'failure':
      // Missed shot - no state changes needed as rebound will be handled
      break
  }
  
  // Apply stamina decay to all players
  applyStaminaDecay(newState, allPlayers)
  
  return newState
}

/**
 * Apply stamina decay to all players
 * @param state Possession state
 * @param allPlayers All players on the court
 */
function applyStaminaDecay(
  state: PossessionState,
  allPlayers: SimulationPlayer[]
): void {
  const config = getDecisionLogicConfig()
  
  for (const player of allPlayers) {
    const currentDecay = state.staminaDecay.get(player.id) || 0
    const newDecay = currentDecay + config.stamina_decay_per_possession
    
    // Apply decay to player attributes if stamina is low
    if (player.stamina < 50) { // Using a fixed threshold for now
      const speedPenalty = newDecay * 0.01 // Using a fixed penalty for now
      state.staminaDecay.set(player.id, newDecay)
      
      // Note: In a full implementation, you might want to track effective attributes
      // that are reduced by stamina decay, but for now we'll just track the decay amount
    } else {
      state.staminaDecay.set(player.id, newDecay)
    }
  }
}

/**
 * Reset possession state for new possession
 * @param ballHandler New ball handler
 * @param allPlayers All players on the court
 * @returns Fresh possession state
 */
export function resetPossessionState(
  ballHandler: SimulationPlayer,
  allPlayers: SimulationPlayer[],
  quarterTimeRemaining: number
): PossessionState {
  return {
    ballHandler,
    passCount: 0,
    defensiveBreakdown: 0,
    shotClock: 24, // Full shot clock
    quarterTimeRemaining,
    opennessScores: new Map(),
    staminaDecay: new Map()
  }
}

/**
 * Update shot clock based on time elapsed
 * @param state Current possession state
 * @param timeElapsed Time elapsed in seconds
 * @returns Updated possession state
 */
export function updateShotClock(
  state: PossessionState,
  timeElapsed: number
): PossessionState {
  const newState = { ...state }
  newState.shotClock = Math.max(0, state.shotClock - timeElapsed)
  return newState
}

/**
 * Update both shot clock and quarter time based on time elapsed
 * @param state Current possession state
 * @param timeElapsed Time elapsed in seconds
 * @returns Updated possession state
 */
export function updateQuarterTime(
  state: PossessionState,
  timeElapsed: number
): PossessionState {
  const newState = { ...state }
  newState.quarterTimeRemaining = Math.max(0, state.quarterTimeRemaining - timeElapsed)
  newState.shotClock = Math.max(0, state.shotClock - timeElapsed)
  return newState
}

/**
 * Get effective player attributes after stamina decay
 * @param player Player to get effective attributes for
 * @param staminaDecay Stamina decay amount
 * @returns Effective attributes
 */
export function getEffectiveAttributes(
  player: SimulationPlayer,
  staminaDecay: number
): Partial<SimulationPlayer> {
  if (player.stamina < 50) { // Using a fixed threshold for now
    const speedPenalty = staminaDecay * 0.01 // Using a fixed penalty for now
    
    return {
      speed: Math.max(0, player.speed - speedPenalty),
      skill_move: Math.max(0, player.skill_move - speedPenalty * 0.5),
      pass: Math.max(0, player.pass - speedPenalty * 0.3),
      ball_iq: Math.max(0, player.ball_iq - speedPenalty * 0.2)
    }
  }
  
  return {}
}

/**
 * Check if possession should end due to shot clock violation
 * @param state Current possession state
 * @returns True if shot clock violation
 */
export function isShotClockViolation(state: PossessionState): boolean {
  return state.shotClock <= 0
}

/**
 * Check if quarter time has expired
 * @param state Current possession state
 * @returns True if quarter time has expired
 */
export function isQuarterExpired(state: PossessionState): boolean {
  return state.quarterTimeRemaining <= 0
}

/**
 * Get possession duration in seconds
 * @param state Current possession state
 * @returns Possession duration
 */
export function getPossessionDuration(state: PossessionState): number {
  const baseDuration = 24 - state.shotClock // Time used from shot clock
  const passCountBonus = state.passCount * 2 // Each pass adds ~2 seconds
  const defensiveBreakdownPenalty = state.defensiveBreakdown * 5 // Defensive issues add time
  
  return Math.min(24, baseDuration + passCountBonus + defensiveBreakdownPenalty) // Using a fixed max duration for now
}

/**
 * Get action duration based on decision and result
 * @param decision Ball handler decision
 * @param eventResult Result of the event
 * @returns Duration in seconds
 */
export function getActionDuration(decision: any, eventResult: any): number {
  if (decision.action === 'pass') {
    // Quick passes take at least 1 second, intercepted passes take 1-2s, completed passes take 2-3s
    return eventResult?.outcome === 'intercepted' ? 2 : 3
  }
  
  if (decision.action === 'skill_move') {
    // Failed skill moves take at least 2 seconds, successful moves take 3-5 seconds
    return eventResult?.outcome === 'steal' ? 2 : 4
  }
  
  if (decision.action === 'shoot') {
    return 3
  }
  
  return 2 // Default fallback
}

/**
 * Get possession intensity (how much action has occurred)
 * @param state Current possession state
 * @returns Possession intensity (0-1)
 */
export function getPossessionIntensity(state: PossessionState): number {
  const passCountFactor = Math.min(1, state.passCount / 5) // Normalize pass count
  const defensiveBreakdownFactor = state.defensiveBreakdown
  const shotClockFactor = 1 - (state.shotClock / 24) // Lower shot clock = higher intensity
  
  return (passCountFactor + defensiveBreakdownFactor + shotClockFactor) / 3
}

/**
 * Get team defensive breakdown level
 * @param state Current possession state
 * @returns Defensive breakdown level (0-1)
 */
export function getTeamDefensiveBreakdown(state: PossessionState): number {
  return state.defensiveBreakdown
}

/**
 * Get pass count for current possession
 * @param state Current possession state
 * @returns Pass count
 */
export function getPassCount(state: PossessionState): number {
  return state.passCount
}

/**
 * Get shot clock remaining
 * @param state Current possession state
 * @returns Shot clock remaining
 */
export function getShotClockRemaining(state: PossessionState): number {
  return state.shotClock
}

/**
 * Get stamina decay for a player
 * @param state Current possession state
 * @param playerId Player ID
 * @returns Stamina decay amount
 */
export function getStaminaDecay(state: PossessionState, playerId: string): number {
  return state.staminaDecay.get(playerId) || 0
}

/**
 * Get all stamina decay values
 * @param state Current possession state
 * @returns Map of player ID to stamina decay
 */
export function getAllStaminaDecay(state: PossessionState): Map<string, number> {
  return new Map(state.staminaDecay)
}

/**
 * Get possession state summary
 * @param state Current possession state
 * @returns Possession state summary
 */
export function getPossessionStateSummary(state: PossessionState): {
  ballHandler: string
  passCount: number
  defensiveBreakdown: number
  shotClock: number
  possessionDuration: number
  possessionIntensity: number
  staminaDecayCount: number
} {
  return {
    ballHandler: state.ballHandler.name,
    passCount: state.passCount,
    defensiveBreakdown: state.defensiveBreakdown,
    shotClock: state.shotClock,
    possessionDuration: getPossessionDuration(state),
    possessionIntensity: getPossessionIntensity(state),
    staminaDecayCount: state.staminaDecay.size
  }
}
