import type { Team, League } from "@/types/game"
import { PlayerGenerator } from "./player-generator"
import { US_CITIES, TEAM_NAMES } from "./game-data"

export class LeagueGenerator {
  private static getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  public static generateLeague(leagueName: string): League {
    // Shuffle cities and team names to get random combinations
    const shuffledCities = this.shuffleArray(US_CITIES)
    const shuffledNames = this.shuffleArray(TEAM_NAMES)

    const teams: Team[] = []

    // Generate 8 teams
    for (let i = 0; i < 8; i++) {
      const city = shuffledCities[i]
      const teamName = shuffledNames[i]
      const players = PlayerGenerator.generateTeamRoster()

      const team: Team = {
        id: Math.random().toString(36).substr(2, 9),
        name: `${city} ${teamName}`,
        city,
        players,
        record: { wins: 0, losses: 0 },
      }

      teams.push(team)
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      name: leagueName,
      teams,
      userTeamId: null,
    }
  }
}
