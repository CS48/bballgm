"use client"

interface Player {
  player_id: number
  name: string
  position: string
  is_starter?: number
  overall_rating: number
  current_stats?: {
    minutes?: number
    points?: number
    fg_made?: number
    fg_attempted?: number
    fg_pct?: number
    three_made?: number
    three_attempted?: number
    three_pct?: number
    ft_made?: number
    ft_attempted?: number
    ft_pct?: number
    oreb?: number
    dreb?: number
    rebounds?: number
    assists?: number
    turnovers?: number
    steals?: number
    blocks?: number
    pf?: number
    plus_minus?: number
  }
}

interface GameStatsTableProps {
  players: Player[]
  activePlayerIds?: number[]
}

export function GameStatsTable({ players, activePlayerIds = [] }: GameStatsTableProps) {
  // Helper functions
  const formatStat = (value: number | undefined, decimals: number = 1): string => {
    if (value === undefined || value === null) return "0.0"
    return value.toFixed(decimals)
  }

  const formatPercentage = (made: number | undefined, attempted: number | undefined): string => {
    if (!made || !attempted || attempted === 0) return "0.0"
    return (made / attempted).toFixed(1)
  }

  // Sort players based on active status if provided, otherwise use starter status
  const sortedPlayers = (() => {
    if (activePlayerIds.length > 0) {
      // Sort by active status: active players first, then bench
      const activePlayers = players.filter(p => activePlayerIds.includes(p.player_id))
        .sort((a, b) => {
          // Sort active players by position order
          const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C']
          return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position)
        })
      
      const benchPlayers = players.filter(p => !activePlayerIds.includes(p.player_id))
        .sort((a, b) => b.overall_rating - a.overall_rating)
      
      return [...activePlayers, ...benchPlayers]
    } else {
      // Fallback to starter-based sorting
      const playersWithStarterFlag = players.filter(player => player.is_starter === 1)
      
      if (playersWithStarterFlag.length === 0) {
        return players
          .sort((a, b) => b.overall_rating - a.overall_rating)
      }
      
      const starters = playersWithStarterFlag.sort((a, b) => {
        const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C']
        return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position)
      })
      
      const bench = players.filter(player => player.is_starter !== 1)
        .sort((a, b) => b.overall_rating - a.overall_rating)
      
      return [...starters, ...bench]
    }
  })()

  return (
    <div className="game-stats-table-container">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2" style={{ minWidth: '11.5rem' }}>Player</th>
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
            {sortedPlayers.map((player, index) => {
              // Determine where to place the divider line
              const isLastActivePlayer = activePlayerIds.length > 0 
                ? index === activePlayerIds.length - 1
                : index === 4 // fallback to 5th player (starters)
              
              return (
                <tr 
                  key={player.player_id} 
                  className={
                    isLastActivePlayer && sortedPlayers.length > 5 
                      ? 'border-b-2 border-black' 
                      : 'border-b border-gray-200'
                  }
                >
                <td className="p-2" style={{ minWidth: '11.5rem' }}>
                  <div>
                    <p className="font-medium">{player.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {player.position} | {player.overall_rating} ovr
                    </p>
                  </div>
                </td>
                <td className="p-2">{formatStat(player.current_stats?.minutes, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.points, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.fg_made, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.fg_attempted, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.fg_pct)}</td>
                <td className="p-2">{formatStat(player.current_stats?.three_made, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.three_attempted, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.three_pct)}</td>
                <td className="p-2">{formatStat(player.current_stats?.ft_made, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.ft_attempted, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.ft_pct)}</td>
                <td className="p-2">{formatStat(player.current_stats?.oreb, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.dreb, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.rebounds, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.assists, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.turnovers, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.steals, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.blocks, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.pf, 0)}</td>
                <td className="p-2">{formatStat(player.current_stats?.plus_minus)}                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
