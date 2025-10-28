# Deep Dive: State Persistence Issue

## Investigation Needed

The issue persists even after:
1. ✅ Fixed season query to use database
2. ✅ Removed race condition from HomeHub mount
3. ✅ MainMenu calls refresh before navigation

## Possible Root Causes

### Hypothesis 1: Teams Data Not Refreshing
The `matchups` useMemo depends on both `currentGameDay` AND `teams`:
```typescript
}, [currentGameDay, teams, userTeam])
```

**Problem**: When a game is completed:
- `currentGameDay.games[].completed` is updated ✅
- `currentGameDay.games[].score` is updated ✅
- BUT `teams[].wins` and `teams[].losses` are updated in database
- The `teams` array in context is NOT refreshed

**Result**: The matchup shows:
```typescript
awayRecord: `${awayTeam.wins}-${awayTeam.losses}`,  // OLD RECORD
homeRecord: `${homeTeam.wins}-${homeTeam.losses}`,  // OLD RECORD
```

### Hypothesis 2: refreshCurrentGameDay Not Awaited Properly
The async/await might not be working as expected in the onClick handler.

### Hypothesis 3: Context State Not Updating
The `setCurrentGameDay` might not be triggering a re-render properly.

## Solution: Refresh Teams Data Too

When `refreshCurrentGameDay()` is called, we should also refresh the teams data since team records change after games.

### Option 1: Call refreshData() Instead
```typescript
onBackToMenu={async () => {
  await refreshData() // Refreshes EVERYTHING including teams
  setCurrentView("main")
}}
```

**Pros**: Ensures all data is fresh
**Cons**: More expensive (queries more data)

### Option 2: Add Teams Refresh to refreshCurrentGameDay
Update `refreshCurrentGameDay` to also refresh teams:
```typescript
const refreshCurrentGameDay = async (): Promise<void> => {
  try {
    setIsLoading(true);
    setError(null);
    
    const currentSeason = await leagueService.getCurrentSeason();
    const gameDay = await calendarService.getCurrentGameDay(currentSeason.year);
    setCurrentGameDay(gameDay);
    
    // Also refresh teams since records change
    const allTeams = await teamService.getAllTeams();
    setTeams(allTeams);
    
    console.log('Refreshed current game day and teams data');
  } catch (err) {
    // ... error handling
  }
};
```

**Pros**: Targeted refresh, only what's needed
**Cons**: Changes the scope of refreshCurrentGameDay

### Option 3: Create New Function refreshGameDayAndTeams
```typescript
const refreshGameDayAndTeams = async (): Promise<void> => {
  await Promise.all([
    refreshCurrentGameDay(),
    refreshTeams() // New function
  ]);
};
```

## Recommended Approach

**Use refreshData() in MainMenu** - it already exists and refreshes everything:
- Teams (with updated records)
- CurrentGameDay (with updated completion status)
- Standings
- All other data

This ensures complete consistency.

## Files to Modify

1. `components/main-menu.tsx` - Change `refreshCurrentGameDay()` to `refreshData()`
2. `lib/context/league-context.tsx` - Ensure `refreshData` is exported

## Expected Result

When returning to HomeHub:
- Teams have updated win/loss records
- CurrentGameDay has updated completion status
- Matchups show correct data
- UI displays correctly


