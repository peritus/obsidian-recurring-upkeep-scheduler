import { ProcessedTask } from '../types';
import { RecurringUpkeepUtils } from './RecurringUpkeepUtils';
import { DateUtils } from './DateUtils';
import { I18nUtils } from '../i18n/I18nUtils';
import { RECURRING_UPKEEP_LOGGING_ENABLED } from '../constants';

// Task status and progress bar CSS classes
export type TaskStatusClass = 
  | 'recurring-upkeep-overdue'
  | 'recurring-upkeep-up-to-date';

export type TaskProgressClass = 
  | 'recurring-upkeep-progress-overdue'
  | 'recurring-upkeep-progress-up-to-date';

/**
 * Centralized function to determine task status styling
 * Returns semantic CSS class names based on task state
 * 
 * This is the single source of truth for all task color logic.
 * Both status text and progress bar colors use this logic to ensure consistency.
 */
export class TaskStyling {
  
  /**
   * Get the CSS class for status text color
   * Determines the semantic status based on task state
   */
  static getStatusClass(task: ProcessedTask): TaskStatusClass {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Getting status class for task', {
        taskName: task.file?.name,
        lastDone: task.last_done,
        daysRemaining: task.daysRemaining
      });
    }

    const result = this.getTaskStatus(task).statusClass;

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Status class determined', {
        taskName: task.file?.name,
        statusClass: result
      });
    }

    return result;
  }

  /**
   * Get the CSS class for progress bar color
   * Uses the same logic as status class to ensure consistency
   */
  static getProgressClass(task: ProcessedTask, currentTime?: string): TaskProgressClass {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Getting progress class for task', {
        taskName: task.file?.name,
        currentTime
      });
    }

    const statusInfo = this.getTaskStatus(task, currentTime);
    
    // Map status classes to progress classes
    let result: TaskProgressClass;
    switch (statusInfo.statusClass) {
      case 'recurring-upkeep-overdue':
        result = 'recurring-upkeep-progress-overdue';
        break;
      case 'recurring-upkeep-up-to-date':
        result = 'recurring-upkeep-progress-up-to-date';
        break;
      default:
        result = 'recurring-upkeep-progress-overdue'; // Default to overdue for safety
    }

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Progress class determined', {
        taskName: task.file?.name,
        statusClass: statusInfo.statusClass,
        progressClass: result
      });
    }

    return result;
  }

  /**
   * Get tooltip text for progress bar
   */
  static getProgressTooltip(task: ProcessedTask, currentTime?: string): string {
    const statusInfo = this.getTaskStatus(task, currentTime);
    return statusInfo.tooltip;
  }

  /**
   * Core logic for determining task status based on business rules
   * This is the single source of truth for all styling decisions
   * 
   * @param task The processed task to analyze
   * @param currentTime Optional current time for progress bar calculations
   * @returns Object with status class and tooltip information
   */
  private static getTaskStatus(task: ProcessedTask, currentTime?: string): {
    statusClass: TaskStatusClass;
    tooltip: string;
  } {
    // If task is eligible for completion, it's overdue (red)
    // Otherwise, it's up to date (green)
    
    // Rule 1: Never completed tasks are overdue
    if (!task.last_done) {
      return {
        statusClass: 'recurring-upkeep-overdue',
        tooltip: "Task has never been completed"
      };
    }

    // Rule 2: Completed today (always up to date)
    const today = currentTime || new Date().toISOString().split('T')[0];
    if (task.last_done === today) {
      return {
        statusClass: 'recurring-upkeep-up-to-date',
        tooltip: "Task completed today"
      };
    }

    // Rule 3: Binary decision based on days remaining
    // Negative or zero days remaining = overdue (red)
    // Positive days remaining = up to date (green)
    const daysRemaining = task.daysRemaining;

    // If task is overdue (daysRemaining <= 0), show as overdue
    if (daysRemaining <= 0) {
      if (daysRemaining < 0) {
        const daysOverdue = Math.abs(daysRemaining);
        return {
          statusClass: 'recurring-upkeep-overdue',
          tooltip: `Overdue by ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}`
        };
      } else {
        return {
          statusClass: 'recurring-upkeep-overdue',
          tooltip: "Due today"
        };
      }
    }

    // Rule 4: Up to date (more than early completion window)
    return {
      statusClass: 'recurring-upkeep-up-to-date',
      tooltip: `Due in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`
    };
  }

  /**
   * Get priority value for sorting tasks
   * Lower numbers = higher priority (should appear first)
   */
  static getSortPriority(task: ProcessedTask): number {
    const statusClass = this.getStatusClass(task);
    
    switch (statusClass) {
      case 'recurring-upkeep-overdue': return 1; // Higher priority (red)
      case 'recurring-upkeep-up-to-date': return 2; // Lower priority (green)
      default: return 3;
    }
  }

  // ========================================
  // UI CONSTANTS AND DISPLAY TEXT METHODS
  // ========================================

  /**
   * UI symbols used consistently across all components
   */
  static readonly UI_SYMBOLS = {
    FREQUENCY: '🔁',
    DATE: '📅',
    SEPARATOR: ' • '
  } as const;

  /**
   * Get the primary status text for display
   * Centralizes status text generation from multiple components
   * 
   * @param task The processed task
   * @returns Localized status text (e.g., "✅ Up to date", "⚠️ Overdue by 3 days")
   */
  static getStatusText(task: ProcessedTask): string {
    try {
      if (!task.last_done) {
        return I18nUtils.t.status.neverCompleted;
      } else if (task.daysRemaining < 0) {
        const days = Math.abs(task.daysRemaining);
        return I18nUtils.formatOverdue(days);
      } else if (task.daysRemaining === 0) {
        return I18nUtils.t.status.dueToday;
      } else {
        return I18nUtils.t.status.upToDate;
      }
    } catch (error) {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.warn('[TaskStyling] Error getting status text, using fallback:', error);
      }
      // Fallback to basic status if i18n fails
      return task.status || "Unknown status";
    }
  }

  /**
   * Get secondary status information text
   * Centralizes complex conditional logic from StatusIndicator component
   * 
   * @param task The processed task
   * @param currentTime Optional current time for calculations
   * @returns Secondary status text with task details
   */
  static getSecondaryStatusText(task: ProcessedTask, currentTime?: string): string {
    const now = currentTime || new Date().toISOString().split('T')[0];
    const frequencyDesc = RecurringUpkeepUtils.getFrequencyDescription(
      task.interval,
      task.interval_unit
    );

    try {
      if (!task.last_done) {
        return I18nUtils.t.ui.statusText.thisIsTask(frequencyDesc);
      } else if (DateUtils.isToday(task.last_done, now)) {
        if (task.calculatedNextDue) {
          const relativeDate = I18nUtils.formatRelativeDate(task.calculatedNextDue, now);
          return I18nUtils.t.ui.statusText.dueWithFrequency(relativeDate, frequencyDesc);
        } else {
          let daysUntilDue = 0;
          const unit = task.interval_unit.toLowerCase();
          if (unit === "days" || unit === "day") {
            daysUntilDue = Number(task.interval);
          } else if (unit === "weeks" || unit === "week") {
            daysUntilDue = Number(task.interval) * 7;
          } else if (unit === "months" || unit === "month") {
            daysUntilDue = Number(task.interval) * 30;
          } else if (unit === "years" || unit === "year") {
            daysUntilDue = Number(task.interval) * 365;
          }
          return I18nUtils.t.ui.statusText.dueInDays(daysUntilDue, frequencyDesc);
        }
      } else if (task.daysRemaining < 0) {
        const relativeDate = I18nUtils.formatRelativeDate(task.last_done, now);
        return I18nUtils.t.ui.statusText.taskLastDone(frequencyDesc, relativeDate);
      } else if (task.daysRemaining === 0) {
        const relativeDate = I18nUtils.formatRelativeDate(task.last_done, now);
        return I18nUtils.t.ui.statusText.taskLastDone(frequencyDesc, relativeDate);
      } else {
        const relativeDate = I18nUtils.formatRelativeDate(task.calculatedNextDue || "", now);
        return I18nUtils.t.ui.statusText.dueWithFrequency(relativeDate, frequencyDesc);
      }
    } catch (error) {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.warn('[TaskStyling] Error getting secondary status text:', error);
      }
      return frequencyDesc; // Fallback to basic frequency description
    }
  }

  /**
   * Get frequency display text with emoji
   * 
   * @param task The processed task
   * @returns Frequency text with emoji (e.g., "🔁 Every 2 weeks")
   */
  static getFrequencyDisplayText(task: ProcessedTask): string {
    try {
      const frequency = I18nUtils.formatFrequency(task.interval, task.interval_unit);
      return `${this.UI_SYMBOLS.FREQUENCY} ${frequency}`;
    } catch (error) {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.warn('[TaskStyling] Error getting frequency display text:', error);
      }
      return `${this.UI_SYMBOLS.FREQUENCY} ${task.interval} ${task.interval_unit}`;
    }
  }

  /**
   * Get due date display text with emoji
   * 
   * @param task The processed task
   * @param currentTime Optional current time for calculations
   * @returns Due date text with emoji (e.g., "📅 Due in 5 days")
   */
  static getDueDateDisplayText(task: ProcessedTask, currentTime?: string): string {
    const now = currentTime || new Date().toISOString().split('T')[0];

    try {
      if (!task.last_done) {
        return `${this.UI_SYMBOLS.DATE} ${I18nUtils.t.ui.labels.never}`;
      } else if (task.daysRemaining < 0) {
        if (task.calculatedNextDue) {
          const wasDueText = I18nUtils.formatRelativeDate(task.calculatedNextDue, now);
          return `${this.UI_SYMBOLS.DATE} ${I18nUtils.t.ui.labels.wasDue} ${wasDueText}`;
        } else {
          return `${this.UI_SYMBOLS.DATE} ${I18nUtils.t.filters.status.overdue}`;
        }
      } else if (task.daysRemaining === 0) {
        return `${this.UI_SYMBOLS.DATE} ${I18nUtils.t.time.relative.today}`;
      } else if (task.calculatedNextDue) {
        const nextDueText = I18nUtils.formatRelativeDate(task.calculatedNextDue, now);
        return `${this.UI_SYMBOLS.DATE} ${I18nUtils.t.ui.labels.nextDue} ${nextDueText}`;
      } else {
        return `${this.UI_SYMBOLS.DATE} ${I18nUtils.t.ui.labels.notScheduled}`;
      }
    } catch (error) {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.warn('[TaskStyling] Error getting due date display text:', error);
      }
      return `${this.UI_SYMBOLS.DATE} ${task.calculatedNextDue || I18nUtils.t.ui.labels.notScheduled}`;
    }
  }

  /**
   * Get complete task info display text
   * Combines frequency and due date with consistent formatting
   * 
   * @param task The processed task
   * @param currentTime Optional current time for calculations
   * @returns Complete task info (e.g., "🔁 Every 2 weeks • 📅 Due in 5 days")
   */
  static getTaskInfoDisplayText(task: ProcessedTask, currentTime?: string): string {
    const frequencyText = this.getFrequencyDisplayText(task);
    const dueDateText = this.getDueDateDisplayText(task, currentTime);
    return `${frequencyText}${this.UI_SYMBOLS.SEPARATOR}${dueDateText}`;
  }
}