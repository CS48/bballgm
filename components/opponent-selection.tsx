'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Team } from '@/lib/types/database';
import { useTeams } from '@/lib/context/league-context';

interface OpponentSelectionProps {
  userTeam: Team;
  onOpponentSelected: (opponent: Team, gameMode: 'sim' | 'watch') => void;
  onBackToMenu: () => void;
  isSimulating?: boolean;
}

export function OpponentSelection({
  userTeam,
  onOpponentSelected,
  onBackToMenu,
  isSimulating = false,
}: OpponentSelectionProps) {
  const teams = useTeams();
  const [selectedOpponent, setSelectedOpponent] = useState<Team | null>(null);
  const [selectedGameMode, setSelectedGameMode] = useState<'sim' | 'watch'>('watch');

  const opponents = teams.filter((team) => team.team_id !== userTeam.team_id);

  const getTeamOverallRating = (team: Team): number => {
    // For now, return a default rating since we don't have player data here
    // This should be calculated from the league context like in other components
    return 75; // Default rating
  };

  const getMatchupDifficulty = (opponent: Team): string => {
    const userRating = getTeamOverallRating(userTeam);
    const opponentRating = getTeamOverallRating(opponent);
    const difference = opponentRating - userRating;

    if (difference >= 10) return 'Very Hard';
    if (difference >= 5) return 'Hard';
    if (difference >= -5) return 'Even';
    if (difference >= -10) return 'Easy';
    return 'Very Easy';
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'Very Hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Hard':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Even':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Very Easy':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleConfirmSelection = () => {
    if (selectedOpponent) {
      onOpponentSelected(selectedOpponent, selectedGameMode);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Select Opponent</h2>
          <p className="text-muted-foreground">Choose a team to play against</p>
        </div>
        <Button variant="secondary" onClick={onBackToMenu}>
          Back to Menu
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {opponents.map((opponent) => {
          const overallRating = getTeamOverallRating(opponent);
          const difficulty = getMatchupDifficulty(opponent);
          const isSelected = selectedOpponent?.team_id === opponent.team_id;

          return (
            <Card
              key={opponent.team_id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'ring-2 ring-primary bg-accent' : ''
              }`}
              onClick={() => setSelectedOpponent(opponent)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-balance">{opponent.name}</CardTitle>
                <CardDescription className="flex items-center justify-between">
                  <span>{opponent.city}</span>
                  <Badge variant="secondary">{overallRating} OVR</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Record:</span>
                    <span className="text-sm font-medium">
                      {opponent.wins}-{opponent.losses}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Difficulty:</span>
                    <Badge className={getDifficultyColor(difficulty)}>{difficulty}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground pt-1">Conference: {opponent.conference}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedOpponent && (
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Matchup Preview</CardTitle>
              <CardDescription>
                <strong>{userTeam.name}</strong> vs <strong>{selectedOpponent.name}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{getTeamOverallRating(userTeam)}</div>
                  <div className="text-sm text-muted-foreground">Your Team</div>
                </div>
                <div className="text-center">
                  <div className="text-lg text-muted-foreground">VS</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">{getTeamOverallRating(selectedOpponent)}</div>
                  <div className="text-sm text-muted-foreground">Opponent</div>
                </div>
              </div>
              <div className="space-y-4">
                {/* Game Mode Selection */}
                <div className="flex space-x-2">
                  <Button
                    variant={selectedGameMode === 'watch' ? 'default' : 'outline'}
                    onClick={() => setSelectedGameMode('watch')}
                    className="flex-1"
                  >
                    Watch Game
                  </Button>
                  <Button
                    variant={selectedGameMode === 'sim' ? 'default' : 'outline'}
                    onClick={() => setSelectedGameMode('sim')}
                    className="flex-1"
                  >
                    Sim Game
                  </Button>
                </div>

                {/* Start Button */}
                <Button onClick={handleConfirmSelection} className="w-full text-lg py-6" disabled={isSimulating}>
                  {isSimulating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {selectedGameMode === 'watch' ? 'Starting Watch...' : 'Simulating Game...'}
                    </>
                  ) : (
                    `Start ${selectedGameMode === 'watch' ? 'Watch' : 'Sim'}`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
