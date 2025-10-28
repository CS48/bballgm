# Debug State Update Issue - Comprehensive Analysis

## Current Status

We've fixed:
1. ✅ Season query (uses database instead of hardcoded year)
2. ✅ Race condition (removed mount refresh from HomeHub)
3. ✅ Game update (UPDATE instead of INSERT)

But the problem persists.

## Possible Remaining Issues

### Issue 1: React State Update Timing

**Problem**: Even though we `await refreshCurrentGameDay()`, the `setCurrentGameDay()` inside it is asynchronous. React batches state updates.

**Flow**:
```javascript
await refreshCurrentGameDay()  // Calls setCurrentGameDay(newData)
// setCurrentGameDay is queued but not completed
setCurrentView("main")  // HomeHub mounts
// HomeHub reads currentGameDay from context
// Might get OLD value if state update hasn't flushed
```

**Solution**: Add a small delay or use a ref to ensure state is updated:
```javascript
await refreshCurrentGameDay()
await new Promise(resolve => setTimeout(resolve, 0)) // Let React flush state
setCurrentView("main")
```

### Issue 2: Context Value Not Updating

**Problem**: The `contextValue` object might be memoized or not updating properly.

**Check**: Is `contextValue` recreated when `currentGameDay` changes?

Looking at the context code, `contextValue` is recreated on every render (not memoized), so this should be fine.

### Issue 3: HomeHub Reading Stale Data

**Problem**: HomeHub's `matchups` useMemo depends on `currentGameDay`, but maybe it's not re-running when expected.

**Check**: Add console.log to see when matchups recalculates:
```typescript
const matchups = useMemo(() => {
  console.log('Recalculating matchups with currentGameDay:', currentGameDay)
  // ... rest of logic
}, [currentGameDay, teams, userTeam])
```

### Issue 4: Database Not Actually Updated

**Problem**: Maybe the UPDATE query isn't working as expected.

**Check**: Add logging to see if the UPDATE actually happens:
```typescript
const result = dbService.run(sql, params);
console.log(`UPDATE result: ${result.changes} rows changed`)
```

### Issue 5: Query Returns Multiple Games

**Problem**: If there are duplicate games (from before the fix), the query might return multiple results.

**Check**: Log what `getGamesByDay` returns:
```typescript
const results = dbService.exec(sql, [season, gameDay]);
console.log(`Found ${results.length} games for game day ${gameDay}`)
```

## Debugging Strategy

### Step 1: Add Comprehensive Logging

Add console.logs at key points:

1. **In storeGameResult** (simulation-service.ts):
```typescript
console.log(`Updating game: ${homeTeamId} vs ${awayTeamId}`)
const result = dbService.run(sql, params);
console.log(`UPDATE affected ${result.changes} rows`)
```

2. **In refreshCurrentGameDay** (league-context.tsx):
```typescript
console.log('Before refresh, currentGameDay:', currentGameDay)
const gameDay = await calendarService.getCurrentGameDay(currentSeason.year);
console.log('After query, gameDay:', gameDay)
setCurrentGameDay(gameDay);
console.log('After setState, should update to:', gameDay)
```

3. **In HomeHub matchups useMemo**:
```typescript
const matchups = useMemo(() => {
  console.log('=== MATCHUPS RECALC ===')
  console.log('currentGameDay:', currentGameDay)
  console.log('currentGameDay.games:', currentGameDay?.games)
  // ... rest
}, [currentGameDay, teams, userTeam])
```

4. **In HomeHub sync useEffect**:
```typescript
useEffect(() => {
  console.log('=== SYNC EFFECT ===')
  console.log('matchups:', matchups)
  const syncCompletedGames = () => {
    // ...
  }
  syncCompletedGames()
}, [matchups])
```

### Step 2: Check Database State

Add a helper to query the database directly:
```typescript
// In main-menu.tsx, before refresh
const checkDb = () => {
  const sql = `SELECT game_id, home_team_id, away_team_id, completed, home_score, away_score FROM games WHERE home_team_id = ? AND away_team_id = ?`;
  const results = dbService.exec(sql, [userTeam.team_id, opponent.team_id]);
  console.log('DB state:', results);
};
checkDb();
await refreshCurrentGameDay();
```

### Step 3: Verify State Propagation

Add logging in the context provider to see when state changes:
```typescript
useEffect(() => {
  console.log('Context currentGameDay changed:', currentGameDay)
}, [currentGameDay])
```

## Most Likely Issue

Based on the symptoms, I suspect **Issue 1: React State Update Timing**.

The `await refreshCurrentGameDay()` completes, but the `setCurrentGameDay` inside it queues a state update that hasn't flushed yet. When `setCurrentView("main")` immediately follows, HomeHub mounts and reads the OLD context value.

## Recommended Fix

### Option A: Force State Flush (Quick Fix)
```typescript
onBackToMenu={async () => {
  await refreshCurrentGameDay()
  // Force React to flush state updates
  await new Promise(resolve => setTimeout(resolve, 0))
  setCurrentView("main")
}}
```

### Option B: Use Callback Pattern (Better)
```typescript
onBackToMenu={async () => {
  await refreshCurrentGameDay()
  // Use setTimeout to ensure state has propagated
  setTimeout(() => setCurrentView("main"), 0)
}}
```

### Option C: Make refreshCurrentGameDay Return Promise That Resolves After State Update
This is tricky because React state updates don't have callbacks. We'd need to use a ref or effect.

### Option D: Don't Unmount HomeHub (Best Long-term)
Instead of unmounting HomeHub when viewing results, keep it mounted but hidden:
```typescript
<div style={{ display: currentView === "main" ? "block" : "none" }}>
  <HomeHub ... />
</div>
{currentView === "view-game-result" && <GameResultComponent ... />}
```

This way, HomeHub stays mounted and its state/effects continue to work.

## Implementation Plan

1. **First**: Add comprehensive logging to identify the exact issue
2. **Then**: Apply the appropriate fix based on what we find
3. **Finally**: Clean up logging

Would you like me to:
A) Add logging first to diagnose the exact issue?
B) Try the quick fix (Option A) to see if it resolves it?
C) Implement the long-term solution (Option D)?


