# Fix Matchup Detail Card Score Display

## Root Cause Found

**Location**: `components/home-hub.tsx` lines 716-722

**Problem**:

```typescript
const isCompleted = !!gameResult || selectedGame.completed  // Can be true even if gameResult is undefined
if (isCompleted) {
  return (
    <span>{gameResult.awayScore}</span>  // ❌ ERROR if gameResult is undefined
  )
}
```

When `selectedGame.completed` is true but `gameResult` is undefined (because local state is empty after navigation), the code tries to access `gameResult.awayScore` which causes the error.

## Solution

Use the same fallback pattern as the carousel - check for `gameResult` first, then fall back to `selectedGame` scores:

```typescript
const awayScore = gameResult?.awayScore ?? selectedGame.awayScore ?? 0
const homeScore = gameResult?.homeScore ?? selectedGame.homeScore ?? 0

<span className={awayScore > homeScore ? 'text-green-600' : 'text-gray-600'}>
  {awayScore}
</span>
```

Or more simply:

```typescript
<span className={(gameResult?.awayScore ?? selectedGame.awayScore) > (gameResult?.homeScore ?? selectedGame.homeScore) ? 'text-green-600' : 'text-gray-600'}>
  {gameResult?.awayScore ?? selectedGame.awayScore}
</span>
```

## Files to Modify

1. `components/home-hub.tsx` (lines 716-722) - Add optional chaining and fallback to selectedGame scores

## Expected Result

- No more TypeError
- Matchup detail card shows scores from either `gameResult` or `selectedGame`
- State persists correctly after navigation
