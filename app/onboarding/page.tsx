"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { GMCreation } from "@/components/gm-creation"
import { TeamSelection } from "@/components/team-selection"
import { LeagueInitializer } from "@/components/league-initializer"
import { useLeague } from "@/lib/context/league-context"
import { storage } from "@/lib/utils/storage"
import type { Team } from "@/lib/types/database"

type OnboardingStep = "league-init" | "gm-creation" | "team-selection"

export default function OnboardingPage() {
  const router = useRouter()
  const { teams } = useLeague()
  const [step, setStep] = useState<OnboardingStep>("league-init")
  const [currentGM, setCurrentGM] = useState<any>(null)

  // Check if league already exists on mount
  useEffect(() => {
    if (teams.length > 0) {
      // League exists → skip to GM creation
      console.log('League already exists, skipping to GM creation')
      setStep("gm-creation")
    }
  }, [teams])

  const handleLeagueCreated = () => {
    setStep("gm-creation")
  }

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
    router.push('/home')
  }

  if (step === "league-init") {
    return <LeagueInitializer onComplete={handleLeagueCreated} />
  }

  if (step === "gm-creation") {
    return <GMCreation onGMCreated={handleGMCreated} />
  }

  return <TeamSelection onTeamSelected={handleTeamSelected} />
}
