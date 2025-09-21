export interface GM {
  id: string
  firstName: string
  lastName: string
  createdAt: Date
}

export interface Player {
  id: string
  name: string
  position: "PG" | "SG" | "SF" | "PF" | "C"
  attributes: {
    shooting: number
    defense: number
    rebounding: number
    passing: number
    athleticism: number
  }
  overall: number
  descriptor: string
}

export interface Team {
  id: string
  name: string
  city: string
  players: Player[]
  record: { wins: number; losses: number }
}

export interface League {
  id: string
  name: string
  teams: Team[]
  userTeamId: string | null
}

export interface GameEvent {
  id: string
  quarter: number
  time: string
  description: string
  homeScore: number
  awayScore: number
}

export interface PlayerGameStats extends Player {
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

export interface GameResult {
  homeTeam: Team
  awayTeam: Team
  homeScore: number
  awayScore: number
  events: GameEvent[]
  winner: string
  homePlayerStats: PlayerGameStats[]
  awayPlayerStats: PlayerGameStats[]
  mvp?: PlayerGameStats
}
