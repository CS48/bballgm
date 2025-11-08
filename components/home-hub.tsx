"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLeague, useTeams, useStandings } from "@/lib/context/league-context"
import { leagueService } from "@/lib/services/league-service"
import { gameService } from "@/lib/services/game-service"
import type { Team } from "@/lib/types/database"

interface HomeHubProps {
  userTeam: Team
  onNavigateToGameSelect: () => void
  onNavigateToWatchGame: (homeTeam: Team, awayTeam: Team) => void
  onViewGameResult: (gameId: number) => void
}

export function HomeHub({ userTeam, onNavigateToGameSelect, onNavigateToWatchGame, onViewGameResult }: HomeHubProps) {
  const { teams, simulateGame, simulateMultipleGames, advanceToNextGameDay, currentGameDay } = useLeague()
  const standings = useStandings()
  const [selectedMatchup, setSelectedMatchup] = useState(0)
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [gameResults, setGameResults] = useState<{[key: string]: {homeScore: number, awayScore: number}}>({})
  const [allGamesCompleted, setAllGamesCompleted] = useState(false)
  const [simulatingGames, setSimulatingGames] = useState<Set<string>>(new Set())
  const [userTeamRoster, setUserTeamRoster] = useState<any>(null)
  const [teamRatings, setTeamRatings] = useState({
    overall: 0,
    interiorShooting: 0,
    threePointShooting: 0,
    passing: 0,
    onBallDefense: 0
  })

  // Debug: Log when currentGameDay changes
  useEffect(() => {
    // Removed console logs for cleaner output
  }, [currentGameDay])

  // Fetch user team roster and calculate ratings
  useEffect(() => {
    const fetchUserTeamRoster = async () => {
      try {
        const roster = await leagueService.getTeamRoster(userTeam.team_id)
        setUserTeamRoster(roster)

        // Calculate team ratings from player attributes
        if (roster.players && roster.players.length > 0) {
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
        }
      } catch (error) {
        console.error('Failed to fetch user team roster:', error)
      }
    }

    fetchUserTeamRoster()
  }, [userTeam.team_id])
  
  // Pagination settings
  const matchupsPerPage = 8 // Show 8 matchups per page (better for 15 games per day)

  // Generate matchups from today's games or fallback to sample matchups
  const matchups = useMemo(() => {
    console.log(`=== MATCHUPS RECALC ===`)
    console.log('currentGameDay exists:', !!currentGameDay)
    console.log('currentGameDay.games count:', currentGameDay?.games?.length || 0)
    
    if (currentGameDay && currentGameDay.games && currentGameDay.games.length > 0) {
      // Use real games from today's schedule
      
      const allMatchups = currentGameDay.games.map(game => {
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
          completed: game.completed,
          homeScore: game.score?.home,  // Include scores from database
          awayScore: game.score?.away
        }
      }).filter(Boolean)
      
      // Prioritize user's team game - put it first if they have a game today
      const userTeamGame = allMatchups.find(matchup => 
        matchup.awayTeamId === userTeam.team_id || matchup.homeTeamId === userTeam.team_id
      )
      
      if (userTeamGame) {
        const otherGames = allMatchups.filter(matchup => matchup !== userTeamGame)
        return [userTeamGame, ...otherGames]
      }
      
      return allMatchups
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

  // Log final matchup state
  useEffect(() => {
    if (matchups.length > 0) {
      console.log('=== FINAL MATCHUP STATE ===')
      const completedCount = matchups.filter(m => m.completed).length
      console.log(`Total matchups: ${matchups.length}, Completed: ${completedCount}`)
      matchups.forEach(matchup => {
        if (matchup.completed) {
          console.log(`✓ ${matchup.homeTeamId} vs ${matchup.awayTeamId}: ${matchup.awayScore}-${matchup.homeScore}`)
        }
      })
    }
  }, [matchups])

  // Sync gameResults with database on mount
  useEffect(() => {
    console.log(`=== SYNC EFFECT ===`)
    console.log('matchups count:', matchups.length)
    
    const syncCompletedGames = () => {
      if (matchups && matchups.length > 0) {
        const completedResults: {[key: string]: {homeScore: number, awayScore: number}} = {}
        
        matchups.forEach(matchup => {
          if (matchup.completed && matchup.homeScore !== undefined && matchup.awayScore !== undefined) {
            const gameKey = `${matchup.homeTeamId}-${matchup.awayTeamId}`
            // Use actual scores from database
            completedResults[gameKey] = { 
              homeScore: matchup.homeScore, 
              awayScore: matchup.awayScore 
            }
          }
        })
        
        console.log('completedResults:', completedResults)
        setGameResults(prev => ({ ...prev, ...completedResults }))
      }
    }
    
    syncCompletedGames()
  }, [matchups])

  // Calculate total pages after matchups are defined
  const totalPages = Math.ceil(matchups.length / matchupsPerPage)

  // Helper function to check if a game is currently simulating
  const isGameSimulating = (matchup: any) => {
    const gameKey = `${matchup.homeTeamId}-${matchup.awayTeamId}`
    return simulatingGames.has(gameKey)
  }

  // Helper function to get team abbreviation
  const getTeamAbbreviation = (teamId: number) => {
    const team = teams.find(t => t.team_id === teamId)
    return team?.abbreviation || 'UNK'
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

  // Get actual starters from roster data
  const starters = userTeamRoster?.players
    ? (() => {
        // Debug: Check if any players have is_starter set
        const playersWithStarterFlag = userTeamRoster.players.filter((player: any) => player.is_starter === 1)
        
        // If no players are marked as starters, fall back to top 5 by overall rating
        if (playersWithStarterFlag.length === 0) {
          return userTeamRoster.players
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
    : [
        { player_id: 1, name: "Player 1", position: "PG", overall_rating: 85, current_stats: { ppg: 0, apg: 0, rpg: 0 } },
        { player_id: 2, name: "Player 2", position: "SG", overall_rating: 82, current_stats: { ppg: 0, apg: 0, rpg: 0 } },
        { player_id: 3, name: "Player 3", position: "SF", overall_rating: 88, current_stats: { ppg: 0, apg: 0, rpg: 0 } },
        { player_id: 4, name: "Player 4", position: "PF", overall_rating: 80, current_stats: { ppg: 0, apg: 0, rpg: 0 } },
        { player_id: 5, name: "Player 5", position: "C", overall_rating: 90, current_stats: { ppg: 0, apg: 0, rpg: 0 } }
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
    const gameKey = `${matchup.homeTeamId}-${matchup.awayTeamId}`
    
    // Check if game is already completed
    if (matchup.completed) {
      console.warn('Game already completed, cannot simulate again')
      return
    }
    
    // Check if game exists in database and is completed
    const gameId = await gameService.getGameIdByMatchup(matchup.homeTeamId, matchup.awayTeamId)
    if (gameId) {
      console.warn('Game already exists in database, cannot simulate again')
      return
    }
    
    try {
      // Mark this game as simulating
      setSimulatingGames(prev => new Set(prev).add(gameKey))
      
      // Get actual simulation results
      const result = await simulateGame(matchup.homeTeamId, matchup.awayTeamId)
      
      // Use actual scores from simulation
      setGameResults(prev => ({
        ...prev,
        [gameKey]: { 
          homeScore: result.homeScore, 
          awayScore: result.awayScore 
        }
      }))
      
      // Check if all games are completed
      checkAllGamesCompleted()
    } catch (error) {
      console.error('Failed to simulate game:', error)
    } finally {
      // Remove from simulating set
      setSimulatingGames(prev => {
        const newSet = new Set(prev)
        newSet.delete(gameKey)
        return newSet
      })
    }
  }

  const handleSimulateAllGames = async () => {
    try {
      // Filter out games that are already completed
      const uncompletedGames = matchups.filter(matchup => {
        const gameKey = `${matchup.homeTeamId}-${matchup.awayTeamId}`
        // Check BOTH local state AND database completed flag
        return !gameResults[gameKey] && !matchup.completed
      })
      
      // Only simulate uncompleted games
      if (uncompletedGames.length > 0) {
        const games = uncompletedGames.map(matchup => ({
          homeTeamId: matchup.homeTeamId,
          awayTeamId: matchup.awayTeamId
        }))
        
        // Get actual results from simulations
        const results = await simulateMultipleGames(games)
        
        // Convert to UI format
        const newResults: {[key: string]: {homeScore: number, awayScore: number}} = {}
        results.forEach(result => {
          const gameKey = `${result.homeTeamId}-${result.awayTeamId}`
          newResults[gameKey] = {
            homeScore: result.homeScore,
            awayScore: result.awayScore
          }
        })
        
        // Merge with existing results instead of replacing
        setGameResults(prev => ({
          ...prev,
          ...newResults
        }))
      }
      
      setAllGamesCompleted(true)
    } catch (error) {
      console.error('Failed to simulate all games:', error)
    }
  }

  const checkAllGamesCompleted = () => {
    const totalGames = matchups.length
    // Count games completed in EITHER local state OR database
    const completedGames = matchups.filter(matchup => {
      const gameKey = `${matchup.homeTeamId}-${matchup.awayTeamId}`
      return gameResults[gameKey] || matchup.completed
    }).length
    setAllGamesCompleted(completedGames >= totalGames)
  }

  const handleProceedToNextDay = async () => {
    // Reset local UI state
    setGameResults({})
    setAllGamesCompleted(false)
    setSelectedMatchup(0)
    setCurrentPage(0)
    
    // Advance to next game day in the database/calendar
    try {
      await advanceToNextGameDay()
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
    <div className="min-h-screen bg-background" style={{ paddingLeft: '3vw', paddingRight: '3vw', paddingTop: '3vh', paddingBottom: '3vh' }}>
      <div className="max-w-7xl mx-auto">
        {/* CSS Grid Layout */}
        <div className="grid grid-cols-3 grid-rows-6 gap-8" style={{ 
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
                    <span>#{(() => {
                      const conferenceStandings = userTeam.conference === 'Eastern' ? standings.eastern : standings.western
                      return conferenceStandings?.findIndex(t => t.team_id === userTeam.team_id) + 1 || 1
                    })()} in {userTeam.conference}ern Conference</span>
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
                        {starters.map((player: any, index: number) => (
                          <tr key={player.player_id || player.id} className="border-b border-gray-200">
                            {/* Column 1: Name (fills remaining width) */}
                            <td className="player-name-cell">
                              <p className="font-medium">{player.name}</p>
                              <div className="text-sm text-muted-foreground">
                                <span>{player.position}</span>
                                <span> | </span>
                                <span>{player.overall_rating || player.overall} ovr</span>
                              </div>
                            </td>
                            
                            {/* Column 2: PPG (hugs content) */}
                            <td className="starters-table-cell">
                              {player.current_stats?.ppg?.toFixed(1) || '0.0'}
                            </td>
                            
                            {/* Column 3: APG (hugs content) */}
                            <td className="starters-table-cell">
                              {player.current_stats?.apg?.toFixed(1) || '0.0'}
                            </td>
                            
                            {/* Column 4: RPG (hugs content) */}
                            <td className="starters-table-cell">
                              {player.current_stats?.rpg?.toFixed(1) || '0.0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="standings" className="mt-4 flex-1 h-full">
                  <div className="tab-content tab-content--transparent">
                    <div className="space-y-4 h-full max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <div>
                        <div className="border-t border-b border-gray-200 rounded-lg overflow-hidden">
                          {/* Table Header */}
                          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              <div className="col-span-1">#</div>
                              <div className="col-span-7">Eastern</div>
                              <div className="col-span-2 text-center">W</div>
                              <div className="col-span-2 text-center">L</div>
                            </div>
                          </div>
                          {/* Table Body */}
                          <div className="divide-y divide-gray-100">
                            {easternStandings.map((team, index) => (
                              <div key={team.team_id} className="px-3 py-2 hover:bg-gray-50 transition-colors">
                                <div className="grid grid-cols-12 gap-2 items-center">
                                  <div className="col-span-1 text-sm font-bold text-gray-700">
                                    {index + 1}
                                  </div>
                                  <div className="col-span-7">
                                    <Link href={`/team/${team.team_id}`} className="font-medium hover:text-primary transition-colors text-sm flex items-center gap-2">
                                      {team.city} {team.name}
                                      {team.team_id === userTeam.team_id && (
                                        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </Link>
                                  </div>
                                  <div className="col-span-2 text-center text-sm font-medium text-gray-700">
                                    {team.wins}
                                  </div>
                                  <div className="col-span-2 text-center text-sm font-medium text-gray-700">
                                    {team.losses}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="border-t border-b border-gray-200 rounded-lg overflow-hidden">
                          {/* Table Header */}
                          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              <div className="col-span-1">#</div>
                              <div className="col-span-7">Western</div>
                              <div className="col-span-2 text-center">W</div>
                              <div className="col-span-2 text-center">L</div>
                            </div>
                          </div>
                          {/* Table Body */}
                          <div className="divide-y divide-gray-100">
                            {westernStandings.map((team, index) => (
                              <div key={team.team_id} className="px-3 py-2 hover:bg-gray-50 transition-colors">
                                <div className="grid grid-cols-12 gap-2 items-center">
                                  <div className="col-span-1 text-sm font-bold text-gray-700">
                                    {index + 1}
                                  </div>
                                  <div className="col-span-7">
                                    <Link href={`/team/${team.team_id}`} className="font-medium hover:text-primary transition-colors text-sm flex items-center gap-2">
                                      {team.city} {team.name}
                                      {team.team_id === userTeam.team_id && (
                                        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </Link>
                                  </div>
                                  <div className="col-span-2 text-center text-sm font-medium text-gray-700">
                                    {team.wins}
                                  </div>
                                  <div className="col-span-2 text-center text-sm font-medium text-gray-700">
                                    {team.losses}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
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
            <div className="flex gap-8 overflow-x-auto">
              {currentPageMatchups.map((matchup, index) => {
                const globalIndex = currentPage * matchupsPerPage + index
                return (
                  <div
                    key={globalIndex}
                    className={`flex-shrink-0 p-2 rounded cursor-pointer transition-colors w-[89px] ${
                      globalIndex === selectedMatchup ? 'border-2 border-black bg-transparent' : 'border-0'
                    }`}
                    onClick={() => {
                      setSelectedMatchup(globalIndex)
                    }}
                  >
                    <div className="text-sm space-y-1">
                      {(() => {
                        const gameKey = `${matchup.homeTeamId}-${matchup.awayTeamId}`
                        const gameResult = gameResults[gameKey]
                        const isCompleted = !!gameResult || matchup.completed // Check both sources
                        const isSimulating = isGameSimulating(matchup)
                        
                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{getTeamAbbreviation(matchup.awayTeamId)}</span>
                              <span className="text-muted-foreground">
                                {isCompleted ? (gameResult?.awayScore ?? matchup.awayScore ?? matchup.awayRecord) : isSimulating ? '...' : matchup.awayRecord}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{getTeamAbbreviation(matchup.homeTeamId)}</span>
                              <span className="text-muted-foreground">
                                {isCompleted ? (gameResult?.homeScore ?? matchup.homeScore ?? matchup.homeRecord) : isSimulating ? '...' : matchup.homeRecord}
                              </span>
                            </div>
                            {isSimulating && (
                              <div className="flex justify-center">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
                              </div>
                            )}
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
                  <Link href={`/team/${matchups[selectedMatchup]?.awayTeamId}`} className="hover:text-primary transition-colors">
                    {matchups[selectedMatchup]?.away}
                  </Link>
                  <span className="mx-2">vs.</span>
                  <Link href={`/team/${matchups[selectedMatchup]?.homeTeamId}`} className="hover:text-primary transition-colors">
                    {matchups[selectedMatchup]?.home}
                  </Link>
                </div>
                {(() => {
                  const selectedGame = matchups[selectedMatchup]
                  if (!selectedGame) return null
                  
                  const gameKey = `${selectedGame.homeTeamId}-${selectedGame.awayTeamId}`
                  const gameResult = gameResults[gameKey]
                  const isCompleted = !!gameResult || selectedGame.completed // Check both sources
                  
                  if (isCompleted) {
                    const awayScore = gameResult?.awayScore ?? selectedGame.awayScore ?? 0
                    const homeScore = gameResult?.homeScore ?? selectedGame.homeScore ?? 0
                    
                    return (
                      <div className="flex justify-center gap-4 text-2xl font-bold">
                        <span className={awayScore > homeScore ? 'text-black' : 'text-gray-600'}>
                          {awayScore}
                        </span>
                        <span>-</span>
                        <span className={homeScore > awayScore ? 'text-black' : 'text-gray-600'}>
                          {homeScore}
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
                  const isCompleted = !!gameResult || selectedGame.completed // Check both sources
                  
                  if (isCompleted) {
                    return (
                      <Button 
                        onClick={async () => {
                          // Get the game ID for this matchup
                          const gameId = await gameService.getGameIdByMatchup(selectedGame.homeTeamId, selectedGame.awayTeamId)
                          if (gameId) {
                            onViewGameResult(gameId)
                          }
                        }}
                        className="px-6 py-2"
                      >
                        View Result
                      </Button>
                    )
                  } else {
                    const isSimulating = isGameSimulating(selectedGame)
                    
                    return (
                      <>
                        <Button 
                          onClick={() => {
                            // Navigate to watch game for this specific matchup
                            const selectedGame = matchups[selectedMatchup]
                            
                            if (!selectedGame) {
                              console.error('No selected game found')
                              return
                            }
                            
                            const homeTeam = teams.find(t => t.team_id === selectedGame.homeTeamId)
                            const awayTeam = teams.find(t => t.team_id === selectedGame.awayTeamId)
                            
                            if (homeTeam && awayTeam) {
                              onNavigateToWatchGame(homeTeam, awayTeam)
                            } else {
                              console.error('Could not find teams for watch game')
                            }
                          }}
                          className="px-6 py-2"
                          disabled={isSimulating}
                        >
                          Watch
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleSimulateGame(matchups[selectedMatchup])}
                          className="px-6 py-2"
                          disabled={isSimulating}
                        >
                          {isSimulating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                              Simulating...
                            </>
                          ) : (
                            'Sim'
                          )}
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
