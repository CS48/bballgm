"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLeague, useTeams, useStandings } from "@/lib/context/league-context"
import type { GM } from "@/types/game"
import type { Team } from "@/lib/types/database"

interface HomeHubProps {
  gm: GM
  userTeam: Team
  onNavigateToRoster: () => void
  onNavigateToGameSelect: () => void
  onNavigateToSettings: () => void
}

export function HomeHub({ gm, userTeam, onNavigateToRoster, onNavigateToGameSelect, onNavigateToSettings }: HomeHubProps) {
  const { teams, simulateGame, simulateMultipleGames, advanceToNextGameDay, currentGameDay } = useLeague()
  const standings = useStandings()
  const [selectedMatchup, setSelectedMatchup] = useState(0)
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [gameResults, setGameResults] = useState<{[key: string]: {homeScore: number, awayScore: number}}>({})
  const [allGamesCompleted, setAllGamesCompleted] = useState(false)

  // Debug: Log when currentGameDay changes
  useEffect(() => {
    console.log('HomeHub: currentGameDay updated:', currentGameDay)
    if (currentGameDay?.games) {
      console.log('HomeHub: Games for current day:', currentGameDay.games.length)
    }
  }, [currentGameDay])
  
  // Pagination settings
  const matchupsPerPage = 6 // Show 6 matchups per page

  // Generate matchups from today's games or fallback to sample matchups
  const matchups = useMemo(() => {
    if (currentGameDay && currentGameDay.games && currentGameDay.games.length > 0) {
      // Use real games from today's schedule
      console.log(`🏀 HomeHub: Displaying ${currentGameDay.games.length} real games for today`);
      console.log(`🏀 HomeHub: First 3 games:`, currentGameDay.games.slice(0, 3).map(g => 
        `Team ${g.home_team_id} vs Team ${g.away_team_id}`
      ));
      
      return currentGameDay.games.map(game => {
        const homeTeam = teams.find(t => t.team_id === game.home_team_id)
        const awayTeam = teams.find(t => t.team_id === game.away_team_id)
        
        if (!homeTeam || !awayTeam) return null
        
        return {
          away: `${awayTeam.city} ${awayTeam.name}`,
          home: `${homeTeam.city} ${homeTeam.name}`,
          awayRecord: `${awayTeam.wins}-${awayTeam.losses}`,
          homeRecord: `${homeTeam.wins}-${homeTeam.losses}`,
          awayTeamId: awayTeam.team_id,
          homeTeamId: homeTeam.team_id,
          gameId: game.game_id,
          completed: game.completed
        }
      }).filter(Boolean)
    } else {
      // Fallback to sample matchups if no games scheduled
      const otherTeams = teams.filter(team => team.team_id !== userTeam.team_id)
      const userTeamMatchup = {
        away: `${userTeam.city} ${userTeam.name}`,
        home: `${otherTeams[0].city} ${otherTeams[0].name}`,
        awayRecord: `${userTeam.wins}-${userTeam.losses}`,
        homeRecord: `${otherTeams[0].wins}-${otherTeams[0].losses}`,
        awayTeamId: userTeam.team_id,
        homeTeamId: otherTeams[0].team_id,
        completed: false
      }
      
      const otherMatchups = otherTeams.slice(1, 7).map((team, index) => {
        const opponent = otherTeams[(index + 6) % otherTeams.length]
        return {
          away: `${team.city} ${team.name}`,
          home: `${opponent.city} ${opponent.name}`,
          awayRecord: `${team.wins}-${team.losses}`,
          homeRecord: `${opponent.wins}-${opponent.losses}`,
          awayTeamId: team.team_id,
          homeTeamId: opponent.team_id,
          completed: false
        }
      })
      
      return [userTeamMatchup, ...otherMatchups]
    }
  }, [currentGameDay, teams, userTeam])

  // Calculate total pages after matchups are defined
  const totalPages = Math.ceil(matchups.length / matchupsPerPage)

  // Team abbreviations mapping for all 30 teams
  const teamAbbreviations: { [key: string]: string } = {
    // Eastern Conference
    "Boston Celtics": "BOS",
    "Brooklyn Nets": "BKN",
    "New York Knicks": "NYK",
    "Philadelphia 76ers": "PHI",
    "Toronto Raptors": "TOR",
    "Chicago Bulls": "CHI",
    "Cleveland Cavaliers": "CLE",
    "Detroit Pistons": "DET",
    "Indiana Pacers": "IND",
    "Milwaukee Bucks": "MIL",
    "Atlanta Hawks": "ATL",
    "Charlotte Hornets": "CHA",
    "Miami Heat": "MIA",
    "Orlando Magic": "ORL",
    "Washington Wizards": "WAS",
    // Western Conference
    "Dallas Mavericks": "DAL",
    "Houston Rockets": "HOU",
    "Memphis Grizzlies": "MEM",
    "New Orleans Pelicans": "NOP",
    "San Antonio Spurs": "SAS",
    "Denver Nuggets": "DEN",
    "Minnesota Timberwolves": "MIN",
    "Oklahoma City Thunder": "OKC",
    "Portland Trail Blazers": "POR",
    "Utah Jazz": "UTA",
    "Golden State Warriors": "GSW",
    "Los Angeles Clippers": "LAC",
    "Los Angeles Lakers": "LAL",
    "Phoenix Suns": "PHX",
    "Sacramento Kings": "SAC"
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

  // Get starting 5 players - for now, create placeholder data since we don't have players loaded
  const starters = [
    { id: 1, name: "Player 1", position: "PG", overall: 85 },
    { id: 2, name: "Player 2", position: "SG", overall: 82 },
    { id: 3, name: "Player 3", position: "SF", overall: 88 },
    { id: 4, name: "Player 4", position: "PF", overall: 80 },
    { id: 5, name: "Player 5", position: "C", overall: 90 }
  ]

  // Use standings from database context instead of sorting league teams
  const easternStandings = standings.eastern || []
  const westernStandings = standings.western || []

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages)
  }

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)
  }
  
  // Get current page matchups
  const currentPageMatchups = matchups.slice(
    currentPage * matchupsPerPage, 
    (currentPage + 1) * matchupsPerPage
  )

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

  const handleSimulateGame = async (matchup: any) => {
    try {
      await simulateGame(matchup.homeTeamId, matchup.awayTeamId)
      
      // Generate random scores for display (in real implementation, this would come from the simulation)
      const homeScore = Math.floor(Math.random() * 30) + 85
      const awayScore = Math.floor(Math.random() * 30) + 85
      
      const gameKey = `${matchup.homeTeamId}-${matchup.awayTeamId}`
      setGameResults(prev => ({
        ...prev,
        [gameKey]: { homeScore, awayScore }
      }))
      
      console.log(`Simulated game: ${matchup.away} vs ${matchup.home}`)
      
      // Check if all games are completed
      checkAllGamesCompleted()
    } catch (error) {
      console.error('Failed to simulate game:', error)
    }
  }

  const handleSimulateAllGames = async () => {
    try {
      const games = matchups.map(matchup => ({
        homeTeamId: matchup.homeTeamId,
        awayTeamId: matchup.awayTeamId
      }))
      await simulateMultipleGames(games)
      
      // Generate random scores for all games
      const newResults: {[key: string]: {homeScore: number, awayScore: number}} = {}
      matchups.forEach(matchup => {
        const homeScore = Math.floor(Math.random() * 30) + 85
        const awayScore = Math.floor(Math.random() * 30) + 85
        const gameKey = `${matchup.homeTeamId}-${matchup.awayTeamId}`
        newResults[gameKey] = { homeScore, awayScore }
      })
      
      setGameResults(newResults)
      setAllGamesCompleted(true)
      console.log('Simulated all games')
    } catch (error) {
      console.error('Failed to simulate all games:', error)
    }
  }

  const checkAllGamesCompleted = () => {
    const totalGames = matchups.length
    const completedGames = Object.keys(gameResults).length
    setAllGamesCompleted(completedGames >= totalGames)
  }

  const handleProceedToNextDay = async () => {
    console.log('HomeHub: Proceeding to next day...')
    console.log('HomeHub: Current game day before advance:', currentGameDay)
    
    // Reset local UI state
    setGameResults({})
    setAllGamesCompleted(false)
    setSelectedMatchup(0)
    setCurrentPage(0)
    
    // Advance to next game day in the database/calendar
    try {
      await advanceToNextGameDay()
      console.log('HomeHub: Advanced to next game day successfully')
    } catch (error) {
      console.error('HomeHub: Failed to advance to next day:', error)
    }
  }

  // Calculate updated team record based on game results
  const getUpdatedTeamRecord = (teamId: number) => {
    let wins = userTeam.wins
    let losses = userTeam.losses
    
    // Check if this team played any games today
    Object.entries(gameResults).forEach(([gameKey, result]) => {
      const [homeTeamId, awayTeamId] = gameKey.split('-').map(Number)
      
      if (teamId === homeTeamId || teamId === awayTeamId) {
        const isHomeTeam = teamId === homeTeamId
        const teamScore = isHomeTeam ? result.homeScore : result.awayScore
        const opponentScore = isHomeTeam ? result.awayScore : result.homeScore
        
        if (teamScore > opponentScore) {
          wins++
        } else {
          losses++
        }
      }
    })
    
    return { wins, losses }
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
            <h2 className="team-name" style={{ fontSize: '2.25rem', margin: '0', lineHeight: '1' }}>{userTeam.name.toUpperCase()}</h2>
            <div className="team-record" style={{ fontSize: '1rem', margin: '0' }}>
              {(() => {
                const updatedRecord = getUpdatedTeamRecord(userTeam.team_id)
                return (
                  <>
                    <span>({updatedRecord.wins}-{updatedRecord.losses})</span>
                    <span> | </span>
                    <span>#{standings.overall?.findIndex(t => t.team_id === userTeam.team_id) + 1 || 1} in League</span>
                  </>
                )
              })()}
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
                              strokeDasharray={`85, 100`}
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-800">
                              85
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
                    <div className="space-y-4 h-full overflow-y-auto">
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Eastern Conference</h4>
                        <div className="space-y-1">
                          {easternStandings.map((team, index) => (
                            <div key={team.team_id} className={`flex justify-between items-center p-2 rounded ${team.team_id === userTeam.team_id ? 'bg-primary/10' : 'bg-muted'}`}>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">#{index + 1}</span>
                                <span className="font-medium">{team.city} {team.name}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {team.wins}-{team.losses}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Western Conference</h4>
                        <div className="space-y-1">
                          {westernStandings.map((team, index) => (
                            <div key={team.team_id} className={`flex justify-between items-center p-2 rounded ${team.team_id === userTeam.team_id ? 'bg-primary/10' : 'bg-muted'}`}>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">#{index + 1}</span>
                                <span className="font-medium">{team.city} {team.name}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {team.wins}-{team.losses}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>

          {/* Today's Matchups Carousel - Row 1, Cols 2-3 */}
          <div className="row-start-1 row-span-1 col-start-2 col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold" style={{ fontSize: '1rem' }}>
                {currentGameDay?.date_display || 'Today\'s'} Matchups
              </h3>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={allGamesCompleted ? handleProceedToNextDay : handleSimulateAllGames}
                >
                  {allGamesCompleted ? 'Proceed to next day' : 'Sim all'}
                </Button>
                <Button variant="outline" size="sm" onClick={prevPage}>‹</Button>
                
                {/* Page indicators */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i === currentPage ? 'bg-black' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                
                <Button variant="outline" size="sm" onClick={nextPage}>›</Button>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto">
              {currentPageMatchups.map((matchup, index) => {
                const globalIndex = currentPage * matchupsPerPage + index
                return (
                  <div
                    key={globalIndex}
                    className={`flex-shrink-0 p-3 rounded cursor-pointer transition-colors w-[105px] ${
                      globalIndex === selectedMatchup ? 'border border-primary bg-primary/5' : 'border-0'
                    }`}
                    onClick={() => {
                      setSelectedMatchup(globalIndex)
                    }}
                  >
                    <div className="text-sm space-y-2">
                      {(() => {
                        const gameKey = `${matchup.homeTeamId}-${matchup.awayTeamId}`
                        const gameResult = gameResults[gameKey]
                        const isCompleted = !!gameResult
                        
                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{teamAbbreviations[matchup.away] || matchup.away}</span>
                              <span className="text-muted-foreground">
                                {isCompleted ? gameResult.awayScore : matchup.awayRecord}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{teamAbbreviations[matchup.home] || matchup.home}</span>
                              <span className="text-muted-foreground">
                                {isCompleted ? gameResult.homeScore : matchup.homeRecord}
                              </span>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Matchup Detail Card - Rows 2-4, Cols 2-3 */}
          <Card className="row-start-2 row-span-3 col-start-2 col-span-2 flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col items-center justify-center">
              <div className="text-center mb-6">
                <div className="text-2xl font-bold mb-2">
                  {matchups[selectedMatchup]?.away} vs. {matchups[selectedMatchup]?.home}
                </div>
                {(() => {
                  const selectedGame = matchups[selectedMatchup]
                  if (!selectedGame) return null
                  
                  const gameKey = `${selectedGame.homeTeamId}-${selectedGame.awayTeamId}`
                  const gameResult = gameResults[gameKey]
                  const isCompleted = !!gameResult
                  
                  if (isCompleted) {
                    return (
                      <div className="flex justify-center gap-4 text-2xl font-bold">
                        <span className={gameResult.awayScore > gameResult.homeScore ? 'text-green-600' : 'text-gray-600'}>
                          {gameResult.awayScore}
                        </span>
                        <span>-</span>
                        <span className={gameResult.homeScore > gameResult.awayScore ? 'text-green-600' : 'text-gray-600'}>
                          {gameResult.homeScore}
                        </span>
                      </div>
                    )
                  } else {
                    return (
                      <div className="flex justify-center gap-4 text-muted-foreground">
                        <span>Points per game</span>
                        <span>•</span>
                        <span>Points per game</span>
                      </div>
                    )
                  }
                })()}
              </div>
              <div className="flex gap-4">
                {(() => {
                  const selectedGame = matchups[selectedMatchup]
                  if (!selectedGame) return null
                  
                  const gameKey = `${selectedGame.homeTeamId}-${selectedGame.awayTeamId}`
                  const gameResult = gameResults[gameKey]
                  const isCompleted = !!gameResult
                  
                  if (isCompleted) {
                    return (
                      <div className="text-center">
                        <p className="text-green-600 font-semibold">Game Completed</p>
                        <p className="text-sm text-muted-foreground">Final Score</p>
                      </div>
                    )
                  } else {
                    return (
                      <>
                        <Button 
                          onClick={() => {
                            // Navigate to game simulation for this specific matchup
                            console.log('Play game:', matchups[selectedMatchup])
                            // This could navigate to a game simulation view
                          }}
                          className="px-6 py-2"
                        >
                          Play
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleSimulateGame(matchups[selectedMatchup])}
                          className="px-6 py-2"
                        >
                          Sim
                        </Button>
                      </>
                    )
                  }
                })()}
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
