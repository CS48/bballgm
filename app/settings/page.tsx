'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsMenu } from '@/components/settings-menu';
import { useLeague } from '@/lib/context/league-context';
import { storage } from '@/lib/utils/storage';
import type { Team } from '@/lib/types/database';

export default function SettingsPage() {
  const router = useRouter();
  const { teams, isLoading, isInitialized } = useLeague();
  const [userTeam, setUserTeam] = useState<Team | null>(null);

  useEffect(() => {
    // Wait for league to initialize
    if (isLoading || !isInitialized) return;

    // Get user team from session
    const session = storage.loadSession();

    if (!session || teams.length === 0) {
      // No session or no teams → redirect to home
      router.push('/');
      return;
    }

    const team = teams.find((t) => t.team_id === session.teamId);

    if (!team) {
      // Team not found → redirect to home
      router.push('/');
      return;
    }

    setUserTeam(team);
  }, [isLoading, isInitialized, teams, router]);

  const handleResetGame = () => {
    // Clear session and redirect to onboarding
    storage.clearSession();
    router.push('/onboarding');
  };

  // Show loading while team loads
  if (!userTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SettingsMenu userTeam={userTeam} onResetGame={handleResetGame} />
    </div>
  );
}
