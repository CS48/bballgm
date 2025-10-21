"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLeague } from "@/lib/context/league-context"
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
import { Circle } from "lucide-react"

export default function LandingPage() {
  const router = useRouter()
  const { teams, isLoading, isInitialized, deleteLeague } = useLeague()
  const [checkingLeague, setCheckingLeague] = useState(true)

  useEffect(() => {
    // Wait for league context to initialize
    if (isLoading || !isInitialized) return

    // Check if user has both league and session
    const session = storage.loadSession()
    
    if (teams.length > 0 && session) {
      // Has league + session → auto-redirect to home (user was playing)
      router.push('/home')
      return
    }

    setCheckingLeague(false)
  }, [isLoading, isInitialized, teams, router])

  const handleStartNewGame = () => {
    router.push('/onboarding')
  }

  const handleResumeLeague = () => {
    // Check if user has a session
    const session = storage.loadSession()
    
    if (session && teams.length > 0) {
      // Has session → go to home
      router.push('/home')
    } else {
      // No session but has league → go to onboarding (skip league init)
      router.push('/onboarding')
    }
  }

  const handleDeleteLeague = async () => {
    try {
      await deleteLeague()
      storage.clearAll()
      // After deletion, show new game option
      setCheckingLeague(false)
    } catch (error) {
      console.error('Failed to delete league:', error)
    }
  }

  // Loading state
  if (checkingLeague) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // League exists → Show resume screen
  if (teams.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Circle className="h-12 w-12 text-orange-500" />
            </div>
            <CardTitle className="text-2xl">Welcome Back!</CardTitle>
            <CardDescription>
              You have an existing league. Continue playing or start fresh?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleResumeLeague}
              className="w-full"
              size="lg"
            >
              Resume League
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
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

  // No league → Show welcome/start screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Circle className="h-16 w-16 text-orange-500" />
          </div>
          <CardTitle className="text-4xl font-bold mb-2">Basketball GM</CardTitle>
          <CardDescription className="text-lg">
            Create your own basketball league and manage your team to championship glory!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Build your dynasty, watch games in real-time, and compete for championships 
              in this realistic basketball management simulation.
            </p>
            
            <Button 
              onClick={handleStartNewGame}
              className="w-full"
              size="lg"
            >
              <Circle className="h-5 w-5 mr-2" />
              Start New Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}