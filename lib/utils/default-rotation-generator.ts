/**
 * Default Rotation Generator
 *
 * Shared utility for generating default rotation configurations.
 * Ensures consistency between UI display and simulation engine.
 */

import type { TeamRotationConfig, PlayerRotation, Player } from '@/lib/types/database';

/**
 * Calculate overall rating for a player using the same method as RotationManager
 * (simple average of all 12 attributes)
 */
function calculateOverallRating(player: Player): number {
  return (
    (player.speed +
      player.ball_iq +
      player.inside_shot +
      player.three_point_shot +
      player.pass +
      player.skill_move +
      player.on_ball_defense +
      player.stamina +
      player.block +
      player.steal +
      player.offensive_rebound +
      player.defensive_rebound) /
    12
  );
}

/**
 * Validate that a rotation config has exactly 5 players for all 48 minutes
 * and exactly one player of each position (PG, SG, SF, PF, C) at all times
 */
function validateRotationConfig(config: TeamRotationConfig, players: Player[]): boolean {
  const minuteCounts = new Array(48).fill(0);
  const minutePositions = new Array(48).fill(null).map(() => new Set<string>());

  // Create a map of player_id to player for quick lookup
  const playerMap = new Map<number, Player>();
  players.forEach((p) => playerMap.set(p.player_id, p));

  for (const playerRotation of config.player_rotations) {
    const player = playerMap.get(playerRotation.player_id);
    if (!player) continue;

    for (const [start, end] of playerRotation.active_minutes) {
      for (let minute = start; minute < end; minute++) {
        if (minute >= 0 && minute < 48) {
          minuteCounts[minute]++;
          minutePositions[minute].add(player.position);
        }
      }
    }
  }

  // Check that all minutes have exactly 5 players
  for (let minute = 0; minute < 48; minute++) {
    if (minuteCounts[minute] !== 5) {
      console.error(`Validation failed: Minute ${minute} has ${minuteCounts[minute]} players (expected 5)`);
      return false;
    }

    // Check that all minutes have exactly one player of each position
    const positions = minutePositions[minute];
    const requiredPositions = ['PG', 'SG', 'SF', 'PF', 'C'];
    if (positions.size !== 5) {
      console.error(`Validation failed: Minute ${minute} has ${positions.size} unique positions (expected 5)`);
      return false;
    }
    for (const pos of requiredPositions) {
      if (!positions.has(pos)) {
        console.error(`Validation failed: Minute ${minute} missing position ${pos}`);
        return false;
      }
    }
  }

  return true;
}

/**
 * Create default rotation configuration for a team
 * Ensures exactly 5 players on court for all 48 minutes
 * Ensures exactly one player of each position (PG, SG, SF, PF, C) at all times
 * Uses only top 9-10 players (typical rotation size)
 *
 * @param teamId Team ID
 * @param players Array of database Player objects
 * @returns TeamRotationConfig with default rotation
 */
export function createDefaultRotationConfig(teamId: number, players: Player[]): TeamRotationConfig {
  const positions: Array<'PG' | 'SG' | 'SF' | 'PF' | 'C'> = ['PG', 'SG', 'SF', 'PF', 'C'];

  // Group players by position and sort by overall rating within each position
  const playersByPosition: Record<string, Player[]> = {
    PG: [],
    SG: [],
    SF: [],
    PF: [],
    C: [],
  };

  players.forEach((player) => {
    if (playersByPosition[player.position]) {
      playersByPosition[player.position].push(player);
    }
  });

  // Sort each position by overall rating (best first)
  positions.forEach((pos) => {
    playersByPosition[pos].sort((a, b) => {
      const aRating = calculateOverallRating(a);
      const bRating = calculateOverallRating(b);
      return bRating - aRating;
    });
  });

  // Select starters: best player at each position (ensures one of each position)
  const starters: Player[] = positions.map((pos) => playersByPosition[pos][0]).filter(Boolean);

  // Select backups: 2nd best at each position (ensures one of each position when they play)
  const backups: Player[] = positions.map((pos) => playersByPosition[pos][1]).filter(Boolean); // Should be exactly 5 if we have at least 2 players per position

  // Select 3rd string: 3rd best at each position (for deeper rotation if needed)
  const thirdString: Player[] = positions.map((pos) => playersByPosition[pos][2]).filter(Boolean);

  // Combine rotation players: starters + backups + third string (up to 10 total)
  const rotationPlayers: Player[] = [...starters, ...backups, ...thirdString].slice(0, 10);

  const playerRotations: PlayerRotation[] = [];

  // Assign minutes ensuring position balance at all times
  // Pattern: Starters (one of each position) play 0-6, 12-18, 24-30, 36-42, 42-48 (32 minutes)
  //          Backups (one of each position) play 6-12, 18-24, 30-36, 46-48 (22 minutes)
  //          Third string (if available) can fill gaps, but we'll use backups primarily

  // Starters: 32 minutes each (0-6, 12-18, 24-30, 36-42, 42-46, 46-48 for top 3)
  // Top 3 starters play 46-48, top 4-5 starters play 42-46
  starters.forEach((starter, index) => {
    if (index < 3) {
      // Top 3 starters: 0-6, 12-18, 24-30, 36-42, 42-48 = 32 minutes
      playerRotations.push({
        player_id: starter.player_id,
        active_minutes: [
          [0, 6],
          [12, 18],
          [24, 30],
          [36, 42],
          [42, 48],
        ],
        total_minutes: 32,
      });
    } else {
      // Top 4-5 starters: 0-6, 12-18, 24-30, 36-42, 42-46 = 30 minutes
      playerRotations.push({
        player_id: starter.player_id,
        active_minutes: [
          [0, 6],
          [12, 18],
          [24, 30],
          [36, 42],
          [42, 46],
        ],
        total_minutes: 30,
      });
    }
  });

  // Backups: 22 minutes each (6-12, 18-24, 30-36, 46-48)
  // Only assign if we have backups for all positions
  if (backups.length === 5) {
    // For minutes 46-48, we need backups at the positions of the 2 starters not playing (top 4-5)
    // Top 3 starters play 46-48, so we need backups at the positions of starters 4-5
    const starterPositions46_48 = new Set(starters.slice(0, 3).map((s) => s.position));
    const backupsFor46_48 = backups.filter((b) => !starterPositions46_48.has(b.position));

    backups.forEach((backup) => {
      const plays46_48 = backupsFor46_48.some((b) => b.player_id === backup.player_id);
      if (plays46_48) {
        // Backups that play 46-48: 6-12, 18-24, 30-36, 46-48 = 22 minutes
        playerRotations.push({
          player_id: backup.player_id,
          active_minutes: [
            [6, 12],
            [18, 24],
            [30, 36],
            [46, 48],
          ],
          total_minutes: 22,
        });
      } else {
        // Other backups: 6-12, 18-24, 30-36 = 18 minutes
        playerRotations.push({
          player_id: backup.player_id,
          active_minutes: [
            [6, 12],
            [18, 24],
            [30, 36],
          ],
          total_minutes: 18,
        });
      }
    });
  } else {
    // If we don't have backups for all positions, use third string or best available
    // This is a fallback - ideally we should have backups for all positions
    backups.forEach((backup) => {
      playerRotations.push({
        player_id: backup.player_id,
        active_minutes: [
          [6, 12],
          [18, 24],
          [30, 36],
          [46, 48],
        ],
        total_minutes: 22,
      });
    });

    // Fill remaining positions with third string or best available
    const backupPositions = new Set(backups.map((p) => p.position));
    const missingPositions = positions.filter((pos) => !backupPositions.has(pos));

    missingPositions.forEach((pos) => {
      const fillPlayer =
        thirdString.find((p) => p.position === pos) || playersByPosition[pos][1] || playersByPosition[pos][0];
      if (fillPlayer && !playerRotations.find((pr) => pr.player_id === fillPlayer.player_id)) {
        playerRotations.push({
          player_id: fillPlayer.player_id,
          active_minutes: [
            [6, 12],
            [18, 24],
            [30, 36],
            [46, 48],
          ],
          total_minutes: 22,
        });
      }
    });
  }

  // Third string: 18 minutes each (6-12, 18-24, 30-36)
  // Only assign if we have at least 3 third-string players and they're not already assigned
  const assignedPlayerIds = new Set(playerRotations.map((pr) => pr.player_id));
  thirdString.forEach((third) => {
    if (!assignedPlayerIds.has(third.player_id) && playerRotations.length < 10) {
      playerRotations.push({
        player_id: third.player_id,
        active_minutes: [
          [6, 12],
          [18, 24],
          [30, 36],
        ],
        total_minutes: 18,
      });
    }
  });

  // Remaining players (11th-15th): No minutes by default
  const rotationPlayerIds = new Set(rotationPlayers.map((p) => p.player_id));
  players.forEach((player) => {
    if (!rotationPlayerIds.has(player.player_id)) {
      playerRotations.push({
        player_id: player.player_id,
        active_minutes: [],
        total_minutes: 0,
      });
    }
  });

  const config: TeamRotationConfig = {
    team_id: teamId,
    player_rotations: playerRotations,
    is_custom: false,
    last_updated: new Date().toISOString(),
  };

  // Validate the rotation
  if (!validateRotationConfig(config, players)) {
    console.error('Generated rotation config is invalid!');
    // Still return it, but log the error
  }

  return config;
}
