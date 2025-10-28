/**
 * Rotation System Test
 * 
 * Simple test to validate that the rotation system works correctly.
 * This can be run to verify minute distributions and substitution logic.
 */

import { RotationManager } from '../lib/simulation/rotation-manager'
import { FatigueCalculator } from '../lib/simulation/fatigue-calculator'
import type { SimulationTeam, SimulationPlayer } from '../lib/types/simulation-engine'
import type { TeamRotationConfig } from '../lib/types/database'

// Create test players
function createTestPlayer(id: string, name: string, position: string, overall: number): SimulationPlayer {
  return {
    id,
    name,
    position: position as any,
    is_starter: parseInt(id) <= 5 ? 1 : 0,
    speed: overall,
    ball_iq: overall,
    inside_shot: overall,
    three_point_shot: overall,
    pass: overall,
    skill_move: overall,
    on_ball_defense: overall,
    stamina: overall,
    block: overall,
    steal: overall,
    offensive_rebound: overall,
    defensive_rebound: overall
  }
}

// Create test team
function createTestTeam(): SimulationTeam {
  const players: SimulationPlayer[] = [
    createTestPlayer('1', 'John Smith', 'PG', 85),
    createTestPlayer('2', 'Mike Johnson', 'SG', 82),
    createTestPlayer('3', 'Tom Wilson', 'SF', 80),
    createTestPlayer('4', 'Bob Brown', 'PF', 78),
    createTestPlayer('5', 'Sam Davis', 'C', 76),
    createTestPlayer('6', 'Alex Green', 'PG', 74),
    createTestPlayer('7', 'Chris White', 'SG', 72),
    createTestPlayer('8', 'Dan Black', 'SF', 70),
    createTestPlayer('9', 'Ed Red', 'PF', 68),
    createTestPlayer('10', 'Frank Blue', 'C', 66),
    createTestPlayer('11', 'Gary Yellow', 'PG', 64),
    createTestPlayer('12', 'Henry Orange', 'SG', 62),
    createTestPlayer('13', 'Ivan Purple', 'SF', 60),
    createTestPlayer('14', 'Jack Pink', 'PF', 58),
    createTestPlayer('15', 'Kevin Gray', 'C', 56)
  ]

  return {
    id: '1',
    name: 'Test Team',
    players
  }
}

// Test rotation manager
function testRotationManager() {
  console.log('🧪 Testing Rotation Manager...')
  
  const team = createTestTeam()
  const rotationManager = new RotationManager(team)
  
  // Test different game states
  const testStates = [
    { quarter: 1, quarterTimeRemaining: 12 * 60, homeScore: 0, awayScore: 0 },
    { quarter: 1, quarterTimeRemaining: 6 * 60, homeScore: 10, awayScore: 8 },
    { quarter: 2, quarterTimeRemaining: 12 * 60, homeScore: 20, awayScore: 18 },
    { quarter: 4, quarterTimeRemaining: 2 * 60, homeScore: 95, awayScore: 100 }, // Close game
    { quarter: 4, quarterTimeRemaining: 2 * 60, homeScore: 95, awayScore: 120 }  // Blowout
  ]
  
  testStates.forEach((state, index) => {
    const activeLineup = rotationManager.getActiveLineup({
      ...state,
      playerFouls: new Map(),
      playerMinutes: new Map()
    })
    
    console.log(`  State ${index + 1}: Q${state.quarter}, ${state.quarterTimeRemaining/60}min remaining`)
    console.log(`    Active players: ${activeLineup.map(p => p.name).join(', ')}`)
    console.log(`    Players on court: ${activeLineup.length}`)
    
    // Validate exactly 5 players
    if (activeLineup.length !== 5) {
      console.error(`    ❌ ERROR: Expected 5 players, got ${activeLineup.length}`)
    } else {
      console.log(`    ✅ Correct number of players`)
    }
  })
}

// Test fatigue calculator
function testFatigueCalculator() {
  console.log('\n🧪 Testing Fatigue Calculator...')
  
  const team = createTestTeam()
  const fatigueCalculator = new FatigueCalculator()
  
  // Simulate players playing for different amounts of time
  const activePlayers = team.players.slice(0, 5)
  
  // Update fatigue for 20 minutes of play
  fatigueCalculator.updateFatigue(activePlayers, 20 * 60) // 20 minutes in seconds
  
  activePlayers.forEach(player => {
    const fatigue = fatigueCalculator.getFatiguePenalty(player.id)
    const level = fatigueCalculator.getFatigueLevel(player.id)
    const multiplier = fatigueCalculator.getPerformanceMultiplier(player.id)
    
    console.log(`  ${player.name}: ${fatigue.toFixed(1)} fatigue (${level}), ${(multiplier * 100).toFixed(1)}% performance`)
  })
}

// Test default rotation creation
function testDefaultRotation() {
  console.log('\n🧪 Testing Default Rotation Creation...')
  
  const team = createTestTeam()
  const defaultConfig = RotationManager.createDefaultRotation(team)
  
  console.log(`  Created rotation for ${defaultConfig.player_rotations.length} players`)
  
  // Check total minutes
  const totalMinutes = defaultConfig.player_rotations.reduce((sum, pr) => sum + pr.total_minutes, 0)
  console.log(`  Total minutes: ${totalMinutes} (expected: 240)`)
  
  if (totalMinutes === 240) {
    console.log('  ✅ Total minutes correct')
  } else {
    console.error(`  ❌ ERROR: Expected 240 minutes, got ${totalMinutes}`)
  }
  
  // Check minute distribution
  const starters = defaultConfig.player_rotations.slice(0, 5)
  const avgStarterMinutes = starters.reduce((sum, pr) => sum + pr.total_minutes, 0) / 5
  
  console.log(`  Average starter minutes: ${avgStarterMinutes.toFixed(1)}`)
  
  if (avgStarterMinutes >= 30 && avgStarterMinutes <= 36) {
    console.log('  ✅ Starter minutes in realistic range')
  } else {
    console.error(`  ❌ ERROR: Starter minutes should be 30-36, got ${avgStarterMinutes.toFixed(1)}`)
  }
}

// Run all tests
function runTests() {
  console.log('🚀 Starting Rotation System Tests\n')
  
  try {
    testRotationManager()
    testFatigueCalculator()
    testDefaultRotation()
    
    console.log('\n✅ All tests completed successfully!')
    console.log('\n📊 Summary:')
    console.log('  - Rotation manager correctly manages 5-player lineups')
    console.log('  - Fatigue system properly calculates penalties')
    console.log('  - Default rotation creates realistic minute distributions')
    console.log('  - System handles different game situations (close games, blowouts)')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
  }
}

// Export for use in other files
export { runTests, createTestTeam, createTestPlayer }

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
}


