# Add localStorage Persistence + Onboarding Route + League Deletion

## Goals

1. **localStorage persistence** - Save user session so refreshing doesn't lose progress
2. **Separate onboarding** - Move GM/team selection to `/onboarding` route
3. **League deletion** - Users can delete league from settings OR resume screen
4. **Smart home page** - Shows game, resume prompt, or league init based on state

## Current Problems

- No data persistence → refresh loses everything
- Onboarding mixed with game flow
- No way to delete league and start fresh
- Navigation bugs can reset to GM creation

## New Architecture

### Route Structure

```
/ (home page) - Smart routing based on state
├─ No league → Show LeagueInitializer
├─ League exists, no session → Show Resume screen
│   ├─ "Resume" → /onboarding
│   └─ "Delete League" → Delete → Show LeagueInitializer
└─ League + session → Show MainMenu

/onboarding (new route)
├─ GM Creation
├─ Team Selection
└─ Complete → Save session → Redirect to /
```

### localStorage Schema

```typescript
// User session (GM + selected team)
interface UserSession {
  gm: { name: string, [key: string]: any }
  teamId: number
  teamName: string
  createdAt: string
}
Key: 'bballgm-session'

// League state (tracks if league exists)
interface LeagueState {
  exists: boolean
  createdAt: string
}
Key: 'bballgm-league-state'
```

## Implementation Steps

### Step 1: Create Storage Utility with League Tracking

**File:** `lib/utils/storage.ts` (NEW)

Complete storage utility with session AND league state:

```typescript
"use client"

interface UserSession {
  gm: {
    name: string
    [key: string]: any
  }
  teamId: number
  teamName: string
  createdAt: string
}

interface LeagueState {
  exists: boolean
  createdAt: string
}

const SESSION_KEY = 'bballgm-session'
const LEAGUE_KEY = 'bballgm-league-state'

export const storage = {
  // Session methods
  saveSession(session: Omit<UserSession, 'createdAt'>): void {
    if (typeof window === 'undefined') return
    try {
      const fullSession: UserSession = {
        ...session,
        createdAt: new Date().toISOString()
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(fullSession))
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  },

  loadSession(): UserSession | null {
    if (typeof window === 'undefined') return null
    try {
      const data = localStorage.getItem(SESSION_KEY)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Failed to load session:', error)
      return null
    }
  },

  clearSession(): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch (error) {
      console.error('Failed to clear session:', error)
    }
  },

  hasSession(): boolean {
    return this.loadSession() !== null
  },

  // League state methods
  markLeagueExists(): void {
    if (typeof window === 'undefined') return
    try {
      const state: LeagueState = {
        exists: true,
        createdAt: new Date().toISOString()
      }
      localStorage.setItem(LEAGUE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to mark league:', error)
    }
  },

  hasLeague(): boolean {
    if (typeof window === 'undefined') return false
    try {
      const data = localStorage.getItem(LEAGUE_KEY)
      if (!data) return false
      const state: LeagueState = JSON.parse(data)
      return state.exists
    } catch (error) {
      return false
    }
  },

  clearLeague(): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(LEAGUE_KEY)
    } catch (error) {
      console.error('Failed to clear league:', error)
    }
  },

  // Clear everything
  clearAll(): void {
    this.clearSession()
    this.clearLeague()
  }
}
```

### Step 2: Create Onboarding Route

**File:** `app/onboarding/page.tsx` (NEW)

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GMCreation } from "@/components/gm-creation"
import { TeamSelection } from "@/components/team-selection"
import { storage } from "@/lib/utils/storage"
import type { Team } from "@/lib/types/database"

type OnboardingStep = "gm-creation" | "team-selection"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>("gm-creation")
  const [currentGM, setCurrentGM] = useState<any>(null)

  const handleGMCreated = (gm: any) => {
    setCurrentGM(gm)
    setStep("team-selection")
  }

  const handleTeamSelected = (team: Team) => {
    // Save to localStorage
    storage.saveSession({
      gm: currentGM,
      teamId: team.team_id,
      teamName: team.name
    })

    // Redirect to home
    router.push('/')
  }

  if (step === "gm-creation") {
    return <GMCreation onGMCreated={handleGMCreated} />
  }

  return <TeamSelection onTeamSelected={handleTeamSelected} />
}
```

### Step 3: Update Home Page with Resume Screen

**File:** `app/page.tsx`

Complete rewrite with smart state management:

```typescript
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainMenu } from "@/components/main-menu"
import { LeagueInitializer } from "@/components/league-initializer"
import { useLeague, useLeagueReady } from "@/lib/context/league-context"
import { storage } from "@/lib/utils/storage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { Team } from "@/lib/types/database"

type PageState = "checking" | "resume-prompt" | "initializing-league" | "playing"

export default function HomePage() {
  const router = useRouter()
  const { teams, isLoading, deleteLeague } = useLeague()
  const isLeagueReady = useLeagueReady()
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [pageState, setPageState] = useState<PageState>("checking")

  useEffect(() => {
    if (pageState !== "checking") return

    const hasLeague = storage.hasLeague()
    const session = storage.loadSession()

    // No league → show initializer
    if (!hasLeague) {
      setPageState("initializing-league")
      return
    }

    // League exists but no session → show resume prompt
    if (!session) {
      setPageState("resume-prompt")
      return
    }

    // Both exist → load game
    if (isLeagueReady && !isLoading) {
      const team = teams.find(t => t.team_id === session.teamId)
      
      if (!team) {
        storage.clearSession()
        setPageState("resume-prompt")
        return
      }

      setUserTeam(team)
      setPageState("playing")
    }
  }, [pageState, isLeagueReady, isLoading, teams])

  const handleResume = () => {
    router.push('/onboarding')
  }

  const handleDeleteLeague = async () => {
    try {
      await deleteLeague()
      storage.clearAll()
      setPageState("initializing-league")
    } catch (error) {
      console.error('Failed to delete league:', error)
    }
  }

  const handleLeagueInitialized = () => {
    storage.markLeagueExists()
    router.push('/onboarding')
  }

  const handleResetGame = () => {
    storage.clearSession()
    router.push('/onboarding')
  }

  // Loading state
  if (pageState === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Resume or Delete prompt
  if (pageState === "resume-prompt") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Welcome Back!</CardTitle>
            <CardDescription>
              You have an existing league. Continue or start fresh?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleResume} className="w-full" size="lg">
              Resume Current League
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" size="lg">
                  Delete League & Start Fresh
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete League?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your league, including all teams, players, and game history. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteLeague}>
                    Delete League
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    )
  }

  // League initializer
  if (pageState === "initializing-league") {
    return <LeagueInitializer onComplete={handleLeagueInitialized} />
  }

  // Playing the game
  if (pageState === "playing" && userTeam) {
    return <MainMenu userTeam={userTeam} onResetGame={handleResetGame} />
  }

  return null
}
```

### Step 4: Update LeagueInitializer

**File:** `components/league-initializer.tsx`

Add onComplete callback prop (minimal change needed - just check if it already exists).

### Step 5: Update Settings Menu with League Deletion

**File:** `components/settings-menu.tsx`

Add league deletion in Danger Zone:

```typescript
import { storage } from "@/lib/utils/storage"
import { useRouter } from "next/navigation"
import { useLeague } from "@/lib/context/league-context"

export function SettingsMenu({ onResetGame, onBackToMenu }: SettingsMenuProps) {
  const router = useRouter()
  const { deleteLeague } = useLeague()
  
  // Reset GM/Team (keep league)
  const handleResetGM = () => {
    storage.clearSession()
    onResetGame()
  }
  
  // Delete entire league
  const handleDeleteLeague = async () => {
    try {
      await deleteLeague()
      storage.clearAll()
      router.push('/')
    } catch (error) {
      console.error('Failed to delete league:', error)
    }
  }

  // Add to settings UI:
  // Two options in Danger Zone:
  // 1. "Reset GM & Team" - keeps league
  // 2. "Delete League" - nuclear option
}
```

## Files to Create

1. ✅ `lib/utils/storage.ts`
2. ✅ `app/onboarding/page.tsx`

## Files to Modify

1. ✅ `app/page.tsx` - Complete rewrite with state machine
2. ✅ `components/settings-menu.tsx` - Add league deletion
3. ✅ `components/league-initializer.tsx` - Add onComplete callback

## Testing Checklist

1. ✅ Fresh user → League initializer
2. ✅ Complete init → /onboarding
3. ✅ Complete onboarding → Home with team
4. ✅ Refresh → Still on home with team
5. ✅ Close/reopen browser → Resume screen
6. ✅ Click "Resume" → /onboarding
7. ✅ Click "Delete" on resume → Initializer
8. ✅ Settings "Reset GM" → /onboarding (keeps league)
9. ✅ Settings "Delete League" → Home initializer
10. ✅ Invalid session → Resume screen
