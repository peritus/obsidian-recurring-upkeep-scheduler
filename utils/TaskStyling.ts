import { ProcessedTask } from '../types';
import { RecurringUpkeepUtils } from './RecurringUpkeepUtils';
import { RECURRING_UPKEEP_LOGGING_ENABLED } from '../constants';

export type TaskStatusClass = 
  | 'recurring-upkeep-never-completed'
  | 'recurring-upkeep-overdue' 
  | 'recurring-upkeep-due-today'
  | 'recurring-upkeep-due-soon'
  | 'recurring-upkeep-up-to-date';

export type TaskProgressClass = 
  | 'recurring-upkeep-progress-never-completed'
  | 'recurring-upkeep-progress-overdue'
  | 'recurring-upkeep-progress-due-today' 
  | 'recurring-upkeep-progress-due-soon'
  | 'recurring-upkeep-progress-up-to-date'
  | 'recurring-upkeep-progress-unknown';

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
   * This method determines the semantic status based on task state
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
      case 'recurring-upkeep-never-completed':
        result = 'recurring-upkeep-progress-never-completed';
        break;
      case 'recurring-upkeep-overdue':
        result = 'recurring-upkeep-progress-overdue';
        break;
      case 'recurring-upkeep-due-today':
        result = 'recurring-upkeep-progress-due-today';
        break;
      case 'recurring-upkeep-due-soon':
        result = 'recurring-upkeep-progress-due-soon';
        break;
      case 'recurring-upkeep-up-to-date':
        result = 'recurring-upkeep-progress-up-to-date';
        break;
      default:
        result = 'recurring-upkeep-progress-unknown';
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
    // Rule 1: Never completed tasks
    if (!task.last_done) {
      return {
        statusClass: 'recurring-upkeep-never-completed',
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

    // Rule 3: Use daysRemaining for status determination
    // This accounts for the task's interval and complete_early_days settings
    const daysRemaining = task.daysRemaining;
    const completeEarlyDays = RecurringUpkeepUtils.getCompleteEarlyDays(task);

    // Rule 4: Overdue tasks (negative days remaining)
    if (daysRemaining < 0) {
      const daysOverdue = Math.abs(daysRemaining);
      return {
        statusClass: 'recurring-upkeep-overdue',
        tooltip: `Overdue by ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}`
      };
    }

    // Rule 5: Due today
    if (daysRemaining === 0) {
      return {
        statusClass: 'recurring-upkeep-due-today',
        tooltip: "Due today"
      };
    }

    // Rule 6: Due soon (within early completion window OR within 7 days)
    // This ensures that tasks that can be completed early show orange color
    const dueSoonThreshold = Math.max(completeEarlyDays, 7);
    if (daysRemaining <= dueSoonThreshold) {
      return {
        statusClass: 'recurring-upkeep-due-soon',
        tooltip: `Due in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`
      };
    }

    // Rule 7: Up to date (more than due soon threshold)
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
      case 'recurring-upkeep-never-completed': return 1; // Highest priority
      case 'recurring-upkeep-overdue': return 2;
      case 'recurring-upkeep-due-today': return 3;
      case 'recurring-upkeep-due-soon': return 4;
      case 'recurring-upkeep-up-to-date': return 5; // Lowest priority
      default: return 6;
    }
  }
}