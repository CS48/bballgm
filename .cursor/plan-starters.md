# Fix Starters Not Being Used in Watch Mode

## Problem Confirmed

The image shows **Jimmy Hall (PG | 79 ovr)** is playing, but based on the player list, he's not a starter. The OVR values are now correct (79, 95, 101, etc.), but the starter selection is still failing.

## Root Cause Analysis

The possession engine has this logic (lines 54-63 in possession-engine.ts):

```typescript
let activeOffensivePlayers = offensiveTeam.players.filter(p => p.is_starter === 1)
let activeDefensivePlayers = defensiveTeam.players.filter(p => p.is_starter === 1)

// Fallback: if we don't have exactly 5 starters, use first 5 players
if (activeOffensivePlayers.length !== 5) {
  activeOffensivePlayers = offensiveTeam.players.slice(0, 5)  // ← This is executing!
}
```

The **fallback to `slice(0, 5)` is being triggered**, which means:
- Either the roster doesn't have exactly 5 players with `is_starter === 1`
- OR the `is_starter` field is not the number `1` (might be truthy but not strictly `===` 1)

## Hypothesis

The `is_starter` field might be a boolean (`true/false`) or string (`"1"/"0"`) instead of number (`1/0`).

## Solution

### Step 1: Add Debug Logging

Add logging to see:
1. How many starters are found
2. What the actual `is_starter` values are
3. Which players are selected

**File:** `/Users/calvin/Documents/Bball Sim/bballgm/lib/simulation/possession-engine.ts`

Add after line 52:

```typescript
// Create initial possession state - use designated starters (is_starter === 1)
console.log('🔍 Possession Engine - Offensive team players:', offensiveTeam.players.map(p => ({
  name: p.name,
  is_starter: p.is_starter,
  is_starter_type: typeof p.is_starter
})))

let activeOffensivePlayers = offensiveTeam.players.filter(p => p.is_starter === 1)
console.log('🔍 Possession Engine - Found starters:', activeOffensivePlayers.length, '/', offensiveTeam.players.length)

let activeDefensivePlayers = defensiveTeam.players.filter(p => p.is_starter === 1)

// Fallback: if we don't have exactly 5 starters, use first 5 players
if (activeOffensivePlayers.length !== 5) {
  console.warn('⚠️ Fallback triggered! Using slice(0,5) instead of starters. Found', activeOffensivePlayers.length, 'starters')
  activeOffensivePlayers = offensiveTeam.players.slice(0, 5)
}
if (activeDefensivePlayers.length !== 5) {
  console.warn('⚠️ Fallback triggered! Using slice(0,5) instead of starters. Found', activeDefensivePlayers.length, 'starters')
  activeDefensivePlayers = defensiveTeam.players.slice(0, 5)
}

console.log('🔍 Possession Engine - Active offensive players:', activeOffensivePlayers.map(p => ({
  name: p.name,
  is_starter: p.is_starter
})))
```

### Step 2: Fix the Filter Logic

Based on what we learn from the debug output, we may need to change the filter to handle different types:

**Option A:** If `is_starter` is truthy (boolean or number):
```typescript
let activeOffensivePlayers = offensiveTeam.players.filter(p => p.is_starter)
```

**Option B:** If `is_starter` might be string or number:
```typescript
let activeOffensivePlayers = offensiveTeam.players.filter(p => p.is_starter == 1) // == instead of ===
```

**Option C:** If we need to be more defensive:
```typescript
let activeOffensivePlayers = offensiveTeam.players.filter(p => 
  p.is_starter === 1 || p.is_starter === true || p.is_starter === "1"
)
```

## Implementation Plan

1. Add debug logging to possession-engine.ts
2. Run watch mode and check console output
3. Based on output, apply the appropriate fix
4. Test that starters are selected
5. Remove debug logging

## Expected Debug Output

We should see something like:
```
🔍 Possession Engine - Offensive team players: [
  {name: "Kemba Cruz", is_starter: 1, is_starter_type: "number"},
  {name: "Daniel Robinson", is_starter: 1, is_starter_type: "number"},
  ...
]
🔍 Possession Engine - Found starters: 5 / 15
🔍 Possession Engine - Active offensive players: [starters list]
```

OR if the issue exists:
```
🔍 Possession Engine - Offensive team players: [
  {name: "Kemba Cruz", is_starter: "1", is_starter_type: "string"},  // ← Wrong type!
]
⚠️ Fallback triggered! Using slice(0,5) instead of starters. Found 0 starters
```

## Files to Modify

1. `/Users/calvin/Documents/Bball Sim/bballgm/lib/simulation/possession-engine.ts` - Add debug logging and fix filter

