# Add Active Player Visual Separation in Watch Mode Stats Table

## Goal

Visually separate active players (on court) from bench players in the stats table during watch mode.

## Visual Treatment (User Specified)

- **Top 5 rows**: Active players currently on the court
- **Dark separator line**: After the 5th row to distinguish active from bench
- **No icons needed**: The visual separation is sufficient

## Current State

The stats table currently sorts players as:

1. Starters first (by position order: PG, SG, SF, PF, C)
2. Bench players second (by overall rating)

However, the current sorting logic in `game-stats-table.tsx` (lines 50-65) may not properly identify starters if `is_starter` values are problematic (as we're debugging).

## Implementation Plan

### Step 1: Ensure Proper Player Sorting

**File:** `/Users/calvin/Documents/Bball Sim/bballgm/components/game-stats-table.tsx`

The existing sorting logic needs to be verified and simplified:

```typescript
// Sort players: starters first (by position order), then bench players (by overall rating)
const sortedPlayers = (() => {
  // Separate starters and bench
  const starters = players.filter((p) => p.is_starter === 1);
  const bench = players.filter((p) => p.is_starter !== 1);

  // Sort starters by position
  const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
  const sortedStarters = starters.sort((a, b) => {
    return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position);
  });

  // Sort bench by overall rating (descending)
  const sortedBench = bench.sort((a, b) => b.overall_rating - a.overall_rating);

  // Return starters first, then bench
  return [...sortedStarters, ...sortedBench];
})();
```

### Step 2: Add Dark Separator Line

Add a visual separator after the 5th player:

```typescript
{sortedPlayers.map((player, index) => (
  <React.Fragment key={player.player_id}>
    <tr>
      {/* Player name cell */}
      <td className="p-2" style={{ minWidth: '11.5rem' }}>
        <div>
          <p className="font-medium">{player.name}</p>
          <p className="text-sm text-muted-foreground">
            {player.position} | {player.overall_rating} ovr
          </p>
        </div>
      </td>
      {/* ...rest of stat columns... */}
    </tr>

    {/* Add separator after 5th player (index 4) */}
    {index === 4 && (
      <tr>
        <td colSpan={18} className="p-0">
          <div className="border-t-2 border-gray-800 dark:border-gray-200" />
        </td>
      </tr>
    )}
  </React.Fragment>
))}
```

### Step 3: Alternative - Using Border on 6th Row

Instead of inserting a new row, we can add a top border to the 6th player:

```typescript
<tr className={index === 5 ? 'border-t-2 border-gray-800 dark:border-gray-200' : ''}>
  <td className="p-2" style={{ minWidth: '11.5rem' }}>
    <div>
      <p className="font-medium">{player.name}</p>
      <p className="text-sm text-muted-foreground">
        {player.position} | {player.overall_rating} ovr
      </p>
    </div>
  </td>
  {/* ...rest of stat columns... */}
</tr>
```

### Step 4: Handle Edge Cases

- **Less than 5 starters**: If somehow there are fewer than 5 starters, only show separator if index === (starters.length - 1)
- **Exactly 5 players total**: Don't show separator if there are no bench players

```typescript
// Only show separator if there are more than 5 players
const showSeparatorAfterIndex = starters.length > 0 ? Math.min(starters.length - 1, 4) : -1

<tr className={index === showSeparatorAfterIndex && players.length > 5 ? 'border-t-2 border-gray-800 dark:border-gray-200' : ''}>
  {/* ... */}
</tr>
```

## Files to Modify

1. **`/Users/calvin/Documents/Bball Sim/bballgm/components/game-stats-table.tsx`**
   - Verify/fix player sorting logic (starters first, then bench)
   - Add dark separator line after 5th player
   - Handle edge cases

## Visual Result

```
╔═══════════════════════════════════════╗
║ PG - Kemba Hill (95 ovr)      [stats] ║
║ SG - Enes Roberts (91 ovr)    [stats] ║
║ SF - Blake Miller (89 ovr)    [stats] ║
║ PF - Semi Lopez (90 ovr)      [stats] ║
║ C - Khris Martin (106 ovr)    [stats] ║
╠═══════════════════════════════════════╣ ← Dark separator
║ PG - Jimmy Hall (79 ovr)      [stats] ║
║ SG - Luka Anderson (87 ovr)   [stats] ║
║ SF - Carsen Baker (81 ovr)    [stats] ║
║ SF - Devin Rodriguez (80 ovr) [stats] ║
║ PG - Tremont Evans (78 ovr)   [stats] ║
╚═══════════════════════════════════════╝
```

This makes it immediately clear which 5 players are currently on the court!

## Implementation Priority

**Recommended Approach**: Use border on 6th row (Step 3) - cleaner and simpler than inserting a new table row.

## ✅ IMPLEMENTATION COMPLETE

**File Modified:** `/Users/calvin/Documents/Bball Sim/bballgm/components/game-stats-table.tsx`

**Changes Made:**

1. ✅ Added index parameter to map function
2. ✅ Added conditional border styling for 6th row (index === 5)
3. ✅ Added check for `sortedPlayers.length > 5` to only show separator when there are bench players
4. ✅ Used dark border (`border-gray-800`) with dark mode support (`dark:border-gray-200`)

**Result:**

- Top 5 players (starters) appear first
- Dark separator line appears after the 5th player (6th row)
- Only shows separator if there are more than 5 players total
- Works in both light and dark modes
