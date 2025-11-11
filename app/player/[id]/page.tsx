'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLeague } from '@/lib/context/league-context';
import { playerService } from '@/lib/services/player-service';
import { teamService } from '@/lib/services/team-service';
import type { Player, Team, PlayerSeasonStats, PlayerCareerStats, DraftInfo } from '@/lib/types/database';

interface PlayerPageProps {
  params: {
    id: string;
  };
}

export default function PlayerPage({ params }: PlayerPageProps) {
  const { teams, isLoading: leagueLoading, currentSeason } = useLeague();
  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [currentSeasonStats, setCurrentSeasonStats] = useState<PlayerSeasonStats | null>(null);
  const [careerStats, setCareerStats] = useState<PlayerCareerStats | null>(null);
  const [historicalStats, setHistoricalStats] = useState<PlayerSeasonStats[]>([]);
  const [draftInfo, setDraftInfo] = useState<DraftInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const playerId = parseInt(params.id);

  // Show loading if league is still loading
  if (leagueLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading league data...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        console.log('PlayerPage: Fetching player data for playerId:', playerId);

        // Fetch player data
        const foundPlayer = await playerService.getPlayer(playerId);
        if (!foundPlayer) {
          console.error('Player not found for playerId:', playerId);
          setLoading(false);
          return;
        }
        console.log('PlayerPage: Found player:', foundPlayer.first_name, foundPlayer.last_name);
        setPlayer(foundPlayer);

        // Fetch team data
        const foundTeam = await teamService.getTeam(foundPlayer.team_id);
        if (foundTeam) {
          setTeam(foundTeam);
        }

        // Parse current season stats
        if (foundPlayer.current_season_stats) {
          const seasonStats = JSON.parse(foundPlayer.current_season_stats);
          console.log('PlayerPage: Current season stats:', seasonStats);
          setCurrentSeasonStats(seasonStats);
        }

        // Parse career stats
        if (foundPlayer.career_stats) {
          const career = JSON.parse(foundPlayer.career_stats);
          console.log('PlayerPage: Career stats:', career);
          setCareerStats(career);
        }

        // Parse historical stats
        if (foundPlayer.historical_stats) {
          const historical = JSON.parse(foundPlayer.historical_stats);
          console.log('PlayerPage: Historical stats:', historical);
          setHistoricalStats(historical);
        }

        // Parse draft info
        if (foundPlayer.draft_info) {
          const draft = JSON.parse(foundPlayer.draft_info);
          console.log('PlayerPage: Draft info:', draft);
          setDraftInfo(draft);
        }
      } catch (error) {
        console.error('PlayerPage: Failed to fetch player data:', error);
      } finally {
        console.log('PlayerPage: Setting loading to false');
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading player data...</p>
        </div>
      </div>
    );
  }

  if (!player || !team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Player Not Found</h1>
          <Link href="/" className="text-primary hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Helper functions
  const formatHeight = (inches: number): string => {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  /**
   * Determines if a stat should show "--" (not implemented) vs "0.0" (implemented but zero)
   * TODO: Remove this helper function after free throws, blocks, personal fouls, and plus/minus are fully implemented
   */
  const isStatNotImplemented = (statName: string): boolean => {
    const notImplementedStats = ['ft_made', 'ft_attempted', 'ft_pct', 'bpg', 'pf', 'plus_minus'];
    return notImplementedStats.includes(statName);
  };

  const formatStat = (value: number | undefined, decimals: number = 1, statName?: string): string => {
    // For unimplemented stats, show "--" if value is undefined, null, or 0
    if (statName && isStatNotImplemented(statName)) {
      if (value === undefined || value === null || value === 0) {
        return '--';
      }
    }
    
    if (value === undefined || value === null) {
      return '0.0';
    }
    return value.toFixed(decimals);
  };

  const formatPercentage = (value: number | undefined, statName?: string): string => {
    // For unimplemented stats, show "--" if value is undefined, null, or 0
    if (statName && isStatNotImplemented(statName)) {
      if (value === undefined || value === null || value === 0) {
        return '--';
      }
    }
    
    if (value === undefined || value === null) {
      return '0.0%';
    }
    return (value * 100).toFixed(1) + '%';
  };

  const formatDraftInfo = (): string => {
    if (!draftInfo) return 'Undrafted';
    return `#${draftInfo.pick} by ${draftInfo.team} in ${draftInfo.year}`;
  };

  const calculateOverallRating = (): number => {
    // Simple overall rating calculation based on key attributes
    const attributes = [
      player.speed,
      player.ball_iq,
      player.inside_shot,
      player.three_point_shot,
      player.pass,
      player.skill_move,
      player.on_ball_defense,
      player.stamina,
      player.block,
      player.steal,
      player.offensive_rebound,
      player.defensive_rebound,
    ];
    return Math.round(attributes.reduce((sum, attr) => sum + attr, 0) / attributes.length);
  };

  const playerName = `${player.first_name} ${player.last_name}`;
  const overallRating = calculateOverallRating();

  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingLeft: '3vw', paddingRight: '3vw', paddingTop: '3vh', paddingBottom: '3vh' }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Player Info Section */}
        <div className="mb-4">
          {/* Player Info Card */}
          <div className="player-info-card hub-card--transparent" style={{ gap: '0', padding: '0.5rem' }}>
            <div className="flex justify-between items-center">
              {/* Left side - Player name, position, team */}
              <div>
                <p className="player-first-name" style={{ fontSize: '1.5rem', margin: '0', color: '#000000' }}>
                  {player.first_name}
                </p>
                <h2
                  className="player-last-name"
                  style={{ fontSize: '2.25rem', margin: '0', lineHeight: '1', fontWeight: 'bold' }}
                >
                  {player.last_name.toUpperCase()}
                </h2>
                <div className="player-position-team" style={{ fontSize: '1rem', margin: '0' }}>
                  <span>{player.position} | </span>
                  <Link href={`/team/${team.team_id}`} className="text-primary hover:underline">
                    {team.city} {team.name}
                  </Link>
                </div>
              </div>

              {/* Right side - Player info table */}
              <div className="flex gap-8">
                {/* OVR */}
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">OVR</div>
                  <div className="text-lg font-bold">{overallRating}</div>
                </div>

                {/* No. */}
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">No.</div>
                  <div className="text-lg font-bold">{player.player_id}</div>
                </div>

                {/* Age */}
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Age</div>
                  <div className="text-lg font-bold">{player.age}</div>
                </div>

                {/* Height */}
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Height</div>
                  <div className="text-lg font-bold">{formatHeight(player.height)}</div>
                </div>

                {/* Weight */}
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Weight</div>
                  <div className="text-lg font-bold">{player.weight} lbs</div>
                </div>

                {/* EXP */}
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">EXP</div>
                  <div className="text-lg font-bold">{player.years_pro} Yrs</div>
                </div>

                {/* Drafted - spans across */}
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Drafted</div>
                  <div className="text-lg font-bold">{formatDraftInfo()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2" style={{ width: '160px' }}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="flex flex-col gap-6">
              {/* Player Season Stats Card - Full Width Row */}
              <Card
                className="hub-card"
                style={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: '0' }}
              >
                <CardHeader style={{ padding: '0' }}>
                  <CardTitle>Current Season</CardTitle>
                </CardHeader>
                <CardContent style={{ padding: '0' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">GP</th>
                          <th className="text-left p-2">MIN</th>
                          <th className="text-left p-2">PTS</th>
                          <th className="text-left p-2">FGM</th>
                          <th className="text-left p-2">FGA</th>
                          <th className="text-left p-2">FG%</th>
                          <th className="text-left p-2">3PM</th>
                          <th className="text-left p-2">3PA</th>
                          <th className="text-left p-2">3P%</th>
                          <th className="text-left p-2">FTM</th>
                          <th className="text-left p-2">FTA</th>
                          <th className="text-left p-2">FT%</th>
                          <th className="text-left p-2">OREB</th>
                          <th className="text-left p-2">DREB</th>
                          <th className="text-left p-2">REB</th>
                          <th className="text-left p-2">AST</th>
                          <th className="text-left p-2">TOV</th>
                          <th className="text-left p-2">STL</th>
                          <th className="text-left p-2">BLK</th>
                          <th className="text-left p-2">PF</th>
                          <th className="text-left p-2">+/-</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2">{formatStat(currentSeasonStats?.games, 0)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.mpg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.ppg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.fg_made, 0)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.fg_attempted, 0)}</td>
                          <td className="p-2">{formatPercentage(currentSeasonStats?.fg_pct)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.three_made, 0)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.three_attempted, 0)}</td>
                          <td className="p-2">{formatPercentage(currentSeasonStats?.three_pct)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.ft_made, 0, 'ft_made')}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.ft_attempted, 0, 'ft_attempted')}</td>
                          <td className="p-2">{formatPercentage(currentSeasonStats?.ft_pct, 'ft_pct')}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.oreb_pg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.dreb_pg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.rpg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.apg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.tpg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.spg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.bpg, 1, 'bpg')}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.pf, 0, 'pf')}</td>
                          <td className="p-2">{formatStat(currentSeasonStats?.plus_minus, 1, 'plus_minus')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Attributes Section */}
              <Card
                className="hub-card"
                style={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: '0' }}
              >
                <CardHeader style={{ padding: '0' }}>
                  <CardTitle>Attributes</CardTitle>
                </CardHeader>
                <CardContent style={{ padding: '0' }}>
                  <div className="space-y-2">
                    {/* Speed */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 text-sm text-muted-foreground">Speed</div>
                      <div className="w-8 text-sm font-semibold">{player.speed}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-black h-4 rounded-full transition-all duration-300"
                          style={{ width: `${player.speed}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Ball IQ */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 text-sm text-muted-foreground">Basketball IQ</div>
                      <div className="w-8 text-sm font-semibold">{player.ball_iq}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-black h-4 rounded-full transition-all duration-300"
                          style={{ width: `${player.ball_iq}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Inside Shot */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 text-sm text-muted-foreground">Interior Scoring</div>
                      <div className="w-8 text-sm font-semibold">{player.inside_shot}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-black h-4 rounded-full transition-all duration-300"
                          style={{ width: `${player.inside_shot}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Three Point Shot */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 text-sm text-muted-foreground">3P Scoring</div>
                      <div className="w-8 text-sm font-semibold">{player.three_point_shot}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-black h-4 rounded-full transition-all duration-300"
                          style={{ width: `${player.three_point_shot}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Pass */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 text-sm text-muted-foreground">Passing</div>
                      <div className="w-8 text-sm font-semibold">{player.pass}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-black h-4 rounded-full transition-all duration-300"
                          style={{ width: `${player.pass}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Skill Move */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 text-sm text-muted-foreground">Skill Move</div>
                      <div className="w-8 text-sm font-semibold">{player.skill_move}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-black h-4 rounded-full transition-all duration-300"
                          style={{ width: `${player.skill_move}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* On Ball Defense */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 text-sm text-muted-foreground">On-ball Defense</div>
                      <div className="w-8 text-sm font-semibold">{player.on_ball_defense}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-black h-4 rounded-full transition-all duration-300"
                          style={{ width: `${player.on_ball_defense}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Stamina */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 text-sm text-muted-foreground">Stamina</div>
                      <div className="w-8 text-sm font-semibold">{player.stamina}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-black h-4 rounded-full transition-all duration-300"
                          style={{ width: `${player.stamina}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Block */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 text-sm text-muted-foreground">Block</div>
                      <div className="w-8 text-sm font-semibold">{player.block}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-black h-4 rounded-full transition-all duration-300"
                          style={{ width: `${player.block}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Steal */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 text-sm text-muted-foreground">Steal</div>
                      <div className="w-8 text-sm font-semibold">{player.steal}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-black h-4 rounded-full transition-all duration-300"
                          style={{ width: `${player.steal}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Offensive Rebound */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 text-sm text-muted-foreground">Offensive Rebound</div>
                      <div className="w-8 text-sm font-semibold">{player.offensive_rebound}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-black h-4 rounded-full transition-all duration-300"
                          style={{ width: `${player.offensive_rebound}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Defensive Rebound */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 text-sm text-muted-foreground">Defensive Rebound</div>
                      <div className="w-8 text-sm font-semibold">{player.defensive_rebound}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-black h-4 rounded-full transition-all duration-300"
                          style={{ width: `${player.defensive_rebound}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="mt-6">
            <Card
              className="hub-card"
              style={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: '0' }}
            >
              <CardContent style={{ padding: '0' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Time period</th>
                        <th className="text-left p-2">GP</th>
                        <th className="text-left p-2">MIN</th>
                        <th className="text-left p-2">PTS</th>
                        <th className="text-left p-2">FGM</th>
                        <th className="text-left p-2">FGA</th>
                        <th className="text-left p-2">FG%</th>
                        <th className="text-left p-2">3PM</th>
                        <th className="text-left p-2">3PA</th>
                        <th className="text-left p-2">3P%</th>
                        <th className="text-left p-2">FTM</th>
                        <th className="text-left p-2">FTA</th>
                        <th className="text-left p-2">FT%</th>
                        <th className="text-left p-2">OREB</th>
                        <th className="text-left p-2">DREB</th>
                        <th className="text-left p-2">REB</th>
                        <th className="text-left p-2">AST</th>
                        <th className="text-left p-2">TOV</th>
                        <th className="text-left p-2">STL</th>
                        <th className="text-left p-2">BLK</th>
                        <th className="text-left p-2">PF</th>
                        <th className="text-left p-2">DD</th>
                        <th className="text-left p-2">TD</th>
                        <th className="text-left p-2">+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Career Stats Row */}
                      <tr>
                        <td className="p-2 font-semibold">Career</td>
                        <td className="p-2">{formatStat(careerStats?.games, 0)}</td>
                        <td className="p-2">{formatStat(careerStats?.minutes)}</td>
                        <td className="p-2">{formatStat(careerStats?.ppg)}</td>
                        <td className="p-2">{formatStat(careerStats?.fg_made, 0)}</td>
                        <td className="p-2">{formatStat(careerStats?.fg_attempted, 0)}</td>
                        <td className="p-2">{formatPercentage(careerStats?.fg_pct)}</td>
                        <td className="p-2">{formatStat(careerStats?.three_made, 0)}</td>
                        <td className="p-2">{formatStat(careerStats?.three_attempted, 0)}</td>
                        <td className="p-2">{formatPercentage(careerStats?.three_pct)}</td>
                        <td className="p-2">{formatStat(careerStats?.ft_made, 0, 'ft_made')}</td>
                        <td className="p-2">{formatStat(careerStats?.ft_attempted, 0, 'ft_attempted')}</td>
                        <td className="p-2">{formatPercentage(careerStats?.ft_pct, 'ft_pct')}</td>
                        <td className="p-2">{formatStat(careerStats?.oreb_pg || (careerStats?.oreb && careerStats?.games ? careerStats.oreb / careerStats.games : undefined))}</td>
                        <td className="p-2">{formatStat(careerStats?.dreb_pg || (careerStats?.dreb && careerStats?.games ? careerStats.dreb / careerStats.games : undefined))}</td>
                        <td className="p-2">{formatStat(careerStats?.rpg)}</td>
                        <td className="p-2">{formatStat(careerStats?.apg)}</td>
                        <td className="p-2">{formatStat(careerStats?.tpg)}</td>
                        <td className="p-2">{formatStat(careerStats?.spg)}</td>
                        <td className="p-2">{formatStat(careerStats?.bpg, 1, 'bpg')}</td>
                        <td className="p-2">{formatStat(careerStats?.pf, 0, 'pf')}</td>
                        <td className="p-2">--</td>
                        <td className="p-2">--</td>
                        <td className="p-2">{formatStat(careerStats?.plus_minus, 1, 'plus_minus')}</td>
                      </tr>

                      {/* Current Season Row */}
                      {currentSeasonStats && (
                        <tr>
                          <td className="p-2 font-semibold">{currentSeason?.year || 'Current'}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.games, 0)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.mpg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.ppg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.fg_made, 0)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.fg_attempted, 0)}</td>
                          <td className="p-2">{formatPercentage(currentSeasonStats.fg_pct)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.three_made, 0)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.three_attempted, 0)}</td>
                          <td className="p-2">{formatPercentage(currentSeasonStats.three_pct)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.ft_made, 0, 'ft_made')}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.ft_attempted, 0, 'ft_attempted')}</td>
                          <td className="p-2">{formatPercentage(currentSeasonStats.ft_pct, 'ft_pct')}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.oreb_pg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.dreb_pg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.rpg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.apg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.tpg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.spg)}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.bpg, 1, 'bpg')}</td>
                          <td className="p-2">{formatStat(currentSeasonStats.pf, 0, 'pf')}</td>
                          <td className="p-2">--</td>
                          <td className="p-2">--</td>
                          <td className="p-2">{formatStat(currentSeasonStats.plus_minus, 1, 'plus_minus')}</td>
                        </tr>
                      )}

                      {/* Historical Season Rows */}
                      {historicalStats.map((season, index) => (
                        <tr key={index}>
                          <td className="p-2">{season.season || `Season ${index + 1}`}</td>
                          <td className="p-2">{formatStat(season.games, 0)}</td>
                          <td className="p-2">{formatStat(season.mpg || (season.minutes && season.games ? season.minutes / season.games : undefined))}</td>
                          <td className="p-2">{formatStat(season.ppg)}</td>
                          <td className="p-2">{formatStat(season.fg_made, 0)}</td>
                          <td className="p-2">{formatStat(season.fg_attempted, 0)}</td>
                          <td className="p-2">{formatPercentage(season.fg_pct)}</td>
                          <td className="p-2">{formatStat(season.three_made, 0)}</td>
                          <td className="p-2">{formatStat(season.three_attempted, 0)}</td>
                          <td className="p-2">{formatPercentage(season.three_pct)}</td>
                          <td className="p-2">{formatStat(season.ft_made, 0, 'ft_made')}</td>
                          <td className="p-2">{formatStat(season.ft_attempted, 0, 'ft_attempted')}</td>
                          <td className="p-2">{formatPercentage(season.ft_pct, 'ft_pct')}</td>
                          <td className="p-2">{formatStat(season.oreb_pg || (season.oreb && season.games ? season.oreb / season.games : undefined))}</td>
                          <td className="p-2">{formatStat(season.dreb_pg || (season.dreb && season.games ? season.dreb / season.games : undefined))}</td>
                          <td className="p-2">{formatStat(season.rpg)}</td>
                          <td className="p-2">{formatStat(season.apg)}</td>
                          <td className="p-2">{formatStat(season.tpg)}</td>
                          <td className="p-2">{formatStat(season.spg)}</td>
                          <td className="p-2">{formatStat(season.bpg, 1, 'bpg')}</td>
                          <td className="p-2">{formatStat(season.pf, 0, 'pf')}</td>
                          <td className="p-2">--</td>
                          <td className="p-2">--</td>
                          <td className="p-2">{formatStat(season.plus_minus, 1, 'plus_minus')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
