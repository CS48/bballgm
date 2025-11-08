/**
 * D20 Face Allocation Utility
 *
 * Handles the complex task of allocating D20 faces across multiple outcomes
 * based on probability distributions, with proper remainder distribution
 * and capping constraints.
 */

import type { FaceCaps } from '../types/simulation-engine';

/**
 * Allocate D20 faces across outcomes based on probabilities
 * @param probabilities Array of probabilities for each outcome (should sum to 1)
 * @param caps Face allocation caps for each outcome
 * @returns Array of face allocations (sums to 20)
 */
export function allocateFaces(probabilities: number[], caps: FaceCaps): number[] {
  // Validate inputs
  if (probabilities.length !== caps.min.length || probabilities.length !== caps.max.length) {
    throw new Error('Probabilities and caps arrays must have the same length');
  }

  if (probabilities.length === 0) {
    throw new Error('Must have at least one outcome');
  }

  // Normalize probabilities to sum to 1
  const totalProb = probabilities.reduce((sum, prob) => sum + prob, 0);
  if (totalProb === 0) {
    throw new Error('Probabilities cannot all be zero');
  }

  const normalized = probabilities.map((prob) => prob / totalProb);

  // Calculate raw face allocations
  const rawFaces = normalized.map((prob) => prob * 20);
  const faces = rawFaces.map(Math.floor);

  // Calculate remainders for distribution
  const remainders = rawFaces.map((raw, index) => ({
    index,
    remainder: raw - faces[index],
  }));

  // Sort by remainder (largest first)
  remainders.sort((a, b) => b.remainder - a.remainder);

  // Distribute remaining faces
  let remainingFaces = 20 - faces.reduce((sum, face) => sum + face, 0);

  for (let i = 0; i < remainingFaces && i < remainders.length; i++) {
    faces[remainders[i].index]++;
  }

  // Apply caps
  const cappedFaces = faces.map((face, index) => Math.max(caps.min[index], Math.min(caps.max[index], face)));

  // Re-normalize if capping changed the total
  const totalFaces = cappedFaces.reduce((sum, face) => sum + face, 0);

  if (totalFaces !== 20) {
    return rebalanceFaces(cappedFaces, caps);
  }

  return cappedFaces;
}

/**
 * Rebalance faces when capping changes the total
 * @param faces Current face allocation
 * @param caps Face allocation caps
 * @returns Rebalanced face allocation
 */
function rebalanceFaces(faces: number[], caps: FaceCaps): number[] {
  const result = [...faces];
  const totalFaces = result.reduce((sum, face) => sum + face, 0);

  if (totalFaces === 20) {
    return result;
  }

  const difference = 20 - totalFaces;

  if (difference > 0) {
    // Need to add faces - find outcomes that can accept more
    const canIncrease = result
      .map((face, index) => (face < caps.max[index] ? index : -1))
      .filter((index) => index !== -1);

    // Distribute additional faces
    for (let i = 0; i < difference && i < canIncrease.length; i++) {
      result[canIncrease[i]]++;
    }
  } else {
    // Need to remove faces - find outcomes that can be reduced
    const canDecrease = result
      .map((face, index) => (face > caps.min[index] ? index : -1))
      .filter((index) => index !== -1);

    // Remove faces
    for (let i = 0; i < Math.abs(difference) && i < canDecrease.length; i++) {
      result[canDecrease[i]]--;
    }
  }

  return result;
}

/**
 * Create face caps for 2-outcome rolls (success/failure)
 * @param minFaces Minimum faces for each outcome
 * @param maxFaces Maximum faces for each outcome
 * @returns FaceCaps for 2 outcomes
 */
export function createTwoOutcomeCaps(minFaces: number, maxFaces: number): FaceCaps {
  return {
    min: [minFaces, minFaces],
    max: [maxFaces, maxFaces],
  };
}

/**
 * Create face caps for 3-outcome rolls (success/neutral/failure)
 * @param successMin Minimum faces for success
 * @param successMax Maximum faces for success
 * @param neutralMin Minimum faces for neutral
 * @param neutralMax Maximum faces for neutral
 * @param failureMin Minimum faces for failure
 * @param failureMax Maximum faces for failure
 * @returns FaceCaps for 3 outcomes
 */
export function createThreeOutcomeCaps(
  successMin: number,
  successMax: number,
  neutralMin: number,
  neutralMax: number,
  failureMin: number,
  failureMax: number
): FaceCaps {
  return {
    min: [successMin, neutralMin, failureMin],
    max: [successMax, neutralMax, failureMax],
  };
}

/**
 * Create face caps for 10-outcome rolls (rebound contest)
 * @param minFaces Minimum faces per outcome
 * @param maxFaces Maximum faces per outcome
 * @returns FaceCaps for 10 outcomes
 */
export function createTenOutcomeCaps(minFaces: number, maxFaces: number): FaceCaps {
  return {
    min: Array(10).fill(minFaces),
    max: Array(10).fill(maxFaces),
  };
}

/**
 * Validate face allocation
 * @param faces Face allocation array
 * @returns True if valid (sums to 20, all non-negative)
 */
export function validateFaceAllocation(faces: number[]): boolean {
  const total = faces.reduce((sum, face) => sum + face, 0);
  const allNonNegative = faces.every((face) => face >= 0);

  return total === 20 && allNonNegative;
}

/**
 * Get outcome from D20 roll based on face allocation
 * @param roll D20 roll result (1-20)
 * @param faces Face allocation array
 * @returns Outcome index (0-based)
 */
export function getOutcomeFromRoll(roll: number, faces: number[]): number {
  if (roll < 1 || roll > 20) {
    throw new Error('Roll must be between 1 and 20');
  }

  let cumulativeFaces = 0;
  for (let i = 0; i < faces.length; i++) {
    cumulativeFaces += faces[i];
    if (roll <= cumulativeFaces) {
      return i;
    }
  }

  // Fallback to last outcome
  return faces.length - 1;
}

/**
 * Calculate probability distribution from face allocation
 * @param faces Face allocation array
 * @returns Probability array
 */
export function calculateProbabilitiesFromFaces(faces: number[]): number[] {
  const total = faces.reduce((sum, face) => sum + face, 0);
  return faces.map((face) => face / total);
}

/**
 * Debug information for face allocation
 * @param probabilities Original probabilities
 * @param faces Final face allocation
 * @param caps Face caps used
 * @returns Debug information object
 */
export function getFaceAllocationDebug(
  probabilities: number[],
  faces: number[],
  caps: FaceCaps
): {
  originalProbabilities: number[];
  finalFaces: number[];
  finalProbabilities: number[];
  totalFaces: number;
  isValid: boolean;
  caps: FaceCaps;
} {
  return {
    originalProbabilities: probabilities,
    finalFaces: faces,
    finalProbabilities: calculateProbabilitiesFromFaces(faces),
    totalFaces: faces.reduce((sum, face) => sum + face, 0),
    isValid: validateFaceAllocation(faces),
    caps,
  };
}
