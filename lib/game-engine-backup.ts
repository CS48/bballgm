import type { Player, Team, GameEvent, GameResult, StrategicAdjustments } from "@/types/game"
import { GameClock } from "./game-clock"

export interface GameSegmentResult {
  events: GameEvent[]
  homeScore: number
  awayScore: number
  homePlayerStats: Map<string, any>
  awayPlayerStats: Map<string, any>
  finalPossession: Team
  homePossessions: number
  awayPossessions: number
  eventId: number
}

export class GameEngine {
  private static getPlayerEffectiveness(player: Player): number {
    // Calculate effectiveness based on overall rating with some randomness
    const baseEffectiveness = player.overall / 100
    const randomFactor = 0.8 + Math.random() * 0.4 // 0.8 to 1.2 multiplier
    return Math.min(1, baseEffectiveness * randomFactor)
  }

  private static calculateTeamStrength(team: Team): number {
    // Calculate team strength based on average player overall rating
    const totalRating = team.players.reduce((sum, player) => sum + player.overall, 0)
    return totalRating / team.players.length
  }

  private static generatePlayDescription(
    player: Player,
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

  public static simulateGame(homeTeam: Team, awayTeam: Team): GameResult {
    console.log('🏀 Starting full game simulation:', homeTeam.name, 'vs', awayTeam.name)
    
    // Calculate team strengths
    const homeStrength = this.calculateTeamStrength(homeTeam)
    const awayStrength = this.calculateTeamStrength(awayTeam)
    console.log('📊 Team strengths - Home:', homeStrength.toFixed(1), 'Away:', awayStrength.toFixed(1))
    
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
      homeTeam // starting possession
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
      firstHalfResult.finalPossession
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
    homeTeam: Team,
    awayTeam: Team,
    strategy: StrategicAdjustments,
    startQuarter: number,
    endQuarter: number,
    startingHomeScore: number,
    startingAwayScore: number,
    startingHomePlayerStats: Map<string, any>,
    startingAwayPlayerStats: Map<string, any>,
    startingHomePossessions: number,
    startingAwayPossessions: number,
    startingPossession: Team
  ): GameSegmentResult {
    console.log(`🎯 Simulating quarters ${startQuarter}-${endQuarter} with strategy:`, strategy)
    
    const events: GameEvent[] = []
    let homeScore = startingHomeScore
    let awayScore = startingAwayScore
    let eventId = 1
    let currentPossession = startingPossession
    let homePossessions = startingHomePossessions
    let awayPossessions = startingAwayPossessions

    const gameClock = new GameClock()
    
    // Set game clock to start of the segment
    if (startQuarter > 1) {
      gameClock.advanceTime((startQuarter - 1) * 12 * 60) // Advance to start of target quarter
    }

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
        threePointersMade: 0,
        threePointersAttempted: 0,
        turnovers: 0,
        fouls: 0,
      })
    })

    // Calculate target possessions based on strategy
    const basePossessionsPerTeam = 55 // Half of full game (110/2)
    const paceMultiplier = strategy.pace === 'slow' ? 0.8 : strategy.pace === 'fast' ? 1.2 : 1.0
    const targetPossessionsPerTeam = Math.round(basePossessionsPerTeam * paceMultiplier)
    
    console.log(`📊 Target possessions per team: ${targetPossessionsPerTeam} (pace: ${strategy.pace})`)

    // Start first possession
    gameClock.startShotClock()

    // Simulate segment until completion
    while (gameClock.getCurrentTime().quarter <= endQuarter) {
      const currentTime = gameClock.getCurrentTime()
      
      // Check if quarter is over
      if (gameClock.getQuarterTimeRemaining() <= 0) {
        console.log(`⏰ Quarter ${currentTime.quarter} complete`)
        if (currentTime.quarter < endQuarter) {
          // Move to next quarter
          gameClock.advanceTime(1)
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
    offensiveTeam: Team,
    defensiveTeam: Team,
    homeTeam: Team,
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
    const events: GameEvent[] = []
    let eventId = startEventId
    let homeScore = currentHomeScore
    let awayScore = currentAwayScore
    let changePossession = true
    let offensiveRebound = false

    // Possession duration based on strategy
    const baseDuration = 10 + Math.random() * 10
    const paceMultiplier = strategy.pace === 'slow' ? 1.3 : strategy.pace === 'fast' ? 0.7 : 1.0
    const possessionDuration = baseDuration * paceMultiplier
    gameClock.advanceTime(possessionDuration)

    // Check for non-shot events first (turnovers, fouls)
    const eventRoll = Math.random()
    
    if (eventRoll < 0.08) { // 8% chance of turnover
      const turnoverPlayer = offensiveTeam.players[Math.floor(Math.random() * 5)]
      playerStats.get(turnoverPlayer.id)!.turnovers++
      
      const currentTime = gameClock.getCurrentTime()
      events.push({
        id: eventId.toString(),
        quarter: currentTime.quarter,
        time: gameClock.getFormattedTime(),
        description: this.generatePlayDescription(turnoverPlayer, "turnover", false, false, offensiveTeam.name),
        homeScore,
        awayScore,
        eventType: 'turnover',
        playerId: turnoverPlayer.id,
        teamId: offensiveTeam.id,
        shotClockRemaining: gameClock.getShotClock().timeRemaining,
        gameTimeSeconds: gameClock.getTotalGameTime()
      })
      eventId++
      
      return { events, homeScore, awayScore, changePossession: true, offensiveRebound: false }
    } else if (eventRoll < 0.12) { // 4% chance of foul
      const foulPlayer = offensiveTeam.players[Math.floor(Math.random() * 5)]
      playerStats.get(foulPlayer.id)!.fouls++
      
      const currentTime = gameClock.getCurrentTime()
      events.push({
        id: eventId.toString(),
        quarter: currentTime.quarter,
        time: gameClock.getFormattedTime(),
        description: this.generatePlayDescription(foulPlayer, "foul", false, false, offensiveTeam.name),
        homeScore,
        awayScore,
        eventType: 'foul',
        playerId: foulPlayer.id,
        teamId: offensiveTeam.id,
        shotClockRemaining: gameClock.getShotClock().timeRemaining,
        gameTimeSeconds: gameClock.getTotalGameTime()
      })
      eventId++
      
      return { events, homeScore, awayScore, changePossession: true, offensiveRebound: false }
    }

    // Shot attempt (88% of possessions - 8% turnovers, 4% fouls)
    const shooter = offensiveTeam.players[Math.floor(Math.random() * 5)]
    const effectiveness = this.getPlayerEffectiveness(shooter)

    // Determine shot type based on strategy
    const baseThreePointChance = 0.35 // 35% base chance
    const shotSelectionMultiplier = strategy.shotSelection === 'conservative' ? 0.6 : 
                                   strategy.shotSelection === 'aggressive' ? 1.4 : 1.0
    const threePointChance = Math.min(0.6, baseThreePointChance * shotSelectionMultiplier)
    const isThreePointer = Math.random() < threePointChance

    // Check shot clock violation
    if (gameClock.getShotClock().timeRemaining <= 0) {
      // Shot clock violation
      const currentTime = gameClock.getCurrentTime()
      events.push({
        id: eventId.toString(),
        quarter: currentTime.quarter,
        time: gameClock.getFormattedTime(),
        description: `${offensiveTeam.name} shot clock violation`,
        homeScore,
        awayScore,
        eventType: 'foul',
        teamId: offensiveTeam.id,
        shotClockRemaining: 0,
        gameTimeSeconds: gameClock.getTotalGameTime()
      })
      eventId++
      return { events, homeScore, awayScore, changePossession: true, offensiveRebound: false }
    }

    // Calculate shot success based on player effectiveness and team strength
    const offensiveTeamStrength = this.calculateTeamStrength(offensiveTeam)
    const defensiveTeamStrength = this.calculateTeamStrength(defensiveTeam)
    
    // Base shot success from player effectiveness
    const baseShotSuccess = effectiveness * 0.5 + 0.15
    
    // Adjust for team strength difference
    const strengthDifference = (offensiveTeamStrength - defensiveTeamStrength) / 100
    const strengthAdjustment = Math.max(0.7, Math.min(1.3, 1 + strengthDifference * 0.3))
    
    // Adjust for defensive strategy
    const defenseMultiplier = strategy.defense === 'intense' ? 0.85 : 
                             strategy.defense === 'soft' ? 1.15 : 1.0
    
    const finalShotSuccess = baseShotSuccess * strengthAdjustment * defenseMultiplier
    const shotSuccess = Math.random() < finalShotSuccess

    const shooterStats = playerStats.get(shooter.id)!
    if (isThreePointer) {
      shooterStats.threePointersAttempted++
    }
    shooterStats.fieldGoalsAttempted++

    const currentTime = gameClock.getCurrentTime()

    if (shotSuccess) {
      // Made shot
      const points = isThreePointer ? 3 : 2
      shooterStats.points += points
      shooterStats.fieldGoalsMade++
      if (isThreePointer) {
        shooterStats.threePointersMade++
      }

      if (offensiveTeam === homeTeam) {
        homeScore += points
      } else {
        awayScore += points
      }

      // Check for assist
      let assistPlayer: Player | null = null
      if (Math.random() > 0.6) {
        assistPlayer = offensiveTeam.players.find((p) => p.id !== shooter.id && Math.random() > 0.6) || null
        if (assistPlayer) {
          playerStats.get(assistPlayer.id)!.assists++
        }
      }

      // Add shot event
      events.push({
        id: eventId.toString(),
        quarter: currentTime.quarter,
        time: gameClock.getFormattedTime(),
        description: this.generatePlayDescription(shooter, "shot", true, isThreePointer, offensiveTeam.name),
        homeScore,
        awayScore,
        eventType: 'shot',
        playerId: shooter.id,
        teamId: offensiveTeam.id,
        shotClockRemaining: gameClock.getShotClock().timeRemaining,
        gameTimeSeconds: gameClock.getTotalGameTime()
      })
      eventId++

      // Add assist event if applicable
      if (assistPlayer) {
        events.push({
          id: eventId.toString(),
          quarter: currentTime.quarter,
          time: gameClock.getFormattedTime(),
          description: this.generatePlayDescription(assistPlayer, "assist", true, false, offensiveTeam.name),
          homeScore,
          awayScore,
          eventType: 'assist',
          playerId: assistPlayer.id,
          teamId: offensiveTeam.id,
          shotClockRemaining: gameClock.getShotClock().timeRemaining,
          gameTimeSeconds: gameClock.getTotalGameTime()
        })
        eventId++
      }

      gameClock.stopShotClock()
    } else {
      // Missed shot - potential for rebound
      events.push({
        id: eventId.toString(),
        quarter: currentTime.quarter,
        time: gameClock.getFormattedTime(),
        description: this.generatePlayDescription(shooter, "shot", false, isThreePointer, offensiveTeam.name),
        homeScore,
        awayScore,
        eventType: 'shot',
        playerId: shooter.id,
        teamId: offensiveTeam.id,
        shotClockRemaining: gameClock.getShotClock().timeRemaining,
        gameTimeSeconds: gameClock.getTotalGameTime()
      })
      eventId++

      // Simulate rebound
      const reboundTime = 0.5 + Math.random() * 1.5 // 0.5-2 seconds
      gameClock.advanceTime(reboundTime)

      const isOffensiveRebound = Math.random() > 0.7 // 30% chance for offensive rebound
      const rebounder = isOffensiveRebound 
        ? offensiveTeam.players[Math.floor(Math.random() * 5)]
        : defensiveTeam.players[Math.floor(Math.random() * 5)]

      playerStats.get(rebounder.id)!.rebounds++

      const reboundTime_current = gameClock.getCurrentTime()
      const rebounderTeam = isOffensiveRebound ? offensiveTeam : defensiveTeam
      events.push({
        id: eventId.toString(),
        quarter: reboundTime_current.quarter,
        time: gameClock.getFormattedTime(),
        description: this.generatePlayDescription(rebounder, "rebound", true, false, rebounderTeam.name),
        homeScore,
        awayScore,
        eventType: 'rebound',
        playerId: rebounder.id,
        teamId: rebounderTeam.id,
        shotClockRemaining: gameClock.getShotClock().timeRemaining,
        gameTimeSeconds: gameClock.getTotalGameTime()
      })
      eventId++

      if (isOffensiveRebound) {
        changePossession = false
        offensiveRebound = true
      } else {
        changePossession = true
        offensiveRebound = false
      }
    }

    // Random chance for additional events (steals, blocks) during possession
    if (Math.random() > 0.85 && !shotSuccess) { // Only if shot was missed
      const eventType = Math.random()
      let eventPlayer: Player
      let actionType: string

      if (eventType > 0.6) {
        // Steal
        eventPlayer = defensiveTeam.players[Math.floor(Math.random() * 5)]
        actionType = "steal"
        playerStats.get(eventPlayer.id)!.steals++
        changePossession = true
        offensiveRebound = false
      } else {
        // Block
        eventPlayer = defensiveTeam.players[Math.floor(Math.random() * 5)]
        actionType = "block"
        playerStats.get(eventPlayer.id)!.blocks++
        changePossession = true
        offensiveRebound = false
      }

      const additionalEventTime = gameClock.getCurrentTime()
      events.push({
        id: eventId.toString(),
        quarter: additionalEventTime.quarter,
        time: gameClock.getFormattedTime(),
        description: this.generatePlayDescription(eventPlayer, actionType, true, false, defensiveTeam.name),
        homeScore,
        awayScore,
        eventType: actionType as any,
        playerId: eventPlayer.id,
        teamId: defensiveTeam.id,
        shotClockRemaining: gameClock.getShotClock().timeRemaining,
        gameTimeSeconds: gameClock.getTotalGameTime()
      })
      eventId++
    }

    return { events, homeScore, awayScore, changePossession, offensiveRebound }
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
      startingPossession
    )
  }

  private static buildGameResult(
    homeTeam: Team,
    awayTeam: Team,
    homeScore: number,
    awayScore: number,
    events: GameEvent[],
    homePlayerStats: Map<string, any>,
    awayPlayerStats: Map<string, any>
  ): GameResult {
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
