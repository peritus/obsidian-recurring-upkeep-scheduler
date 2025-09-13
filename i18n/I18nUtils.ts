import { App } from 'obsidian';
import { I18nManager } from './I18nManager';
import { LocaleKey } from './types';

/**
 * Global i18n utility instance
 * Provides easy access to localization throughout the plugin
 */
export class I18nUtils {
  private static instance: I18nManager | null = null;

  /**
   * Initialize the i18n system
   */
  static init(app: App, locale?: LocaleKey): void {
    this.instance = new I18nManager(app, { locale });
  }

  /**
   * Get the i18n manager instance
   */
  static get i18n(): I18nManager {
    if (!this.instance) {
      throw new Error('I18n system not initialized. Call I18nUtils.init() first.');
    }
    return this.instance;
  }

  /**
   * Get current locale definition
   */
  static get t() {
    return this.i18n.locale;
  }

  /**
   * Format status message with proper localization
   */
  static formatStatus(status: 'upToDate' | 'dueToday' | 'neverCompleted', days?: number): string {
    const t = this.t;

    switch (status) {
      case 'upToDate':
        return t.status.upToDate;
      case 'dueToday':
        return t.status.dueToday;
      case 'neverCompleted':
        return t.status.neverCompleted;
      default:
        return t.status.upToDate;
    }
  }

  /**
   * Format overdue status with days
   */
  static formatOverdue(days: number): string {
    return this.t.status.overdue(days);
  }

  /**
   * Format due soon status with days
   */
  static formatDueSoon(days: number): string {
    return this.t.status.dueSoon(days);
  }

  /**
   * Format frequency description
   */
  static formatFrequency(interval: number, intervalUnit: string): string {
    const t = this.t;
    const normalizedUnit = intervalUnit?.toLowerCase();

    if (interval === 1) {
      if (normalizedUnit === "day" || normalizedUnit === "days") return t.time.frequencies.daily;
      if (normalizedUnit === "week" || normalizedUnit === "weeks") return t.time.frequencies.weekly;
      if (normalizedUnit === "month" || normalizedUnit === "months") return t.time.frequencies.monthly;
      if (normalizedUnit === "year" || normalizedUnit === "years") return t.time.frequencies.yearly;
    }

    // Get proper unit name
    let unitName: string;
    if (normalizedUnit === "day" || normalizedUnit === "days") {
      unitName = this.i18n.getTimeUnit(interval, 'day');
    } else if (normalizedUnit === "week" || normalizedUnit === "weeks") {
      unitName = this.i18n.getTimeUnit(interval, 'week');
    } else if (normalizedUnit === "month" || normalizedUnit === "months") {
      unitName = this.i18n.getTimeUnit(interval, 'month');
    } else if (normalizedUnit === "year" || normalizedUnit === "years") {
      unitName = this.i18n.getTimeUnit(interval, 'year');
    } else {
      unitName = intervalUnit;
    }

    return t.time.frequencies.every(interval, unitName);
  }

  /**
   * Format relative date with proper localization
   */
  static formatRelativeDate(dateString: string, now?: string): string {
    if (!dateString) return this.t.ui.labels.never;

    const date = new Date(dateString);
    const todayStr = now || new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    if (isNaN(date.getTime()) || isNaN(today.getTime())) {
      return this.t.ui.labels.never;
    }

    // Normalize dates to avoid timezone issues
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const t = this.t;

    if (diffDays === 0) return t.time.relative.today;
    if (diffDays === 1) return t.time.relative.tomorrow;
    if (diffDays === -1) return t.time.relative.yesterday;

    // For dates within a week, show the weekday name
    if (diffDays > 1 && diffDays < 7) {
      const weekdayName = this.i18n.getWeekdayName(date);
      return t.time.relative.onWeekday(weekdayName);
    }

    // Use the smart period formatting
    return this.formatDaysToPeriod(diffDays);
  }

  /**
   * Format days to appropriate time period (days/weeks/months/years)
   */
  static formatDaysToPeriod(days: number): string {
    const absDays = Math.abs(days);
    const isPast = days < 0;
    const t = this.t;

    if (absDays >= 365) {
      const years = Math.round(absDays / 365);
      return isPast ? t.time.relative.yearsAgo(years) : t.time.relative.inYears(years);
    } else if (absDays >= 30) {
      const months = Math.round(absDays / 30);
      return isPast ? t.time.relative.monthsAgo(months) : t.time.relative.inMonths(months);
    } else if (absDays >= 7) {
      const weeks = Math.round(absDays / 7);
      return isPast ? t.time.relative.weeksAgo(weeks) : t.time.relative.inWeeks(weeks);
    } else {
      return isPast ? t.time.relative.daysAgo(absDays) : t.time.relative.inDays(absDays);
    }
  }

  /**
   * Add localized date tooltip to an element
   */
  static addDateTooltip(element: HTMLElement, dateString: string, prefix?: string, now?: string): void {
    if (!dateString || !element) return;

    const formattedDate = this.i18n.formatDate(dateString);
    const tooltipPrefix = prefix || this.t.ui.labels.due;

    if (now) {
      const todayStr = now;
      const today = new Date(todayStr);
      const targetDate = new Date(dateString);

      if (!isNaN(today.getTime()) && !isNaN(targetDate.getTime())) {
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        element.title = this.t.help.dateTooltip(tooltipPrefix, formattedDate, diffDays);
      } else {
        element.title = this.t.help.dateTooltip(tooltipPrefix, formattedDate);
      }
    } else {
      element.title = this.t.help.dateTooltip(tooltipPrefix, formattedDate);
    }

    element.classList.add('recurring-upkeep-tooltip');
  }

  /**
   * Get current locale info for debugging
   */
  static getLocaleInfo() {
    return this.i18n.getLocaleInfo();
  }

  /**
   * Set locale manually
   */
  static setLocale(locale: LocaleKey): void {
    this.i18n.setLocale(locale);
  }
}
