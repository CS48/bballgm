"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { GM, League, Team } from "@/types/game"
import { useLeague } from "@/lib/context/league-context"

interface SettingsMenuProps {
  gm: GM
  league: League
  userTeam: Team
  onResetGame: () => void
  onBackToMenu: () => void
  onOpenDebugger?: () => void
}

export function SettingsMenu({ gm, league, userTeam, onResetGame, onBackToMenu, onOpenDebugger }: SettingsMenuProps) {
  const { deleteLeague, teams, players } = useLeague()
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const getTeamOverallRating = (team: Team): number => {
    const totalOverall = team.players.reduce((sum, player) => sum + player.overall, 0)
    return Math.round(totalOverall / team.players.length)
  }

  const getLeagueStats = () => {
    const totalPlayers = league.teams.reduce((sum, team) => sum + team.players.length, 0)
    const averageTeamRating =
      league.teams.reduce((sum, team) => sum + getTeamOverallRating(team), 0) / league.teams.length
    const totalGames = league.teams.reduce((sum, team) => sum + team.record.wins + team.record.losses, 0)

    return {
      totalPlayers,
      averageTeamRating: Math.round(averageTeamRating),
      totalGames,
    }
  }

  const leagueStats = getLeagueStats()

  const handleResetConfirm = () => {
    setShowResetDialog(false)
    onResetGame()
  }

  const handleDeleteLeague = async () => {
    try {
      await deleteLeague()
      setShowDeleteDialog(false)
      // The league context will handle clearing the state
      console.log('League deleted successfully')
    } catch (error) {
      console.error('Failed to delete league:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Settings</h2>
          <p className="text-muted-foreground">Manage your game preferences and data</p>
        </div>
        <Button variant="secondary" onClick={onBackToMenu}>
          Back to Menu
        </Button>
      </div>

      {/* GM Information */}
      <Card>
        <CardHeader>
          <CardTitle>GM Profile</CardTitle>
          <CardDescription>Your general manager information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">
                {gm.firstName} {gm.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{gm.createdAt.toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Team</p>
              <p className="font-medium">{userTeam.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Record</p>
              <p className="font-medium">
                {userTeam.record.wins}-{userTeam.record.losses}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* League Information */}
      <Card>
        <CardHeader>
          <CardTitle>League Information</CardTitle>
          <CardDescription>Details about your current league</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">League Name</p>
              <p className="font-medium">{league.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Teams</p>
              <p className="font-medium">{league.teams.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Players</p>
              <p className="font-medium">{leagueStats.totalPlayers}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground mb-3">League Teams</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {league.teams.map((team) => (
                <div key={team.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="font-medium">{team.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{getTeamOverallRating(team)} OVR</Badge>
                    {team.id === userTeam.id && <Badge variant="default">Your Team</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Game Statistics</CardTitle>
          <CardDescription>Your performance and league stats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{userTeam.record.wins}</p>
              <p className="text-sm text-muted-foreground">Wins</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{userTeam.record.losses}</p>
              <p className="text-sm text-muted-foreground">Losses</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{getTeamOverallRating(userTeam)}</p>
              <p className="text-sm text-muted-foreground">Team Rating</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {userTeam.record.wins + userTeam.record.losses > 0
                  ? Math.round((userTeam.record.wins / (userTeam.record.wins + userTeam.record.losses)) * 100)
                  : 0}
                %
              </p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Game Actions</CardTitle>
          <CardDescription>Reset your progress or start over</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <h4 className="font-medium text-destructive mb-2">Reset Game</h4>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete your current GM profile, league, and all progress. You'll start over from the
              beginning with GM creation.
            </p>

            <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Reset Game</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to reset?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete:
                    <br />
                    <br />• Your GM profile ({gm.firstName} {gm.lastName})
                    <br />• Your current league ({league.name})
                    <br />• Your team ({userTeam.name})
                    <br />• All game progress and statistics
                    <br />
                    <br />
                    You will need to create a new GM and league from scratch.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetConfirm} className="bg-destructive hover:bg-destructive/90">
                    Yes, Reset Game
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Development Tools */}
      {onOpenDebugger && (
        <Card>
          <CardHeader>
            <CardTitle>Development Tools</CardTitle>
            <CardDescription>Debug and test the simulation engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Engine Tester</h4>
              <p className="text-sm text-blue-700 mb-4">
                Access the simulation engine testing tools to verify game mechanics, database integrity, and standings calculations.
              </p>
              <Button onClick={onOpenDebugger} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                Open Engine Tester
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* League Management */}
      <Card>
        <CardHeader>
          <CardTitle>League Management</CardTitle>
          <CardDescription>Manage your current league</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* League Info */}
          <div className="space-y-2">
            <h4 className="font-semibold">Current League</h4>
            <div className="text-sm space-y-1">
              <div>Teams: {teams.length}</div>
              <div>Players: {players.length}</div>
              <div>Games Played: {leagueStats.totalGames / 2}</div>
            </div>
          </div>
          
          <Separator />
          
          {/* Danger Zone */}
          <div className="space-y-2">
            <h4 className="font-semibold text-red-600">Danger Zone</h4>
            <p className="text-sm text-muted-foreground">
              Irreversible actions that will delete data
            </p>
            
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Delete League
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete League</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your entire league including all teams, players, and game data. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteLeague} className="bg-red-600 hover:bg-red-700">
                    Delete League
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About Basketball GM</CardTitle>
          <CardDescription>Game information and features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p>
              <strong>Basketball GM</strong> is a web-based basketball management simulation where you create a GM
              profile, manage an 8-team league, and compete against AI opponents.
            </p>
            <p>
              <strong>Features:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Create and customize your GM profile</li>
              <li>Generate random 8-team leagues with US cities</li>
              <li>Manage teams with 5 players each having unique attributes</li>
              <li>Simulate realistic basketball games with play-by-play action</li>
              <li>View detailed player statistics and team performance</li>
              <li>Reset and start new leagues anytime</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
