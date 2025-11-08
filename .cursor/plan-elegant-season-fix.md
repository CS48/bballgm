# Elegant Solution: Query Actual Season from Database

## Problem Analysis

**Current Issue**: `getCurrentSeason()` returns a hardcoded year (`new Date().getFullYear()`), but the actual season in the database might be different:

- When league is generated, it uses `currentYear`
- When advancing seasons, it uses `currentYear + 1`
- But `getCurrentSeason()` always returns the real-world year, not the database season

**Root Cause**: No single source of truth for the current season - it's hardcoded based on real-world date instead of queried from database.

## Elegant Solution

### Query the Actual Season from Database

Instead of hardcoding the season, query it from the database tables that actually have season data:

#### Option 1: Query from `season_calendar` table (Recommended)

```typescript
public async getCurrentSeason(): Promise<SeasonInfo> {
  try {
    // Query the most recent season from season_calendar
    const sql = `
      SELECT DISTINCT season
      FROM season_calendar
      ORDER BY season DESC
      LIMIT 1
    `;

    const results = dbService.exec(sql);

    if (results.length === 0) {
      // Fallback to current year if no season found
      const currentYear = new Date().getFullYear();
      return {
        year: currentYear,
        season: currentYear,
        start_date: `${currentYear}-10-15`,
        end_date: `${currentYear + 1}-04-15`,
        games_per_team: 82,
        playoffs_enabled: false,
        playoff_teams_per_conference: 8
      };
    }

    const season = results[0].season;
    return {
      year: season,
      season: season,
      start_date: `${season}-10-15`,
      end_date: `${season + 1}-04-15`,
      games_per_team: 82,
      playoffs_enabled: false,
      playoff_teams_per_conference: 8
    };
  } catch (error) {
    console.error('Failed to get current season:', error);
    // Fallback to current year
    const currentYear = new Date().getFullYear();
    return {
      year: currentYear,
      season: currentYear,
      start_date: `${currentYear}-10-15`,
      end_date: `${currentYear + 1}-04-15`,
      games_per_team: 82,
      playoffs_enabled: false,
      playoff_teams_per_conference: 8
    };
  }
}
```

#### Option 2: Query from `games` table

```typescript
const sql = `
  SELECT DISTINCT season 
  FROM games 
  ORDER BY season DESC 
  LIMIT 1
`;
```

### Benefits of This Approach

1. **Single Source of Truth**: Season comes from database, not hardcoded
2. **Works for All Seasons**: Automatically works for current and future seasons
3. **Graceful Fallback**: Falls back to current year if database is empty
4. **Future-Proof**: When advancing seasons, the query automatically picks up the new season
5. **No Breaking Changes**: Same interface, just smarter implementation

### Implementation Steps

1. **Update `getCurrentSeason()` in `league-service.ts`**
   - Add database query to get actual season
   - Add fallback to current year if no data
   - Add error handling

2. **Update `SeasonInfo` type if needed**
   - Ensure it has a `season` field (might already have `year`)

3. **Test the Flow**
   - Initial league generation → uses current year
   - After games → queries actual season from database
   - After season advance → queries new season

### Files to Modify

1. `lib/services/league-service.ts` - Update `getCurrentSeason()` method

### Expected Result

- ✅ Season is always queried from database (single source of truth)
- ✅ Works for current season and all future seasons
- ✅ Graceful fallback if database is empty
- ✅ No more hardcoded year assumptions
- ✅ `refreshCurrentGameDay()` works correctly for all seasons
