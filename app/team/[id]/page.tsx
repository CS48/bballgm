"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLeague, useStandings } from "@/lib/context/league-context"
import { leagueService } from "@/lib/services/league-service"
import { playerService } from "@/lib/services/player-service"
import { RosterTable } from "@/components/roster-table"
import type { Team } from "@/lib/types/database"

interface TeamPageProps {
  params: {
    id: string
  }
}

export default function TeamPage({ params }: TeamPageProps) {
  const { teams, isLoading: leagueLoading } = useLeague()
  const standings = useStandings()
  const [team, setTeam] = useState<Team | null>(null)
  const [teamRoster, setTeamRoster] = useState<any>(null)
  const [teamSeasonStats, setTeamSeasonStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const teamId = parseInt(params.id)

  // Show loading if league is still loading
  if (leagueLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading league data...</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        console.log('TeamPage: Fetching team data for teamId:', teamId)
        console.log('TeamPage: Available teams:', teams.length)
        
        // Find team in context
        const foundTeam = teams.find(t => t.team_id === teamId)
        if (!foundTeam) {
          console.error('Team not found for teamId:', teamId)
          setLoading(false)
          return
        }
        console.log('TeamPage: Found team:', foundTeam.name)
        setTeam(foundTeam)

        // Parse team season stats from current_season_stats JSON
        if (foundTeam.current_season_stats) {
          const seasonStats = JSON.parse(foundTeam.current_season_stats)
          console.log('TeamPage: Season stats:', seasonStats)
          setTeamSeasonStats(seasonStats)
        }

        // Fetch team roster with real player data
        console.log('TeamPage: Fetching roster...')
        const roster = await leagueService.getTeamRoster(teamId)
        console.log('TeamPage: Roster fetched:', roster)
        setTeamRoster(roster)
      } catch (error) {
        console.error('TeamPage: Failed to fetch team data:', error)
      } finally {
        console.log('TeamPage: Setting loading to false')
        setLoading(false)
      }
    }

    if (teams.length > 0) {
      console.log('TeamPage: Teams available, fetching data')
      fetchTeamData()
    } else {
      console.log('TeamPage: No teams available, setting loading to false')
      setLoading(false)
    }
  }, [teamId, teams])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading team data...</p>
        </div>
      </div>
    )
  }

  if (!team || !teamRoster) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Team Not Found</h1>
          <Link href="/" className="text-primary hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  // Get actual starters from roster data
  const starters = teamRoster?.players
    ? (() => {
        // If no players are marked as starters, fall back to top 5 by overall rating
        const playersWithStarterFlag = teamRoster.players.filter((player: any) => player.is_starter === 1)
        
        if (playersWithStarterFlag.length === 0) {
          return teamRoster.players
            .sort((a: any, b: any) => b.overall_rating - a.overall_rating)
            .slice(0, 5)
        }
        
        // Use actual starters
        return playersWithStarterFlag.sort((a: any, b: any) => {
          // Sort by position order: PG, SG, SF, PF, C
          const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C']
          return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position)
        })
      })()
    : []

  return (
    <div className="min-h-screen bg-background" style={{ paddingLeft: '3vw', paddingRight: '3vw', paddingTop: '3vh', paddingBottom: '3vh' }}>
      <div className="max-w-7xl mx-auto">
        {/* Team Info Section */}
        <div className="mb-4">
          {/* Team Info Card */}
          <div className="team-info-card hub-card--transparent" style={{ gap: '0', padding: '0.5rem' }}>
            <p className="team-city" style={{ fontSize: '1.5rem', margin: '0', color: '#000000' }}>{team.city}</p>
            <h2 className="team-name" style={{ fontSize: '2.25rem', margin: '0', lineHeight: '1' }}>{team.name.toUpperCase()}</h2>
            <div className="team-record" style={{ fontSize: '1rem', margin: '0' }}>
              <span>({team.wins}-{team.losses})</span>
              <span> | </span>
              <span>#{standings.overall?.findIndex(t => t.team_id === team.team_id) + 1 || 1} in {team.conference}ern Conference</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4" style={{ width: '320px' }}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="finances">Finances</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="flex flex-col gap-6">
              {/* Team Season Stats Card - Full Width Row */}
              <Card className="hub-card" style={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: '0' }}>
                <CardHeader style={{ padding: '0' }}>
                  <CardTitle>Team Season Averages</CardTitle>
                </CardHeader>
                <CardContent style={{ padding: '0' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">GP</th>
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
                          <td className="p-2">{(teamSeasonStats?.games || 0).toFixed(1)}</td>
                          <td className="p-2">{teamSeasonStats?.ppg?.toFixed(1) || '0.0'}</td>
                          <td className="p-2">{(teamSeasonStats?.fg_made || 0).toFixed(1)}</td>
                          <td className="p-2">{(teamSeasonStats?.fg_attempted || 0).toFixed(1)}</td>
                          <td className="p-2">{teamSeasonStats?.fg_pct ? (teamSeasonStats.fg_pct * 100).toFixed(1) + '%' : '0.0%'}</td>
                          <td className="p-2">{(teamSeasonStats?.three_made || 0).toFixed(1)}</td>
                          <td className="p-2">{(teamSeasonStats?.three_attempted || 0).toFixed(1)}</td>
                          <td className="p-2">{teamSeasonStats?.three_pct ? (teamSeasonStats.three_pct * 100).toFixed(1) + '%' : '0.0%'}</td>
                          <td className="p-2">{(teamSeasonStats?.ft_made || 0).toFixed(1)}</td>
                          <td className="p-2">{(teamSeasonStats?.ft_attempted || 0).toFixed(1)}</td>
                          <td className="p-2">{teamSeasonStats?.ft_pct ? (teamSeasonStats.ft_pct * 100).toFixed(1) + '%' : '0.0%'}</td>
                          <td className="p-2">{(teamSeasonStats?.oreb || 0).toFixed(1)}</td>
                          <td className="p-2">{(teamSeasonStats?.dreb || 0).toFixed(1)}</td>
                          <td className="p-2">{teamSeasonStats?.rpg?.toFixed(1) || '0.0'}</td>
                          <td className="p-2">{teamSeasonStats?.apg?.toFixed(1) || '0.0'}</td>
                          <td className="p-2">{teamSeasonStats?.tpg?.toFixed(1) || '0.0'}</td>
                          <td className="p-2">{teamSeasonStats?.spg?.toFixed(1) || '0.0'}</td>
                          <td className="p-2">{teamSeasonStats?.bpg?.toFixed(1) || '0.0'}</td>
                          <td className="p-2">{(teamSeasonStats?.pf || 0).toFixed(1)}</td>
                          <td className="p-2">{teamSeasonStats?.plus_minus?.toFixed(1) || '0.0'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Starters Header */}
              <Card className="hub-card" style={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: '0' }}>
                <CardHeader style={{ padding: '0' }}>
                  <CardTitle>Starters</CardTitle>
                </CardHeader>
              </Card>

              {/* Five Starter Boxes */}
              <div className="flex gap-4">
                {starters.map((player: any, index: number) => (
                  <Card key={player.player_id} className="flex-1 bg-transparent rounded-lg">
                    <CardContent className="p-4 text-center">
                      {/* Player Avatar */}
                      <div className="mb-3">
                        <img 
                          src="/placeholder-user.jpg" 
                          alt={player.name}
                          className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-gray-300"
                        />
                      </div>
                      
                      {/* Player Name */}
                      <h3 className="font-semibold text-lg mb-1">
                        <Link href={`/player/${player.player_id}`} className="hover:underline text-primary">
                          {player.name}
                        </Link>
                      </h3>
                      
                      {/* Position and Rating */}
                      <div className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">{player.position}</span>
                        <span> | </span>
                        <span>{player.overall_rating} ovr</span>
                      </div>
                      
                      {/* Key Stats */}
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-center" style={{ gap: '3rem' }}>
                          <span className="text-muted-foreground">PPG:</span>
                          <span className="font-medium">{player.current_stats?.ppg?.toFixed(1) || '0.0'}</span>
                        </div>
                        <div className="flex justify-center" style={{ gap: '3rem' }}>
                          <span className="text-muted-foreground">APG:</span>
                          <span className="font-medium">{player.current_stats?.apg?.toFixed(1) || '0.0'}</span>
                        </div>
                        <div className="flex justify-center" style={{ gap: '3rem' }}>
                          <span className="text-muted-foreground">RPG:</span>
                          <span className="font-medium">{player.current_stats?.rpg?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Roster Tab */}
          <TabsContent value="roster" className="mt-6">
            <RosterTable players={teamRoster?.players || []} />
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="mt-6">
            <Card className="hub-card hub-card--filled">
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Schedule content coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finances Tab */}
          <TabsContent value="finances" className="mt-6">
            <Card className="hub-card hub-card--filled">
              <CardHeader>
                <CardTitle>Finances</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Finances content coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
