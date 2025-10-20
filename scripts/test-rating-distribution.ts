/**
 * Test script to validate player rating distribution
 * Run this after generating a league to check the distribution
 */

import { PlayerGenerator } from '../lib/generators/player-generator';

const playerGenerator = PlayerGenerator.getInstance();

// Generate test players
const testPlayers: any[] = [];
const positions = ['PG', 'SG', 'SF', 'PF', 'C'] as const;

console.log('Generating 450 test players (30 teams × 15 players)...\n');

// Generate 450 players (full league)
for (let teamId = 1; teamId <= 30; teamId++) {
  positions.forEach(position => {
    for (let i = 0; i < 3; i++) {
      const player = playerGenerator.generatePlayer(teamId, position);
      testPlayers.push(player);
    }
  });
}

// Calculate overall ratings
const overallRatings = testPlayers.map(player => {
  const weights = {
    speed: 1.0,
    ball_iq: 1.2,
    inside_shot: 1.0,
    three_point_shot: 1.0,
    pass: 0.8,
    skill_move: 0.8,
    on_ball_defense: 1.0,
    stamina: 0.6,
    block: 0.8,
    steal: 0.8,
    offensive_rebound: 0.7,
    defensive_rebound: 0.9
  };
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  Object.keys(weights).forEach(attr => {
    const value = player[attr as keyof typeof player] as number;
    const weight = weights[attr as keyof typeof weights];
    weightedSum += value * weight;
    totalWeight += weight;
  });
  
  return Math.max(50, Math.min(99, Math.round(weightedSum / totalWeight)));
});

// Calculate statistics
const min = Math.min(...overallRatings);
const max = Math.max(...overallRatings);
const mean = overallRatings.reduce((sum, val) => sum + val, 0) / overallRatings.length;
const sortedRatings = [...overallRatings].sort((a, b) => a - b);
const median = sortedRatings[Math.floor(sortedRatings.length / 2)];

// Calculate standard deviation
const squaredDiffs = overallRatings.map(val => Math.pow(val - mean, 2));
const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / overallRatings.length;
const stdDev = Math.sqrt(variance);

// Create histogram
const histogram: Record<string, number> = {};
for (let i = 40; i <= 100; i += 5) {
  const bucket = `${i}-${i + 4}`;
  histogram[bucket] = 0;
}

overallRatings.forEach(rating => {
  const bucketStart = Math.floor(rating / 5) * 5;
  const bucket = `${bucketStart}-${bucketStart + 4}`;
  if (histogram[bucket] !== undefined) {
    histogram[bucket]++;
  }
});

// Print results
console.log('═══════════════════════════════════════════════════');
console.log('           PLAYER RATING DISTRIBUTION             ');
console.log('═══════════════════════════════════════════════════\n');

console.log('Statistics:');
console.log(`  Total Players: ${overallRatings.length}`);
console.log(`  Min:           ${min}`);
console.log(`  Max:           ${max}`);
console.log(`  Mean:          ${mean.toFixed(2)}`);
console.log(`  Median:        ${median}`);
console.log(`  Std Dev:       ${stdDev.toFixed(2)}`);

console.log('\nValidation:');
console.log(`  ✓ No players > 99:     ${max <= 99 ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  ✓ Mean ≈ 75 ± 2:       ${Math.abs(mean - 75) <= 2 ? '✓ PASS' : '✗ FAIL'} (${mean.toFixed(2)})`);
console.log(`  ✓ Std Dev ≈ 7-8:       ${stdDev >= 6 && stdDev <= 9 ? '✓ PASS' : '✗ FAIL'} (${stdDev.toFixed(2)})`);

console.log('\nHistogram (5-point buckets):');
Object.entries(histogram).forEach(([bucket, count]) => {
  const percentage = ((count / overallRatings.length) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(count / 10));
  console.log(`  ${bucket}: ${count.toString().padStart(3)} (${percentage.padStart(5)}%) ${bar}`);
});

console.log('\nRating Tiers:');
const tiers = [
  { name: '40-60 (Poor)', min: 40, max: 60, target: '~5%' },
  { name: '60-70 (Below Avg)', min: 60, max: 70, target: '~15%' },
  { name: '70-75 (Replacement)', min: 70, max: 75, target: '~25%' },
  { name: '75-80 (Average)', min: 75, max: 80, target: '~30%' },
  { name: '80-85 (Good)', min: 80, max: 85, target: '~15%' },
  { name: '85-90 (All-Star)', min: 85, max: 90, target: '~7%' },
  { name: '90-95 (Elite)', min: 90, max: 95, target: '~2.5%' },
  { name: '95-99 (MVP)', min: 95, max: 99, target: '~0.5%' },
];

tiers.forEach(tier => {
  const count = overallRatings.filter(r => r >= tier.min && r < tier.max).length;
  const percentage = ((count / overallRatings.length) * 100).toFixed(1);
  console.log(`  ${tier.name.padEnd(24)} ${count.toString().padStart(3)} (${percentage.padStart(5)}%) - Target: ${tier.target}`);
});

console.log('\n═══════════════════════════════════════════════════\n');

