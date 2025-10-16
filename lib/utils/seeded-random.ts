"use client"

/**
 * Seeded Random Number Generator
 * 
 * This utility provides a seedable random number generator using a Linear Congruential Generator (LCG)
 * to ensure reproducible randomization for schedule generation.
 */

/**
 * SeededRandom class that provides deterministic random number generation
 */
export class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  /**
   * Generate the next random number between 0 and 1
   * @returns Random number between 0 and 1
   */
  next(): number {
    // Linear Congruential Generator: seed = (seed * a + c) % m
    // Using parameters: a=9301, c=49297, m=233280 (good for 32-bit)
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
   * Shuffle an array using Fisher-Yates algorithm with seeded random
   * @param array Array to shuffle
   * @returns New shuffled array
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  
  /**
   * Select random elements from an array
   * @param array Array to select from
   * @param count Number of elements to select
   * @returns Array of selected elements
   */
  selectRandom<T>(array: T[], count: number): T[] {
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, count);
  }
}
