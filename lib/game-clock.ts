/**
 * NBA-compliant game clock system
 * Handles quarter timing, shot clock, and game flow
 */

export interface GameTime {
  quarter: number
  minutes: number
  seconds: number
  totalSeconds: number
  isOvertime: boolean
}

export interface ShotClockState {
  timeRemaining: number
  isActive: boolean
}

export class GameClock {
  private currentTime: number // Total seconds elapsed in the game
  private quarterLength: number = 12 * 60 // 12 minutes in seconds
  private overtimeLength: number = 5 * 60 // 5 minutes in seconds
  private shotClockTime: number = 24 // 24 seconds
  private currentShotClock: number = 24
  private isShotClockActive: boolean = false
  private currentQuarter: number = 1
  private isOvertime: boolean = false

  constructor() {
    this.currentTime = 0
    this.currentShotClock = this.shotClockTime
    this.isShotClockActive = false
  }

  /**
   * Get current game time in a readable format
   */
  getCurrentTime(): GameTime {
    const quarterTime = this.getQuarterTime()
    const minutes = Math.floor(quarterTime / 60)
    const seconds = quarterTime % 60

    return {
      quarter: this.currentQuarter,
      minutes,
      seconds,
      totalSeconds: this.currentTime,
      isOvertime: this.isOvertime
    }
  }

  /**
   * Get time remaining in current quarter
   */
  private getQuarterTime(): number {
    if (this.isOvertime) {
      return this.overtimeLength - (this.currentTime % this.overtimeLength)
    }
    
    const quarterStartTime = (this.currentQuarter - 1) * this.quarterLength
    return this.quarterLength - (this.currentTime - quarterStartTime)
  }

  /**
   * Get current shot clock state
   */
  getShotClock(): ShotClockState {
    return {
      timeRemaining: this.currentShotClock,
      isActive: this.isShotClockActive
    }
  }

  /**
   * Advance time by specified seconds
   */
  advanceTime(seconds: number): void {
    this.currentTime += seconds
    
    if (this.isShotClockActive) {
      this.currentShotClock -= seconds
      if (this.currentShotClock <= 0) {
        this.currentShotClock = 0
        this.isShotClockActive = false
      }
    }

    // Check if quarter is over
    this.checkQuarterEnd()
  }

  /**
   * Start shot clock for new possession
   */
  startShotClock(): void {
    this.currentShotClock = this.shotClockTime
    this.isShotClockActive = true
  }

  /**
   * Reset shot clock based on NBA rules
   */
  resetShotClock(resetType: 'full' | 'partial' | 'offensive_rebound'): void {
    switch (resetType) {
      case 'full':
        this.currentShotClock = this.shotClockTime
        break
      case 'partial':
        this.currentShotClock = 14
        break
      case 'offensive_rebound':
        this.currentShotClock = 14
        break
    }
    this.isShotClockActive = true
  }

  /**
   * Stop shot clock (e.g., after made shot, timeout, etc.)
   */
  stopShotClock(): void {
    this.isShotClockActive = false
  }

  /**
   * Check if current quarter is over
   */
  private checkQuarterEnd(): void {
    const quarterTime = this.getQuarterTime()
    
    if (quarterTime <= 0) {
      if (this.currentQuarter < 4) {
        this.currentQuarter++
        // Reset to start of new quarter
        this.currentTime = (this.currentQuarter - 1) * this.quarterLength
      } else if (!this.isOvertime) {
        // End of regulation - check if overtime needed
        this.isOvertime = true
        this.currentQuarter = 5
        this.currentTime = 4 * this.quarterLength // Start of first overtime
      } else {
        // End of overtime period
        this.currentQuarter++
        const overtimePeriod = this.currentQuarter - 4
        this.currentTime = 4 * this.quarterLength + (overtimePeriod - 1) * this.overtimeLength
      }
    }
  }

  /**
   * Get formatted time string for display
   */
  getFormattedTime(): string {
    const time = this.getCurrentTime()
    const roundedSeconds = Math.round(time.seconds * 100) / 100 // Round to 2 decimal places
    const secondsStr = roundedSeconds.toFixed(2).padStart(5, '0') // Format as SS.SS
    return `${time.minutes}:${secondsStr}`
  }

  /**
   * Check if game is over (no more overtime needed)
   */
  isGameOver(): boolean {
    return false // This will be determined by the game engine based on score
  }

  /**
   * Get total game time in seconds
   */
  getTotalGameTime(): number {
    return this.currentTime
  }

  /**
   * Check if we're in the final 2 minutes of a quarter (for special rules)
   */
  isInFinalTwoMinutes(): boolean {
    const quarterTime = this.getQuarterTime()
    return quarterTime <= 120 // 2 minutes = 120 seconds
  }

  /**
   * Get time remaining in current quarter in seconds
   */
  getQuarterTimeRemaining(): number {
    return this.getQuarterTime()
  }
}
