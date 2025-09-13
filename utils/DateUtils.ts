import { DateFormatOptions } from '../types';
import { RECURRING_UPKEEP_LOGGING_ENABLED } from '../constants';

// Type definitions for date inputs
type DateInput = string | Date | null | undefined | {
  toString(): string;
  toFormat?(format: string): string;
};

export class DateUtils {
  static parseLocalDate(dateInput: DateInput): Date {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Parsing local date', {
        input: dateInput,
        inputType: typeof dateInput
      });
    }

    if (!dateInput) {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Empty date input, returning invalid date');
      }
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

        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug('[Recurring Upkeep] Extracted date from object', {
            extractedValue: dateInput
          });
        }
      } catch (e) {
        console.error('[Recurring Upkeep] Error extracting date from DateTime object', e);
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
      console.error('[Recurring Upkeep] Invalid date format', {
        expected: 'YYYY-MM-DD',
        received: dateString,
        cleaned: cleanDateString
      });
      console.error("Invalid date format, expected YYYY-MM-DD but got:", dateString);
      return new Date(NaN);
    }

    const parts = cleanDateString.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('[Recurring Upkeep] Failed to parse date components', {
        year,
        month,
        day,
        cleanDateString
      });
      console.error("Failed to parse date components:", { year, month, day, cleanDateString });
      return new Date(NaN);
    }

    const result = new Date(year, month, day);

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Successfully parsed local date', {
        input: dateInput,
        result: result.toISOString().split('T')[0],
        components: { year, month: month + 1, day }
      });
    }

    return result;
  }

  static formatDate(dateString: string): string {
    if (!dateString) return "Never";

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Formatting date', { dateString });
    }

    const date = new Date(dateString);
    const options: DateFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    const result = date.toLocaleDateString(undefined, options);

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Date formatted', {
        input: dateString,
        output: result
      });
    }

    return result;
  }

  static formatDaysToPeriod(days: number, isPast = false): string {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Formatting days to period', {
        days,
        isPast,
        absDays: Math.abs(days)
      });
    }

    const absDays = Math.abs(days);

    if (absDays === 0) {
      return "today";
    } else if (absDays === 1) {
      return isPast ? "yesterday" : "tomorrow";
    }

    let result: string;
    if (absDays >= 365) {
      const years = Math.round(absDays / 365);
      const yearText = years === 1 ? "year" : "years";
      result = isPast ? `${years} ${yearText} ago` : `in ${years} ${yearText}`;
    } else if (absDays >= 30) {
      const months = Math.round(absDays / 30);
      const monthText = months === 1 ? "month" : "months";
      result = isPast ? `${months} ${monthText} ago` : `in ${months} ${monthText}`;
    } else if (absDays >= 7) {
      const weeks = Math.round(absDays / 7);
      const weekText = weeks === 1 ? "week" : "weeks";
      result = isPast ? `${weeks} ${weekText} ago` : `in ${weeks} ${weekText}`;
    } else {
      const dayText = absDays === 1 ? "day" : "days";
      result = isPast ? `${absDays} ${dayText} ago` : `in ${absDays} ${dayText}`;
    }

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Days formatted to period', {
        input: days,
        isPast,
        result
      });
    }

    return result;
  }

  static formatRelativeDate(dateString: string, now: string | null = null): string {
    if (!dateString) return "never";

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Formatting relative date', {
        dateString,
        now
      });
    }

    const date = this.parseLocalDate(dateString);
    const todayStr = now || new Date().toISOString().split('T')[0];
    const today = this.parseLocalDate(todayStr);

    if (isNaN(date.getTime()) || isNaN(today.getTime())) {
      console.error('[Recurring Upkeep] Invalid date in formatRelativeDate', {
        dateString,
        now,
        parsedDate: date.getTime(),
        parsedToday: today.getTime()
      });
      console.error("Invalid date in formatRelativeDate:", { dateString, now });
      return "never";
    }

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Calculated date difference', {
        diffTime,
        diffDays
      });
    }

    let result: string;
    if (diffDays > 1 && diffDays < 7) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      result = `on ${days[date.getDay()]}`;
    } else if (diffDays < -1 && diffDays > -7) {
      result = this.formatDaysToPeriod(diffDays, true);
    } else {
      result = this.formatDaysToPeriod(diffDays, diffDays < 0);
    }

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Relative date formatted', {
        input: dateString,
        now,
        diffDays,
        result
      });
    }

    return result;
  }

  static isToday(dateString: string, now: string | null = null): boolean {
    if (!dateString) return false;

    const date = this.parseLocalDate(dateString);
    const todayStr = now || new Date().toISOString().split('T')[0];
    const today = this.parseLocalDate(todayStr);

    if (isNaN(date.getTime()) || isNaN(today.getTime())) {
      return false;
    }

    const result = date.getDate() === today.getDate() &&
                  date.getMonth() === today.getMonth() &&
                  date.getFullYear() === today.getFullYear();

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Checked if date is today', {
        dateString,
        now,
        isToday: result
      });
    }

    return result;
  }

  static calculateDaysRemaining(dueDate: string, now: string | null = null): number {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Calculating days remaining', {
        dueDate,
        now
      });
    }

    if (!dueDate) {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] No due date provided, returning -9999');
      }
      return -9999;
    }

    const todayStr = now || new Date().toISOString().split('T')[0];
    const today = this.parseLocalDate(todayStr);
    const due = this.parseLocalDate(dueDate);

    if (isNaN(due.getTime()) || isNaN(today.getTime())) {
      console.error('[Recurring Upkeep] Invalid dates in calculateDaysRemaining', {
        dueDate,
        todayStr,
        dueValid: !isNaN(due.getTime()),
        todayValid: !isNaN(today.getTime())
      });
      console.error("calculateDaysRemaining: Invalid date(s):", { dueDate, todayStr });
      return -9999;
    }

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Days remaining calculated', {
        dueDate,
        todayStr,
        diffTime,
        diffDays
      });
    }

    return diffDays;
  }

  static calculateNextDueDate(lastDoneDate: string, interval: number, intervalUnit: string): string | null {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Calculating next due date', {
        lastDoneDate,
        interval,
        intervalUnit
      });
    }

    if (!lastDoneDate) {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] No last done date provided');
      }
      return null;
    }

    let date: Date;
    try {
      date = new Date(lastDoneDate);

      if (isNaN(date.getTime())) {
        console.error('[Recurring Upkeep] Invalid date provided', { lastDoneDate });
        console.error("Invalid date:", lastDoneDate);
        return null;
      }
    } catch (e) {
      console.error('[Recurring Upkeep] Error parsing date', {
        lastDoneDate,
        error: e
      });
      console.error("Error parsing date:", e);
      return null;
    }

    const nextDue = new Date(date);

    const numInterval = Number(interval);
    if (isNaN(numInterval) || numInterval <= 0) {
      console.error('[Recurring Upkeep] Invalid interval', {
        interval,
        numInterval
      });
      console.error("Invalid interval:", interval);
      return null;
    }

    const normalizedUnit = intervalUnit?.toLowerCase();

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Processing interval unit', {
        originalUnit: intervalUnit,
        normalizedUnit,
        numInterval
      });
    }

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

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Month calculation handled edge case', {
          targetDay,
          finalDay: nextDue.getDate()
        });
      }
    } else if (normalizedUnit === "year" || normalizedUnit === "years") {
      nextDue.setFullYear(nextDue.getFullYear() + numInterval);
    } else {
      console.error('[Recurring Upkeep] Unknown interval unit', {
        intervalUnit,
        normalizedUnit
      });
      console.error("Unknown interval unit:", intervalUnit);
      return null;
    }

    if (isNaN(nextDue.getTime())) {
      console.error('[Recurring Upkeep] Calculated next due date is invalid', {
        nextDue,
        lastDoneDate,
        interval,
        intervalUnit
      });
      console.error("Calculated next due date is invalid:", nextDue);
      return null;
    }

    const resultYear = nextDue.getFullYear();
    const resultMonth = (nextDue.getMonth() + 1).toString().padStart(2, '0');
    const resultDay = nextDue.getDate().toString().padStart(2, '0');

    const result = `${resultYear}-${resultMonth}-${resultDay}`;

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Next due date calculated successfully', {
        input: { lastDoneDate, interval, intervalUnit },
        result,
        daysDifference: Math.ceil((nextDue.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      });
    }

    return result;
  }

  static addDateTooltip(element: HTMLElement, dateString: string, prefix = "Date", now: string | null = null): void {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Adding date tooltip', {
        dateString,
        prefix,
        now,
        elementType: element.tagName
      });
    }

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

        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug('[Recurring Upkeep] Tooltip added with day calculation', {
            formattedDate,
            dayInfo,
            diffDays
          });
        }
      } else {
        element.title = `${prefix}: ${formattedDate}`;

        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug('[Recurring Upkeep] Tooltip added without day calculation', {
            formattedDate,
            dateValid: !isNaN(targetDate.getTime()),
            todayValid: !isNaN(today.getTime())
          });
        }
      }

      element.classList.add('recurring-upkeep-tooltip');
    }
  }
}
