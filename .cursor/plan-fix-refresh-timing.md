# Fix Refresh Timing Issue

## Problem Analysis

The state persistence issue is caused by a **timing/race condition**:

### Current Flow (Broken)

```
1. HomeHub mounts
2. refreshCurrentGameDay() is called (async)
3. Component renders with OLD currentGameDay from context
4. matchups useMemo runs with OLD data
5. Sync useEffect runs with OLD matchups
6. refreshCurrentGameDay() completes (too late)
7. currentGameDay updates in context
8. matchups recalculates
9. Sync useEffect runs again BUT gameResults already set with old data
```

### Root Cause

The `refreshCurrentGameDay()` call on mount is **fire-and-forget** - the component doesn't wait for it to complete before rendering.

## Solutions

### Option 1: Don't Call Refresh on Mount (Recommended)

**Insight**: The context already has `currentGameDay` loaded from initialization. We don't need to refresh it on every mount - only when returning from a game result view.

**Implementation**:

- Remove the refresh useEffect from HomeHub
- Keep the refresh calls in MainMenu before navigating back
- This ensures data is fresh when needed, but doesn't cause unnecessary refreshes

**Pros**:

- Simpler
- No race conditions
- Better performance (fewer DB queries)
- Context maintains the data

**Cons**:

- None - this is the correct approach

### Option 2: Wait for Refresh Before Rendering

Make HomeHub wait for the refresh to complete before rendering.

**Pros**:

- Ensures fresh data always

**Cons**:

- Adds loading state
- Slower initial render
- Unnecessary since context already has data

### Option 3: Add Dependency to Sync UseEffect

Make the sync useEffect depend on `refreshCurrentGameDay` completing.

**Cons**:

- Complex
- Still has race conditions
- Doesn't solve the root issue

## Recommended Implementation

### Remove Refresh from HomeHub Mount

The context already loads `currentGameDay` during initialization. HomeHub doesn't need to refresh it on every mount. The refresh should only happen:

1. **When returning from game result** - MainMenu calls refresh before navigating back
2. **When advancing game day** - Already handled in `advanceToNextGameDay()`
3. **When context initializes** - Already handled in `loadLeagueData()`

**Files to Modify**:

1. `components/home-hub.tsx` - Remove the refresh useEffect

**Expected Result**:

- No race conditions
- State persists correctly
- Fewer unnecessary DB queries
- Cleaner code

### Why This Works

1. Context loads `currentGameDay` on initialization ✅
2. When game is completed, database is updated ✅
3. When navigating to game result, context data stays in memory ✅
4. When clicking "Back to Menu", MainMenu refreshes data BEFORE navigating ✅
5. HomeHub remounts with fresh data from context ✅
6. matchups useMemo uses fresh currentGameDay ✅
7. Sync useEffect uses fresh matchups ✅
8. UI displays correct state ✅

The key insight: **The refresh in MainMenu is sufficient** - we don't need to refresh again on HomeHub mount.
