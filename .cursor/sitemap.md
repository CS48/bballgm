# Basketball GM App - Current Site Map & Navigation Flow

## Route-Based Pages (Next.js Routes)

### `/` - Home Page (app/page.tsx)
**State Machine:**
```
league-initialization → gm-creation → team-selection → main-game
```

**Components Rendered:**
1. `LeagueInitializer` (if no league exists)
2. `GMCreation` (create GM profile)
3. `TeamSelection` (pick your team)
4. `MainMenu` (main game hub) ← **Primary game interface**

**Navigation:**
- No external links
- State-based progression only
- "Reset Game" button → goes back to `gm-creation` state

---

### `/team/[id]` - Team Page (app/team/[id]/page.tsx)
**Purpose:** View any team's roster, stats, and information

**Navigation Bar:**
```
Home | Roster | Schedule | Settings
```

**Current State:**
- ✅ "Home" → `<Link href="/">` - Works, navigates to `/`
- ❌ "Roster" → `<a href="#">` - Does nothing
- ❌ "Schedule" → `<a href="#">` - Does nothing  
- ❌ "Settings" → `<a href="#">` - Does nothing

**Problem:** This page is **ORPHANED** - nothing in the main game flow links to it!

**Data Fetched:**
- Team info from `teams` (league context)
- Team roster via `leagueService.getTeamRoster()`
- Team stats via `leagueService.getTeamSeasonStats()`
- Standings from league context

---

### `/watch-game` - Standalone Watch Game (app/watch-game/page.tsx)
**Purpose:** Watch a game via URL parameters

**URL Parameters:**
- `?homeTeamId=X&awayTeamId=Y`

**Navigation:**
- Back button → `window.location.href = '/'` (hard refresh to home)
- On game complete → logs to console, no navigation

**Problem:** This page is **ORPHANED** - nothing links to it with proper URL params!

**Current State:**
- Route exists but unused
- The app uses state-based watch mode instead (via MainMenu)

---

## State-Based Views (Within MainMenu Component)

### MainMenu Component (components/main-menu.tsx)
**State Type:** `MenuView = "main" | "roster" | "game-select" | "game-result" | "settings" | "watch-game"`

**View Routing:**
```typescript
currentView === "main"         → <HomeHub />
currentView === "roster"       → <TeamRoster />
currentView === "game-select"  → <OpponentSelection />
currentView === "game-result"  → <GameResultComponent />
currentView === "settings"     → <SettingsMenu />
currentView === "watch-game"   → <GameWatch />
```

---

### 1. HomeHub View (components/home-hub.tsx)
**Default view when entering main game**

**Navigation Bar:**
```
Home | Roster | Schedule | Settings
```

**Current Implementation:**
- ❌ "Home" → `<a href="#">` - **BUG:** Can trigger page navigation
- ❌ "Roster" → `onClick={onNavigateToRoster}` - **CRASHES APP** 
- ❌ "Schedule" → `<a href="#">` - Does nothing
- ❌ "Settings" → `onClick={onNavigateToSettings}` - **CRASHES APP**

**Callback Props:**
```typescript
interface HomeHubProps {
  userTeam: Team
  onNavigateToRoster: () => void        // → setCurrentView("roster")
  onNavigateToGameSelect: () => void    // Not used in nav
  onNavigateToSettings: () => void      // → setCurrentView("settings")
  onNavigateToWatchGame: (homeTeam, awayTeam) => void // Used by game cards
}
```

**Content:**
- User team info card
- Today's games (clickable to start watch mode)
- League standings
- Next game card

**Working Navigation:**
- ✅ Click "Today's Games" → Calls `onNavigateToWatchGame()` → Sets `currentView = "watch-game"`
- ✅ Click "Next Game" → Calls `onNavigateToGameSelect()` → Sets `currentView = "game-select"`

---

### 2. TeamRoster View (components/team-roster.tsx)
**Shows current team's roster**

**Navigation:**
- Back button → calls `onBackToMenu()` → Sets `currentView = "main"`

**Props:**
```typescript
interface TeamRosterProps {
  team: Team
  onBackToMenu: () => void
}
```

**Current State:**
- ❌ **CRASHES** when navigated to - likely missing data or props

---

### 3. OpponentSelection View (components/opponent-selection.tsx)
**Select opponent for sim or watch game**

**Navigation:**
- Back button → Returns to "main" view (implicit via MainMenu logic)

**Actions:**
- Select opponent + "Sim Game" → Simulates game → Shows "game-result" view
- Select opponent + "Watch Game" → Prepares teams → Shows "watch-game" view

**Current State:**
- ✅ Works correctly

---

### 4. GameResultComponent View (components/game-result.tsx)
**Shows results after simulating a game**

**Navigation:**
- "Continue" button → Returns to "main" view

**Current State:**
- ✅ Works correctly

---

### 5. SettingsMenu View (components/settings-menu.tsx)
**Game settings and reset options**

**Navigation:**
- Back button → calls `onBackToMenu()` → Sets `currentView = "main"`

**Props:**
```typescript
interface SettingsMenuProps {
  onResetGame: () => void
  onBackToMenu: () => void
}
```

**Current State:**
- ❌ **CRASHES** when navigated to - likely missing data or props

---

### 6. GameWatch View (components/game-watch.tsx)
**Watch a game in progress with live updates**

**Navigation Bar:**
```
← Back | Home | Roster | Schedule | Settings
```

**Current Implementation:**
- ✅ "← Back" → `onClick={handleNavigationAttempt}` → Shows modal or calls `onNavigateAway()`
- ❌ "Home" → `onClick={handleNavigationAttempt}` - Shows modal but doesn't navigate
- ❌ "Roster" → `onClick={handleNavigationAttempt}` - Shows modal but doesn't navigate
- ❌ "Schedule" → `onClick={handleNavigationAttempt}` - Shows modal but doesn't navigate
- ❌ "Settings" → `onClick={handleNavigationAttempt}` - Shows modal but doesn't navigate

**Props:**
```typescript
interface GameWatchProps {
  homeTeam: GameSimulationTeam
  awayTeam: GameSimulationTeam
  onGameComplete: (result: any) => void
  onNavigateAway: () => void
}
```

**Modal Logic:**
```typescript
handleNavigationAttempt() {
  if (!gameState.isComplete) {
    setShowNavigationModal(true)  // Shows "Game in progress" modal
  } else {
    onNavigateAway()  // → Sets currentView = "main"
  }
}
```

**Current State:**
- ✅ Back button works (with confirmation modal)
- ❌ Other nav items are non-functional placeholders

---

## Data Flow

### League Context (lib/context/league-context.tsx)
**Global state provider**

**Data:**
- `teams: Team[]` - All 30 teams
- `players: Player[]` - All players (raw database, **no overall_rating calculated**)
- `currentSeason: SeasonInfo`
- `standings: TeamStanding[]`

**Services:**
- `simulateGame(homeTeamId, awayTeamId)` - Sim a game
- `getTeamRoster(teamId)` - Get roster **with calculated overall_rating**

**Used By:**
- MainMenu (useLeague)
- HomeHub (useLeague, useTeams, useStandings)
- TeamPage (useLeague, useStandings)

---

## Navigation Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  app/page.tsx (Route: /)                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  State Machine                                       │    │
│  │  league-init → gm-creation → team-selection → ◉     │    │
│  └────────────────────────────────────────────┬────────┘    │
│                                                 │             │
│                                                 v             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  MainMenu (main-game state)                         │    │
│  │                                                      │    │
│  │  currentView state machine:                         │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │                                               │  │    │
│  │  │  ◉ "main" (HomeHub)                           │  │    │
│  │  │      │                                        │  │    │
│  │  │      ├──► "roster" (TeamRoster) ❌ CRASHES   │  │    │
│  │  │      │                                        │  │    │
│  │  │      ├──► "settings" (SettingsMenu) ❌ CRASH │  │    │
│  │  │      │                                        │  │    │
│  │  │      ├──► "game-select" (OpponentSelection)  │  │    │
│  │  │      │        │                               │  │    │
│  │  │      │        ├──► "game-result" ✅          │  │    │
│  │  │      │        │                               │  │    │
│  │  │      │        └──► "watch-game" ✅           │  │    │
│  │  │      │                  │                     │  │    │
│  │  │      └──────────────────┘                     │  │    │
│  │  │         (all can return to "main")            │  │    │
│  │  │                                               │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  app/team/[id]/page.tsx (Route: /team/[id])                 │
│  🏝️ ORPHANED - Nothing links here!                          │
│                                                               │
│  Navigation:                                                  │
│    Home → Link to "/" ✅                                     │
│    Other nav items → href="#" ❌                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  app/watch-game/page.tsx (Route: /watch-game?params)        │
│  🏝️ ORPHANED - Nothing links here!                          │
│                                                               │
│  Navigation:                                                  │
│    Back → window.location.href = "/" (hard refresh) ⚠️      │
└─────────────────────────────────────────────────────────────┘
```

---

## Problems Summary

### Critical Issues 🔴

1. **Roster button crashes** - From HomeHub, clicking "Roster" crashes the app
2. **Settings button crashes** - From HomeHub, clicking "Settings" crashes the app
3. **Home button can navigate away** - Using `<a href="#">` can trigger unwanted navigation

### Navigation Disconnects 🟡

4. **Team page is orphaned** - `/team/[id]` exists but nothing links to it
5. **Watch-game page is orphaned** - `/watch-game` exists but unused (app uses state-based watch mode)
6. **No "My Team" link** - Users can't easily navigate to their own team page

### UX Issues 🟢

7. **Watch mode nav is non-functional** - Nav items show but do nothing
8. **Mixing navigation paradigms** - Some pages use routes, some use state

---

## Recommended Architecture

### Option 1: Full State-Based (Current + Fixes)
- Keep everything in MainMenu state machine
- Fix crashes in roster/settings views
- Add "my-team" view that shows TeamPage content
- Remove orphaned route pages

### Option 2: Full Route-Based (Major Refactor)
- Convert all views to Next.js pages
- Use URL routing throughout
- Proper browser history support
- More complex state management needed

**Current plan uses Option 1** - Less disruptive, fixes immediate issues.

