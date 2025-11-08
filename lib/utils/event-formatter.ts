/**
 * Event Formatter Utility
 *
 * Converts raw PossessionLogEntry objects into human-readable descriptions
 * for the watch mode event feed.
 */

import type { PossessionLogEntry } from '../types/simulation-engine';

/**
 * Format a possession log entry into a human-readable description
 * @param entry The possession log entry to format
 * @returns Formatted description string
 */
export function formatPossessionEvent(entry: PossessionLogEntry): string {
  const { ballHandler, decision, rollResult, description } = entry;

  // If we already have a good description (and it doesn't contain "decides"), use it
  if (description && !description.includes('decides') && description.trim().length > 0) {
    return description;
  }

  // Format based on decision and outcome
  switch (decision.action) {
    case 'shoot':
      return formatShotEvent(ballHandler, decision, rollResult);
    case 'pass':
      return formatPassEvent(ballHandler, decision, rollResult);
    case 'skill_move':
      return formatSkillMoveEvent(ballHandler, decision, rollResult);
    default:
      // Fallback: create simple action description
      const actionVerb =
        decision.action === 'shoot'
          ? 'shoots'
          : decision.action === 'pass'
            ? 'passes'
            : decision.action === 'skill_move'
              ? 'attempts skill move'
              : decision.action;
      return `${ballHandler} ${actionVerb}`;
  }
}

/**
 * Format a shot attempt event
 */
function formatShotEvent(ballHandler: string, decision: any, rollResult: any): string {
  if (!rollResult) {
    return `${ballHandler} shoots`;
  }

  const isThreePointer = rollResult.isThreePointer;
  const shotType = isThreePointer ? '3pt' : '2pt';
  const openness = decision.opennessScore || 0;
  const contested = openness < 50 ? 'contested' : 'open';

  if (rollResult.outcome === 'success' && rollResult.made) {
    return `${ballHandler} shoots ${contested} ${shotType} jumper - makes it! (+${rollResult.points})`;
  } else if (rollResult.outcome === 'failure') {
    return `${ballHandler} shoots ${contested} ${shotType} jumper - misses`;
  }

  return `${ballHandler} shoots ${contested} ${shotType} jumper`;
}

/**
 * Format a pass event
 */
function formatPassEvent(ballHandler: string, decision: any, rollResult: any): string {
  const target = decision.target?.name || 'teammate';
  const openness = Math.round(decision.opennessScore || 0);

  if (!rollResult) {
    return `${ballHandler} passes to ${target}`;
  }

  if (rollResult.outcome === 'complete') {
    return `${ballHandler} passes to ${target}`;
  } else if (rollResult.outcome === 'intercepted') {
    return `${ballHandler}'s pass to ${target} intercepted!`;
  }

  return `${ballHandler} passes to ${target}`;
}

/**
 * Format a skill move event
 */
function formatSkillMoveEvent(ballHandler: string, decision: any, rollResult: any): string {
  if (!rollResult) {
    return `${ballHandler} attempts skill move`;
  }

  if (rollResult.outcome === 'success') {
    return `${ballHandler} completes crossover`;
  } else if (rollResult.outcome === 'steal') {
    return `${ballHandler} loses the ball on skill move - stolen!`;
  } else {
    return `${ballHandler}'s skill move fails`;
  }
}

/**
 * Get color class for event outcome
 * @param rollResult The roll result from the event
 * @returns CSS class for styling
 */
export function getEventColorClass(rollResult: any): string {
  if (!rollResult) return 'text-gray-600';

  switch (rollResult.outcome) {
    case 'success':
      if (rollResult.points) return 'text-green-600'; // Made shot
      return 'text-blue-600'; // Successful pass/skill move
    case 'failure':
      return 'text-red-600'; // Missed shot
    case 'intercepted':
    case 'steal':
      return 'text-orange-600'; // Turnover
    case 'offensive':
      return 'text-purple-600'; // Offensive rebound
    case 'defensive':
      return 'text-blue-500'; // Defensive rebound
    default:
      return 'text-gray-600';
  }
}

/**
 * Format game clock for display
 * @param quarterTimeRemaining Time remaining in quarter (seconds)
 * @param quarter Current quarter number
 * @returns Formatted time string (MM:SS Q#)
 */
export function formatGameClock(quarterTimeRemaining: number, quarter: number): string {
  const minutes = Math.floor(quarterTimeRemaining / 60);
  const seconds = Math.floor(quarterTimeRemaining % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} Q${quarter}`;
}
