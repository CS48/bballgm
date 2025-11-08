/**
 * Openness Calculator
 *
 * Calculates matchup openness scores for all 5v5 player matchups.
 * Uses player attributes, context (pass count, defensive breakdown), and
 * configurable coefficients to determine how "open" each offensive player is.
 */

import type { SimulationPlayer, PossessionState } from '../types/simulation-engine';
import { getDecisionLogicConfig, getOpennessCalculatorConfig } from './config-loader';
import { getD20RNG } from './d20-rng';

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
  const config = getOpennessCalculatorConfig();

  // Apply stamina decay to offensive attributes
  const effectiveSpeed = Math.max(0, offensivePlayer.speed - staminaDecay);
  const effectiveBallIQ = Math.max(0, offensivePlayer.ball_iq - staminaDecay * 0.5);
  const effectiveSkillMove = Math.max(0, offensivePlayer.skill_move - staminaDecay * 0.3);
  const effectivePass = Math.max(0, offensivePlayer.pass - staminaDecay * 0.2);

  // Calculate offensive contribution using config coefficients
  const offensiveValue =
    effectiveSpeed * config.coefficients.off_speed +
    effectiveBallIQ * config.coefficients.off_ball_iq +
    effectiveSkillMove * config.coefficients.off_skill_move +
    effectivePass * config.coefficients.off_pass;

  // Calculate defensive contribution using config coefficients
  const defensiveValue =
    defensivePlayer.speed * config.coefficients.def_speed +
    defensivePlayer.on_ball_defense * config.coefficients.def_on_ball;

  // Apply context modifiers
  const passCountBonus = passCount * 1.5;
  const defensiveBreakdownPenalty = defensiveBreakdown * 2.0;

  // Calculate raw openness value
  const rawValue = offensiveValue - defensiveValue + passCountBonus - defensiveBreakdownPenalty;

  // Normalize to 0-100 range using config-based scaling
  const normalized = Math.max(
    0,
    Math.min(100, config.normalization.base_value + rawValue * config.normalization.scale_factor)
  );

  // Add random variance for dynamic gameplay (±10 points)
  const rng = getD20RNG();
  const variance = rng.next() * 20 - 10; // Range: -10 to +10
  const withVariance = Math.max(0, Math.min(100, normalized + variance));

  // Debug logging for openness calculation
  console.log(`\n--- Openness Calculation ---`);
  console.log(
    `Offensive: ${offensivePlayer.name} (Speed: ${effectiveSpeed}, BallIQ: ${effectiveBallIQ}, Skill: ${effectiveSkillMove})`
  );
  console.log(
    `Defensive: ${defensivePlayer.name} (Speed: ${defensivePlayer.speed}, OnBall: ${defensivePlayer.on_ball_defense})`
  );
  console.log(`Offensive Value: ${offensiveValue.toFixed(2)}`);
  console.log(`Defensive Value: ${defensiveValue.toFixed(2)}`);
  console.log(`Raw Value: ${rawValue.toFixed(2)}`);
  console.log(`Base: ${config.normalization.base_value}, Scale: ${config.normalization.scale_factor}`);
  console.log(`Normalized: ${normalized.toFixed(1)}, Variance: ${variance.toFixed(1)}`);
  console.log(`Final Openness: ${Math.round(withVariance)}`);

  return Math.round(withVariance);
}

/**
 * Find the defender assigned to guard an offensive player (position-based)
 * @param offensivePlayer Offensive player to find matchup for
 * @param defensiveTeam All defensive players
 * @returns Assigned defender
 */
function findPositionMatchup(offensivePlayer: SimulationPlayer, defensiveTeam: SimulationPlayer[]): SimulationPlayer {
  // First, try to find exact position match
  const exactMatch = defensiveTeam.find((d) => d.position === offensivePlayer.position);
  if (exactMatch) return exactMatch;

  // Fallback: find closest position match
  const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
  const offIndex = positionOrder.indexOf(offensivePlayer.position);

  // Try adjacent positions
  for (let distance = 1; distance < positionOrder.length; distance++) {
    const checkIndices = [offIndex - distance, offIndex + distance];
    for (const checkIndex of checkIndices) {
      if (checkIndex >= 0 && checkIndex < positionOrder.length) {
        const match = defensiveTeam.find((d) => d.position === positionOrder[checkIndex]);
        if (match) return match;
      }
    }
  }

  // Ultimate fallback: return first defender
  return defensiveTeam[0];
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
  const opennessScores = new Map<string, number>();

  // Calculate openness for each offensive player vs their position matchup
  for (const offensivePlayer of offensiveTeam) {
    // Find the defender assigned to this offensive player
    const defender = findPositionMatchup(offensivePlayer, defensiveTeam);

    const staminaDecay = state.staminaDecay.get(offensivePlayer.id) || 0;
    const openness = calculateOpenness(
      offensivePlayer,
      defender,
      state.passCount,
      state.defensiveBreakdown,
      staminaDecay
    );

    opennessScores.set(offensivePlayer.id, openness);
  }

  return opennessScores;
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
  let mostOpenPlayer = offensiveTeam[0];
  let highestOpenness = opennessScores.get(mostOpenPlayer.id) || 0;

  for (const player of offensiveTeam) {
    const openness = opennessScores.get(player.id) || 0;
    if (openness > highestOpenness) {
      highestOpenness = openness;
      mostOpenPlayer = player;
    }
  }

  return mostOpenPlayer;
}

/**
 * Get openness score for a specific player
 * @param playerId Player ID
 * @param opennessScores Map of player ID to openness score
 * @returns Openness score or 0 if not found
 */
export function getPlayerOpenness(playerId: string, opennessScores: Map<string, number>): number {
  return opennessScores.get(playerId) || 0;
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
    const opennessA = opennessScores.get(a.id) || 0;
    const opennessB = opennessScores.get(b.id) || 0;
    return opennessB - opennessA;
  });
}

/**
 * Calculate team average openness
 * @param opennessScores Map of player ID to openness score
 * @returns Average openness score
 */
export function getTeamAverageOpenness(opennessScores: Map<string, number>): number {
  const scores = Array.from(opennessScores.values());
  if (scores.length === 0) return 0;

  const total = scores.reduce((sum, score) => sum + score, 0);
  return total / scores.length;
}

/**
 * Get openness distribution statistics
 * @param opennessScores Map of player ID to openness score
 * @returns Openness statistics
 */
export function getOpennessStats(opennessScores: Map<string, number>): {
  min: number;
  max: number;
  average: number;
  median: number;
  standardDeviation: number;
} {
  const scores = Array.from(opennessScores.values());

  if (scores.length === 0) {
    return { min: 0, max: 0, average: 0, median: 0, standardDeviation: 0 };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

  const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
  const standardDeviation = Math.sqrt(variance);

  return { min, max, average, median, standardDeviation };
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
  offensivePlayer: string;
  defensivePlayer: string;
  passCount: number;
  defensiveBreakdown: number;
  staminaDecay: number;
  effectiveAttributes: {
    speed: number;
    ball_iq: number;
    skill_move: number;
    pass: number;
  };
  offensiveValue: number;
  defensiveValue: number;
  contextModifiers: {
    passCountBonus: number;
    defensiveBreakdownPenalty: number;
  };
  rawValue: number;
  finalOpenness: number;
} {
  const config = getOpennessCalculatorConfig();

  const effectiveSpeed = Math.max(0, offensivePlayer.speed - staminaDecay);
  const effectiveBallIQ = Math.max(0, offensivePlayer.ball_iq - staminaDecay * 0.5);
  const effectiveSkillMove = Math.max(0, offensivePlayer.skill_move - staminaDecay * 0.3);
  const effectivePass = Math.max(0, offensivePlayer.pass - staminaDecay * 0.2);

  const offensiveValue =
    effectiveSpeed * config.coefficients.off_speed +
    effectiveBallIQ * config.coefficients.off_ball_iq +
    effectiveSkillMove * config.coefficients.off_skill_move +
    effectivePass * config.coefficients.off_pass;

  const defensiveValue =
    defensivePlayer.speed * config.coefficients.def_speed +
    defensivePlayer.on_ball_defense * config.coefficients.def_on_ball;

  const passCountBonus = passCount * 1.5;
  const defensiveBreakdownPenalty = defensiveBreakdown * 2.0;

  const rawValue = offensiveValue - defensiveValue + passCountBonus - defensiveBreakdownPenalty;
  const finalOpenness = calculateOpenness(
    offensivePlayer,
    defensivePlayer,
    passCount,
    defensiveBreakdown,
    staminaDecay
  );

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
      pass: effectivePass,
    },
    offensiveValue,
    defensiveValue,
    contextModifiers: {
      passCountBonus,
      defensiveBreakdownPenalty,
    },
    rawValue,
    finalOpenness,
  };
}
