import { ProcessedTask } from '../types';
import { TaskStyling } from '../utils/TaskStyling';
import { RecurringUpkeepUtils } from '../utils/RecurringUpkeepUtils';
import { DateUtils } from '../utils/DateUtils';

export class ProgressBar {
  constructor() {
    // No constructor parameters needed
  }

  render(container: HTMLElement, task: ProcessedTask, now?: string): void {
    const currentTime = now || new Date().toISOString().split('T')[0];

    const wrapper = container.createEl('div', {
      cls: 'recurring-upkeep-progress-wrapper'
    });

    const progress = wrapper.createEl('div', {
      cls: 'recurring-upkeep-progress-bar'
    });

    // Calculate percentage for progress bar width
    let percentage = this.calculatePercentage(task, currentTime);

    // Get semantic CSS class from centralized styling
    const colorClass = TaskStyling.getProgressClass(task, currentTime);
    const tooltip = TaskStyling.getProgressTooltip(task, currentTime);

    // Set progress width using CSS custom property instead of inline styles
    progress.style.setProperty('--progress-width', `${percentage}%`);
    progress.setAttribute('data-width', percentage.toString());
    progress.addClasses([colorClass]);
    progress.title = tooltip;
  }

  private calculatePercentage(task: ProcessedTask, currentTime: string): number {
    if (!task.last_done) {
      return 0; // Never completed
    }

    if (DateUtils.isToday(task.last_done, currentTime)) {
      return 100; // Completed today
    }

    // Calculate percentage based on days since last done
    const intervalInDays = RecurringUpkeepUtils.calculateIntervalInDays(
      task.interval,
      task.interval_unit
    );

    const lastDoneDate = DateUtils.parseLocalDate(task.last_done);
    const today = DateUtils.parseLocalDate(currentTime);

    if (isNaN(lastDoneDate.getTime()) || isNaN(today.getTime())) {
      return 50; // Unknown state
    }

    const daysSinceLastDone = Math.round(
      (today.getTime() - lastDoneDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Convert to percentage (0-100%, may exceed 100% if overdue)
    return Math.max(0, Math.min(100, (daysSinceLastDone / intervalInDays) * 100));
  }
}
