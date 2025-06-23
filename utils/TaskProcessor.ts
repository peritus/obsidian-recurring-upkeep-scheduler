import { UpkeepTask, ProcessedTask } from '../types';
import { RecurringUpkeepUtils } from './RecurringUpkeepUtils';

export class TaskProcessor {
  static processTask(task: UpkeepTask, now?: string): ProcessedTask {
    const nowStr = now || new Date().toISOString().split('T')[0];
    const statusInfo = RecurringUpkeepUtils.determineTaskStatus(task, nowStr);

    return {
      ...task,
      ...statusInfo
    };
  }

  static processTasks(tasks: UpkeepTask[], now?: string): ProcessedTask[] {
    return tasks.map(task => this.processTask(task, now));
  }

  static sortTasks(tasks: ProcessedTask[]): ProcessedTask[] {
    return [...tasks].sort((a, b) => {
      if (!a.calculatedNextDue && b.calculatedNextDue) return -1;
      if (a.calculatedNextDue && !b.calculatedNextDue) return 1;
      if (!a.calculatedNextDue && !b.calculatedNextDue) return 0;

      const dateA = new Date(a.calculatedNextDue!);
      const dateB = new Date(b.calculatedNextDue!);

      return dateA.getTime() - dateB.getTime();
    });
  }
}
