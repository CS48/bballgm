'use client';

import { MainMenu } from '@/components/main-menu';
import { useLeague } from '@/lib/context/league-context';
import { storage } from '@/lib/utils/storage';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { Team } from '@/lib/types/database';

export default function HomePage() {
  const router = useRouter();
  const { teams, isLoading, isInitialized } = useLeague();
  const [userTeam, setUserTeam] = useState<Team | null>(null);

  useEffect(() => {
    // Wait for league to initialize
    if (isLoading || !isInitialized) return;

    // Check for session
    const session = storage.loadSession();

    if (!session || teams.length === 0) {
      // No session or no league → redirect to landing
      router.push('/');
      return;
    }

    const team = teams.find((t) => t.team_id === session.teamId);

    if (!team) {
      // Team not found → clear session and redirect
      storage.clearSession();
      router.push('/');
      return;
    }

    setUserTeam(team);
  }, [isLoading, isInitialized, teams, router]);

  const handleResetGame = () => {
    storage.clearSession();
    router.push('/onboarding');
  };

  // Show loading while team loads
  if (!userTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your team...</p>
        </div>
      </div>
    );
  }

  return <MainMenu userTeam={userTeam} onResetGame={handleResetGame} />;
}
