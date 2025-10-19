/**
 * Possession Engine
 * 
 * Main orchestrator for D20 basketball possession simulation.
 * Coordinates all modules to run a complete possession from start to finish.
 */

import type { 
  SimulationPlayer, 
  SimulationTeam, 
  PossessionState, 
  PossessionResult, 
  PossessionLogEntry,
  BallHandlerDecision 
} from '../types/simulation-engine'
import { initializeD20RNG } from './d20-rng'
import { calculateAllOpennessScores } from './openness-calculator'
import { decideAction } from './decision-maker'
import { rollShot, shouldAttemptThreePointer } from './roll-shot'
import { rollSkillMove } from './roll-skill-move'
import { rollPass } from './roll-pass'
import { rollRebound } from './roll-rebound'
import { 
  applyModifiers, 
  resetPossessionState, 
  updateShotClock, 
  updateQuarterTime,
  isShotClockViolation,
  isQuarterExpired,
  getPossessionDuration,
  getActionDuration 
} from './modifiers'
import { getConfig } from './config-loader'

/**
 * Simulate a complete possession
 * @param offensiveTeam Offensive team
 * @param defensiveTeam Defensive team
 * @param ballHandler Starting ball handler
 * @param seed Random seed for deterministic simulation
 * @returns Complete possession result
 */
export function simulatePossession(
  offensiveTeam: SimulationTeam,
  defensiveTeam: SimulationTeam,
  ballHandler: SimulationPlayer,
  seed: number,
  quarterTimeRemaining: number
): PossessionResult {
  // Initialize RNG with seed
  initializeD20RNG(seed)
  
  // Create initial possession state - use designated starters (is_starter === 1)
  let activeOffensivePlayers = offensiveTeam.players.filter(p => p.is_starter === 1)
  let activeDefensivePlayers = defensiveTeam.players.filter(p => p.is_starter === 1)
  
  // Fallback: if we don't have exactly 5 starters, use first 5 players
  if (activeOffensivePlayers.length !== 5) {
    activeOffensivePlayers = offensiveTeam.players.slice(0, 5)
  }
  if (activeDefensivePlayers.length !== 5) {
    activeDefensivePlayers = defensiveTeam.players.slice(0, 5)
  }
  let state = resetPossessionState(ballHandler, [...activeOffensivePlayers, ...activeDefensivePlayers], quarterTimeRemaining)
  
  const events: PossessionLogEntry[] = []
  let step = 0
  let finalScore = 0
  let changePossession = false
  let offensiveRebound = false
  let newBallHandler: SimulationPlayer | undefined
  
  // Get logging configuration
  const config = getConfig()
  const shouldLog = config.logging?.verbose_possession_logs !== false
  
  // Log possession start
  // Possession start logging removed for cleaner debug output

  // MANDATORY: Ball advance at start of possession
  // Player brings ball up court - this always happens and consumes time
  if (state.quarterTimeRemaining > 0) {
    // Random time between 3-7 seconds for ball advance
    const ballAdvanceTime = Math.floor(Math.random() * 5) + 3 // 3-7 seconds
    
    // Ball advance logging removed for cleaner debug output
    
    // Update time BEFORE creating event (so stateUpdate has correct time)
    state = updateQuarterTime(state, ballAdvanceTime)
    
    // Create ball advance event log entry
    const ballAdvanceEvent: PossessionLogEntry = {
      step: 0, // Step 0 for ball advance (before player decisions)
      ballHandler: state.ballHandler.name,
      decision: { action: 'ball_advance', reasoning: 'Ball advance' },
      opennessScores: {},
      description: `${state.ballHandler.name} brings the ball up the court`,
      stateUpdate: {
        passCount: state.passCount,
        defensiveBreakdown: state.defensiveBreakdown,
        shotClock: state.shotClock,
        quarterTimeRemaining: state.quarterTimeRemaining
      }
    }
    
    events.push(ballAdvanceEvent)
    
    // Check if ball advance consumed all remaining time
    if (state.quarterTimeRemaining <= 0) {
      // Quarter time expired logging removed for cleaner debug output
      return {
        events,
        finalScore: 0,
        changePossession: true,
        offensiveRebound: false,
        newBallHandler: undefined,
        possessionDuration: ballAdvanceTime,
        quarterTimeRemaining: state.quarterTimeRemaining
      }
    }
  }

  // Main possession loop - player decisions start here
  let stepCounter = 1 // Start from step 1 (step 0 was ball advance)
  while (state.shotClock > 0 && state.quarterTimeRemaining > 0 && !changePossession) {
    step = stepCounter
    stepCounter++
    
    // Calculate openness scores for all matchups
    const opennessScores = calculateAllOpennessScores(
      activeOffensivePlayers,
      activeDefensivePlayers,
      state
    )
    
    // Update state with new openness scores
    state.opennessScores = opennessScores
    
    // Make decision for ball handler
    const decision = decideAction(
      state.ballHandler,
      activeOffensivePlayers.filter(p => p.id !== state.ballHandler.id),
      state.shotClock,
      opennessScores,
      state
    )
    
    // Log decision with detailed reasoning
    // Decision logging removed for cleaner debug output
    
    // Log decision
    const decisionLog: PossessionLogEntry = {
      step,
      ballHandler: state.ballHandler.name,
      decision,
      opennessScores: Object.fromEntries(opennessScores),
      description: `${state.ballHandler.name} decides to ${decision.action}${decision.target ? ` to ${decision.target.name}` : ''}`
    }
    
    // Check if there's enough quarter time for this action
    const estimatedActionTime = decision.action === 'shoot' ? 3 : 
                                decision.action === 'pass' ? 3 : 5
    if (state.quarterTimeRemaining < estimatedActionTime) {
      // Quarter time expired logging removed for cleaner debug output
      changePossession = true
      break
    }
    
    let eventResult: any = null
    
    // Execute the decision
    switch (decision.action) {
      case 'shoot':
        eventResult = executeShot(state, activeOffensivePlayers, activeDefensivePlayers, decision)
        break
      case 'skill_move':
        eventResult = executeSkillMove(state, activeOffensivePlayers, activeDefensivePlayers, decision)
        break
      case 'pass':
        eventResult = executePass(state, activeOffensivePlayers, activeDefensivePlayers, decision)
        break
    }
    
    // Log event result
    if (eventResult) {
      decisionLog.rollResult = eventResult
      decisionLog.description += ` - ${eventResult.outcome}`
      
      // Log action outcome with details
      if (shouldLog && config.logging?.show_roll_details !== false) {
        if (decision.action === 'shoot') {
          // Shot result logging removed for cleaner debug output
        } else if (decision.action === 'pass') {
          // Pass result logging removed for cleaner debug output
        } else if (decision.action === 'skill_move') {
          // Skill move result logging removed for cleaner debug output
        }
      }
      
      // Check for possession change
      if (eventResult.outcome === 'intercepted' || eventResult.outcome === 'steal') {
        // Turnover logging removed for cleaner debug output
        changePossession = true
      } else if (eventResult.outcome === 'success' && eventResult.points) {
        finalScore = eventResult.points
        changePossession = true
      } else if (eventResult.outcome === 'failure' && eventResult.reboundResult) {
        // Handle rebound
        const reboundResult = eventResult.reboundResult
        // Rebound logging removed for cleaner debug output
        
        if (reboundResult.isOffensive) {
          offensiveRebound = true
          newBallHandler = reboundResult.rebounder
          state.ballHandler = reboundResult.rebounder
        } else {
          changePossession = true
        }
      }
      
      // Apply modifiers
      state = applyModifiers(state, eventResult, [...activeOffensivePlayers, ...activeDefensivePlayers])
    }
    
    // Update both shot clock and quarter time with realistic action duration
    const timeElapsed = getActionDuration(decision, eventResult)
    // Action timing logging removed for cleaner debug output
    state = updateQuarterTime(state, timeElapsed)
    
    // Update state snapshot AFTER time update
    decisionLog.stateUpdate = {
      passCount: state.passCount,
      defensiveBreakdown: state.defensiveBreakdown,
      shotClock: state.shotClock,
      quarterTimeRemaining: state.quarterTimeRemaining
    }
    
    // Add event to log
    events.push(decisionLog)
    
    // Check for shot clock violation
    if (isShotClockViolation(state)) {
      const violationLog: PossessionLogEntry = {
        step: step + 1,
        ballHandler: state.ballHandler.name,
        decision: { action: 'violation', reasoning: 'Shot clock violation' },
        opennessScores: Object.fromEntries(opennessScores),
        description: 'Shot clock violation - possession ends'
      }
      events.push(violationLog)
      changePossession = true
    }
  }
  
  // Log possession end
  // Possession end logging removed for cleaner debug output
  
  return {
    events,
    finalScore,
    changePossession,
    offensiveRebound,
    newBallHandler,
    possessionDuration: getPossessionDuration(state),
    quarterTimeRemaining: state.quarterTimeRemaining
  }
}

/**
 * Execute a shot attempt
 * @param state Current possession state
 * @param activeOffensivePlayers Active offensive players (5)
 * @param activeDefensivePlayers Active defensive players (5)
 * @param decision Ball handler decision
 * @returns Shot result
 */
function executeShot(
  state: PossessionState,
  activeOffensivePlayers: SimulationPlayer[],
  activeDefensivePlayers: SimulationPlayer[],
  decision: BallHandlerDecision
): any {
  const shooter = state.ballHandler
  const openness = state.opennessScores.get(shooter.id) || 0
  
  // Determine if it's a three-pointer
  const isThreePointer = shouldAttemptThreePointer(shooter, openness, {
    shotClock: state.shotClock,
    passCount: state.passCount,
    defensiveBreakdown: state.defensiveBreakdown
  })
  
  // Find defender (simplified - just pick a random defender)
  const defender = activeDefensivePlayers[Math.floor(Math.random() * activeDefensivePlayers.length)]
  
  // Roll for shot
  const shotResult = rollShot(shooter, defender, openness, isThreePointer, {
    shotClock: state.shotClock,
    passCount: state.passCount,
    defensiveBreakdown: state.defensiveBreakdown
  })
  
  // Handle rebound if shot missed
  if (!shotResult.made) {
    const allPlayers = [...activeOffensivePlayers, ...activeDefensivePlayers]
    
    const reboundResult = rollRebound(
      allPlayers,
      {
        shotDistance: isThreePointer ? 'long' : 'mid',
        isThreePointer,
        offensiveTeamId: activeOffensivePlayers[0].teamId, // Use team ID from first player
        defensiveTeamId: activeDefensivePlayers[0].teamId // Use team ID from first player
      }
    )
    
    return {
      ...shotResult,
      reboundResult
    }
  }
  
  return shotResult
}

/**
 * Execute a skill move attempt
 * @param state Current possession state
 * @param activeOffensivePlayers Active offensive players (5)
 * @param activeDefensivePlayers Active defensive players (5)
 * @param decision Ball handler decision
 * @returns Skill move result
 */
function executeSkillMove(
  state: PossessionState,
  activeOffensivePlayers: SimulationPlayer[],
  activeDefensivePlayers: SimulationPlayer[],
  decision: BallHandlerDecision
): any {
  const offensivePlayer = state.ballHandler
  const openness = state.opennessScores.get(offensivePlayer.id) || 0
  
  // Find defender (simplified - just pick a random defender)
  const defender = activeDefensivePlayers[Math.floor(Math.random() * activeDefensivePlayers.length)]
  
  // Roll for skill move
  const skillMoveResult = rollSkillMove(offensivePlayer, defender, openness, {
    passCount: state.passCount,
    defensiveBreakdown: state.defensiveBreakdown,
    staminaDecay: state.staminaDecay.get(offensivePlayer.id) || 0
  })
  
  return skillMoveResult
}

/**
 * Execute a pass attempt
 * @param state Current possession state
 * @param activeOffensivePlayers Active offensive players (5)
 * @param activeDefensivePlayers Active defensive players (5)
 * @param decision Ball handler decision
 * @returns Pass result
 */
function executePass(
  state: PossessionState,
  activeOffensivePlayers: SimulationPlayer[],
  activeDefensivePlayers: SimulationPlayer[],
  decision: BallHandlerDecision
): any {
  const passer = state.ballHandler
  const target = decision.target!
  const targetOpenness = state.opennessScores.get(target.id) || 0
  
  // Find defender (simplified - just pick a random defender)
  const defender = activeDefensivePlayers[Math.floor(Math.random() * activeDefensivePlayers.length)]
  
  // Roll for pass
  const passResult = rollPass(passer, defender, targetOpenness, {
    passCount: state.passCount,
    defensiveBreakdown: state.defensiveBreakdown,
    staminaDecay: state.staminaDecay.get(passer.id) || 0,
    targetPlayer: target
  })
  
  return passResult
}

/**
 * Get possession summary
 * @param result Possession result
 * @returns Possession summary
 */
export function getPossessionSummary(result: PossessionResult): {
  duration: number
  events: number
  finalScore: number
  changePossession: boolean
  offensiveRebound: boolean
  ballHandler: string
  passCount: number
} {
  const lastEvent = result.events[result.events.length - 1]
  const passCount = lastEvent?.stateUpdate?.passCount || 0
  
  return {
    duration: result.possessionDuration,
    events: result.events.length,
    finalScore: result.finalScore,
    changePossession: result.changePossession,
    offensiveRebound: result.offensiveRebound,
    ballHandler: result.events[0]?.ballHandler || 'Unknown',
    passCount
  }
}

/**
 * Get detailed possession log
 * @param result Possession result
 * @returns Detailed log
 */
export function getDetailedPossessionLog(result: PossessionResult): string {
  let log = `Possession Summary:\n`
  log += `Duration: ${result.possessionDuration}s\n`
  log += `Events: ${result.events.length}\n`
  log += `Final Score: ${result.finalScore}\n`
  log += `Change Possession: ${result.changePossession}\n`
  log += `Offensive Rebound: ${result.offensiveRebound}\n\n`
  
  log += `Event Log:\n`
  for (const event of result.events) {
    log += `Step ${event.step}: ${event.description}\n`
    if (event.rollResult) {
      log += `  Roll: ${event.rollResult.roll} (Faces: [${event.rollResult.faces.join(', ')}])\n`
      log += `  Raw Value: ${event.rollResult.rawValue.toFixed(2)}\n`
      log += `  Probability: ${(event.rollResult.normalizedProbability * 100).toFixed(1)}%\n`
    }
    if (event.stateUpdate) {
      log += `  State: Pass Count=${event.stateUpdate.passCount}, Def Breakdown=${event.stateUpdate.defensiveBreakdown.toFixed(2)}, Shot Clock=${event.stateUpdate.shotClock}\n`
    }
    log += `\n`
  }
  
  return log
}
