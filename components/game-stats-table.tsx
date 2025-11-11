'use client';

import { isStatNotImplemented } from '@/lib/utils';

interface Player {
  player_id: number;
  name: string;
  position: string;
  is_starter?: number;
  overall_rating: number;
  current_stats?: {
    minutes?: number;
    points?: number;
    fg_made?: number;
    fg_attempted?: number;
    fg_pct?: number;
    three_made?: number;
    three_attempted?: number;
    three_pct?: number;
    ft_made?: number;
    ft_attempted?: number;
    ft_pct?: number;
    oreb?: number;
    dreb?: number;
    rebounds?: number;
    assists?: number;
    turnovers?: number;
    steals?: number;
    blocks?: number;
    pf?: number;
    plus_minus?: number;
  };
}

interface GameStatsTableProps {
  players: Player[];
  activePlayerIds?: number[];
}

export function GameStatsTable({ players, activePlayerIds = [] }: GameStatsTableProps) {
  // Helper functions
  /**
   * Format stat value, showing "--" for unimplemented stats
   * TODO: Remove statName parameter and isStatNotImplemented check after all stats are fully implemented
   */
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

  /**
   * Format percentage, showing "--" for unimplemented stats
   * TODO: Remove statName parameter and isStatNotImplemented check after all stats are fully implemented
   */
  const formatPercentage = (made: number | undefined, attempted: number | undefined, statName?: string): string => {
    // For unimplemented stats, show "--" if made/attempted are undefined, null, or 0
    if (statName && isStatNotImplemented(statName)) {
      if (made === undefined || made === null || made === 0 || attempted === undefined || attempted === null || attempted === 0) {
        return '--';
      }
    }
    
    if (!made || !attempted || attempted === 0) {
      return '0.0';
    }
    return (made / attempted).toFixed(1);
  };

  // Sort players based on active status if provided, otherwise use starter status
  const sortedPlayers = (() => {
    if (activePlayerIds.length > 0) {
      // Sort by active status: active players first, then bench
      const activePlayers = players
        .filter((p) => activePlayerIds.includes(p.player_id))
        .sort((a, b) => {
          // Sort active players by position order
          const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
          return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position);
        });

      const benchPlayers = players
        .filter((p) => !activePlayerIds.includes(p.player_id))
        .sort((a, b) => b.overall_rating - a.overall_rating);

      return [...activePlayers, ...benchPlayers];
    } else {
      // Fallback to starter-based sorting
      const playersWithStarterFlag = players.filter((player) => player.is_starter === 1);

      if (playersWithStarterFlag.length === 0) {
        return players.sort((a, b) => b.overall_rating - a.overall_rating);
      }

      const starters = playersWithStarterFlag.sort((a, b) => {
        const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
        return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position);
      });

      const bench = players
        .filter((player) => player.is_starter !== 1)
        .sort((a, b) => b.overall_rating - a.overall_rating);

      return [...starters, ...bench];
    }
  })();

  return (
    <div className="game-stats-table-container h-full">
      {/* Table */}
      <div className="h-full overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-20 bg-background">
            <tr className="border-b">
              <th
                className="text-left p-2 border-r border-gray-200 bg-background sticky left-0 z-30"
                style={{ minWidth: '11.5rem' }}
              >
                Player
              </th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">MIN</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">PTS</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">FGM</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">FGA</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">FG%</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">3PM</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">3PA</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">3P%</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">FTM</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">FTA</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">FT%</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">OREB</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">DREB</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">REB</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">AST</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">TOV</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">STL</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">BLK</th>
              <th className="text-right p-2 border-r border-gray-200 font-mono">PF</th>
              <th className="text-right p-2 font-mono">+/-</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, index) => {
              // Check if player is currently active
              const isActive =
                activePlayerIds.length > 0 ? activePlayerIds.includes(player.player_id) : player.is_starter === 1; // fallback to starter status

              return (
                <tr
                  key={player.player_id}
                  className={`border-b ${isActive ? 'border-l-4 border-l-black border-gray-200 bg-background' : 'border-gray-200 bg-background'}`}
                >
                  <td
                    className={`p-2 border-r sticky left-0 z-10 ${isActive ? 'border-l-4 border-l-black border-gray-200 bg-background' : 'border-gray-200 bg-background'}`}
                    style={{ minWidth: '11.5rem' }}
                  >
                    <div>
                      <p className="font-medium">{player.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.position} | {player.overall_rating} ovr
                      </p>
                    </div>
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.minutes, 0)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.points, 0)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.fg_made, 0)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.fg_attempted, 0)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.fg_pct)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.three_made, 0)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.three_attempted, 0)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.three_pct)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.ft_made, 0, 'ft_made')}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.ft_attempted, 0, 'ft_attempted')}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.ft_pct, 1, 'ft_pct')}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.oreb, 0)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.dreb, 0)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.rebounds, 0)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.assists, 0)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.turnovers, 0)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.steals, 0)}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.blocks, 0, 'blocks')}
                  </td>
                  <td className={`p-2 text-right border-r font-mono border-gray-200 bg-background`}>
                    {formatStat(player.current_stats?.pf, 0, 'pf')}
                  </td>
                  <td className={`p-2 text-right font-mono bg-background`}>
                    {formatStat(player.current_stats?.plus_minus, 1, 'plus_minus')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
