import { App } from 'obsidian';
import { LocaleDefinition, LocaleKey, I18nOptions } from './types';
import { en } from './locales/en';
import { de } from './locales/de';

// Type definitions for accessing Obsidian app configuration
interface VaultConfig {
  userLocale?: string;
}

interface ObsidianVaultWithConfig {
  config?: VaultConfig;
}

export class I18nManager {
  private app: App;
  private currentLocale: LocaleKey;
  private fallbackLocale: LocaleKey;
  private locales: Record<LocaleKey, LocaleDefinition>;

  constructor(app: App, options: I18nOptions = {}) {
    this.app = app;
    this.fallbackLocale = options.fallbackLocale || 'en';
    this.locales = { en, de };

    // Auto-detect locale or use provided one
    this.currentLocale = this.detectLocale(options.locale);
  }

  private detectLocale(providedLocale?: LocaleKey): LocaleKey {
    if (providedLocale && this.locales[providedLocale]) {
      return providedLocale;
    }

    // Try to detect from Obsidian's locale
    try {
      // Safe access to Obsidian's vault configuration using type assertion
      const vaultWithConfig = this.app.vault as unknown as ObsidianVaultWithConfig;
      const obsidianLocale = vaultWithConfig.config?.userLocale ||
                           this.getStorageLocale() ||
                           this.getNavigatorLocale() ||
                           'en';

      // Map common locale codes to our supported locales
      const normalizedLocale = obsidianLocale.toLowerCase();
      if (normalizedLocale.startsWith('de')) return 'de';
      if (normalizedLocale.startsWith('en')) return 'en';

    } catch (error) {
      console.log('Could not detect locale, using fallback:', error);
    }

    return this.fallbackLocale;
  }

  private getStorageLocale(): string | null {
    try {
      return localStorage.getItem('language');
    } catch {
      return null;
    }
  }

  private getNavigatorLocale(): string | null {
    try {
      return navigator.language;
    } catch {
      return null;
    }
  }

  /**
   * Get the current locale definition
   */
  get locale(): LocaleDefinition {
    return this.locales[this.currentLocale] || this.locales[this.fallbackLocale];
  }

  /**
   * Get current locale key
   */
  get currentLocaleKey(): LocaleKey {
    return this.currentLocale;
  }

  /**
   * Set the current locale
   */
  setLocale(locale: LocaleKey): void {
    if (this.locales[locale]) {
      this.currentLocale = locale;
    }
  }

  /**
   * Format a number with proper locale-specific formatting
   */
  formatNumber(num: number): string {
    try {
      return new Intl.NumberFormat(this.currentLocale).format(num);
    } catch {
      return num.toString();
    }
  }

  /**
   * Format a date with proper locale-specific formatting
   */
  formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';

      const defaultOptions: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };

      return new Intl.DateTimeFormat(this.currentLocale, options || defaultOptions).format(dateObj);
    } catch {
      return typeof date === 'string' ? date : date.toString();
    }
  }

  /**
   * Get weekday name in current locale
   */
  getWeekdayName(date: Date | string): string {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';

      return new Intl.DateTimeFormat(this.currentLocale, { weekday: 'long' }).format(dateObj);
    } catch {
      return '';
    }
  }

  /**
   * Get short weekday name in current locale
   */
  getShortWeekdayName(date: Date | string): string {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';

      return new Intl.DateTimeFormat(this.currentLocale, { weekday: 'short' }).format(dateObj);
    } catch {
      return '';
    }
  }

  /**
   * Get proper plural form for a given count
   * This handles basic English/German pluralization rules
   */
  getPlural(count: number, singular: string, plural: string): string {
    if (this.currentLocale === 'de') {
      // German: 0 and 1 are singular, everything else is plural
      return count === 1 ? singular : plural;
    } else {
      // English: 1 is singular, everything else (including 0) is plural
      return count === 1 ? singular : plural;
    }
  }

  /**
   * Helper to get time unit in correct form
   */
  getTimeUnit(count: number, unit: 'day' | 'week' | 'month' | 'year'): string {
    const units = this.locale.time.units;
    const singular = units[unit];
    const plural = units[unit + 's' as keyof typeof units];
    return this.getPlural(count, singular, plural);
  }

  /**
   * Debug method to get current locale info
   */
  getLocaleInfo(): { current: LocaleKey; available: LocaleKey[]; fallback: LocaleKey } {
    return {
      current: this.currentLocale,
      available: Object.keys(this.locales) as LocaleKey[],
      fallback: this.fallbackLocale
    };
  }
}
