"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { Player } from "@/types/game"

interface PlayerCardProps {
  player: Player
  showDetailed?: boolean
}

export function PlayerCard({ player, showDetailed = false }: PlayerCardProps) {
  const getOverallColor = (overall: number) => {
    if (overall >= 85) return "text-green-600 dark:text-green-400"
    if (overall >= 75) return "text-blue-600 dark:text-blue-400"
    if (overall >= 65) return "text-yellow-600 dark:text-yellow-400"
    if (overall >= 55) return "text-orange-600 dark:text-orange-400"
    return "text-red-600 dark:text-red-400"
  }

  const getAttributeColor = (value: number) => {
    if (value >= 85) return "bg-green-500"
    if (value >= 75) return "bg-blue-500"
    if (value >= 65) return "bg-yellow-500"
    if (value >= 55) return "bg-orange-500"
    return "bg-red-500"
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case "PG":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "SG":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "SF":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "PF":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "C":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-balance">{player.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getPositionColor(player.position)}>{player.position}</Badge>
              <Badge variant="outline">{player.descriptor}</Badge>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getOverallColor(player.overall)}`}>{player.overall}</div>
            <div className="text-xs text-muted-foreground">OVR</div>
          </div>
        </div>
      </CardHeader>

      {showDetailed && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground">Shooting</span>
                  <span className="font-medium">{player.attributes.shooting}</span>
                </div>
                <Progress value={player.attributes.shooting} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground">Defense</span>
                  <span className="font-medium">{player.attributes.defense}</span>
                </div>
                <Progress value={player.attributes.defense} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground">Rebounding</span>
                  <span className="font-medium">{player.attributes.rebounding}</span>
                </div>
                <Progress value={player.attributes.rebounding} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground">Passing</span>
                  <span className="font-medium">{player.attributes.passing}</span>
                </div>
                <Progress value={player.attributes.passing} className="h-2" />
              </div>

              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground">Athleticism</span>
                  <span className="font-medium">{player.attributes.athleticism}</span>
                </div>
                <Progress value={player.attributes.athleticism} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
