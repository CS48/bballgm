"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { useLeague } from "@/lib/context/league-context"
import { storage } from "@/lib/utils/storage"
import type { Team } from "@/lib/types/database"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { teams, isLoading, isInitialized } = useLeague()
  const [userTeam, setUserTeam] = useState<Team | null>(null)

  // Skip sidebar for onboarding and landing pages
  const skipSidebar = pathname === '/' || pathname === '/onboarding'

  useEffect(() => {
    if (skipSidebar) return

    // Wait for league to initialize
    if (isLoading || !isInitialized) return

    // Check for session
    const session = storage.loadSession()
    
    if (!session || teams.length === 0) {
      // No session or no league → redirect to landing
      router.push('/')
      return
    }

    const team = teams.find(t => t.team_id === session.teamId)
    
    if (!team) {
      // Team not found → clear session and redirect
      storage.clearSession()
      router.push('/')
      return
    }

    setUserTeam(team)
  }, [isLoading, isInitialized, teams, router, skipSidebar])

  // Show loading while team loads (only for pages that need sidebar)
  if (!skipSidebar && !userTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your team...</p>
        </div>
      </div>
    )
  }

  if (skipSidebar) {
    return <>{children}</>
  }

  return (
    <>
      <AppSidebar userTeam={userTeam!} />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>
    </>
  )
}
