import { ProcessedTask } from '../types';
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
    // Use centralized styling and text generation
    primaryElement.textContent = TaskStyling.getStatusText(task);
    const statusClass = TaskStyling.getStatusClass(task);
    primaryElement.addClasses([statusClass]);

    // Use centralized secondary status text generation
    secondaryElement.textContent = TaskStyling.getSecondaryStatusText(task);

    // Add tooltip if we have a due date
    if (task.calculatedNextDue) {
      const now = new Date().toISOString().split('T')[0];
      try {
        I18nUtils.addDateTooltip(secondaryElement, task.calculatedNextDue, I18nUtils.t.ui.labels.due, now);
      } catch (error) {
        // Ignore tooltip errors - not critical for functionality
      }
    }
  }
}
