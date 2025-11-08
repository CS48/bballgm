'use client';

/**
 * Date Generator Utility
 *
 * This utility converts game day numbers (1-150) to month-based display dates
 * following NBA season calendar structure (October 15 - April 10).
 */

import { CalendarConfig } from '../types/calendar';

/**
 * NBA Season Calendar Configuration
 * Maps game days to realistic NBA season dates
 */
const SEASON_CALENDAR_CONFIG: CalendarConfig = {
  start_month: 'October',
  start_day: 15,
  months: [
    { name: 'October', days: 31, start_day: 15 }, // 17 days (15-31)
    { name: 'November', days: 30, start_day: 1 }, // 30 days
    { name: 'December', days: 31, start_day: 1 }, // 31 days
    { name: 'January', days: 31, start_day: 1 }, // 31 days
    { name: 'February', days: 28, start_day: 1 }, // 28 days
    { name: 'March', days: 31, start_day: 1 }, // 31 days
    { name: 'April', days: 10, start_day: 1 }, // 10 days (1-10)
  ],
  total_calendar_days: 178,
  total_game_days: 150,
  rest_day_ratio: 0.84, // 84% of days have games
};

/**
 * DateGenerator class for converting game days to display dates
 */
export class DateGenerator {
  private static instance: DateGenerator;
  private config: CalendarConfig;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.config = SEASON_CALENDAR_CONFIG;
  }

  /**
   * Get the singleton instance of DateGenerator
   * @returns DateGenerator instance
   */
  public static getInstance(): DateGenerator {
    if (!DateGenerator.instance) {
      DateGenerator.instance = new DateGenerator();
    }
    return DateGenerator.instance;
  }

  /**
   * Generate display date for a game day number
   * @param gameDayNumber Game day number (1-150)
   * @param seasonYear Season year for ISO date generation
   * @returns Object with display and ISO date information
   */
  public generateGameDayDate(
    gameDayNumber: number,
    seasonYear: number = 2025
  ): {
    display: string; // "October 15"
    iso: string; // "2025-10-15"
    month: string; // "October"
    day: number; // 15
    month_index: number; // 0-6
  } {
    if (gameDayNumber < 1 || gameDayNumber > this.config.total_game_days) {
      throw new Error(`Game day must be between 1 and ${this.config.total_game_days}`);
    }

    let remainingDays = gameDayNumber;
    let currentMonthIndex = 0;
    let currentDay = this.config.start_day;

    // Find the month and day for this game day
    while (remainingDays > 0 && currentMonthIndex < this.config.months.length) {
      const month = this.config.months[currentMonthIndex];
      const daysInMonth = month.days - month.start_day + 1;

      if (remainingDays <= daysInMonth) {
        // This game day falls within this month
        currentDay = month.start_day + remainingDays - 1;
        break;
      } else {
        // Move to next month
        remainingDays -= daysInMonth;
        currentMonthIndex++;
        if (currentMonthIndex < this.config.months.length) {
          currentDay = this.config.months[currentMonthIndex].start_day;
        }
      }
    }

    const monthName = this.config.months[currentMonthIndex].name;

    // Generate ISO date format
    const monthMap: { [key: string]: string } = {
      January: '01',
      February: '02',
      March: '03',
      April: '04',
      May: '05',
      June: '06',
      July: '07',
      August: '08',
      September: '09',
      October: '10',
      November: '11',
      December: '12',
    };
    const monthNum = monthMap[monthName];
    const dayNum = currentDay.toString().padStart(2, '0');
    const isoDate = `${seasonYear}-${monthNum}-${dayNum}`;

    const result = {
      display: `${monthName} ${currentDay}`,
      iso: isoDate,
      month: monthName,
      day: currentDay,
      month_index: currentMonthIndex,
    };

    return result;
  }

  /**
   * Generate the complete season calendar
   * @returns Array of all game days with their display dates
   */
  public generateSeasonCalendar(): Array<{
    game_day: number;
    date_display: string;
    month: string;
    day: number;
    month_index: number;
  }> {
    const calendar: Array<{
      game_day: number;
      date_display: string;
      month: string;
      day: number;
      month_index: number;
    }> = [];

    for (let gameDay = 1; gameDay <= this.config.total_game_days; gameDay++) {
      const dateInfo = this.generateGameDayDate(gameDay);
      calendar.push({
        game_day: gameDay,
        ...dateInfo,
      });
    }

    return calendar;
  }

  /**
   * Get the season start date
   * @returns Season start date display
   */
  public getSeasonStartDate(): string {
    return `${this.config.start_month} ${this.config.start_day}`;
  }

  /**
   * Get the season end date
   * @returns Season end date display
   */
  public getSeasonEndDate(): string {
    const lastGameDay = this.generateGameDayDate(this.config.total_game_days);
    return lastGameDay.display;
  }

  /**
   * Get the month for a specific game day
   * @param gameDayNumber Game day number
   * @returns Month name
   */
  public getMonthForGameDay(gameDayNumber: number): string {
    const dateInfo = this.generateGameDayDate(gameDayNumber);
    return dateInfo.month;
  }

  /**
   * Get the week number for a game day (approximate)
   * @param gameDayNumber Game day number
   * @returns Week number (1-22)
   */
  public getWeekForGameDay(gameDayNumber: number): number {
    return Math.ceil(gameDayNumber / 7);
  }

  /**
   * Check if a game day is in a specific month
   * @param gameDayNumber Game day number
   * @param monthName Month name to check
   * @returns True if game day is in the specified month
   */
  public isGameDayInMonth(gameDayNumber: number, monthName: string): boolean {
    const dateInfo = this.generateGameDayDate(gameDayNumber);
    return dateInfo.month === monthName;
  }

  /**
   * Get all game days in a specific month
   * @param monthName Month name
   * @returns Array of game day numbers in that month
   */
  public getGameDaysInMonth(monthName: string): number[] {
    const gameDays: number[] = [];

    for (let gameDay = 1; gameDay <= this.config.total_game_days; gameDay++) {
      if (this.isGameDayInMonth(gameDay, monthName)) {
        gameDays.push(gameDay);
      }
    }

    return gameDays;
  }

  /**
   * Get the next game day in the same month
   * @param currentGameDay Current game day number
   * @returns Next game day in same month, or null if none
   */
  public getNextGameDayInMonth(currentGameDay: number): number | null {
    const currentMonth = this.getMonthForGameDay(currentGameDay);

    for (let gameDay = currentGameDay + 1; gameDay <= this.config.total_game_days; gameDay++) {
      if (this.getMonthForGameDay(gameDay) === currentMonth) {
        return gameDay;
      }
    }

    return null;
  }

  /**
   * Get the first game day of a month
   * @param monthName Month name
   * @returns First game day in that month, or null if none
   */
  public getFirstGameDayInMonth(monthName: string): number | null {
    const gameDays = this.getGameDaysInMonth(monthName);
    return gameDays.length > 0 ? gameDays[0] : null;
  }

  /**
   * Get the last game day of a month
   * @param monthName Month name
   * @returns Last game day in that month, or null if none
   */
  public getLastGameDayInMonth(monthName: string): number | null {
    const gameDays = this.getGameDaysInMonth(monthName);
    return gameDays.length > 0 ? gameDays[gameDays.length - 1] : null;
  }

  /**
   * Calculate season progress percentage
   * @param currentGameDay Current game day
   * @returns Progress percentage (0-100)
   */
  public getSeasonProgress(currentGameDay: number): number {
    return Math.round((currentGameDay / this.config.total_game_days) * 100);
  }

  /**
   * Get days remaining in season
   * @param currentGameDay Current game day
   * @returns Days remaining
   */
  public getDaysRemaining(currentGameDay: number): number {
    return Math.max(0, this.config.total_game_days - currentGameDay);
  }

  /**
   * Get estimated completion date
   * @param currentGameDay Current game day
   * @returns Estimated completion date display
   */
  public getEstimatedCompletionDate(currentGameDay: number): string {
    const daysRemaining = this.getDaysRemaining(currentGameDay);
    if (daysRemaining === 0) {
      return this.getSeasonEndDate();
    }

    const estimatedGameDay = currentGameDay + daysRemaining;
    const dateInfo = this.generateGameDayDate(estimatedGameDay);
    return dateInfo.display;
  }

  /**
   * Get calendar configuration
   * @returns Calendar configuration object
   */
  public getConfig(): CalendarConfig {
    return { ...this.config };
  }
}

/**
 * Export singleton instance for easy access
 */
export const dateGenerator = DateGenerator.getInstance();
