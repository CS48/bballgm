# Fix Missing Overall Rating in Watch Mode

## Root Cause - FOUND!

The debug output revealed the exact issue:

**The `players` from `useLeague()` are raw database players without `overall_rating` calculated.**

Looking at the console:

```
🔍 convertDatabaseTeamToGameTeam - Input players:
  {name: "Michael Parker", overall_rating: undefined, is_starter: 1, speed: 45}
```

The raw database `Player` type only has individual attributes (speed, ball_iq, etc.) but **NOT** the calculated `overall_rating` field. The `overall_rating` needs to be calculated using `playerService.calculateOverallRating(player)`.

## Current Problematic Code

**File:** `components/main-menu.tsx` (lines 40-45)

```typescript
// Get players for both teams
const homeTeamPlayers = players.filter((p) => p.team_id === userTeam.team_id);
const awayTeamPlayers = players.filter((p) => p.team_id === opponent.team_id);

// Convert to game simulation teams
const homeGameTeam = convertDatabaseTeamToGameTeam(userTeam, homeTeamPlayers);
const awayGameTeam = convertDatabaseTeamToGameTeam(opponent, awayTeamPlayers);
```

**Problem:** `players` from `useLeague()` are raw database records without `overall_rating` field.

## Solution

Use `leagueService.getTeamRoster()` instead of filtering context players. This service already calculates the `overall_rating` for each player (as we saw in the sim mode code).

The league context already has a `getTeamRoster` function that we can use!

## Implementation

### Update main-menu.tsx - Watch mode from opponent selection

**File:** `/Users/calvin/Documents/Bball Sim/bballgm/components/main-menu.tsx`

Replace lines 36-53 with:

```typescript
if (gameMode === 'watch') {
  // Prepare teams for watch mode (stay in same context)
  try {
    // Get full rosters with calculated overall ratings
    const [homeRoster, awayRoster] = await Promise.all([
      leagueService.getTeamRoster(userTeam.team_id),
      leagueService.getTeamRoster(opponent.team_id),
    ]);

    // Convert to game simulation teams using the helper from watch-game page
    const homeGameTeam = convertRosterToGameTeam(homeRoster, userTeam);
    const awayGameTeam = convertRosterToGameTeam(awayRoster, opponent);

    setWatchGameTeams({ home: homeGameTeam, away: awayGameTeam });
    setCurrentView('watch-game');
  } catch (error) {
    console.error('Failed to prepare watch game:', error);
    setCurrentView('game-select');
  }
  return;
}
```

### Update main-menu.tsx - Watch mode from home hub

**File:** `/Users/calvin/Documents/Bball Sim/bballgm/components/main-menu.tsx`

Replace lines 176-191 with:

```typescript
onNavigateToWatchGame={async (homeTeam, awayTeam) => {
  // Prepare teams for watch mode
  try {
    // Get full rosters with calculated overall ratings
    const [homeRoster, awayRoster] = await Promise.all([
      leagueService.getTeamRoster(homeTeam.team_id),
      leagueService.getTeamRoster(awayTeam.team_id)
    ])

    // Convert to game simulation teams using the helper from watch-game page
    const homeGameTeam = convertRosterToGameTeam(homeRoster, homeTeam)
    const awayGameTeam = convertRosterToGameTeam(awayRoster, awayTeam)

    setSelectedOpponent(awayTeam)
    setWatchGameTeams({ home: homeGameTeam, away: awayGameTeam })
    setCurrentView("watch-game")
  } catch (error) {
    console.error('Failed to prepare watch game:', error)
  }
}}
```

### Create helper function

Since we need to convert roster data (not raw database players), we should use a consistent conversion approach. We can either:

1. Create a shared helper that works with roster data from `getTeamRoster()`
2. Update `convertDatabaseTeamToGameTeam` to work with roster data

**Option 1 (Recommended):** Create a new conversion helper in `main-menu.tsx`:

```typescript
import { leagueService } from '@/lib/services/league-service';

// Helper to convert roster from getTeamRoster to GameSimulationTeam
function convertRosterToGameTeam(roster: any, team: Team): GameSimulationTeam {
  const gamePlayers: GameSimulationPlayer[] = roster.players.map((player: any) => ({
    id: player.player_id.toString(),
    name: player.name,
    position: player.position as 'PG' | 'SG' | 'SF' | 'PF' | 'C',
    teamId: roster.team.team_id.toString(),
    is_starter: player.is_starter,
    attributes: {
      shooting: Math.round((player.inside_shot + player.three_point_shot) / 2),
      defense: Math.round((player.on_ball_defense + player.block + player.steal) / 3),
      rebounding: Math.round((player.offensive_rebound + player.defensive_rebound) / 2),
      passing: player.pass,
      athleticism: Math.round((player.speed + player.stamina) / 2),
    },
    overall: player.overall_rating, // This is now calculated by getTeamRoster!
    descriptor: `${player.position} - ${player.overall_rating} OVR`,
    // Individual attributes for D20 engine
    speed: player.speed,
    ball_iq: player.ball_iq,
    inside_shot: player.inside_shot,
    three_point_shot: player.three_point_shot,
    pass: player.pass,
    skill_move: player.skill_move,
    on_ball_defense: player.on_ball_defense,
    stamina: player.stamina,
    block: player.block,
    steal: player.steal,
    offensive_rebound: player.offensive_rebound,
    defensive_rebound: player.defensive_rebound,
  }));

  return {
    id: roster.team.team_id.toString(),
    name: roster.team.name,
    city: roster.team.city,
    players: gamePlayers,
    record: { wins: team.wins, losses: team.losses },
  };
}
```

### Remove Debug Logging

After confirming the fix works, remove all the debug console.log statements from:

- `/Users/calvin/Documents/Bball Sim/bballgm/lib/types/game-simulation.ts`
- `/Users/calvin/Documents/Bball Sim/bballgm/components/game-watch.tsx`
- `/Users/calvin/Documents/Bball Sim/bballgm/components/game-stats-table.tsx`

## Expected Outcome

After this fix:

1. **OVR will display correctly** - `overall_rating` will be calculated by `getTeamRoster()`
2. **Starters will work correctly** - The roster includes proper `is_starter` flags
3. **Individual attributes will work** - All player attributes will be available for D20 simulation
4. **Watch mode will match sim mode** - Both use the same data source with calculated ratings

## Files to Modify

1. `/Users/calvin/Documents/Bball Sim/bballgm/components/main-menu.tsx` - Use getTeamRoster instead of context players
2. Remove debug logging from all files after confirming the fix works
