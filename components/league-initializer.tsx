/**
 * League Initializer Component
 * 
 * This component handles the initialization of a new basketball league,
 * providing a user interface to create and configure the league settings.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useLeague } from '../lib/context/league-context';
import { LeagueInitOptions } from '../lib/types/league';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Loader2, Users, Calendar, Trophy, Circle, AlertTriangle } from 'lucide-react';

interface LeagueInitializerProps {
  onComplete?: () => void
}

/**
 * League Initializer Component
 */
export function LeagueInitializer({ onComplete }: LeagueInitializerProps) {
  const { initializeLeague, isLoading, error, isInitialized, teams, players } = useLeague();
  const [leagueName, setLeagueName] = useState('My Basketball League');
  const [startSeason, setStartSeason] = useState(new Date().getFullYear());
  // Generation options are now hardcoded for optimal experience
  const generateRosters = true;
  const generateSchedule = true;
  const useV2Scheduler = true;
  const [isCreating, setIsCreating] = useState(false);
  const [existingLeague, setExistingLeague] = useState<{
    teams: number;
    players: number;
    games: number;
  } | null>(null);

  /**
   * Check for existing league data
   */
  useEffect(() => {
    const checkExistingLeague = () => {
      if (teams.length > 0 && players.length > 0) {
        setExistingLeague({
          teams: teams.length,
          players: players.length,
          games: 0 // We'll need to get this from the database
        });
      }
    };
    
    checkExistingLeague();
  }, [teams, players]);

  /**
   * Handle league creation
   */
  const handleCreateLeague = async () => {
    // Show confirmation if existing league detected
    if (existingLeague) {
      const confirmed = confirm(
        `WARNING: This will permanently delete your existing league with ${existingLeague.teams} teams, ${existingLeague.players} players, and all game data. Are you sure you want to continue?`
      );
      if (!confirmed) return;
    }
    try {
      setIsCreating(true);
      
      const options: LeagueInitOptions = {
        league_name: leagueName,
        start_season: startSeason,
        config: {
          total_teams: 30,
          teams_per_conference: 15,
          divisions_per_conference: 0,
          teams_per_division: 0,
          players_per_team: 15,
          games_per_season: 82,
          use_divisions: false,
          playoffs_enabled: false,
          playoff_teams_per_conference: 8
        },
        generate_rosters: generateRosters,
        generate_schedule: generateSchedule,
        useV2Scheduler: useV2Scheduler,
        random_seed: Math.floor(Math.random() * 1000000)
      };

      await initializeLeague(options);
      console.log('League created successfully!');
      
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Failed to create league:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Show loading while context is initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <h2 className="text-xl font-semibold mb-2">Initializing...</h2>
            <p className="text-muted-foreground text-center">
              Setting up the basketball simulation engine...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || isCreating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {isCreating ? 'Creating League...' : 'Initializing...'}
            </h2>
            <p className="text-muted-foreground text-center">
              {isCreating 
                ? 'Generating teams, players, and schedules. This may take a moment.'
                : 'Setting up the basketball simulation engine...'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert className="mb-4">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            <Button onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Circle className="h-12 w-12 text-orange-500 mr-3" />
            <CardTitle className="text-3xl font-bold">Basketball GM</CardTitle>
          </div>
          <CardDescription className="text-lg">
            Create your own basketball league and manage your team to championship glory!
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Existing League Warning */}
          {existingLeague && (
            <Alert className="mb-6 border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">Existing League Detected</AlertTitle>
              <AlertDescription className="text-orange-700">
                You have an existing league with {existingLeague.teams} teams, {existingLeague.players} players, and {existingLeague.games} games played.
                Creating a new league will permanently delete all existing data.
              </AlertDescription>
            </Alert>
          )}
          {/* League Configuration */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leagueName">League Name</Label>
                <Input
                  id="leagueName"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  placeholder="My Basketball League"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="startSeason">Starting Season</Label>
                <Input
                  id="startSeason"
                  type="number"
                  value={startSeason}
                  onChange={(e) => setStartSeason(parseInt(e.target.value))}
                  min="2020"
                  max="2030"
                />
              </div>
            </div>

            {/* League Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">League Features</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Teams & Players</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    30 NBA teams with 15 players each (450 total players)
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-green-500" />
                    <span className="font-medium">82-Game Season</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Full NBA-style schedule with conference and inter-conference games
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">Realistic Simulation</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Advanced game engine with player attributes and team chemistry
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Circle className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">Complete Stats</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Track player and team statistics throughout the season
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Create League Button */}
          <Button 
            onClick={handleCreateLeague}
            className="w-full h-12 text-lg"
            disabled={!leagueName.trim()}
          >
            <Circle className="h-5 w-5 mr-2" />
            Create New League
          </Button>

          {/* Additional Info */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              This will create a complete basketball league with 30 teams, 450 players, 
              and a full 82-game schedule. Realistic player rosters and balanced scheduling 
              ensure competitive gameplay. You can start playing immediately!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
