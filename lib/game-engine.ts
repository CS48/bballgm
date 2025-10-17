import type { GameSimulationPlayer, GameSimulationTeam, GameEvent, GameSimulationResult, StrategicAdjustments } from "@/lib/types/game-simulation"
import type { SimulationTeam, D20GameEvent } from "@/lib/types/simulation-engine"
import { GameClock } from "./game-clock"
import { simulatePossession } from "./simulation/possession-engine"
import { convertToSimulationTeam, convertToSimulationPlayer } from "./types/simulation-engine"
import { initializeD20RNG } from "./simulation/d20-rng"
import { getConfig } from "./simulation/config-loader"

export interface GameSegmentResult {
  events: GameEvent[]
  homeScore: number
  awayScore: number
  homePlayerStats: Map<string, any>
  awayPlayerStats: Map<string, any>
  finalPossession: GameSimulationTeam
  homePossessions: number
  awayPossessions: number
  eventId: number
}

export class GameEngine {
  private static getPlayerEffectiveness(player: GameSimulationPlayer): number {
    // Calculate effectiveness based on overall rating with some randomness
    const baseEffectiveness = player.overall / 100
    const randomFactor = 0.8 + Math.random() * 0.4 // 0.8 to 1.2 multiplier
    return Math.min(1, baseEffectiveness * randomFactor)
  }

  private static calculateTeamStrength(team: GameSimulationTeam): number {
    // Calculate team strength based on average player overall rating
    const totalRating = team.players.reduce((sum, player) => sum + player.overall, 0)
    return totalRating / team.players.length
  }

  private static generatePlayDescription(
    player: GameSimulationPlayer,
    action: string,
    success: boolean,
    isThreePointer?: boolean,
    teamName?: string,
  ): string {
    const playerName = player.name.split(" ")[1] // Use last name
    const teamPrefix = teamName ? `[${teamName}] ` : ""

    if (action === "shot") {
      if (success) {
        return isThreePointer ? `${teamPrefix}${playerName} drains a three-pointer!` : `${teamPrefix}${playerName} makes a two-pointer!`
      } else {
        return isThreePointer ? `${teamPrefix}${playerName} misses the three-point attempt` : `${teamPrefix}${playerName} misses the shot`
      }
    } else if (action === "rebound") {
      return `${teamPrefix}${playerName} grabs the rebound`
    } else if (action === "assist") {
      return `${teamPrefix}${playerName} with the assist`
    } else if (action === "steal") {
      return `${teamPrefix}${playerName} steals the ball!`
    } else if (action === "block") {
      return `${teamPrefix}${playerName} with the block!`
    } else if (action === "turnover") {
      return `${teamPrefix}${playerName} turns the ball over`
    } else if (action === "foul") {
      return `${teamPrefix}${playerName} commits a foul`
    }

    return `${teamPrefix}${playerName} makes a play`
  }

  private static normalRandom(mean: number, stdDev: number): number {
    let u = 0,
      v = 0
    while (u === 0) u = Math.random() // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random()
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
    return z * stdDev + mean
  }

  public static simulateGame(homeTeam: GameSimulationTeam, awayTeam: GameSimulationTeam): GameSimulationResult {
    console.log('🏀 Starting full game simulation:', homeTeam.name, 'vs', awayTeam.name)
    
    // Calculate team strengths
    const homeStrength = this.calculateTeamStrength(homeTeam)
    const awayStrength = this.calculateTeamStrength(awayTeam)
    // Team strengths calculated for legacy compatibility
    
    // Simulate first half (quarters 1-2)
    console.log('⏰ Starting first half simulation...')
    const firstHalfResult = this.simulateGameSegment(
      homeTeam, 
      awayTeam, 
      { pace: 'normal', shotSelection: 'balanced', defense: 'normal' },
      1, // start quarter
      2, // end quarter
      0, // starting home score
      0, // starting away score
      new Map(), // starting player stats
      new Map(),
      0, // starting home possessions
      0, // starting away possessions
      homeTeam, // starting possession
      1 // starting event ID
    )
    
    console.log('🏁 First half complete - Home:', firstHalfResult.homeScore, 'Away:', firstHalfResult.awayScore)
    
    // For now, simulate second half with same strategy (will be replaced with user input)
    console.log('⏰ Starting second half simulation...')
    const secondHalfResult = this.simulateGameSegment(
      homeTeam,
      awayTeam,
      { pace: 'normal', shotSelection: 'balanced', defense: 'normal' },
      3, // start quarter
      4, // end quarter
      firstHalfResult.homeScore,
      firstHalfResult.awayScore,
      firstHalfResult.homePlayerStats,
      firstHalfResult.awayPlayerStats,
      firstHalfResult.homePossessions,
      firstHalfResult.awayPossessions,
      firstHalfResult.finalPossession,
      firstHalfResult.eventId // Continue event ID sequence
    )
    
    console.log('🏁 Second half complete - Home:', secondHalfResult.homeScore, 'Away:', secondHalfResult.awayScore)
    
    // Combine results
    const allEvents = [...firstHalfResult.events, ...secondHalfResult.events]
    
    // Check for overtime
    if (secondHalfResult.homeScore === secondHalfResult.awayScore) {
      console.log('⏰ Game tied - starting overtime...')
      const overtimeResult = this.simulateOvertime(
        homeTeam,
        awayTeam,
        secondHalfResult.homeScore,
        secondHalfResult.awayScore,
        secondHalfResult.homePlayerStats,
        secondHalfResult.awayPlayerStats,
        secondHalfResult.homePossessions,
        secondHalfResult.awayPossessions,
        secondHalfResult.finalPossession,
        secondHalfResult.eventId
      )
      
      allEvents.push(...overtimeResult.events)
      secondHalfResult.homeScore = overtimeResult.homeScore
      secondHalfResult.awayScore = overtimeResult.awayScore
    }
    
    console.log('🏆 Game complete - Final: Home:', secondHalfResult.homeScore, 'Away:', secondHalfResult.awayScore)
    
    return this.buildGameResult(homeTeam, awayTeam, secondHalfResult.homeScore, secondHalfResult.awayScore, allEvents, secondHalfResult.homePlayerStats, secondHalfResult.awayPlayerStats)
  }

  public static simulateGameSegment(
    homeTeam: GameSimulationTeam,
    awayTeam: GameSimulationTeam,
    strategy: StrategicAdjustments,
    startQuarter: number,
    endQuarter: number,
    startingHomeScore: number,
    startingAwayScore: number,
    startingHomePlayerStats: Map<string, any>,
    startingAwayPlayerStats: Map<string, any>,
    startingHomePossessions: number,
    startingAwayPossessions: number,
    startingPossession: Team,
    startingEventId: number
  ): GameSegmentResult {
    console.log(`🎯 Simulating quarters ${startQuarter}-${endQuarter} with strategy:`, strategy)
    
    const events: GameEvent[] = []
    let homeScore = startingHomeScore
    let awayScore = startingAwayScore
    let eventId = startingEventId // FIXED: Use starting event ID instead of hardcoded 1
    let currentPossession = startingPossession
    let homePossessions = startingHomePossessions
    let awayPossessions = startingAwayPossessions

    const gameClock = new GameClock()
    
    // Set game clock to start of the segment
    gameClock.setStartingQuarter(startQuarter)
    
    // Disable automatic quarter advancement - we'll handle it manually
    gameClock.setAutoAdvanceQuarters(false)

    // Initialize or copy player stats
    const playerStats = new Map<string, any>()
    
    // Copy starting stats or initialize new ones
    homeTeam.players.forEach((player) => {
      const existingStats = startingHomePlayerStats.get(player.id)
      playerStats.set(player.id, existingStats || {
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        fieldGoalsMade: 0,
        fieldGoalsAttempted: 0,
        threePointersMade: 0,
        threePointersAttempted: 0,
        turnovers: 0,
        fouls: 0,
      })
    })
    
    awayTeam.players.forEach((player) => {
      const existingStats = startingAwayPlayerStats.get(player.id)
      playerStats.set(player.id, existingStats || {
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        fieldGoalsMade: 0,
        fieldGoalsAttempted: 0,
        turnovers: 0,
        fouls: 0,
      })
    })

    // Calculate target possessions based on strategy
    const basePossessionsPerTeam = 55 // Half of full game (110/2)
    const paceMultiplier = strategy.pace === 'slow' ? 0.8 : strategy.pace === 'fast' ? 1.2 : 1.0
    const targetPossessionsPerTeam = Math.round(basePossessionsPerTeam * paceMultiplier)
    
    // Target possessions calculated for legacy compatibility

    // Start first possession
    gameClock.startShotClock()

    // Simulate segment until completion
    while (gameClock.getCurrentTime().quarter <= endQuarter) {
      const currentTime = gameClock.getCurrentTime()
      
      // Check if quarter is over
      if (gameClock.getQuarterTimeRemaining() <= 0) {
        console.log(`⏰ Quarter ${currentTime.quarter} complete`)
        if (currentTime.quarter < endQuarter) {
          // Move to next quarter manually
          gameClock.advanceToNextQuarter()
          continue
        } else {
          // End of segment
          break
        }
      }

      // Check if we've reached realistic possession limits
      const currentTeamPossessions = currentPossession === homeTeam ? homePossessions : awayPossessions
      if (currentTeamPossessions >= targetPossessionsPerTeam) {
        // Switch to other team if they haven't reached limit
        const otherTeamPossessions = currentPossession === homeTeam ? awayPossessions : homePossessions
        if (otherTeamPossessions < targetPossessionsPerTeam) {
          currentPossession = currentPossession === homeTeam ? awayTeam : homeTeam
          gameClock.resetShotClock('full')
          continue
        } else {
          // Both teams have reached possession limit, end segment
          console.log(`📊 Possession limit reached - ending segment`)
          break
        }
      }

      // Simulate a possession
      const possessionResult = this.simulatePossession(
        currentPossession,
        currentPossession === homeTeam ? awayTeam : homeTeam,
        homeTeam,
        gameClock,
        playerStats,
        homeScore,
        awayScore,
        eventId,
        strategy
      )

      // Add events from this possession
      events.push(...possessionResult.events)
      eventId += possessionResult.events.length

      // Update scores
      homeScore = possessionResult.homeScore
      awayScore = possessionResult.awayScore

      // Update possession count
      if (currentPossession === homeTeam) {
        homePossessions++
      } else {
        awayPossessions++
      }

      // Change possession (unless it's an offensive rebound)
      if (possessionResult.changePossession) {
        currentPossession = currentPossession === homeTeam ? awayTeam : homeTeam
        gameClock.resetShotClock('full')
      } else if (possessionResult.offensiveRebound) {
        gameClock.resetShotClock('offensive_rebound')
      }
    }

    console.log(`🏁 Segment complete - Home: ${homeScore}, Away: ${awayScore}, Events: ${events.length}`)
    
    return {
      events,
      homeScore,
      awayScore,
      homePlayerStats: new Map(playerStats),
      awayPlayerStats: new Map(playerStats),
      finalPossession: currentPossession,
      homePossessions,
      awayPossessions,
      eventId
    }
  }

  private static simulatePossession(
    offensiveTeam: GameSimulationTeam,
    defensiveTeam: GameSimulationTeam,
    homeTeam: GameSimulationTeam,
    gameClock: GameClock,
    playerStats: Map<string, any>,
    currentHomeScore: number,
    currentAwayScore: number,
    startEventId: number,
    strategy: StrategicAdjustments
  ): {
    events: GameEvent[]
    homeScore: number
    awayScore: number
    changePossession: boolean
    offensiveRebound: boolean
  } {
    // Convert to simulation teams
    const simOffensiveTeam = convertToSimulationTeam(offensiveTeam)
    const simDefensiveTeam = convertToSimulationTeam(defensiveTeam)
    
    // Initialize D20 RNG with game time as seed for deterministic results
    const seed = Math.floor(gameClock.getTotalGameTime() * 1000) + startEventId
    initializeD20RNG(seed)
    
    // Start with point guard as ball handler
    const ballHandler = simOffensiveTeam.players.find(p => p.position === 'PG') || simOffensiveTeam.players[0]
    
    // Simulate possession using D20 engine
    const possessionResult = simulatePossession(
      simOffensiveTeam,
      simDefensiveTeam,
      ballHandler,
      seed
    )
    
    // Log possession summary
    const config = getConfig()
    const shouldLog = config.logging?.verbose_possession_logs !== false
    
    if (shouldLog) {
      const scoreChange = possessionResult.finalScore
      const teamName = offensiveTeam === homeTeam ? 'Home' : 'Away'
      const newHomeScore = offensiveTeam === homeTeam ? currentHomeScore + scoreChange : currentHomeScore
      const newAwayScore = offensiveTeam === homeTeam ? currentAwayScore : currentAwayScore + scoreChange
      
      console.log(`📊 Possession Summary: ${teamName} ${scoreChange > 0 ? '+' : ''}${scoreChange} pts (Score: ${newHomeScore}-${newAwayScore})`)
      console.log(`   Duration: ${possessionResult.possessionDuration}s, ${possessionResult.events.length} actions, changed possession: ${possessionResult.changePossession}`)
      console.log('')
    }
    
    // Convert possession result to game events
    const events: GameEvent[] = []
    let eventId = startEventId
    let homeScore = currentHomeScore
    let awayScore = currentAwayScore
    let changePossession = true
    let offensiveRebound = false
    
    // Process each possession event
    for (const possessionEvent of possessionResult.events) {
      const currentTime = gameClock.getCurrentTime()
      
      // Create enhanced game event with D20 details
      const gameEvent: D20GameEvent = {
        id: eventId.toString(),
        quarter: currentTime.quarter,
        time: gameClock.getFormattedTime(),
        description: possessionEvent.description,
        homeScore: offensiveTeam === homeTeam ? homeScore : awayScore,
        awayScore: offensiveTeam === homeTeam ? awayScore : homeScore,
        eventType: this.mapPossessionEventType(possessionEvent),
        playerId: this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam),
        teamId: offensiveTeam.id,
        shotClockRemaining: gameClock.getShotClock().timeRemaining,
        gameTimeSeconds: gameClock.getTotalGameTime(),
        
        // D20 simulation details
        ballHandler: {
          id: this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam) || '',
          name: possessionEvent.ballHandler
        },
        opennessScores: possessionEvent.opennessScores,
        decision: possessionEvent.decision,
        rollDetails: possessionEvent.rollResult ? {
          roll: possessionEvent.rollResult.roll,
          faces: possessionEvent.rollResult.faces,
          outcome: possessionEvent.rollResult.outcome,
          rawValue: possessionEvent.rollResult.rawValue
        } : undefined
      }
      
      events.push(gameEvent)
      eventId++
      
      // Update scores and stats based on possession result
      if (possessionEvent.rollResult?.outcome === 'success' && possessionEvent.rollResult.points) {
        const points = possessionEvent.rollResult.points
        if (offensiveTeam === homeTeam) {
          homeScore += points
        } else {
          awayScore += points
        }
        
        // Update player stats
        const shooterId = this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam)
        if (shooterId) {
          const shooterStats = playerStats.get(shooterId)!
          shooterStats.points += points
          shooterStats.fieldGoalsMade++
          shooterStats.fieldGoalsAttempted++
          if (possessionEvent.rollResult.isThreePointer) {
            shooterStats.threePointersMade++
            shooterStats.threePointersAttempted++
          }
        }
      } else if (possessionEvent.rollResult?.outcome === 'failure') {
        // Missed shot - update attempts
        const shooterId = this.findPlayerIdByName(possessionEvent.ballHandler, offensiveTeam)
        if (shooterId) {
          const shooterStats = playerStats.get(shooterId)!
          shooterStats.fieldGoalsAttempted++
          if (possessionEvent.rollResult.isThreePointer) {
            shooterStats.threePointersAttempted++
          }
        }
      }
    }
    
    // Handle possession result
    changePossession = possessionResult.changePossession
    offensiveRebound = possessionResult.offensiveRebound
    
    // Advance game clock based on possession duration
    gameClock.advanceTime(possessionResult.possessionDuration)
    
    return { events, homeScore, awayScore, changePossession, offensiveRebound }
  }
  
  private static mapPossessionEventType(possessionEvent: any): GameEvent['eventType'] {
    if (possessionEvent.rollResult?.outcome === 'success' && possessionEvent.rollResult.points) {
      return 'shot'
    } else if (possessionEvent.rollResult?.outcome === 'failure') {
      return 'shot'
    } else if (possessionEvent.rollResult?.outcome === 'complete') {
      return 'pass'
    } else if (possessionEvent.rollResult?.outcome === 'intercepted') {
      return 'steal'
    } else if (possessionEvent.rollResult?.outcome === 'steal') {
      return 'steal'
    } else if (possessionEvent.rollResult?.outcome === 'rebound') {
      return 'rebound'
    }
    return 'shot'
  }
  
  private static findPlayerIdByName(playerName: string, team: GameSimulationTeam): string | undefined {
    return team.players.find(p => p.name === playerName)?.id
  }

  private static simulateOvertime(
    homeTeam: Team,
    awayTeam: Team,
    startingHomeScore: number,
    startingAwayScore: number,
    startingHomePlayerStats: Map<string, any>,
    startingAwayPlayerStats: Map<string, any>,
    startingHomePossessions: number,
    startingAwayPossessions: number,
    startingPossession: Team,
    startingEventId: number
  ): GameSegmentResult {
    console.log('⏰ Starting overtime simulation...')
    
    return this.simulateGameSegment(
      homeTeam,
      awayTeam,
      { pace: 'normal', shotSelection: 'balanced', defense: 'normal' },
      5, // overtime quarter
      5, // end at overtime
      startingHomeScore,
      startingAwayScore,
      startingHomePlayerStats,
      startingAwayPlayerStats,
      startingHomePossessions,
      startingAwayPossessions,
      startingPossession,
      startingEventId // Continue event ID sequence
    )
  }

  private static buildGameResult(
    homeTeam: GameSimulationTeam,
    awayTeam: GameSimulationTeam,
    homeScore: number,
    awayScore: number,
    events: GameEvent[],
    homePlayerStats: Map<string, any>,
    awayPlayerStats: Map<string, any>
  ): GameSimulationResult {
    const homePlayerStatsArray = homeTeam.players.map((player) => ({
      ...player,
      ...homePlayerStats.get(player.id)!,
    }))

    const awayPlayerStatsArray = awayTeam.players.map((player) => ({
      ...player,
      ...awayPlayerStats.get(player.id)!,
    }))

    const homeCalculatedScore = homePlayerStatsArray.reduce((sum, player) => sum + player.points, 0)
    const awayCalculatedScore = awayPlayerStatsArray.reduce((sum, player) => sum + player.points, 0)

    const winningTeamStats = homeCalculatedScore > awayCalculatedScore ? homePlayerStatsArray : awayPlayerStatsArray
    const mvp = winningTeamStats.reduce((best, player) => {
      const playerScore = player.points + player.rebounds * 0.5 + player.assists * 0.7
      const bestScore = best.points + best.rebounds * 0.5 + best.assists * 0.7
      return playerScore > bestScore ? player : best
    })

    return {
      homeTeam,
      awayTeam,
      homeScore: homeCalculatedScore,
      awayScore: awayCalculatedScore,
      events,
      winner: homeCalculatedScore > awayCalculatedScore ? homeTeam.name : awayTeam.name,
      homePlayerStats: homePlayerStatsArray,
      awayPlayerStats: awayPlayerStatsArray,
      mvp,
    }
  }
}
