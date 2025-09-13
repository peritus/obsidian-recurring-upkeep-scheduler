import { DateFormatOptions } from '../types';

// Type definitions for date inputs
type DateInput = string | Date | null | undefined | {
  toString(): string;
  toFormat?(format: string): string;
};

export class DateUtils {
  static parseLocalDate(dateInput: DateInput): Date {
    if (!dateInput) {
      return new Date(NaN);
    }

    if (dateInput && typeof dateInput === 'object' && 'toString' in dateInput) {
      try {
        if ('toFormat' in dateInput && typeof dateInput.toFormat === 'function') {
          dateInput = dateInput.toFormat('yyyy-MM-dd');
        } else if (dateInput instanceof Date) {
          dateInput = dateInput.toISOString().split('T')[0];
        } else {
          dateInput = dateInput.toString();
        }
      } catch (e) {
        console.error("Error extracting date from DateTime object:", e);
        return new Date(NaN);
      }
    }

    if (dateInput instanceof Date) {
      dateInput = dateInput.toISOString().split('T')[0];
    }

    const dateString = String(dateInput);

    let cleanDateString = dateString;
    if (dateString.includes('T')) {
      cleanDateString = dateString.split('T')[0];
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDateString)) {
      console.error("Invalid date format, expected YYYY-MM-DD but got:", dateString);
      return new Date(NaN);
    }

    const parts = cleanDateString.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error("Failed to parse date components:", { year, month, day, cleanDateString });
      return new Date(NaN);
    }

    return new Date(year, month, day);
  }

  static formatDate(dateString: string): string {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    const options: DateFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return date.toLocaleDateString(undefined, options);
  }

  static formatDaysToPeriod(days: number, isPast = false): string {
    const absDays = Math.abs(days);

    if (absDays === 0) {
      return "today";
    } else if (absDays === 1) {
      return isPast ? "yesterday" : "tomorrow";
    }

    if (absDays >= 365) {
      const years = Math.round(absDays / 365);
      const yearText = years === 1 ? "year" : "years";
      return isPast ? `${years} ${yearText} ago` : `in ${years} ${yearText}`;
    } else if (absDays >= 30) {
      const months = Math.round(absDays / 30);
      const monthText = months === 1 ? "month" : "months";
      return isPast ? `${months} ${monthText} ago` : `in ${months} ${monthText}`;
    } else if (absDays >= 7) {
      const weeks = Math.round(absDays / 7);
      const weekText = weeks === 1 ? "week" : "weeks";
      return isPast ? `${weeks} ${weekText} ago` : `in ${weeks} ${weekText}`;
    } else {
      const dayText = absDays === 1 ? "day" : "days";
      return isPast ? `${absDays} ${dayText} ago` : `in ${absDays} ${dayText}`;
    }
  }

  static formatRelativeDate(dateString: string, now: string | null = null): string {
    if (!dateString) return "never";

    const date = this.parseLocalDate(dateString);
    const todayStr = now || new Date().toISOString().split('T')[0];
    const today = this.parseLocalDate(todayStr);

    if (isNaN(date.getTime()) || isNaN(today.getTime())) {
      console.error("Invalid date in formatRelativeDate:", { dateString, now });
      return "never";
    }

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1 && diffDays < 7) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `on ${days[date.getDay()]}`;
    } else if (diffDays < -1 && diffDays > -7) {
      return this.formatDaysToPeriod(diffDays, true);
    }

    return this.formatDaysToPeriod(diffDays, diffDays < 0);
  }

  static isToday(dateString: string, now: string | null = null): boolean {
    if (!dateString) return false;

    const date = this.parseLocalDate(dateString);
    const todayStr = now || new Date().toISOString().split('T')[0];
    const today = this.parseLocalDate(todayStr);

    if (isNaN(date.getTime()) || isNaN(today.getTime())) {
      return false;
    }

    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  static calculateDaysRemaining(dueDate: string, now: string | null = null): number {
    if (!dueDate) {
      return -9999;
    }

    const todayStr = now || new Date().toISOString().split('T')[0];
    const today = this.parseLocalDate(todayStr);
    const due = this.parseLocalDate(dueDate);

    if (isNaN(due.getTime()) || isNaN(today.getTime())) {
      console.error("calculateDaysRemaining: Invalid date(s):", { dueDate, todayStr });
      return -9999;
    }

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  static calculateNextDueDate(lastDoneDate: string, interval: number, intervalUnit: string): string | null {
    if (!lastDoneDate) return null;

    let date: Date;
    try {
      date = new Date(lastDoneDate);

      if (isNaN(date.getTime())) {
        console.error("Invalid date:", lastDoneDate);
        return null;
      }
    } catch (e) {
      console.error("Error parsing date:", e);
      return null;
    }

    const nextDue = new Date(date);

    const numInterval = Number(interval);
    if (isNaN(numInterval) || numInterval <= 0) {
      console.error("Invalid interval:", interval);
      return null;
    }

    const normalizedUnit = intervalUnit?.toLowerCase();

    if (normalizedUnit === "day" || normalizedUnit === "days") {
      nextDue.setDate(nextDue.getDate() + numInterval);
    } else if (normalizedUnit === "week" || normalizedUnit === "weeks") {
      nextDue.setDate(nextDue.getDate() + (numInterval * 7));
    } else if (normalizedUnit === "month" || normalizedUnit === "months") {
      const targetDay = nextDue.getDate();
      nextDue.setMonth(nextDue.getMonth() + numInterval);

      if (nextDue.getDate() !== targetDay) {
        nextDue.setDate(0);
      }
    } else if (normalizedUnit === "year" || normalizedUnit === "years") {
      nextDue.setFullYear(nextDue.getFullYear() + numInterval);
    } else {
      console.error("Unknown interval unit:", intervalUnit);
      return null;
    }

    if (isNaN(nextDue.getTime())) {
      console.error("Calculated next due date is invalid:", nextDue);
      return null;
    }

    const resultYear = nextDue.getFullYear();
    const resultMonth = (nextDue.getMonth() + 1).toString().padStart(2, '0');
    const resultDay = nextDue.getDate().toString().padStart(2, '0');

    return `${resultYear}-${resultMonth}-${resultDay}`;
  }

  static addDateTooltip(element: HTMLElement, dateString: string, prefix = "Date", now: string | null = null): void {
    if (dateString && element) {
      const formattedDate = this.formatDate(dateString);

      const todayStr = now || new Date().toISOString().split('T')[0];
      const today = this.parseLocalDate(todayStr);
      const targetDate = this.parseLocalDate(dateString);

      if (!isNaN(today.getTime()) && !isNaN(targetDate.getTime())) {
        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        let dayInfo = "";
        if (diffDays === 0) {
          dayInfo = " (today)";
        } else if (diffDays > 0) {
          dayInfo = ` (${diffDays} days)`;
        } else {
          dayInfo = ` (${Math.abs(diffDays)} days ago)`;
        }

        element.title = `${prefix}: ${formattedDate}${dayInfo}`;
      } else {
        element.title = `${prefix}: ${formattedDate}`;
      }

      element.classList.add('recurring-upkeep-tooltip');
    }
  }
}
