'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OpponentSelection } from './opponent-selection';
import { GameResultComponent } from './game-result';
import { HomeHub } from './home-hub';
import { GameWatch } from './game-watch';
import { useLeague } from '@/lib/context/league-context';
import { leagueService } from '@/lib/services/league-service';
import { teamService } from '@/lib/services/team-service';
import { gameService } from '@/lib/services/game-service';
import { GameEngine } from '@/lib/game-engine';
import { convertDatabaseTeamToGameTeam } from '@/lib/types/game-simulation';
import type { Team, TeamRotationConfig } from '@/lib/types/database';
import type { GameSimulationTeam, GameSimulationPlayer } from '@/lib/types/game-simulation';

interface MainMenuProps {
  userTeam: Team;
  onResetGame: () => void;
}

type MenuView = 'main' | 'game-select' | 'game-result' | 'watch-game' | 'view-game-result';

// Helper to convert roster from getTeamRoster to GameSimulationTeam
function convertRosterToGameTeam(roster: any, team: Team): GameSimulationTeam {
  const gamePlayers: GameSimulationPlayer[] = roster.players.map((player: any) => ({
    id: player.player_id.toString(),
    name: player.name,
    position: player.position as 'PG' | 'SG' | 'SF' | 'PF' | 'C',
    teamId: roster.team.team_id.toString(),
    is_starter: player.is_starter,
    attributes: {
      shooting: Math.round((player.inside_shot + player.three_point_shot) / 2),
      defense: Math.round((player.on_ball_defense + player.block + player.steal) / 3),
      rebounding: Math.round((player.offensive_rebound + player.defensive_rebound) / 2),
      passing: player.pass,
      athleticism: Math.round((player.speed + player.stamina) / 2),
    },
    overall: player.overall_rating, // This is now calculated by getTeamRoster!
    descriptor: `${player.position} - ${player.overall_rating} OVR`,
    // Individual attributes for D20 engine
    speed: player.speed,
    ball_iq: player.ball_iq,
    inside_shot: player.inside_shot,
    three_point_shot: player.three_point_shot,
    pass: player.pass,
    skill_move: player.skill_move,
    on_ball_defense: player.on_ball_defense,
    stamina: player.stamina,
    block: player.block,
    steal: player.steal,
    offensive_rebound: player.offensive_rebound,
    defensive_rebound: player.defensive_rebound,
  }));

  return {
    id: roster.team.team_id.toString(),
    name: roster.team.name,
    city: roster.team.city,
    abbreviation: team.abbreviation,
    players: gamePlayers,
    record: { wins: team.wins, losses: team.losses },
  };
}

export function MainMenu({ userTeam, onResetGame }: MainMenuProps) {
  const { simulateGame, logWatchGame, teams, players, getGameResult, refreshCurrentGameDay } = useLeague();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<MenuView>('main');
  const [selectedOpponent, setSelectedOpponent] = useState<Team | null>(null);
  const [gameResult, setGameResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [watchGameTeams, setWatchGameTeams] = useState<{ home: GameSimulationTeam; away: GameSimulationTeam } | null>(
    null
  );
  const [watchGameRotations, setWatchGameRotations] = useState<{
    home: TeamRotationConfig | null;
    away: TeamRotationConfig | null;
  }>({ home: null, away: null });

  const handleOpponentSelected = async (opponent: Team, gameMode: 'sim' | 'watch') => {
    setSelectedOpponent(opponent);

    if (gameMode === 'watch') {
      // Check if game already completed in database
      const gameId = await gameService.getGameIdByMatchup(userTeam.team_id, opponent.team_id);
      if (gameId) {
        console.warn('Game already completed, cannot watch again');
        alert('This game has already been completed. View the result instead.');
        return;
      }

      // Prepare teams for watch mode (stay in same context)
      try {
        // Get full rosters with calculated overall ratings and rotation configs
        const [homeRoster, awayRoster, homeTeam, awayTeam] = await Promise.all([
          leagueService.getTeamRoster(userTeam.team_id),
          leagueService.getTeamRoster(opponent.team_id),
          teamService.getTeam(userTeam.team_id),
          teamService.getTeam(opponent.team_id),
        ]);

        // Parse rotation configs if they exist
        const homeRotation = homeTeam?.rotation_config ? JSON.parse(homeTeam.rotation_config) : null;
        const awayRotation = awayTeam?.rotation_config ? JSON.parse(awayTeam.rotation_config) : null;

        // Convert to game simulation teams
        const homeGameTeam = convertRosterToGameTeam(homeRoster, userTeam);
        const awayGameTeam = convertRosterToGameTeam(awayRoster, opponent);

        setWatchGameTeams({ home: homeGameTeam, away: awayGameTeam });
        setWatchGameRotations({ home: homeRotation, away: awayRotation });
        setCurrentView('watch-game');
      } catch (error) {
        console.error('Failed to prepare watch game:', error);
        setCurrentView('game-select');
      }
      return;
    }

    // Handle sim mode (existing logic)
    setIsSimulating(true);

    try {
      // Get full rosters with calculated overall ratings
      const [homeRoster, awayRoster] = await Promise.all([
        leagueService.getTeamRoster(userTeam.team_id),
        leagueService.getTeamRoster(opponent.team_id),
      ]);

      // Convert to game simulation teams
      const homeGameTeam = convertRosterToGameTeam(homeRoster, userTeam);
      const awayGameTeam = convertRosterToGameTeam(awayRoster, opponent);

      // Simulate game with full stats using GameEngine
      const fullResult = GameEngine.simulateGame(homeGameTeam, awayGameTeam);

      // Still call context simulateGame to persist to DB
      await simulateGame(userTeam.team_id, opponent.team_id);

      // Use the full result with player stats
      handleGameComplete(fullResult);
    } catch (error) {
      console.error('Game simulation failed:', error);
      // Reset to game selection on error
      setCurrentView('game-select');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleGameComplete = (result: any) => {
    setGameResult(result);
    setCurrentView('game-result');
  };

  const handleViewGameResult = async (gameId: number) => {
    try {
      const result = await getGameResult(gameId);
      if (result) {
        setGameResult(result);
        setCurrentView('view-game-result');
      }
    } catch (error) {
      console.error('Failed to load game result:', error);
    }
  };

  if (currentView === 'game-select') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <OpponentSelection
            userTeam={userTeam}
            onOpponentSelected={handleOpponentSelected}
            onBackToMenu={() => setCurrentView('main')}
            isSimulating={isSimulating}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'game-result' && gameResult) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <GameResultComponent
            result={gameResult}
            userTeam={userTeam}
            onBackToMenu={async () => {
              console.log(`=== BACK TO MENU CLICKED ===`);
              console.log('Before refreshCurrentGameDay');
              await refreshCurrentGameDay(); // Refresh before navigating back
              console.log('After refreshCurrentGameDay');
              setCurrentView('main');
              console.log('After setCurrentView("main")');
            }}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'watch-game' && watchGameTeams) {
    return (
      <GameWatch
        homeTeam={watchGameTeams.home}
        awayTeam={watchGameTeams.away}
        homeRotationConfig={watchGameRotations.home}
        awayRotationConfig={watchGameRotations.away}
        onGameComplete={async (result) => {
          try {
            // Log the completed watch game to the database
            await logWatchGame(parseInt(watchGameTeams.home.id), parseInt(watchGameTeams.away.id), result);

            // Use the complete result from buildGameResult()
            setGameResult(result);
            setCurrentView('game-result');
          } catch (error) {
            console.error('Failed to log watch game:', error);
            // Still show the result even if logging failed
            setGameResult(result);
            setCurrentView('game-result');
          }
        }}
        onNavigateAway={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'view-game-result' && gameResult) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <GameResultComponent
            result={gameResult}
            userTeam={userTeam}
            onBackToMenu={async () => {
              console.log(`=== BACK TO MENU CLICKED ===`);
              console.log('Before refreshCurrentGameDay');
              await refreshCurrentGameDay(); // Refresh before navigating back
              console.log('After refreshCurrentGameDay');
              setCurrentView('main');
              console.log('After setCurrentView("main")');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <HomeHub
      userTeam={userTeam}
      onNavigateToGameSelect={() => setCurrentView('game-select')}
      onNavigateToWatchGame={async (homeTeam, awayTeam) => {
        // Prepare teams for watch mode
        try {
          // Get full rosters with calculated overall ratings and rotation configs
          const [homeRoster, awayRoster, homeTeamData, awayTeamData] = await Promise.all([
            leagueService.getTeamRoster(homeTeam.team_id),
            leagueService.getTeamRoster(awayTeam.team_id),
            teamService.getTeam(homeTeam.team_id),
            teamService.getTeam(awayTeam.team_id),
          ]);

          // Parse rotation configs if they exist
          const homeRotation = homeTeamData?.rotation_config ? JSON.parse(homeTeamData.rotation_config) : null;
          const awayRotation = awayTeamData?.rotation_config ? JSON.parse(awayTeamData.rotation_config) : null;

          // Convert to game simulation teams
          const homeGameTeam = convertRosterToGameTeam(homeRoster, homeTeam);
          const awayGameTeam = convertRosterToGameTeam(awayRoster, awayTeam);

          setSelectedOpponent(awayTeam);
          setWatchGameTeams({ home: homeGameTeam, away: awayGameTeam });
          setWatchGameRotations({ home: homeRotation, away: awayRotation });
          setCurrentView('watch-game');
        } catch (error) {
          console.error('Failed to prepare watch game:', error);
        }
      }}
      onViewGameResult={handleViewGameResult}
    />
  );
}
