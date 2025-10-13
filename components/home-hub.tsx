"use client"

import { useState } from "react"
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
  }

  const prevNews = () => {
    setCurrentNewsIndex((prev) => (prev - 1 + newsItems.length) % newsItems.length)
  }

  return (
    <div className="min-h-screen bg-background p-4">
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
        <div className="grid grid-cols-3 grid-rows-6 gap-4 h-[800px]">
          {/* Team Name/Record Card - Row 1, Col 1 */}
          <div className="row-start-1 row-span-1 col-start-1 col-span-1 flex flex-col justify-start h-full">
            <p className="text-sm text-muted-foreground">{userTeam.city}</p>
            <h2 className="text-2xl font-bold">{userTeam.name.toUpperCase()}</h2>
            <p className="text-sm text-muted-foreground">
              ({userTeam.record.wins}-{userTeam.record.losses}) | #{sortedTeams.findIndex(t => t.id === userTeam.id) + 1}
            </p>
          </div>

          {/* Starters/Conference Standings Card - Rows 2-6, Col 1 */}
          <Card className="row-start-2 row-span-5 col-start-1 col-span-1">
            <CardHeader>
              <Tabs defaultValue="starters" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="starters">Starters</TabsTrigger>
                  <TabsTrigger value="standings">Conf. Standings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="starters" className="mt-4">
                  <div className="space-y-4">
                    {/* Team Stats Circles */}
                    <div className="flex justify-around mb-4">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-2">
                          {Math.round(userTeam.players.reduce((sum, p) => sum + p.overall, 0) / userTeam.players.length)}
                        </div>
                        <p className="text-sm font-medium">Overall</p>
                      </div>
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-2">
                          80
                        </div>
                        <p className="text-sm font-medium">Offense</p>
                      </div>
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xl font-bold mx-auto mb-2">
                          90
                        </div>
                        <p className="text-sm font-medium">Defense</p>
                      </div>
                    </div>

                    {/* Starting Lineup */}
                    <div className="space-y-2">
                      {starters.map((player, index) => (
                        <div key={player.id} className="flex justify-between items-center p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{player.name}</span>
                            <span className="text-sm text-muted-foreground">{player.position}</span>
                            <span className="text-sm font-bold text-primary">{player.overall} ovr</span>
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>11.9 PPG</span>
                            <span>5.7 RPG</span>
                            <span>2.1 APG</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="standings" className="mt-4">
                  <div className="space-y-2">
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

          {/* Today's Matchups Carousel + Detail Card - Rows 1-4, Cols 2-3 */}
          <div className="row-start-1 row-span-4 col-start-2 col-span-2 flex flex-col space-y-4">
            {/* Matchups Carousel */}
            <div className="flex-shrink-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Today's Games</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={prevMatchup}>‹</Button>
                  <span className="text-sm text-muted-foreground">Sim all</span>
                  <Button variant="outline" size="sm" onClick={nextMatchup}>›</Button>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {matchups.map((matchup, index) => (
                  <div
                    key={index}
                    className={`flex-shrink-0 p-3 rounded border cursor-pointer transition-colors ${
                      index === selectedMatchup ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                    onClick={() => setSelectedMatchup(index)}
                  >
                    <div className="text-sm">
                      <div className="font-medium">{matchup.away} {matchup.awayRecord}</div>
                      <div className="text-muted-foreground">@ {matchup.home} {matchup.homeRecord}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Matchup Detail Card */}
            <Card className="flex-1 flex flex-col">
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
          </div>

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
