"use client"

interface UserSession {
  gm: {
    name: string
    [key: string]: any
  }
  teamId: number
  teamName: string
  createdAt: string
}

interface LeagueState {
  exists: boolean
  createdAt: string
}

const SESSION_KEY = 'bballgm-session'
const LEAGUE_KEY = 'bballgm-league-state'
const DATABASE_KEY = 'bballgm-database'

export const storage = {
  // Session methods
  saveSession(session: Omit<UserSession, 'createdAt'>): void {
    if (typeof window === 'undefined') return
    
    try {
      const fullSession: UserSession = {
        ...session,
        createdAt: new Date().toISOString()
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(fullSession))
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  },

  loadSession(): UserSession | null {
    if (typeof window === 'undefined') return null
    
    try {
      const data = localStorage.getItem(SESSION_KEY)
      if (!data) return null
      
      return JSON.parse(data)
    } catch (error) {
      console.error('Failed to load session:', error)
      return null
    }
  },

  clearSession(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch (error) {
      console.error('Failed to clear session:', error)
    }
  },

  hasSession(): boolean {
    return this.loadSession() !== null
  },

  // League state methods
  markLeagueExists(): void {
    if (typeof window === 'undefined') return
    
    try {
      const state: LeagueState = {
        exists: true,
        createdAt: new Date().toISOString()
      }
      localStorage.setItem(LEAGUE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to mark league exists:', error)
    }
  },

  hasLeague(): boolean {
    if (typeof window === 'undefined') return false
    
    try {
      const data = localStorage.getItem(LEAGUE_KEY)
      if (!data) return false
      
      const state: LeagueState = JSON.parse(data)
      return state.exists
    } catch (error) {
      return false
    }
  },

  clearLeague(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(LEAGUE_KEY)
    } catch (error) {
      console.error('Failed to clear league state:', error)
    }
  },

  // Database persistence methods
  saveDatabase(data: Uint8Array): void {
    if (typeof window === 'undefined') return
    
    try {
      // Convert Uint8Array to base64 string for storage
      const base64 = btoa(
        Array.from(data)
          .map(byte => String.fromCharCode(byte))
          .join('')
      )
      
      localStorage.setItem(DATABASE_KEY, base64)
      console.log('Database saved to localStorage')
    } catch (error) {
      console.error('Failed to save database:', error)
      
      // If storage quota exceeded, try to clear old data
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded. Database may be too large.')
      }
    }
  },

  loadDatabase(): Uint8Array | null {
    if (typeof window === 'undefined') return null
    
    try {
      const base64 = localStorage.getItem(DATABASE_KEY)
      if (!base64) return null
      
      // Convert base64 string back to Uint8Array
      const binaryString = atob(base64)
      const bytes = new Uint8Array(binaryString.length)
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      console.log('Database loaded from localStorage')
      return bytes
    } catch (error) {
      console.error('Failed to load database:', error)
      return null
    }
  },

  clearDatabase(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(DATABASE_KEY)
      console.log('Database cleared from localStorage')
    } catch (error) {
      console.error('Failed to clear database:', error)
    }
  },

  hasDatabase(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(DATABASE_KEY) !== null
  },

  // Clear everything
  clearAll(): void {
    this.clearSession()
    this.clearLeague()
    this.clearDatabase()
  }
}
