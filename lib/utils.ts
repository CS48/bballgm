import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Determines if a stat should show "--" (not implemented) vs "0.0" (implemented but zero)
 * TODO: Remove this helper function after free throws, blocks, personal fouls, plus/minus, double doubles, and triple doubles are fully implemented
 */
export function isStatNotImplemented(statName: string): boolean {
  const notImplementedStats = ['ft_made', 'ft_attempted', 'ft_pct', 'bpg', 'blocks', 'pf', 'plus_minus', 'dd', 'td'];
  return notImplementedStats.includes(statName.toLowerCase());
}
