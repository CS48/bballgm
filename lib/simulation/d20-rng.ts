/**
 * D20 Random Number Generator
 *
 * Seeded random number generator specifically for D20 basketball simulation.
 * Provides deterministic, reproducible dice rolls for testing and debugging.
 */

/**
 * D20 RNG class for basketball simulation
 */
export class D20RNG {
  private seed: number;
  private originalSeed: number;

  constructor(seed: number) {
    this.seed = seed;
    this.originalSeed = seed;
  }

  /**
   * Generate a D20 roll (1-20)
   * @returns Random integer between 1 and 20
   */
  rollD20(): number {
    // Linear Congruential Generator optimized for D20
    // Using parameters: a=9301, c=49297, m=233280
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return (this.seed % 20) + 1;
  }

  /**
   * Generate multiple D20 rolls
   * @param count Number of rolls to generate
   * @returns Array of D20 rolls
   */
  rollMultipleD20(count: number): number[] {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(this.rollD20());
    }
    return rolls;
  }

  /**
   * Generate a random number between 0 and 1
   * @returns Random number between 0 and 1
   */
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Generate a random integer between min (inclusive) and max (exclusive)
   * @param min Minimum value (inclusive)
   * @param max Maximum value (exclusive)
   * @returns Random integer
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Generate a random boolean
   * @returns Random boolean
   */
  nextBoolean(): boolean {
    return this.next() < 0.5;
  }

  /**
   * Get current seed value
   * @returns Current seed
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Get original seed value
   * @returns Original seed
   */
  getOriginalSeed(): number {
    return this.originalSeed;
  }

  /**
   * Reset to original seed
   */
  reset(): void {
    this.seed = this.originalSeed;
  }

  /**
   * Set new seed
   * @param newSeed New seed value
   */
  setSeed(newSeed: number): void {
    this.seed = newSeed;
    this.originalSeed = newSeed;
  }

  /**
   * Create a new D20RNG instance with a specific seed
   * @param seed Seed value
   * @returns New D20RNG instance
   */
  static create(seed: number): D20RNG {
    return new D20RNG(seed);
  }

  /**
   * Create a D20RNG with timestamp-based seed
   * @returns New D20RNG instance with current timestamp as seed
   */
  static createRandom(): D20RNG {
    return new D20RNG(Date.now());
  }
}

/**
 * Global D20 RNG instance for the simulation
 */
let globalD20RNG: D20RNG | null = null;

/**
 * Initialize the global D20 RNG with a seed
 * @param seed Seed value for deterministic rolls
 */
export function initializeD20RNG(seed: number): void {
  globalD20RNG = new D20RNG(seed);
}

/**
 * Get the global D20 RNG instance
 * @returns Global D20RNG instance
 */
export function getD20RNG(): D20RNG {
  if (!globalD20RNG) {
    globalD20RNG = new D20RNG(Date.now());
  }
  return globalD20RNG;
}

/**
 * Roll a D20 using the global RNG
 * @returns D20 roll result (1-20)
 */
export function rollD20(): number {
  return getD20RNG().rollD20();
}

/**
 * Roll multiple D20s using the global RNG
 * @param count Number of rolls
 * @returns Array of D20 roll results
 */
export function rollMultipleD20(count: number): number[] {
  return getD20RNG().rollMultipleD20(count);
}
