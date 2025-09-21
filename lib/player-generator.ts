import type { Player } from "@/types/game"
import { FIRST_NAMES, LAST_NAMES, PLAYER_DESCRIPTORS } from "./game-data"

export class PlayerGenerator {
  private static getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
  }

  private static generateAttributes() {
    // Generate attributes between 40-95
    const shooting = 40 + Math.floor(Math.random() * 56)
    const defense = 40 + Math.floor(Math.random() * 56)
    const rebounding = 40 + Math.floor(Math.random() * 56)
    const passing = 40 + Math.floor(Math.random() * 56)
    const athleticism = 40 + Math.floor(Math.random() * 56)

    return { shooting, defense, rebounding, passing, athleticism }
  }

  private static calculateOverall(attributes: Player["attributes"]): number {
    const { shooting, defense, rebounding, passing, athleticism } = attributes
    return Math.round((shooting + defense + rebounding + passing + athleticism) / 5)
  }

  private static getDescriptor(overall: number, attributes: Player["attributes"]): string {
    // Choose descriptor based on highest attribute
    const { shooting, defense, rebounding, passing, athleticism } = attributes
    const max = Math.max(shooting, defense, rebounding, passing, athleticism)

    if (shooting === max && shooting > 80) return "Sharpshooter"
    if (defense === max && defense > 80) return "Lockdown Defender"
    if (rebounding === max && rebounding > 80) return "Rebounding Machine"
    if (passing === max && passing > 80) return "Floor General"
    if (athleticism === max && athleticism > 80) return "Athletic Freak"

    if (overall > 85) return "Superstar"
    if (overall > 75) return "All-Star"
    if (overall > 65) return "Starter"
    if (overall > 55) return "Role Player"

    return this.getRandomElement(PLAYER_DESCRIPTORS)
  }

  public static generatePlayer(position: Player["position"]): Player {
    const firstName = this.getRandomElement(FIRST_NAMES)
    const lastName = this.getRandomElement(LAST_NAMES)
    const name = `${firstName} ${lastName}`

    const attributes = this.generateAttributes()
    const overall = this.calculateOverall(attributes)
    const descriptor = this.getDescriptor(overall, attributes)

    return {
      id: Math.random().toString(36).substr(2, 9),
      name,
      position,
      attributes,
      overall,
      descriptor,
    }
  }

  public static generateTeamRoster(): Player[] {
    const positions: Player["position"][] = ["PG", "SG", "SF", "PF", "C"]
    return positions.map((position) => this.generatePlayer(position))
  }
}
