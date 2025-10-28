# Fix Game Update Bug - Root Cause Found

## Problem: INSERT Instead of UPDATE

### Root Cause
**File**: `lib/services/simulation-service.ts` (line 769)
**Method**: `storeGameResult()`

**Current Code**:
```typescript
const sql = `
  INSERT INTO games (season, date, home_team_id, away_team_id, home_score, away_score, completed, box_score)
  VALUES (?, ?, ?, ?, ?, ?, 1, ?)
`;
```

**Problem**: This INSERTS a new game record instead of UPDATING the existing scheduled game.

### What Happens

1. **League Generation**: Games are created with `completed = 0`
   ```sql
   INSERT INTO games (...) VALUES (..., 0, ...)  -- Game ID 123
   ```

2. **User Sims Game**: `storeGameResult()` is called
   ```sql
   INSERT INTO games (...) VALUES (..., 1, ...)  -- NEW Game ID 456
   ```

3. **Result**: 
   - Original game (ID 123) still has `completed = 0`
   - New game (ID 456) has `completed = 1`
   - `getCurrentGameDay()` queries by `game_day` and finds the original game (ID 123)
   - UI shows game as incomplete

### Why State Doesn't Persist

1. User sims game → New record inserted with `completed = 1`
2. Navigate to game result → Works (uses the new record)
3. Click "Back to Menu" → `refreshCurrentGameDay()` queries games by `game_day`
4. Query returns original game with `completed = 0` (not the new one)
5. UI shows incomplete state

## Solution: UPDATE Existing Game

### Approach 1: UPDATE by Matchup (Recommended)

Update the existing game record instead of inserting a new one.

**Implementation**:
```typescript
private async storeGameResult(
  homeTeamId: number,
  awayTeamId: number,
  gameResult: GameSimulationResult
): Promise<void> {
  try {
    const currentYear = new Date().getFullYear();
    
    // UPDATE existing game instead of INSERT
    const sql = `
      UPDATE games 
      SET home_score = ?, 
          away_score = ?, 
          completed = 1, 
          box_score = ?
      WHERE season = ? 
        AND home_team_id = ? 
        AND away_team_id = ?
        AND completed = 0
    `;
    
    const params = [
      gameResult.home_score,
      gameResult.away_score,
      JSON.stringify(gameResult.box_score),
      currentYear,
      homeTeamId,
      awayTeamId
    ];
    
    dbService.run(sql, params);
    
    console.log(`Updated game result: ${homeTeamId} vs ${awayTeamId}`);
  } catch (error) {
    console.error('Failed to store game result:', error);
    throw error;
  }
}
```

**Pros**:
- Updates the correct scheduled game
- No duplicate records
- `getCurrentGameDay()` returns the updated game
- State persists correctly

**Cons**:
- None

### Approach 2: INSERT with REPLACE

Use SQLite's `INSERT OR REPLACE`:
```sql
INSERT OR REPLACE INTO games (game_id, season, date, game_day, home_team_id, away_team_id, home_score, away_score, completed, box_score)
SELECT game_id, season, date, game_day, home_team_id, away_team_id, ?, ?, 1, ?
FROM games
WHERE season = ? AND home_team_id = ? AND away_team_id = ? AND completed = 0
```

**Pros**:
- Handles both insert and update
- Preserves game_id

**Cons**:
- More complex
- Need to fetch game_id first

### Approach 3: Check if Game Exists, Then UPDATE or INSERT

```typescript
// First, check if game exists
const checkSql = `SELECT game_id FROM games WHERE season = ? AND home_team_id = ? AND away_team_id = ? AND completed = 0`;
const existing = dbService.exec(checkSql, [currentYear, homeTeamId, awayTeamId]);

if (existing.length > 0) {
  // UPDATE existing game
  const updateSql = `UPDATE games SET home_score = ?, away_score = ?, completed = 1, box_score = ? WHERE game_id = ?`;
  dbService.run(updateSql, [gameResult.home_score, gameResult.away_score, JSON.stringify(gameResult.box_score), existing[0].game_id]);
} else {
  // INSERT new game (fallback for games not in schedule)
  const insertSql = `INSERT INTO games (season, date, home_team_id, away_team_id, home_score, away_score, completed, box_score) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`;
  dbService.run(insertSql, [currentYear, currentDate, homeTeamId, awayTeamId, gameResult.home_score, gameResult.away_score, JSON.stringify(gameResult.box_score)]);
}
```

**Pros**:
- Handles both scheduled and ad-hoc games
- Explicit logic

**Cons**:
- Two database calls
- More complex

## Recommended Implementation

**Use Approach 1: Simple UPDATE**

This is the cleanest solution:
1. Games are pre-created during league generation
2. When simulated, we UPDATE the existing game
3. No duplicate records
4. State persists correctly

### Additional Considerations

**What about game_day?**
The UPDATE should also preserve the `game_day` field:
```sql
UPDATE games 
SET home_score = ?, 
    away_score = ?, 
    completed = 1, 
    box_score = ?,
    date = ?
WHERE season = ? 
  AND home_team_id = ? 
  AND away_team_id = ?
  AND completed = 0
```

**What if no game is found?**
Add error handling:
```typescript
const result = dbService.run(sql, params);
if (result.changes === 0) {
  console.warn(`No scheduled game found for ${homeTeamId} vs ${awayTeamId}, inserting new game`);
  // Fallback to INSERT
}
```

## Files to Modify

1. **`lib/services/simulation-service.ts`** (line 759-787)
   - Change `storeGameResult()` from INSERT to UPDATE
   - Add error handling for games not in schedule

## Expected Result

After fix:
1. ✅ User sims game → Existing game record is updated
2. ✅ Navigate to game result → Works
3. ✅ Click "Back to Menu" → `refreshCurrentGameDay()` queries games
4. ✅ Query returns the SAME game with `completed = 1`
5. ✅ UI shows completed state with scores
6. ✅ State persists correctly across navigation

## Testing Scenarios

1. **Scheduled game**: Sim a game from today's schedule → Should update existing game
2. **Navigation**: Return to home hub → Should show completed state
3. **Multiple games**: Sim multiple games → All should update correctly
4. **Reload**: Refresh page → Completed games should still show as completed

## Migration Consideration

**Existing duplicate games**: If the database already has duplicate game records from previous simulations, we might want to clean them up:

```sql
-- Find duplicates
SELECT home_team_id, away_team_id, season, COUNT(*) as count
FROM games
WHERE completed = 1
GROUP BY home_team_id, away_team_id, season
HAVING count > 1;

-- Keep only the completed game, delete the incomplete one
DELETE FROM games
WHERE game_id IN (
  SELECT g1.game_id
  FROM games g1
  JOIN games g2 ON g1.home_team_id = g2.home_team_id 
    AND g1.away_team_id = g2.away_team_id 
    AND g1.season = g2.season
  WHERE g1.completed = 0 AND g2.completed = 1
);
```

But this is optional - the UPDATE approach will prevent future duplicates.


