# Fix Database Persistence on Page Refresh

## Root Cause

**Location**: `lib/context/league-context.tsx`

**Problem**: 
Several functions that modify the database are not calling `saveDatabase()` after making changes. This causes all changes to be lost when the page is refreshed because they only exist in memory, not in localStorage.

**Functions that DO save correctly:**
- `createLeague()` (line 226) ✅
- `simulateGame()` (line 294) ✅
- `logWatchGame()` (line 369) ✅

**Functions that DON'T save (causing data loss):**
- `simulateMultipleGames()` (line 316-338) ❌ - Used by "Sim All" button
- `advanceToNextGameDay()` (line 439-459) ❌ - Used when advancing the calendar

When users:
1. Click "Sim All" to simulate multiple games
2. Advance to the next game day
3. Refresh the page

All those changes are lost because they were never persisted to localStorage.

## Solution

Add `await saveDatabase()` after the database changes in both functions:

### 1. `simulateMultipleGames` (after line 326)
```typescript
const results = await simulationService.simulateMultipleGames(games);

// Refresh data after simulations
await refreshData();

// Auto-save database after multiple game simulations
await saveDatabase()

console.log(`${games.length} games simulated successfully`);
```

### 2. `advanceToNextGameDay` (after line 448)
```typescript
await calendarService.advanceGameDay(currentYear);

// Refresh data after advance
await refreshData();

// Auto-save database after advancing day
await saveDatabase()

console.log('Advanced to next game day');
```

## Files to Modify

1. **`lib/context/league-context.tsx`**
   - Add `await saveDatabase()` in `simulateMultipleGames` (after line 326)
   - Add `await saveDatabase()` in `advanceToNextGameDay` (after line 448)

## Expected Result

- All game simulations persist after page refresh
- Day advances persist after page refresh
- Consistent behavior across all database-modifying operations
- No more data loss on refresh


