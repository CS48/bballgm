"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy } from "lucide-react"
import type { GameSimulationResult, PlayerGameStats } from "@/lib/types/game-simulation"

interface BoxScoreProps {
  result: GameSimulationResult
  onClose: () => void
}

export function BoxScore({ result, onClose }: BoxScoreProps) {
  const calculateFieldGoalPercentage = (made: number, attempted: number) => {
    if (attempted === 0) return "0.0%"
    return `${((made / attempted) * 100).toFixed(1)}%`
  }

  const PlayerStatsRow = ({ player, isMVP = false }: { player: PlayerGameStats; isMVP?: boolean }) => (
    <tr className={`border-b ${isMVP ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}`}>
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          {isMVP && <Trophy className="h-4 w-4 text-yellow-500" />}
          <div>
            <div className="font-medium">{player.name}</div>
            <div className="text-sm text-muted-foreground">{player.position}</div>
          </div>
        </div>
      </td>
      <td className="py-2 px-3 text-center font-bold">{player.points}</td>
      <td className="py-2 px-3 text-center">{player.rebounds}</td>
      <td className="py-2 px-3 text-center">{player.assists}</td>
      <td className="py-2 px-3 text-center">{player.steals}</td>
      <td className="py-2 px-3 text-center">{player.blocks}</td>
      <td className="py-2 px-3 text-center">
        {player.fieldGoalsMade}/{player.fieldGoalsAttempted}
      </td>
      <td className="py-2 px-3 text-center">
        {calculateFieldGoalPercentage(player.fieldGoalsMade, player.fieldGoalsAttempted)}
      </td>
      <td className="py-2 px-3 text-center">
        {player.threePointersMade}/{player.threePointersAttempted}
      </td>
    </tr>
  )

  const TeamStatsTable = ({
    players,
    teamName,
    isMVPTeam,
  }: {
    players: PlayerGameStats[]
    teamName: string
    isMVPTeam: boolean
  }) => {
    const totals = players.reduce(
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
      },
    )

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{teamName}</h3>
          {isMVPTeam && result.mvp && (
            <Badge variant="default" className="bg-yellow-500 text-yellow-900">
              <Trophy className="h-3 w-3 mr-1" />
              MVP: {result.mvp.name.split(" ")[1]}
            </Badge>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 bg-muted/50">
                <th className="py-2 px-3 text-left">Player</th>
                <th className="py-2 px-3 text-center">PTS</th>
                <th className="py-2 px-3 text-center">REB</th>
                <th className="py-2 px-3 text-center">AST</th>
                <th className="py-2 px-3 text-center">STL</th>
                <th className="py-2 px-3 text-center">BLK</th>
                <th className="py-2 px-3 text-center">FG</th>
                <th className="py-2 px-3 text-center">FG%</th>
                <th className="py-2 px-3 text-center">3P</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <PlayerStatsRow key={player.id} player={player} isMVP={result.mvp?.id === player.id} />
              ))}
              <tr className="border-t-2 bg-muted/30 font-bold">
                <td className="py-2 px-3">TOTALS</td>
                <td className="py-2 px-3 text-center">{totals.points}</td>
                <td className="py-2 px-3 text-center">{totals.rebounds}</td>
                <td className="py-2 px-3 text-center">{totals.assists}</td>
                <td className="py-2 px-3 text-center">{totals.steals}</td>
                <td className="py-2 px-3 text-center">{totals.blocks}</td>
                <td className="py-2 px-3 text-center">
                  {totals.fieldGoalsMade}/{totals.fieldGoalsAttempted}
                </td>
                <td className="py-2 px-3 text-center">
                  {calculateFieldGoalPercentage(totals.fieldGoalsMade, totals.fieldGoalsAttempted)}
                </td>
                <td className="py-2 px-3 text-center">
                  {totals.threePointersMade}/{totals.threePointersAttempted}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const winningTeamStats = result.homeScore > result.awayScore ? result.homePlayerStats : result.awayPlayerStats
  const isHomeWinner = result.homeScore > result.awayScore

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-primary mb-2">Complete Box Score</h2>
        <div className="flex justify-center items-center gap-4">
          <span className="text-xl font-bold">
            {result.homeTeam.name} {result.homeScore}
          </span>
          <span className="text-muted-foreground">-</span>
          <span className="text-xl font-bold">
            {result.awayTeam.name} {result.awayScore}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Game MVP
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result.mvp && (
            <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div>
                <h3 className="text-lg font-bold">{result.mvp.name}</h3>
                <p className="text-muted-foreground">
                  {result.mvp.position} • {isHomeWinner ? result.homeTeam.name : result.awayTeam.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-600">{result.mvp.points} PTS</p>
                <p className="text-sm text-muted-foreground">
                  {result.mvp.rebounds} REB • {result.mvp.assists} AST
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      <div className="flex justify-center">
        <Button onClick={onClose} className="text-lg px-8 py-6">
          Close Box Score
        </Button>
      </div>
    </div>
  )
}
