import { ProcessedTask } from '../types';
import { RecurringUpkeepUtils } from '../utils/RecurringUpkeepUtils';
import { DateUtils } from '../utils/DateUtils';
import { I18nUtils } from '../i18n/I18nUtils';
import { TaskStyling } from '../utils/TaskStyling';

export class StatusIndicator {
  constructor() {
    // No constructor parameters needed
  }

  render(container: HTMLElement, task: ProcessedTask): void {
    const statusContainer = container.createEl('div', {
      cls: 'recurring-upkeep-status-container'
    });

    const primaryStatus = statusContainer.createEl('div', {
      cls: 'recurring-upkeep-status-primary'
    });

    const secondaryStatus = statusContainer.createEl('div', {
      cls: 'recurring-upkeep-status-secondary'
    });

    this.updateStatus(primaryStatus, secondaryStatus, task);
  }

  private updateStatus(primaryElement: HTMLElement, secondaryElement: HTMLElement, task: ProcessedTask): void {
    const now = new Date().toISOString().split('T')[0];
    const frequencyDesc = RecurringUpkeepUtils.getFrequencyDescription(
      task.interval,
      task.interval_unit
    );

    // Use centralized styling instead of hardcoded color
    primaryElement.textContent = task.status;
    const statusClass = TaskStyling.getStatusClass(task);
    primaryElement.addClasses([statusClass]);

    if (!task.last_done) {
      secondaryElement.textContent = I18nUtils.t.ui.statusText.thisIsTask(frequencyDesc);
    } else if (DateUtils.isToday(task.last_done, now)) {
      if (task.calculatedNextDue) {
        const relativeDate = I18nUtils.formatRelativeDate(task.calculatedNextDue, now);
        secondaryElement.textContent = I18nUtils.t.ui.statusText.dueWithFrequency(relativeDate, frequencyDesc);
        I18nUtils.addDateTooltip(secondaryElement, task.calculatedNextDue, I18nUtils.t.ui.labels.due, now);
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
        secondaryElement.textContent = I18nUtils.t.ui.statusText.dueInDays(daysUntilDue, frequencyDesc);
        secondaryElement.title = I18nUtils.t.ui.statusText.approximateDueDate(daysUntilDue);
      }
    } else if (task.daysRemaining < 0) {
      const relativeDate = I18nUtils.formatRelativeDate(task.last_done, now);
      secondaryElement.textContent = I18nUtils.t.ui.statusText.taskLastDone(frequencyDesc, relativeDate);
      I18nUtils.addDateTooltip(secondaryElement, task.last_done, I18nUtils.t.ui.labels.lastDone, now);
    } else if (task.daysRemaining === 0) {
      const relativeDate = I18nUtils.formatRelativeDate(task.last_done, now);
      secondaryElement.textContent = I18nUtils.t.ui.statusText.taskLastDone(frequencyDesc, relativeDate);
      I18nUtils.addDateTooltip(secondaryElement, task.last_done, I18nUtils.t.ui.labels.lastDone, now);
    } else {
      const relativeDate = I18nUtils.formatRelativeDate(task.calculatedNextDue || "", now);
      secondaryElement.textContent = I18nUtils.t.ui.statusText.dueWithFrequency(relativeDate, frequencyDesc);
      if (task.calculatedNextDue) {
        I18nUtils.addDateTooltip(secondaryElement, task.calculatedNextDue, I18nUtils.t.ui.labels.due, now);
      }
    }
  }
}
