import type { Player, Team, GameEvent, GameResult } from "@/types/game"

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
  ): string {
    const playerName = player.name.split(" ")[1] // Use last name

    if (action === "shot") {
      if (success) {
        return isThreePointer ? `${playerName} drains a three-pointer!` : `${playerName} makes a two-pointer!`
      } else {
        return isThreePointer ? `${playerName} misses the three-point attempt` : `${playerName} misses the shot`
      }
    } else if (action === "rebound") {
      return `${playerName} grabs the rebound`
    } else if (action === "assist") {
      return `${playerName} with the assist`
    } else if (action === "steal") {
      return `${playerName} steals the ball!`
    } else if (action === "block") {
      return `${playerName} with the block!`
    }

    return `${playerName} makes a play`
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
      }),
    )

    for (let quarter = 1; quarter <= 4; quarter++) {
      const possessions = 20 + Math.floor(Math.random() * 8) // 20-27 possessions per quarter
      const quarterTargetHome = Math.round((homeTargetScore / 4) * (0.8 + Math.random() * 0.4))
      const quarterTargetAway = Math.round((awayTargetScore / 4) * (0.8 + Math.random() * 0.4))

      for (let i = 0; i < possessions; i++) {
        const timeLeft = Math.floor(((possessions - i) / possessions) * 12) // Minutes left in quarter
        const minutes = timeLeft
        const seconds = Math.floor(Math.random() * 60)
        const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`

        // Alternate possessions
        const isHomePossession = i % 2 === 0
        const offensiveTeam = isHomePossession ? homeTeam : awayTeam
        const defensiveTeam = isHomePossession ? awayTeam : homeTeam

        // Pick random offensive player
        const shooter = offensiveTeam.players[Math.floor(Math.random() * 5)]
        const effectiveness = this.getPlayerEffectiveness(shooter)

        const isThreePointer = Math.random() > 0.65 // 35% chance for 3-pointer

        const currentScore = isHomePossession ? homeScore : awayScore
        const targetScore = isHomePossession ? homeTargetScore : awayTargetScore
        const progressFactor = Math.min(1.3, Math.max(0.8, targetScore / Math.max(1, currentScore)))
        const baseShotSuccess = effectiveness * 0.5 + 0.15
        const shotSuccess = Math.random() < baseShotSuccess * progressFactor

        const shooterStats = playerStats.get(shooter.id)!
        if (isThreePointer) {
          shooterStats.threePointersAttempted++
        }
        shooterStats.fieldGoalsAttempted++

        let points = 0
        if (shotSuccess) {
          points = isThreePointer ? 3 : 2
          shooterStats.points += points
          shooterStats.fieldGoalsMade++
          if (isThreePointer) {
            shooterStats.threePointersMade++
          }

          if (isHomePossession) {
            homeScore += points
          } else {
            awayScore += points
          }

          if (Math.random() > 0.6) {
            const assistPlayer = offensiveTeam.players.find((p) => p.id !== shooter.id && Math.random() > 0.6)
            if (assistPlayer) {
              playerStats.get(assistPlayer.id)!.assists++
            }
          }
        }

        const description = this.generatePlayDescription(shooter, "shot", shotSuccess, isThreePointer)

        events.push({
          id: eventId.toString(),
          quarter,
          time: timeString,
          description,
          homeScore,
          awayScore,
        })

        eventId++

        if (Math.random() > 0.7) {
          const eventType = Math.random()
          let eventPlayer
          let actionType

          if (eventType > 0.7) {
            // Rebound
            eventPlayer =
              Math.random() > 0.6
                ? offensiveTeam.players[Math.floor(Math.random() * 5)]
                : defensiveTeam.players[Math.floor(Math.random() * 5)]
            actionType = "rebound"
            playerStats.get(eventPlayer.id)!.rebounds++
          } else if (eventType > 0.4) {
            // Steal
            eventPlayer = defensiveTeam.players[Math.floor(Math.random() * 5)]
            actionType = "steal"
            playerStats.get(eventPlayer.id)!.steals++
          } else {
            // Block
            eventPlayer = defensiveTeam.players[Math.floor(Math.random() * 5)]
            actionType = "block"
            playerStats.get(eventPlayer.id)!.blocks++
          }

          events.push({
            id: eventId.toString(),
            quarter,
            time: timeString,
            description: this.generatePlayDescription(eventPlayer, actionType, true),
            homeScore,
            awayScore,
          })

          eventId++
        }
      }
    }

    const winner = homeScore > awayScore ? homeTeam.name : awayTeam.name

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
      homeScore: homeCalculatedScore, // Use calculated score to ensure accuracy
      awayScore: awayCalculatedScore, // Use calculated score to ensure accuracy
      events,
      winner: homeCalculatedScore > awayCalculatedScore ? homeTeam.name : awayTeam.name,
      homePlayerStats,
      awayPlayerStats,
      mvp, // Added MVP selection
    }
  }
}
