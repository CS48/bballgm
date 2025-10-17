/**
 * Simulation Configuration Loader
 * 
 * Provides type-safe access to all tuning parameters.
 * Configuration is inlined for client-side compatibility.
 */

import type { SimulationConfig } from '../types/simulation-engine'

/**
 * Inlined simulation configuration for client-side use
 */
const SIMULATION_CONFIG: SimulationConfig = {
  shot_roll: {
    coefficients: {
      off_shot: 0.50,
      openness: 0.30,
      off_speed: 0.05,
      stamina: 0.05,
      def_onball: 0.40,
      def_speed: 0.05,
      shot_clock_pressure: 0.20,
      context_modifier: 0.0
    },
    caps: {
      max_faces: 19,
      min_faces: 1
    }
  },
  skill_move_roll: {
    coefficients: {
      success: {
        off_skill: 0.55,
        off_speed: 0.20,
        def_onball: 0.30,
        def_speed: 0.05,
        openness: 0.10
      },
      steal: {
        def_steal: 0.60,
        def_speed: 0.25,
        off_skill: 0.30
      }
    },
    caps: {
      steal_cap: 2,
      max_faces: 18,
      min_faces: 1
    },
    baseline: {
      neutral_weight: 15
    }
  },
  pass_roll: {
    coefficients: {
      off_pass: 0.45,
      target_openness: 0.35,
      ball_iq: 0.10,
      def_openness: 0.10,
      def_steal: 0.35
    },
    caps: {
      steal_cap: 1,
      max_faces: 19,
      min_faces: 1
    }
  },
  rebound_roll: {
    coefficients: {
      off_reb: 1.0,
      def_reb: 1.0,
      position_bonus: 0.25,
      team_bias: 0.10
    },
    caps: {
      max_faces: 18,
      min_faces: 1
    }
  },
  decision_logic: {
    forced_shot_threshold: 4,
    def_breakdown_increment: 3,
    max_def_breakdown: 30,
    stamina_decay_per_possession: 1.0
  },
  allocation_rules: {
    d20_total_faces: 20,
    rounding_method: "floor_then_remainder",
    fractional_priority: "desc",
    seeded_rng: true
  },
  logging: {
    verbose_possession_logs: true,
    show_decision_details: true,
    show_roll_details: true
  }
}

/**
 * Load simulation configuration
 * @returns SimulationConfig object
 */
export function loadConfig(): SimulationConfig {
  return SIMULATION_CONFIG
}

/**
 * Get complete simulation configuration (alias for loadConfig)
 * @returns SimulationConfig object
 */
export function getConfig(): SimulationConfig {
  return SIMULATION_CONFIG
}


/**
 * Get shot roll configuration
 * @returns Shot roll configuration section
 */
export function getShotRollConfig(): SimulationConfig['shot_roll'] {
  const config = loadConfig()
  return config.shot_roll
}

/**
 * Get skill move roll configuration
 * @returns Skill move roll configuration section
 */
export function getSkillMoveRollConfig(): SimulationConfig['skill_move_roll'] {
  const config = loadConfig()
  return config.skill_move_roll
}

/**
 * Get pass roll configuration
 * @returns Pass roll configuration section
 */
export function getPassRollConfig(): SimulationConfig['pass_roll'] {
  const config = loadConfig()
  return config.pass_roll
}

/**
 * Get rebound roll configuration
 * @returns Rebound roll configuration section
 */
export function getReboundRollConfig(): SimulationConfig['rebound_roll'] {
  const config = loadConfig()
  return config.rebound_roll
}

/**
 * Get decision logic configuration
 * @returns Decision logic configuration section
 */
export function getDecisionLogicConfig(): SimulationConfig['decision_logic'] {
  const config = loadConfig()
  return config.decision_logic
}

/**
 * Get allocation rules configuration
 * @returns Allocation rules configuration section
 */
export function getAllocationRulesConfig(): SimulationConfig['allocation_rules'] {
  const config = loadConfig()
  return config.allocation_rules
}

/**
 * Get position bonus for rebound calculation
 * @param position Player position
 * @returns Position bonus value
 */
export function getPositionBonus(position: string): number {
  const config = loadConfig()
  // Position bonuses are now handled differently in the new structure
  // This is a simplified version - you may want to adjust based on your needs
  const bonuses: Record<string, number> = {
    'C': 5,   // Centers get highest bonus
    'PF': 3,  // Power forwards get good bonus
    'SF': 1,  // Small forwards get small bonus
    'SG': -1, // Shooting guards get small penalty
    'PG': -2  // Point guards get penalty
  }
  return bonuses[position] || 0
}
