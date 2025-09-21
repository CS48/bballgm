import type { Player, Team, GameEvent, GameResult } from "@/types/game"
import { GameClock } from "./game-clock"

export class GameEngine {
  private static getPlayerEffectiveness(player: Player): number {
    // Calculate effectiveness based on overall rating with some randomness
    const baseEffectiveness = player.overall / 100
    const randomFactor = 0.8 + Math.random() * 0.4 // 0.8 to 1.2 multiplier
    return Math.min(1, baseEffectiveness * randomFactor)
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
    const events: GameEvent[] = []
    let homeScore = 0
    let awayScore = 0
    let eventId = 1
    let currentPossession = homeTeam // Home team starts with possession
    let maxOvertimePeriods = 3 // Maximum overtime periods

    const gameClock = new GameClock()
    const homeTargetScore = Math.max(85, Math.min(125, Math.round(this.normalRandom(105, 15))))
    const awayTargetScore = Math.max(85, Math.min(125, Math.round(this.normalRandom(105, 15))))

    const playerStats = new Map<
      string,
      {
        points: number
        rebounds: number
        assists: number
        steals: number
        blocks: number
        fieldGoalsMade: number
        fieldGoalsAttempted: number
        threePointersMade: number
        threePointersAttempted: number
        turnovers: number
        fouls: number
      }
    >()

    // Initialize stats for all players
    homeTeam.players.forEach((player) =>
      playerStats.set(player.id, {
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
      }),
    )
    awayTeam.players.forEach((player) =>
      playerStats.set(player.id, {
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
      }),
    )

    // Target ~220 total possessions (110 per team) for realistic NBA pace with 80-100 FGA per team
    const targetPossessionsPerTeam = 110
    let homePossessions = 0
    let awayPossessions = 0

    // Start first possession
    gameClock.startShotClock()

    // Simulate game until completion
    while (gameClock.getCurrentTime().quarter <= 4 || (gameClock.getCurrentTime().quarter > 4 && homeScore === awayScore && gameClock.getCurrentTime().quarter <= 4 + maxOvertimePeriods)) {
      const currentTime = gameClock.getCurrentTime()
      
      // Check if quarter is over
      if (gameClock.getQuarterTimeRemaining() <= 0) {
        // End of quarter - check if we need overtime
        if (currentTime.quarter === 4 && homeScore === awayScore) {
          // Start overtime
          gameClock.advanceTime(1) // Move to overtime
          continue
        } else if (currentTime.quarter > 4 && homeScore === awayScore) {
          // Continue overtime
          gameClock.advanceTime(1)
          continue
        } else if (currentTime.quarter > 4 && homeScore !== awayScore) {
          // Overtime winner determined
          break
        } else if (currentTime.quarter === 4 && homeScore !== awayScore) {
          // Game over
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
          // Both teams have reached possession limit, end game
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
        eventId
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

    const homePlayerStats = homeTeam.players.map((player) => ({
      ...player,
      ...playerStats.get(player.id)!,
    }))

    const awayPlayerStats = awayTeam.players.map((player) => ({
      ...player,
      ...playerStats.get(player.id)!,
    }))

    const homeCalculatedScore = homePlayerStats.reduce((sum, player) => sum + player.points, 0)
    const awayCalculatedScore = awayPlayerStats.reduce((sum, player) => sum + player.points, 0)

    const winningTeamStats = homeCalculatedScore > awayCalculatedScore ? homePlayerStats : awayPlayerStats
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
      homePlayerStats,
      awayPlayerStats,
      mvp,
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
    startEventId: number
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

    // Realistic possession duration: 10-20 seconds
    const possessionDuration = 10 + Math.random() * 10
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

    // Determine shot type
    const isThreePointer = Math.random() > 0.65 // 35% chance for 3-pointer

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

    // Calculate shot success
    const currentScore = offensiveTeam === homeTeam ? homeScore : awayScore
    const targetScore = offensiveTeam === homeTeam ? 105 : 105 // Simplified target
    const progressFactor = Math.min(1.3, Math.max(0.8, targetScore / Math.max(1, currentScore)))
    const baseShotSuccess = effectiveness * 0.5 + 0.15
    const shotSuccess = Math.random() < baseShotSuccess * progressFactor

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
}
