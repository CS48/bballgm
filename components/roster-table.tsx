"use client"

import { useState } from "react"
import Link from "next/link"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

interface Player {
  player_id: number
  name: string
  position: string
  age: number
  height: number
  weight: number
  years_pro: number
  overall_rating: number
  is_starter?: number
  current_stats?: {
    games?: number
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
  }
  draft_info?: string | null
}

interface RosterTableProps {
  players: Player[]
}

export function RosterTable({ players }: RosterTableProps) {
  const [view, setView] = useState<"info" | "stats">("info")

  // Helper functions
  const formatHeight = (inches: number): string => {
    const feet = Math.floor(inches / 12)
    const remainingInches = inches % 12
    return `${feet}'${remainingInches}"`
  }

  const formatStat = (value: number | undefined, decimals: number = 1): string => {
    if (value === undefined || value === null) return "0.0"
    return value.toFixed(decimals)
  }

  const formatPercentage = (made: number | undefined, attempted: number | undefined): string => {
    if (!made || !attempted || attempted === 0) return "0.0"
    return (made / attempted).toFixed(1)
  }

  const parseAcquired = (draftInfo: string | null): string => {
    if (!draftInfo) return "N/A"
    try {
      const draft = JSON.parse(draftInfo)
      return `#${draft.pick} Pick in ${draft.year}`
    } catch {
      return "N/A"
    }
  }

  // Sort players: starters first (by position order), then bench players (by overall rating)
  const starters = (() => {
    // Debug: Check if any players have is_starter set
    const playersWithStarterFlag = players.filter(player => player.is_starter === 1)
    console.log('RosterTable Debug - Players with is_starter=1:', playersWithStarterFlag.length)
    console.log('RosterTable Debug - All players is_starter values:', players.map(p => ({ name: p.name, is_starter: p.is_starter })))
    
    // If no players are marked as starters, fall back to top 5 by overall rating
    if (playersWithStarterFlag.length === 0) {
      console.log('RosterTable Debug - No starters found, using top 5 by overall rating')
      return players
        .sort((a, b) => b.overall_rating - a.overall_rating)
        .slice(0, 5)
    }
    
    // Use actual starters
    return playersWithStarterFlag.sort((a, b) => {
      const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C']
      return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position)
    })
  })()
  
  const benchPlayers = players.filter(player => player.is_starter !== 1)
    .sort((a, b) => b.overall_rating - a.overall_rating)
  
  const sortedPlayers = [...starters, ...benchPlayers]

  return (
    <div className="roster-table-container">
      {/* Header with segmented control */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Roster</h3>
        <ToggleGroup type="single" value={view} onValueChange={(value) => setView(value as "info" | "stats")}>
          <ToggleGroupItem value="info">Info</ToggleGroupItem>
          <ToggleGroupItem value="stats">Stats</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 w-8"></th>
              {view === "info" ? (
                <>
                  <th className="text-left p-2">Player</th>
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Height</th>
                  <th className="text-left p-2">Weight</th>
                  <th className="text-left p-2">Age</th>
                  <th className="text-left p-2">YWT</th>
                  <th className="text-left p-2">Years</th>
                  <th className="text-left p-2">Salary</th>
                  <th className="text-left p-2">Acquired</th>
                </>
              ) : (
                <>
                  <th className="text-left p-2">Player</th>
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
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => (
              <tr key={player.player_id} className="border-b border-gray-200">
                <td className="p-2">
                  <Checkbox className="border-black data-[state=checked]:bg-black data-[state=checked]:border-black" />
                </td>
                <td className="p-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/player/${player.player_id}`} className="font-medium hover:underline text-primary">
                        {player.name}
                      </Link>
                      {player.is_starter === 1 && (
                        <Badge variant="outline" className="text-xs bg-gray-50 text-black border-gray-300">
                          Starter
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {player.position} | {player.overall_rating} ovr
                    </p>
                  </div>
                </td>
                {view === "info" ? (
                  <>
                    <td className="p-2">{player.player_id}</td>
                    <td className="p-2">{formatHeight(player.height)}</td>
                    <td className="p-2">{player.weight} lbs</td>
                    <td className="p-2">{player.age}</td>
                    <td className="p-2">N/A</td>
                    <td className="p-2">{player.years_pro}</td>
                    <td className="p-2">XXX,XXX,XXX</td>
                    <td className="p-2">{parseAcquired(player.draft_info)}</td>
                  </>
                ) : (
                  <>
                    <td className="p-2">{formatStat(player.current_stats?.games, 0)}</td>
                    <td className="p-2">{formatStat(player.current_stats?.minutes)}</td>
                    <td className="p-2">{formatStat(player.current_stats?.points)}</td>
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
                    <td className="p-2">N/A</td>
                    <td className="p-2">N/A</td>
                    <td className="p-2">{formatStat(player.current_stats?.plus_minus)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
