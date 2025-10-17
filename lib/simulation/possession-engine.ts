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
  isShotClockViolation,
  getPossessionDuration 
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
  seed: number
): PossessionResult {
  // Initialize RNG with seed
  initializeD20RNG(seed)
  
  // Create initial possession state - only use first 5 players (starters) from each team
  const activeOffensivePlayers = offensiveTeam.players.slice(0, 5)
  const activeDefensivePlayers = defensiveTeam.players.slice(0, 5)
  let state = resetPossessionState(ballHandler, [...activeOffensivePlayers, ...activeDefensivePlayers])
  
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
  if (shouldLog) {
    console.log(`🏀 POSSESSION START - ${offensiveTeam.name} with ball`)
    console.log(`  Ball Handler: ${ballHandler.name} (${ballHandler.position})`)
    console.log(`  Shot Clock: ${state.shotClock}s`)
    console.log('')
  }

  // Main possession loop
  while (state.shotClock > 0 && !changePossession) {
    step++
    
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
    if (shouldLog && config.logging?.show_decision_details !== false) {
      console.log(`📋 DECISION - ${state.ballHandler.name} decides to ${decision.action.toUpperCase()}`)
      console.log(`  Reasoning: ${decision.reasoning}`)
      if (decision.target) {
        const targetOpenness = opennessScores.get(decision.target.id) || 0
        console.log(`  Target: ${decision.target.name} (openness: ${targetOpenness})`)
      }
    }
    
    // Log decision
    const decisionLog: PossessionLogEntry = {
      step,
      ballHandler: state.ballHandler.name,
      decision,
      opennessScores: Object.fromEntries(opennessScores),
      description: `${state.ballHandler.name} decides to ${decision.action}${decision.target ? ` to ${decision.target.name}` : ''}`
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
          if (eventResult.outcome === 'success') {
            console.log(`🎯 SHOT MADE - ${state.ballHandler.name} (${eventResult.points} pts)`)
            console.log(`  Roll: ${eventResult.roll} (Faces: [${eventResult.faces.join(',')}])`)
            console.log(`  Success probability: ${(eventResult.normalizedProbability * 100).toFixed(1)}%`)
          } else {
            console.log(`⛔ SHOT MISSED - ${state.ballHandler.name}`)
            console.log(`  Roll: ${eventResult.roll} (Faces: [${eventResult.faces.join(',')}])`)
            console.log(`  Success probability: ${(eventResult.normalizedProbability * 100).toFixed(1)}%`)
          }
        } else if (decision.action === 'pass') {
          if (eventResult.outcome === 'success') {
            console.log(`✅ PASS COMPLETE to ${decision.target?.name}`)
            console.log(`  Roll: ${eventResult.roll} (Faces: [${eventResult.faces.join(',')}])`)
            console.log(`  Success probability: ${(eventResult.normalizedProbability * 100).toFixed(1)}%`)
          } else if (eventResult.outcome === 'intercepted') {
            console.log(`🚫 PASS INTERCEPTED by defense`)
            console.log(`  Roll: ${eventResult.roll} (Faces: [${eventResult.faces.join(',')}])`)
          }
        } else if (decision.action === 'skill_move') {
          if (eventResult.outcome === 'success') {
            console.log(`🔥 SKILL MOVE SUCCESS - ${state.ballHandler.name}`)
            console.log(`  Roll: ${eventResult.roll} (Faces: [${eventResult.faces.join(',')}])`)
            console.log(`  Success probability: ${(eventResult.normalizedProbability * 100).toFixed(1)}%`)
          } else {
            console.log(`❌ SKILL MOVE FAILED - ${state.ballHandler.name}`)
            console.log(`  Roll: ${eventResult.roll} (Faces: [${eventResult.faces.join(',')}])`)
          }
        }
      }
      
      // Check for possession change
      if (eventResult.outcome === 'intercepted' || eventResult.outcome === 'steal') {
        changePossession = true
      } else if (eventResult.outcome === 'success' && eventResult.points) {
        finalScore = eventResult.points
        changePossession = true
      } else if (eventResult.outcome === 'failure' && eventResult.reboundResult) {
        // Handle rebound
        const reboundResult = eventResult.reboundResult
        if (shouldLog && config.logging?.show_roll_details !== false) {
          console.log(`🏀 REBOUND BATTLE`)
          console.log(`  Rebounder: ${reboundResult.rebounder.name} (${reboundResult.isOffensive ? 'Offensive' : 'Defensive'})`)
          console.log(`  Roll: ${reboundResult.roll} (Faces: [${reboundResult.faces.join(',')}])`)
        }
        
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
      decisionLog.stateUpdate = {
        passCount: state.passCount,
        defensiveBreakdown: state.defensiveBreakdown,
        shotClock: state.shotClock
      }
    }
    
    events.push(decisionLog)
    
    // Check for shot clock violation
    if (isShotClockViolation(state)) {
      const violationLog: PossessionLogEntry = {
        step: step + 1,
        ballHandler: state.ballHandler.name,
        decision: { action: 'shoot', reasoning: 'Shot clock violation', opennessScore: 0 },
        opennessScores: Object.fromEntries(opennessScores),
        description: 'Shot clock violation - possession ends'
      }
      events.push(violationLog)
      changePossession = true
    }
    
    // Update shot clock
    state = updateShotClock(state, 1) // Assume 1 second per step
  }
  
  // Log possession end
  if (shouldLog) {
    console.log(`🔄 POSSESSION END - ${getPossessionDuration(state)}s elapsed, ${state.passCount} passes, ${finalScore} points`)
    if (changePossession) {
      console.log(`  Possession changed to ${offensiveTeam.name === offensiveTeam.name ? 'defense' : 'offense'}`)
    } else if (offensiveRebound) {
      console.log(`  Offensive rebound - possession continues`)
    }
    console.log('')
  }
  
  return {
    events,
    finalScore,
    changePossession,
    offensiveRebound,
    newBallHandler,
    possessionDuration: getPossessionDuration(state)
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
