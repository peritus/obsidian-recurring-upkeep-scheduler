import { ProcessedTask } from '../types';
import { RecurringUpkeepUtils } from './RecurringUpkeepUtils';
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
    const completeEarlyDays = RecurringUpkeepUtils.getCompleteEarlyDays(task);

    // If task can be completed early (within completion window), show as overdue
    if (daysRemaining <= completeEarlyDays) {
      if (daysRemaining < 0) {
        const daysOverdue = Math.abs(daysRemaining);
        return {
          statusClass: 'recurring-upkeep-overdue',
          tooltip: `Overdue by ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}`
        };
      } else if (daysRemaining === 0) {
        return {
          statusClass: 'recurring-upkeep-overdue',
          tooltip: "Due today"
        };
      } else {
        return {
          statusClass: 'recurring-upkeep-overdue',
          tooltip: `Due in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`
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
   * Determines if a task is eligible for early completion
   * This is used by complete buttons to show/hide appropriately
   */
  static isEligibleForCompletion(task: ProcessedTask, currentTime?: string): boolean {
    // Never completed tasks can always be completed
    if (!task.last_done) {
      return true;
    }

    // Tasks completed today cannot be completed again
    const today = currentTime || new Date().toISOString().split('T')[0];
    if (task.last_done === today) {
      return false;
    }

    // Tasks can be completed if they're within the early completion window
    const completeEarlyDays = RecurringUpkeepUtils.getCompleteEarlyDays(task);
    return task.daysRemaining <= completeEarlyDays;
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
}