"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { GM, League, Team } from "@/types/game"

interface HomeHubProps {
  gm: GM
  league: League
  userTeam: Team
  onNavigateToRoster: () => void
  onNavigateToGameSelect: () => void
  onNavigateToSettings: () => void
}

export function HomeHub({ gm, league, userTeam, onNavigateToRoster, onNavigateToGameSelect, onNavigateToSettings }: HomeHubProps) {
  const [selectedMatchup, setSelectedMatchup] = useState(0)
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0)

  // Sample matchups data
  const matchups = [
    { away: "Boston Celtics", home: "New York Knicks", awayRecord: "52-30", homeRecord: "30-52" },
    { away: "Dallas Mavericks", home: "Los Angeles Lakers", awayRecord: "41-41", homeRecord: "45-37" },
    { away: "Miami Heat", home: "Chicago Bulls", awayRecord: "38-44", homeRecord: "42-40" },
    { away: "Phoenix Suns", home: "Denver Nuggets", awayRecord: "48-34", homeRecord: "55-27" },
  ]

  // Team abbreviations mapping
  const teamAbbreviations: { [key: string]: string } = {
    "Boston Celtics": "BOS",
    "New York Knicks": "NYK", 
    "Dallas Mavericks": "DAL",
    "Los Angeles Lakers": "LAL",
    "Miami Heat": "MIA",
    "Chicago Bulls": "CHI",
    "Phoenix Suns": "PHX",
    "Denver Nuggets": "DEN",
  }

  // Sample news data
  const newsItems = [
    {
      title: "Lakers bounce back against Warriors",
      content: "LeBron James scores 40 points as the Lakers defeat the Warriors 121-115 in a thrilling game. The Lakers showed great resilience after their previous loss.",
      type: "game-recap"
    },
    {
      title: "Rookie sensation continues hot streak",
      content: "First-year player has been averaging 25+ points over the last 10 games, making a strong case for Rookie of the Year honors.",
      type: "league-news"
    },
    {
      title: "Trade deadline approaches",
      content: "Several teams are reportedly looking to make moves before the trade deadline. Key players may be on the move.",
      type: "league-news"
    }
  ]

  // Get starting 5 players
  const starters = userTeam.players.slice(0, 5)

  // Sort teams by record for standings
  const sortedTeams = [...league.teams].sort((a, b) => {
    const aWinPct = a.record.wins / (a.record.wins + a.record.losses)
    const bWinPct = b.record.wins / (b.record.wins + b.record.losses)
    return bWinPct - aWinPct
  })

  const nextMatchup = () => {
    setSelectedMatchup((prev) => (prev + 1) % matchups.length)
  }

  const prevMatchup = () => {
    setSelectedMatchup((prev) => (prev - 1 + matchups.length) % matchups.length)
  }

  const nextNews = () => {
    setCurrentNewsIndex((prev) => (prev + 1) % newsItems.length)
    resetAutoAdvance()
  }

  const prevNews = () => {
    setCurrentNewsIndex((prev) => (prev - 1 + newsItems.length) % newsItems.length)
    resetAutoAdvance()
  }

  // Auto-advance news carousel every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % newsItems.length)
    }, 10000)

    return () => clearInterval(interval)
  }, [newsItems.length, currentNewsIndex])

  const resetAutoAdvance = () => {
    // This will trigger the useEffect to restart the interval
    setCurrentNewsIndex((prev) => prev)
  }

  return (
    <div className="min-h-screen bg-background" style={{ paddingLeft: '6vw', paddingRight: '6vw', paddingTop: '3vh', paddingBottom: '3vh' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-6">
          <nav className="flex items-center gap-6">
            <a href="#" className="text-foreground font-medium border-b-2 border-primary pb-1">Home</a>
            <button 
              onClick={onNavigateToRoster}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Roster
            </button>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Schedule</a>
            <button 
              onClick={onNavigateToSettings}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Settings
            </button>
          </nav>
        </div>

        {/* CSS Grid Layout */}
        <div className="grid grid-cols-3 grid-rows-6 gap-4" style={{ 
          height: 'calc(100vh - 3vh - 3vh - 60px)', // Full viewport minus top/bottom padding minus header height
          minHeight: '600px',
          maxHeight: '900px'
        }}>
          {/* Team Name/Record Card - Row 1, Col 1 */}
          <div className="row-start-1 row-span-1 col-start-1 col-span-1 team-info-card hub-card--transparent" style={{ gap: '0', padding: '0.5rem' }}>
            <p className="team-city" style={{ fontSize: '1.5rem', margin: '0', color: '#000000' }}>{userTeam.city}</p>
            <h2 className="team-name" style={{ fontSize: '2.25rem', margin: '0', lineHeight: '1' }}>{userTeam.name.replace(userTeam.city, '').trim().toUpperCase()}</h2>
            <div className="team-record" style={{ fontSize: '1rem', margin: '0' }}>
              <span>({userTeam.record.wins}-{userTeam.record.losses})</span>
              <span> | </span>
              <span>#{sortedTeams.findIndex(t => t.id === userTeam.id) + 1} in Conference</span>
            </div>
          </div>

          {/* Starters/Conference Standings Card - Rows 2-6, Col 1 */}
          <Card className="row-start-2 row-span-5 col-start-1 col-span-1 hub-card hub-card--filled">
            <CardHeader className="flex-shrink-0 flex flex-col h-full">
              <Tabs defaultValue="starters" className="w-full flex flex-col h-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="starters">Starters</TabsTrigger>
                  <TabsTrigger value="standings">Conf. Standings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="starters" className="mt-4 flex-1 h-full">
                  <div className="tab-content tab-content--transparent">
                    {/* Team Stats Rings */}
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
                              strokeDasharray={`${Math.round(userTeam.players.reduce((sum, p) => sum + p.overall, 0) / userTeam.players.length)}, 100`}
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-800">
                              {Math.round(userTeam.players.reduce((sum, p) => sum + p.overall, 0) / userTeam.players.length)}
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
                              strokeDasharray="80, 100"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-800">80</span>
                          </div>
                        </div>
                        <p className="stat-ring-label">Offense</p>
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
                              strokeDasharray="90, 100"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-800">90</span>
                          </div>
                        </div>
                        <p className="stat-ring-label">Defense</p>
                      </div>
                    </div>

                    {/* Starting Lineup */}
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
                        {starters.map((player, index) => (
                          <tr key={player.id} className="border-b border-gray-200">
                            {/* Column 1: Name (fills remaining width) */}
                            <td className="player-name-cell">
                              <p className="font-medium">{player.name}</p>
                              <div className="text-sm text-muted-foreground">
                                <span>{player.position}</span>
                                <span> | </span>
                                <span>{player.overall} ovr</span>
                              </div>
                            </td>
                            
                            {/* Column 2: PPG (hugs content) */}
                            <td className="starters-table-cell">11.9</td>
                            
                            {/* Column 3: APG (hugs content) */}
                            <td className="starters-table-cell">2.1</td>
                            
                            {/* Column 4: RPG (hugs content) */}
                            <td className="starters-table-cell">5.7</td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="standings" className="mt-4 flex-1 h-full">
                  <div className="tab-content tab-content--transparent">
                    {sortedTeams.slice(0, 8).map((team, index) => (
                      <div key={team.id} className={`flex justify-between items-center p-2 rounded ${team.id === userTeam.id ? 'bg-primary/10' : 'bg-muted'}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">#{index + 1}</span>
                          <span className="font-medium">{team.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {team.record.wins}-{team.record.losses}
                        </span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>

          {/* Today's Matchups Carousel - Row 1, Cols 2-3 */}
          <div className="row-start-1 row-span-1 col-start-2 col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Today's Games</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={prevMatchup}>‹</Button>
                <span className="text-sm text-muted-foreground">Sim all</span>
                <Button variant="outline" size="sm" onClick={nextMatchup}>›</Button>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto">
              {matchups.map((matchup, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 p-3 rounded cursor-pointer transition-colors w-[105px] ${
                    index === selectedMatchup ? 'border border-primary bg-primary/5' : 'border-0'
                  }`}
                  onClick={() => setSelectedMatchup(index)}
                >
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{teamAbbreviations[matchup.away] || matchup.away}</span>
                      <span className="text-muted-foreground">{matchup.awayRecord}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{teamAbbreviations[matchup.home] || matchup.home}</span>
                      <span className="text-muted-foreground">{matchup.homeRecord}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matchup Detail Card - Rows 2-4, Cols 2-3 */}
          <Card className="row-start-2 row-span-3 col-start-2 col-span-2 flex flex-col">
            <CardContent className="p-6 flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">
                  {matchups[selectedMatchup].away} vs. {matchups[selectedMatchup].home}
                </div>
                <div className="flex justify-center gap-4 text-muted-foreground">
                  <span>Points per game</span>
                  <span>•</span>
                  <span>Points per game</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* News Carousel - Rows 5-6, Cols 2-3 */}
          <Card className="row-start-5 row-span-2 col-start-2 col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Last Game</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={prevNews}>‹</Button>
                  <Button variant="outline" size="sm" onClick={nextNews}>›</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="text-lg font-bold">{newsItems[currentNewsIndex].title}</h3>
                <p className="text-muted-foreground">{newsItems[currentNewsIndex].content}</p>
                <div className="flex justify-center">
                  <div className="flex gap-1">
                    {newsItems.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentNewsIndex ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
