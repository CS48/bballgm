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
  const [teamRatings, setTeamRatings] = useState({
    overall: 0,
    interiorShooting: 0,
    threePointShooting: 0,
    passing: 0,
    onBallDefense: 0
  })
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

        // Calculate team ratings from player attributes
        if (roster.players && roster.players.length > 0) {
          console.log('TeamPage: Calculating ratings for', roster.players.length, 'players')
          const players = roster.players
          const overallRatings = players.map(p => p.overall_rating)
          const interiorShooting = players.map(p => p.inside_shot)
          const threePointShooting = players.map(p => p.three_point_shot)
          const passing = players.map(p => p.pass)
          const onBallDefense = players.map(p => p.on_ball_defense)

          setTeamRatings({
            overall: Math.round(overallRatings.reduce((a, b) => a + b, 0) / overallRatings.length),
            interiorShooting: Math.round(interiorShooting.reduce((a, b) => a + b, 0) / interiorShooting.length),
            threePointShooting: Math.round(threePointShooting.reduce((a, b) => a + b, 0) / threePointShooting.length),
            passing: Math.round(passing.reduce((a, b) => a + b, 0) / passing.length),
            onBallDefense: Math.round(onBallDefense.reduce((a, b) => a + b, 0) / onBallDefense.length)
          })
          console.log('TeamPage: Ratings calculated successfully')
        } else {
          console.log('TeamPage: No players found in roster')
        }
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
    <div className="min-h-screen bg-background" style={{ paddingLeft: '6vw', paddingRight: '6vw', paddingTop: '3vh', paddingBottom: '3vh' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-6">
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-foreground font-medium border-b-2 border-primary pb-1">Home</Link>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Roster</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Schedule</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Settings</a>
          </nav>
        </div>

        {/* Team Info and Ratings Section */}
        <div className="flex gap-6 mb-8">
          {/* Team Info Card */}
          <div className="flex-1 team-info-card hub-card--transparent" style={{ gap: '0', padding: '0.5rem' }}>
            <p className="team-city" style={{ fontSize: '1.5rem', margin: '0', color: '#000000' }}>{team.city}</p>
            <h2 className="team-name" style={{ fontSize: '2.25rem', margin: '0', lineHeight: '1' }}>{team.name.toUpperCase()}</h2>
            <div className="team-record" style={{ fontSize: '1rem', margin: '0' }}>
              <span>({team.wins}-{team.losses})</span>
              <span> | </span>
              <span>#{standings.overall?.findIndex(t => t.team_id === team.team_id) + 1 || 1} in {team.conference}ern Conference</span>
            </div>
          </div>

          {/* Team Ratings */}
          <div className="flex-1">
            <div className="team-stats-rings">
              <div className="stat-ring">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-300"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      stroke="#333333"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${teamRatings.overall}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-800">
                      {teamRatings.overall}
                    </span>
                  </div>
                </div>
                <p className="stat-ring-label">Overall</p>
              </div>
              <div className="stat-ring">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-300"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      stroke="#333333"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${teamRatings.interiorShooting}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-800">{teamRatings.interiorShooting}</span>
                  </div>
                </div>
                <p className="stat-ring-label">Interior Shooting</p>
              </div>
              <div className="stat-ring">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-300"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      stroke="#333333"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${teamRatings.threePointShooting}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-800">{teamRatings.threePointShooting}</span>
                  </div>
                </div>
                <p className="stat-ring-label">3P Shooting</p>
              </div>
              <div className="stat-ring">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-300"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      stroke="#333333"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${teamRatings.passing}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-800">{teamRatings.passing}</span>
                  </div>
                </div>
                <p className="stat-ring-label">Passing</p>
              </div>
              <div className="stat-ring">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-300"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      stroke="#333333"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${teamRatings.onBallDefense}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-800">{teamRatings.onBallDefense}</span>
                  </div>
                </div>
                <p className="stat-ring-label">On-Ball Defense</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="finances">Finances</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="flex flex-col gap-6">
              {/* Team Season Stats Card - Full Width Row */}
              <Card className="hub-card hub-card--filled">
                <CardHeader>
                  <CardTitle>Team Season Stats</CardTitle>
                </CardHeader>
                <CardContent>
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
                          <th className="text-left p-2">DD</th>
                          <th className="text-left p-2">TD</th>
                          <th className="text-left p-2">+/-</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2">{teamSeasonStats?.games || 0}</td>
                          <td className="p-2">{teamSeasonStats?.ppg?.toFixed(1) || '0.0'}</td>
                          <td className="p-2">{teamSeasonStats?.fg_made || 0}</td>
                          <td className="p-2">{teamSeasonStats?.fg_attempted || 0}</td>
                          <td className="p-2">{teamSeasonStats?.fg_pct ? (teamSeasonStats.fg_pct * 100).toFixed(1) + '%' : '0.0%'}</td>
                          <td className="p-2">{teamSeasonStats?.three_made || 0}</td>
                          <td className="p-2">{teamSeasonStats?.three_attempted || 0}</td>
                          <td className="p-2">{teamSeasonStats?.three_pct ? (teamSeasonStats.three_pct * 100).toFixed(1) + '%' : '0.0%'}</td>
                          <td className="p-2">{teamSeasonStats?.ft_made || 0}</td>
                          <td className="p-2">{teamSeasonStats?.ft_attempted || 0}</td>
                          <td className="p-2">{teamSeasonStats?.ft_pct ? (teamSeasonStats.ft_pct * 100).toFixed(1) + '%' : '0.0%'}</td>
                          <td className="p-2">{teamSeasonStats?.oreb || 0}</td>
                          <td className="p-2">{teamSeasonStats?.dreb || 0}</td>
                          <td className="p-2">{teamSeasonStats?.rpg?.toFixed(1) || '0.0'}</td>
                          <td className="p-2">{teamSeasonStats?.apg?.toFixed(1) || '0.0'}</td>
                          <td className="p-2">{teamSeasonStats?.tpg?.toFixed(1) || '0.0'}</td>
                          <td className="p-2">{teamSeasonStats?.spg?.toFixed(1) || '0.0'}</td>
                          <td className="p-2">{teamSeasonStats?.bpg?.toFixed(1) || '0.0'}</td>
                          <td className="p-2">{teamSeasonStats?.pf || 0}</td>
                          <td className="p-2">{teamSeasonStats?.dd || 0}</td>
                          <td className="p-2">{teamSeasonStats?.td || 0}</td>
                          <td className="p-2">{teamSeasonStats?.plus_minus?.toFixed(1) || '0.0'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Second Row: Three Cards */}
              <div className="grid grid-cols-3 gap-6">
                {/* Starters Card */}
                <Card className="hub-card hub-card--filled">
                <CardHeader>
                  <CardTitle>Starters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="starters-table-container">
                    <table className="starters-table">
                      <thead>
                        <tr>
                          <th className="starters-table-header" style={{ fontSize: '0.75rem' }}>Name</th>
                          <th className="w-auto text-right pr-2" style={{ fontSize: '0.75rem' }}>PPG</th>
                          <th className="w-auto text-right pr-2" style={{ fontSize: '0.75rem' }}>APG</th>
                          <th className="w-auto text-right pr-2" style={{ fontSize: '0.75rem' }}>RPG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {starters.map((player: any, index: number) => (
                          <tr key={player.player_id} className="border-b border-gray-200">
                            <td className="player-name-cell">
                              <p className="font-medium">{player.name}</p>
                              <div className="text-sm text-muted-foreground">
                                <span>{player.position}</span>
                                <span> | </span>
                                <span>{player.overall_rating} ovr</span>
                              </div>
                            </td>
                            <td className="starters-table-cell">
                              {player.current_stats?.ppg?.toFixed(1) || '0.0'}
                            </td>
                            <td className="starters-table-cell">
                              {player.current_stats?.apg?.toFixed(1) || '0.0'}
                            </td>
                            <td className="starters-table-cell">
                              {player.current_stats?.rpg?.toFixed(1) || '0.0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

                {/* Personnel Card */}
                <Card className="hub-card hub-card--filled">
                  <CardHeader>
                    <CardTitle>Personnel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Feature not available</p>
                  </CardContent>
                </Card>

                {/* Trade Block Card */}
                <Card className="hub-card hub-card--filled">
                  <CardHeader>
                    <CardTitle>Trade Block</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Feature not available</p>
                  </CardContent>
                </Card>
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
