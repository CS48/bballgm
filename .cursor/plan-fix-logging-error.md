# Fix Logging Error and Simplify Debugging

## Issue

Added comprehensive logging but got: `TypeError: undefined is not an object (evaluating 'gameResult.awayScore')`

This error doesn't match the code (which uses optional chaining `gameResult?.awayScore`), suggesting:

1. The error might be from cached code
2. The logging might be interfering
3. There might be a different code path causing the error

## Solution

### Step 1: Simplify Logging

Keep only the most critical logs:

1. Database UPDATE result (did it work?)
2. What data refreshCurrentGameDay returns
3. What matchups receives

Remove verbose per-matchup logging that might cause issues.

### Step 2: Add Guard for gameResult

Even though we have optional chaining, add explicit check:

```typescript
const displayScore = isCompleted
  ? gameResult && gameResult.awayScore !== undefined
    ? gameResult.awayScore
    : (matchup.awayScore ?? matchup.awayRecord)
  : isSimulating
    ? '...'
    : matchup.awayRecord;
```

### Step 3: Focus on Key Question

The main question is: **After clicking "Back to Menu", does matchup.completed = true and matchup.homeScore/awayScore have values?**

If YES → UI should work
If NO → Database or query issue

## Implementation

1. Simplify logging in home-hub.tsx (remove per-matchup logs)
2. Keep database and refresh logs
3. Add one summary log showing final matchup state
4. Test again

This will give us clean, actionable information without potential side effects from excessive logging.
