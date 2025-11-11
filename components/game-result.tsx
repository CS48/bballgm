'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy } from 'lucide-react';
import type { Team } from '@/lib/types/database';
import type { GameSimulationResult, PlayerGameStats } from '@/lib/types/game-simulation';

interface GameResultProps {
  result: GameSimulationResult;
  userTeam: Team;
  onBackToMenu: () => void;
}

export function GameResultComponent({ result, userTeam, onBackToMenu }: GameResultProps) {
  const userIsHome = userTeam.team_id.toString() === result.homeTeam.id;
  const userWon =
    (userIsHome && result.homeScore > result.awayScore) || (!userIsHome && result.awayScore > result.homeScore);

  const userScore = userIsHome ? result.homeScore : result.awayScore;
  const opponentScore = userIsHome ? result.awayScore : result.homeScore;
  const opponent = userIsHome ? result.awayTeam : result.homeTeam;

  const calculateFieldGoalPercentage = (made: number, attempted: number) => {
    if (attempted === 0) return '0.0%';
    return `${((made / attempted) * 100).toFixed(1)}%`;
  };

  const PlayerStatsRow = ({ player, isMVP = false }: { player: PlayerGameStats; isMVP?: boolean }) => (
    <tr className={`border-b ${isMVP ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
      <td className="py-2 px-3 text-left">
        <div className="flex items-center gap-2">
          {isMVP && <Trophy className="h-4 w-4 text-yellow-500" />}
          <div>
            <div className="font-medium text-sm">{player.name}</div>
            <div className="text-xs text-muted-foreground">{player.position}</div>
          </div>
        </div>
      </td>
      <td className="py-2 px-2 text-center font-bold">{player.points}</td>
      <td className="py-2 px-2 text-center">{player.fieldGoalsMade}</td>
      <td className="py-2 px-2 text-center">{player.fieldGoalsAttempted}</td>
      <td className="py-2 px-2 text-center text-xs">
        {calculateFieldGoalPercentage(player.fieldGoalsMade, player.fieldGoalsAttempted)}
      </td>
      <td className="py-2 px-2 text-center">{player.threePointersMade}</td>
      <td className="py-2 px-2 text-center">{player.threePointersAttempted}</td>
      <td className="py-2 px-2 text-center">{player.rebounds}</td>
      <td className="py-2 px-2 text-center">{player.assists}</td>
      <td className="py-2 px-2 text-center">{player.steals}</td>
      <td className="py-2 px-2 text-center">
        {player.blocks !== undefined && player.blocks !== null && player.blocks !== 0
          ? player.blocks
          : isStatNotImplemented('blocks')
            ? '--'
            : 0}
      </td>
    </tr>
  );

  const TeamStatsTable = ({
    players,
    teamName,
    isMVPTeam,
  }: {
    players: PlayerGameStats[];
    teamName: string;
    isMVPTeam: boolean;
  }) => {
    // Safety check for undefined players
    if (!players || !Array.isArray(players)) {
      return <div className="text-center text-muted-foreground py-8">No player stats available</div>;
    }

    // Sort players: starters first (by position order), then bench (by minutes played)
    const sortedPlayers = [...players].sort((a, b) => {
      // Starters come first
      if (a.is_starter && !b.is_starter) return -1;
      if (!a.is_starter && b.is_starter) return 1;

      // Both starters: sort by position order
      if (a.is_starter && b.is_starter) {
        const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
        return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position);
      }

      // Both bench: sort by minutes played (descending)
      return (b.minutes || 0) - (a.minutes || 0);
    });

    const totals = sortedPlayers.reduce(
      (acc, player) => ({
        points: acc.points + player.points,
        rebounds: acc.rebounds + player.rebounds,
        assists: acc.assists + player.assists,
        steals: acc.steals + player.steals,
        blocks: acc.blocks + player.blocks,
        fieldGoalsMade: acc.fieldGoalsMade + player.fieldGoalsMade,
        fieldGoalsAttempted: acc.fieldGoalsAttempted + player.fieldGoalsAttempted,
        threePointersMade: acc.threePointersMade + player.threePointersMade,
        threePointersAttempted: acc.threePointersAttempted + player.threePointersAttempted,
      }),
      {
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        fieldGoalsMade: 0,
        fieldGoalsAttempted: 0,
        threePointersMade: 0,
        threePointersAttempted: 0,
      }
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{teamName} Basic Box Score Stats</h3>
          {isMVPTeam && result.mvp && (
            <Badge variant="default" className="bg-yellow-500 text-yellow-900">
              <Trophy className="h-3 w-3 mr-1" />
              MVP: {result.mvp.name.split(' ')[1]}
            </Badge>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-gray-300">
            <thead>
              <tr className="bg-red-600 text-white">
                <th className="py-2 px-3 text-left font-bold">Player</th>
                <th className="py-2 px-2 text-center font-bold">PTS</th>
                <th className="py-2 px-2 text-center font-bold">FG</th>
                <th className="py-2 px-2 text-center font-bold">FGA</th>
                <th className="py-2 px-2 text-center font-bold">FG%</th>
                <th className="py-2 px-2 text-center font-bold">3P</th>
                <th className="py-2 px-2 text-center font-bold">3PA</th>
                <th className="py-2 px-2 text-center font-bold">REB</th>
                <th className="py-2 px-2 text-center font-bold">AST</th>
                <th className="py-2 px-2 text-center font-bold">STL</th>
                <th className="py-2 px-2 text-center font-bold">BLK</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedPlayers.map((player) => (
                <PlayerStatsRow key={player.id} player={player} isMVP={result.mvp?.id === player.id} />
              ))}
              <tr className="border-t-2 bg-gray-100 font-bold">
                <td className="py-2 px-3 font-bold">Team Totals</td>
                <td className="py-2 px-2 text-center font-bold">{totals.points}</td>
                <td className="py-2 px-2 text-center font-bold">{totals.fieldGoalsMade}</td>
                <td className="py-2 px-2 text-center font-bold">{totals.fieldGoalsAttempted}</td>
                <td className="py-2 px-2 text-center font-bold text-xs">
                  {calculateFieldGoalPercentage(totals.fieldGoalsMade, totals.fieldGoalsAttempted)}
                </td>
                <td className="py-2 px-2 text-center font-bold">{totals.threePointersMade}</td>
                <td className="py-2 px-2 text-center font-bold">{totals.threePointersAttempted}</td>
                <td className="py-2 px-2 text-center font-bold">{totals.rebounds}</td>
                <td className="py-2 px-2 text-center font-bold">{totals.assists}</td>
                <td className="py-2 px-2 text-center font-bold">{totals.steals}</td>
                <td className="py-2 px-2 text-center font-bold">
                  {totals.blocks !== undefined && totals.blocks !== null && totals.blocks !== 0
                    ? totals.blocks
                    : isStatNotImplemented('blocks')
                      ? '--'
                      : 0}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const isHomeWinner = result.homeScore > result.awayScore;

  return (
    <div className="space-y-6">
      {/* Back to Menu button at top */}
      <div className="flex justify-start">
        <Button variant="secondary" onClick={onBackToMenu} className="text-lg px-8 py-6">
          ← Back to Menu
        </Button>
      </div>

      <div className="text-center">
        <h2 className="text-4xl font-bold text-primary mb-2">Game Complete</h2>
        <Badge variant={userWon ? 'default' : 'destructive'} className="text-xl px-6 py-2">
          {userWon ? 'Victory!' : 'Defeat'}
        </Badge>
      </div>

      {/* Final Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Final Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h3 className="text-xl font-bold">{userTeam.name}</h3>
              <div className="text-5xl font-bold mt-2">{userScore}</div>
            </div>
            <div className="text-center px-4">
              <div className="text-2xl text-muted-foreground">-</div>
            </div>
            <div className="text-center flex-1">
              <h3 className="text-xl font-bold">{opponent.name}</h3>
              <div className="text-5xl font-bold mt-2">{opponentScore}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {result.mvp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Game MVP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div>
                <h3 className="text-lg font-bold">{result.mvp.name}</h3>
                <p className="text-muted-foreground">
                  {result.mvp.position} • {result.winner}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-600">{result.mvp.points} PTS</p>
                <p className="text-sm text-muted-foreground">
                  {result.mvp.rebounds} REB • {result.mvp.assists} AST
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="home" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="home">{result.homeTeam.name}</TabsTrigger>
              <TabsTrigger value="away">{result.awayTeam.name}</TabsTrigger>
            </TabsList>
            <TabsContent value="home" className="p-6">
              <TeamStatsTable
                players={result.homePlayerStats}
                teamName={result.homeTeam.name}
                isMVPTeam={isHomeWinner}
              />
            </TabsContent>
            <TabsContent value="away" className="p-6">
              <TeamStatsTable
                players={result.awayPlayerStats}
                teamName={result.awayTeam.name}
                isMVPTeam={!isHomeWinner}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
