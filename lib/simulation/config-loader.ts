/**
 * Simulation Configuration Loader
 *
 * Provides type-safe access to all tuning parameters.
 * Configuration is inlined for client-side compatibility.
 */

import type { SimulationConfig } from '../types/simulation-engine';

/**
 * Inlined simulation configuration for client-side use
 */
const SIMULATION_CONFIG: SimulationConfig = {
  shot_roll: {
    coefficients: {
      off_shot: 0.75,
      openness: 0.45,
      off_speed: 0.1,
      stamina: 0.1,
      def_onball: 0.5,
      def_speed: 0.1,
      shot_clock_pressure: 0.2,
      context_modifier: 0.0,
    },
    caps: {
      max_faces: 19,
      min_faces: 1,
    },
  },
  openness_calculator: {
    coefficients: {
      off_speed: 1.0, // was 0.32 (3.1x increase)
      off_ball_iq: 0.8, // was 0.26 (3.1x increase)
      off_skill_move: 0.6, // was 0.16 (3.75x increase)
      off_pass: 0.3, // was 0.08 (3.75x increase)
      def_speed: 0.9, // was 0.30 (3x increase)
      def_on_ball: 1.65, // was 0.55 (3x increase)
    },
    normalization: {
      base_value: 50, // keep same
      scale_factor: 1.0, // reduce from 2.0 to 1.0 since raw values will be larger
    },
  },
  skill_move_roll: {
    coefficients: {
      success: {
        off_skill: 0.7,
        off_speed: 0.25,
        def_onball: 0.4,
        def_speed: 0.1,
        openness: 0.15,
      },
      steal: {
        def_steal: 0.4,
        def_speed: 0.3,
        off_skill: 0.35,
      },
    },
    caps: {
      steal_cap: 1,
      max_faces: 19,
      min_faces: 1,
    },
    baseline: {
      neutral_weight: 15,
    },
  },
  pass_roll: {
    coefficients: {
      off_pass: 0.8,
      target_openness: 0.6,
      ball_iq: 0.2,
      def_steal: 0.05,
    },
    caps: {
      steal_cap: 0, // Minimum steal faces (unchanged)
      steal_cap_max: 4, // NEW: Maximum steal faces (caps at 20% interception rate)
      max_faces: 19, // Maximum total faces
      min_faces: 1,
    },
  },
  rebound_roll: {
    coefficients: {
      off_reb: 1.0,
      def_reb: 1.0,
      position_bonus: 0.25,
      team_bias: 0.1,
    },
    caps: {
      max_faces: 18,
      min_faces: 1,
    },
    position_bonuses: {
      C: 5, // Centers get highest bonus
      PF: 3, // Power forwards get good bonus
      SF: 1, // Small forwards get small bonus
      SG: -1, // Shooting guards get small penalty
      PG: -2, // Point guards get penalty
    },
    distance_modifiers: {
      close: {
        C: 5, // Centers get bonus for close shots
        PF: 3,
        SF: 1,
        SG: -1,
        PG: -2,
      },
      mid: {
        C: 2,
        PF: 3, // Power forwards get bonus for mid-range
        SF: 2,
        SG: 1,
        PG: 0,
      },
      long: {
        C: -2, // Centers struggle with long rebounds
        PF: -1,
        SF: 1,
        SG: 2, // Guards get bonus for long rebounds
        PG: 3,
      },
    },
    three_pointer_modifiers: {
      C: -3, // Centers struggle with three-point rebounds
      PF: -1,
      SF: 0,
      SG: 2, // Guards get bonus for three-point rebounds
      PG: 3,
    },
  },
  decision_logic: {
    forced_shot_threshold: 4,
    def_breakdown_increment: 3,
    max_def_breakdown: 30,
    stamina_decay_per_possession: 1.0,
  },
  allocation_rules: {
    d20_total_faces: 20,
    rounding_method: 'floor_then_remainder',
    fractional_priority: 'desc',
    seeded_rng: true,
  },
  logging: {
    verbose_possession_logs: true,
    show_decision_details: true,
    show_roll_details: true,
  },
};

/**
 * Load simulation configuration
 * @returns SimulationConfig object
 */
export function loadConfig(): SimulationConfig {
  return SIMULATION_CONFIG;
}

/**
 * Get complete simulation configuration (alias for loadConfig)
 * @returns SimulationConfig object
 */
export function getConfig(): SimulationConfig {
  return SIMULATION_CONFIG;
}

/**
 * Get shot roll configuration
 * @returns Shot roll configuration section
 */
export function getShotRollConfig(): SimulationConfig['shot_roll'] {
  const config = loadConfig();
  return config.shot_roll;
}

/**
 * Get skill move roll configuration
 * @returns Skill move roll configuration section
 */
export function getSkillMoveRollConfig(): SimulationConfig['skill_move_roll'] {
  const config = loadConfig();
  return config.skill_move_roll;
}

/**
 * Get pass roll configuration
 * @returns Pass roll configuration section
 */
export function getPassRollConfig(): SimulationConfig['pass_roll'] {
  const config = loadConfig();
  return config.pass_roll;
}

/**
 * Get rebound roll configuration
 * @returns Rebound roll configuration section
 */
export function getReboundRollConfig(): SimulationConfig['rebound_roll'] {
  const config = loadConfig();
  return config.rebound_roll;
}

/**
 * Get decision logic configuration
 * @returns Decision logic configuration section
 */
export function getDecisionLogicConfig(): SimulationConfig['decision_logic'] {
  const config = loadConfig();
  return config.decision_logic;
}

/**
 * Get openness calculator configuration
 * @returns Openness calculator configuration section
 */
export function getOpennessCalculatorConfig(): SimulationConfig['openness_calculator'] {
  const config = loadConfig();
  return config.openness_calculator;
}

/**
 * Get allocation rules configuration
 * @returns Allocation rules configuration section
 */
export function getAllocationRulesConfig(): SimulationConfig['allocation_rules'] {
  const config = loadConfig();
  return config.allocation_rules;
}

/**
 * Get position bonus for rebound calculation
 * @param position Player position
 * @returns Position bonus value
 */
export function getPositionBonus(position: string): number {
  const config = loadConfig();
  // Position bonuses are now handled differently in the new structure
  // This is a simplified version - you may want to adjust based on your needs
  const bonuses: Record<string, number> = {
    C: 5, // Centers get highest bonus
    PF: 3, // Power forwards get good bonus
    SF: 1, // Small forwards get small bonus
    SG: -1, // Shooting guards get small penalty
    PG: -2, // Point guards get penalty
  };
  return bonuses[position] || 0;
}
