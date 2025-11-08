'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameStatsTable } from './game-stats-table';
import { GameWatchNavigationModal } from './game-watch-navigation-modal';
import { Scoreboard } from './scoreboard';
import { WatchGameEngine } from '@/lib/game-watch-engine';
import { formatGameClock, getEventColorClass } from '@/lib/utils/event-formatter';
import type { GameSimulationTeam, WatchGameState, AnimationSpeed } from '@/lib/types/game-simulation';
import type { TeamRotationConfig } from '@/lib/types/database';

interface GameWatchProps {
  homeTeam: GameSimulationTeam;
  awayTeam: GameSimulationTeam;
  homeRotationConfig?: TeamRotationConfig | null;
  awayRotationConfig?: TeamRotationConfig | null;
  onGameComplete: (result: any) => void;
  onNavigateAway: () => void;
}

export function GameWatch({
  homeTeam,
  awayTeam,
  homeRotationConfig,
  awayRotationConfig,
  onGameComplete,
  onNavigateAway,
}: GameWatchProps) {
  const [gameEngine] = useState(
    () => new WatchGameEngine(homeTeam, awayTeam, homeRotationConfig || null, awayRotationConfig || null)
  );
  const [gameState, setGameState] = useState<WatchGameState>(gameEngine.getState());
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const eventFeedRef = useRef<HTMLDivElement>(null);

  // Update game state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newState = gameEngine.getState();
      setGameState(newState);

      // Check if game is complete and trigger callback
      if (newState.isComplete && !gameState.isComplete) {
        const gameResult = gameEngine.buildGameResult();
        onGameComplete(gameResult);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameEngine, gameState.isComplete, onGameComplete]);

  // Auto-scroll event feed to bottom
  useEffect(() => {
    if (eventFeedRef.current && gameState.events.length > 0) {
      const scrollContainer = eventFeedRef.current;
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      });
    }
  }, [gameState.events.length]);

  // Handle navigation attempts
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!gameState.isComplete) {
        e.preventDefault();
        e.returnValue = '';
        setShowNavigationModal(true);
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (!gameState.isComplete) {
        // Prevent navigation by pushing current state back
        window.history.pushState(null, '', window.location.href);
        setShowNavigationModal(true);
      }
    };

    // Push a state to enable back button detection
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [gameState.isComplete]);

  const handleStartGame = () => {
    gameEngine.startGame();
  };

  const handlePauseGame = () => {
    gameEngine.pauseGame();
  };

  const handleResumeGame = () => {
    gameEngine.resumeGame();
  };

  const handleSpeedChange = (speed: AnimationSpeed) => {
    gameEngine.setAnimationSpeed(speed);
  };

  const handleNavigationAttempt = () => {
    if (!gameState.isComplete) {
      setShowNavigationModal(true);
    } else {
      onNavigateAway();
    }
  };

  const handleContinueWatching = () => {
    setShowNavigationModal(false);
  };

  const handleLeaveAndSim = async () => {
    await gameEngine.autoSimulateRemaining();
    setShowNavigationModal(false);
    onNavigateAway();
  };

  // Convert game simulation teams to roster table format
  const getRosterTableData = (team: GameSimulationTeam) => {
    return team.players.map((player) => {
      const stats = gameState.playerStats.get(player.id);
      const result = {
        player_id: parseInt(player.id),
        name: player.name,
        position: player.position,
        is_starter: player.is_starter,
        age: 25, // Default age for game simulation
        height: 75, // Default height for game simulation
        weight: 200, // Default weight for game simulation
        years_pro: 3, // Default years pro
        overall_rating: player.overall,
        current_stats: stats
          ? {
              games: 1,
              minutes: stats.minutes,
              points: stats.points,
              fg_made: stats.fieldGoalsMade,
              fg_attempted: stats.fieldGoalsAttempted,
              fg_pct: stats.fieldGoalsAttempted > 0 ? (stats.fieldGoalsMade / stats.fieldGoalsAttempted) * 100 : 0,
              three_made: stats.threePointersMade,
              three_attempted: stats.threePointersAttempted,
              three_pct:
                stats.threePointersAttempted > 0 ? (stats.threePointersMade / stats.threePointersAttempted) * 100 : 0,
              ft_made: 0, // Free throws not implemented yet
              ft_attempted: 0,
              ft_pct: 0,
              oreb: stats.offensiveRebound || 0,
              dreb: stats.defensiveRebound || 0,
              rebounds: (stats.offensiveRebound || 0) + (stats.defensiveRebound || 0),
              assists: stats.assists,
              turnovers: stats.turnovers,
              steals: stats.steals,
              blocks: stats.blocks,
              pf: stats.fouls,
              plus_minus: 0, // Not calculated in current system
            }
          : {
              games: 1,
              minutes: 0,
              points: 0,
              fg_made: 0,
              fg_attempted: 0,
              fg_pct: 0,
              three_made: 0,
              three_attempted: 0,
              three_pct: 0,
              ft_made: 0,
              ft_attempted: 0,
              ft_pct: 0,
              oreb: 0,
              dreb: 0,
              rebounds: 0,
              assists: 0,
              turnovers: 0,
              steals: 0,
              blocks: 0,
              pf: 0,
              plus_minus: 0,
            },
      };

      return result;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col -m-4">
      {/* Flexbox 1: Scoreboard Section */}
      <div className="w-full px-[10vw] pt-4 pb-4 bg-stone-200" style={{ minHeight: '200px' }}>
        <Scoreboard awayTeam={awayTeam} homeTeam={homeTeam} gameState={gameState} />
      </div>

      {/* Flexbox 2: Game Controls */}
      <div className="w-full px-[10vw] py-3 bg-stone-200">
        <div className="flex items-center justify-center gap-4">
          {/* Play/Pause Button */}
          {!gameState.isPlaying ? (
            <Button onClick={handleStartGame} size="lg" variant="outline">
              Play
            </Button>
          ) : gameState.isPaused ? (
            <Button onClick={handleResumeGame} size="lg" variant="outline">
              Resume
            </Button>
          ) : (
            <Button onClick={handlePauseGame} size="lg" variant="outline">
              Pause
            </Button>
          )}

          {/* Skip Button */}
          <Button variant="outline" size="lg">
            Skip
          </Button>

          {/* Speed Controls */}
          <div className="flex space-x-1">
            {([1, 2, 4, 8] as AnimationSpeed[]).map((speed) => (
              <Button
                key={speed}
                variant={gameState.animationSpeed === speed ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSpeedChange(speed)}
                className={gameState.animationSpeed === speed ? 'bg-gray-800 text-white' : ''}
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Flexbox 3: Stats & Event Log */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px-200px)]">
        {/* Sub-flexbox 1: Team Stats */}
        <div className="flex-[2] min-w-[50vw] p-4 overflow-hidden">
          <Tabs defaultValue="away" className="h-full flex flex-col">
            <TabsList className="flex gap-4 mb-4 bg-transparent p-2 border-none">
              <TabsTrigger
                value="away"
                className="data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white data-[state=active]:rounded-full px-4 py-2 text-black bg-transparent border-none rounded-none flex items-center justify-center min-w-[120px]"
              >
                {awayTeam.name}
              </TabsTrigger>
              <TabsTrigger
                value="home"
                className="data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white data-[state=active]:rounded-full px-4 py-2 text-black bg-transparent border-none rounded-none flex items-center justify-center min-w-[120px]"
              >
                {homeTeam.name}
              </TabsTrigger>
              <TabsTrigger
                value="comparison"
                className="data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white data-[state=active]:rounded-full px-4 py-2 text-black bg-transparent border-none rounded-none flex items-center justify-center min-w-[120px]"
              >
                Team Comparison
              </TabsTrigger>
            </TabsList>

            <TabsContent value="away" className="flex-1 overflow-hidden">
              <div className="h-full overflow-hidden">
                <GameStatsTable
                  players={getRosterTableData(awayTeam)}
                  activePlayerIds={gameEngine.getActivePlayerIds('away')}
                />
              </div>
            </TabsContent>

            <TabsContent value="home" className="flex-1 overflow-hidden">
              <div className="h-full overflow-hidden">
                <GameStatsTable
                  players={getRosterTableData(homeTeam)}
                  activePlayerIds={gameEngine.getActivePlayerIds('home')}
                />
              </div>
            </TabsContent>

            <TabsContent value="comparison" className="flex-1 overflow-hidden">
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sub-flexbox 2: Event Log */}
        <div className="flex-[1] p-4 border-l border-gray-300">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto scroll-smooth" ref={eventFeedRef}>
              <div className="space-y-3 p-3">
                {gameState.events.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">Game will start when you click Play</div>
                ) : (
                  gameState.events.map((event, index) => {
                    // Determine which team took the action
                    const isHomeTeam = event.teamId === homeTeam.id;
                    const teamAbbrev = isHomeTeam ? homeTeam.abbreviation : awayTeam.abbreviation;
                    const teamName = isHomeTeam ? homeTeam.name : awayTeam.name;

                    return (
                      <div
                        key={event.id}
                        className="border border-gray-300 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow"
                      >
                        {/* Header: Time, Team, and Score */}
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                          <div className="flex items-center gap-3">
                            <div className="text-xs font-mono font-semibold text-gray-600">{event.time}</div>
                            <div className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                              {teamAbbrev}
                            </div>
                          </div>
                          {event.homeScore !== undefined && event.awayScore !== undefined && (
                            <div className="text-xs font-mono text-gray-600">
                              <span>
                                {awayTeam.abbreviation} {event.awayScore}
                              </span>
                              <span className="text-gray-400 mx-1">-</span>
                              <span>
                                {homeTeam.abbreviation} {event.homeScore}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content: Event Description */}
                        <div className="px-3 py-3">
                          <p className="text-sm text-gray-900 leading-relaxed">{event.description}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Warning Modal */}
      <GameWatchNavigationModal
        isOpen={showNavigationModal}
        onClose={() => setShowNavigationModal(false)}
        onContinueWatching={handleContinueWatching}
        onLeaveAndSim={handleLeaveAndSim}
      />
    </div>
  );
}
