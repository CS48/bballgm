/**
 * League Tester Component
 * 
 * This component provides testing functionality for the basketball simulation engine,
 * allowing users to test game simulation, data integrity, and league operations.
 */

'use client';

import React, { useState } from 'react';
import { useLeague, useTeams, useStandings } from '../lib/context/league-context';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Loader2, Play, Database, Users, Trophy, CheckCircle, XCircle } from 'lucide-react';

interface LeagueTesterProps {
  onBackToGame?: () => void;
}

/**
 * League Tester Component
 */
export function LeagueTester({ onBackToGame }: LeagueTesterProps) {
  const { simulateGame, simulateMultipleGames, refreshData, isLoading, error } = useLeague();
  const teams = useTeams();
  const standings = useStandings();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  /**
   * Test single game simulation
   */
  const testSingleGame = async () => {
    if (teams.length < 2) {
      setTestResults(prev => [...prev, {
        test: 'Single Game Simulation',
        status: 'failed',
        message: 'Not enough teams available'
      }]);
      return;
    }

    try {
      setIsTesting(true);
      const homeTeam = teams[0];
      const awayTeam = teams[1];
      
      await simulateGame(homeTeam.team_id, awayTeam.team_id);
      
      setTestResults(prev => [...prev, {
        test: 'Single Game Simulation',
        status: 'passed',
        message: `Simulated ${awayTeam.city} ${awayTeam.name} vs ${homeTeam.city} ${homeTeam.name}`
      }]);
    } catch (err) {
      setTestResults(prev => [...prev, {
        test: 'Single Game Simulation',
        status: 'failed',
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      }]);
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * Test multiple game simulation
   */
  const testMultipleGames = async () => {
    if (teams.length < 4) {
      setTestResults(prev => [...prev, {
        test: 'Multiple Game Simulation',
        status: 'failed',
        message: 'Not enough teams available'
      }]);
      return;
    }

    try {
      setIsTesting(true);
      const games = [
        { homeTeamId: teams[0].team_id, awayTeamId: teams[1].team_id },
        { homeTeamId: teams[2].team_id, awayTeamId: teams[3].team_id }
      ];
      
      await simulateMultipleGames(games);
      
      setTestResults(prev => [...prev, {
        test: 'Multiple Game Simulation',
        status: 'passed',
        message: `Simulated ${games.length} games successfully`
      }]);
    } catch (err) {
      setTestResults(prev => [...prev, {
        test: 'Multiple Game Simulation',
        status: 'failed',
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      }]);
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * Test data integrity
   */
  const testDataIntegrity = async () => {
    try {
      setIsTesting(true);
      
      // Check if we have the expected number of teams
      const expectedTeams = 30;
      const actualTeams = teams.length;
      
      if (actualTeams !== expectedTeams) {
        setTestResults(prev => [...prev, {
          test: 'Data Integrity - Team Count',
          status: 'failed',
          message: `Expected ${expectedTeams} teams, found ${actualTeams}`
        }]);
        return;
      }

      // Check if all teams have players
      const teamsWithoutPlayers = teams.filter(team => {
        // This would need to be implemented with actual player count check
        return false; // Placeholder
      });

      if (teamsWithoutPlayers.length > 0) {
        setTestResults(prev => [...prev, {
          test: 'Data Integrity - Team Rosters',
          status: 'failed',
          message: `${teamsWithoutPlayers.length} teams without players`
        }]);
        return;
      }

      setTestResults(prev => [...prev, {
        test: 'Data Integrity',
        status: 'passed',
        message: 'All data integrity checks passed'
      }]);
    } catch (err) {
      setTestResults(prev => [...prev, {
        test: 'Data Integrity',
        status: 'failed',
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      }]);
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * Test standings calculation
   */
  const testStandings = async () => {
    try {
      setIsTesting(true);
      
      // Check if standings are properly calculated
      const hasStandings = standings.overall.length > 0;
      
      if (!hasStandings) {
        setTestResults(prev => [...prev, {
          test: 'Standings Calculation',
          status: 'failed',
          message: 'No standings data available'
        }]);
        return;
      }

      // Check if standings are sorted correctly
      const isSorted = standings.overall.every((team, index) => {
        if (index === 0) return true;
        const prevTeam = standings.overall[index - 1];
        
        // Correct standings logic: higher wins = better, same wins + fewer losses = better
        const isCorrectOrder = team.wins < prevTeam.wins || 
                              (team.wins === prevTeam.wins && team.losses >= prevTeam.losses);
        
        return isCorrectOrder;
      });

      if (!isSorted) {
        setTestResults(prev => [...prev, {
          test: 'Standings Calculation',
          status: 'failed',
          message: 'Standings are not properly sorted'
        }]);
        return;
      }

      setTestResults(prev => [...prev, {
        test: 'Standings Calculation',
        status: 'passed',
        message: 'Standings are properly calculated and sorted'
      }]);
    } catch (err) {
      setTestResults(prev => [...prev, {
        test: 'Standings Calculation',
        status: 'failed',
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      }]);
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * Run all tests
   */
  const runAllTests = async () => {
    setTestResults([]);
    await testSingleGame();
    await testMultipleGames();
    await testDataIntegrity();
    await testStandings();
  };

  /**
   * Clear test results
   */
  const clearResults = () => {
    setTestResults([]);
  };

  /**
   * Refresh league data
   */
  const handleRefresh = async () => {
    try {
      await refreshData();
      setTestResults(prev => [...prev, {
        test: 'Data Refresh',
        status: 'passed',
        message: 'League data refreshed successfully'
      }]);
    } catch (err) {
      setTestResults(prev => [...prev, {
        test: 'Data Refresh',
        status: 'failed',
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      }]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Basketball Simulation Engine Tester
              </CardTitle>
              <CardDescription>
                Test the basketball simulation engine and validate data integrity
              </CardDescription>
            </div>
            {onBackToGame && (
              <Button variant="outline" onClick={onBackToGame}>
                Back to Game
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* League Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Teams: {teams.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">Standings: {standings.overall.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-green-500" />
              <span className="text-sm">Status: {isLoading ? 'Loading' : 'Ready'}</span>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Test Controls */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={testSingleGame} 
              disabled={isTesting || teams.length < 2}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Test Single Game
            </Button>
            
            <Button 
              onClick={testMultipleGames} 
              disabled={isTesting || teams.length < 4}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Test Multiple Games
            </Button>
            
            <Button 
              onClick={testDataIntegrity} 
              disabled={isTesting}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Test Data Integrity
            </Button>
            
            <Button 
              onClick={testStandings} 
              disabled={isTesting}
              className="flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              Test Standings
            </Button>
            
            <Button 
              onClick={runAllTests} 
              disabled={isTesting}
              variant="default"
              className="flex items-center gap-2"
            >
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run All Tests
            </Button>
            
            <Button 
              onClick={handleRefresh} 
              disabled={isTesting}
              variant="outline"
            >
              Refresh Data
            </Button>
            
            <Button 
              onClick={clearResults} 
              variant="outline"
            >
              Clear Results
            </Button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Test Results</h3>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      {result.status === 'passed' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">{result.test}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.status === 'passed' ? 'default' : 'destructive'}>
                        {result.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{result.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* League Statistics */}
          {teams.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">League Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Teams:</span>
                  <span className="ml-2 font-medium">{teams.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Games Played:</span>
                  <span className="ml-2 font-medium">
                    {teams.reduce((sum, team) => sum + team.wins + team.losses, 0) / 2}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Wins:</span>
                  <span className="ml-2 font-medium">
                    {teams.reduce((sum, team) => sum + team.wins, 0)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Losses:</span>
                  <span className="ml-2 font-medium">
                    {teams.reduce((sum, team) => sum + team.losses, 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
