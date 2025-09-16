import { UpkeepTask, ProcessedTask } from '../types';
import { RecurringUpkeepUtils } from './RecurringUpkeepUtils';
import { RECURRING_UPKEEP_LOGGING_ENABLED } from '../constants';

export class TaskProcessor {
  static processTask(task: UpkeepTask, now?: string): ProcessedTask {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Processing individual task', {
        taskName: task.file?.name,
        lastDone: task.last_done,
        interval: task.interval,
        intervalUnit: task.interval_unit,
        now
      });
    }

    const nowStr = now || new Date().toISOString().split('T')[0];
    const statusInfo = RecurringUpkeepUtils.determineTaskStatus(task, nowStr);

    const result = {
      ...task,
      ...statusInfo
    };

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Task processed', {
        taskName: task.file?.name,
        status: result.status,
        daysRemaining: result.daysRemaining
      });
    }

    return result;
  }

  static processTasks(tasks: UpkeepTask[], now?: string): ProcessedTask[] {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Processing multiple tasks', {
        taskCount: tasks.length,
        now
      });
    }

    const startTime = RECURRING_UPKEEP_LOGGING_ENABLED ? performance.now() : 0;

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.time('[Recurring Upkeep] Task processing batch');
    }

    const results = tasks.map(task => this.processTask(task, now));

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      const duration = performance.now() - startTime;
      console.timeEnd('[Recurring Upkeep] Task processing batch');
      console.info('[Recurring Upkeep] Batch processing completed', {
        inputCount: tasks.length,
        outputCount: results.length,
        duration: `${duration.toFixed(2)}ms`,
        averagePerTask: `${(duration / tasks.length).toFixed(2)}ms`
      });
    }

    return results;
  }

  static sortTasks(tasks: ProcessedTask[]): ProcessedTask[] {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Sorting tasks by due date', {
        taskCount: tasks.length
      });
    }

    const startTime = RECURRING_UPKEEP_LOGGING_ENABLED ? performance.now() : 0;

    const sorted = [...tasks].sort((a, b) => {
      // Tasks without due dates come first
      if (!a.calculatedNextDue && b.calculatedNextDue) return -1;
      if (a.calculatedNextDue && !b.calculatedNextDue) return 1;
      if (!a.calculatedNextDue && !b.calculatedNextDue) return 0;

      // Sort by due date
      const dateA = new Date(a.calculatedNextDue!);
      const dateB = new Date(b.calculatedNextDue!);

      return dateA.getTime() - dateB.getTime();
    });

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      const duration = performance.now() - startTime;
      console.debug('[Recurring Upkeep] Tasks sorted', {
        inputCount: tasks.length,
        sortedCount: sorted.length,
        duration: `${duration.toFixed(2)}ms`,
        tasksWithoutDueDate: sorted.filter(t => !t.calculatedNextDue).length,
        tasksWithDueDate: sorted.filter(t => t.calculatedNextDue).length
      });
    }

    return sorted;
  }
}
