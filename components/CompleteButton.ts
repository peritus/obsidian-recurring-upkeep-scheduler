import { App, TFile } from 'obsidian';
import { ProcessedTask } from '../types';
import { RecurringUpkeepUtils } from '../utils/RecurringUpkeepUtils';
import { I18nUtils } from '../i18n/I18nUtils';
import { WidgetEventManager } from '../utils/WidgetEventManager';
import { TaskStyling } from '../utils/TaskStyling';

export class CompleteButton {
  private app: App;
  private widgetEventManager: WidgetEventManager;

  constructor(app: App, widgetEventManager: WidgetEventManager) {
    this.app = app;
    this.widgetEventManager = widgetEventManager;
  }

  render(container: HTMLElement, task: ProcessedTask, onComplete?: () => void): void {
    // Get appropriate button styling based on task status
    const buttonClass = this.getButtonClass(task);
    
    const button = container.createEl('button', {
      text: I18nUtils.t.ui.buttons.markComplete,
      cls: `recurring-upkeep-button task-complete-btn ${buttonClass}`
    });

    button.addEventListener('click', async () => {
      // Set loading state with semantic class
      button.textContent = I18nUtils.t.ui.messages.loading;
      button.disabled = true;
      button.className = "recurring-upkeep-button";

      const result = await RecurringUpkeepUtils.markTaskComplete(this.app, task.file.path);

      if (result.success) {
        // Success state
        button.textContent = "✅ " + I18nUtils.t.filters.status.upToDate;
        button.className = "recurring-upkeep-button recurring-upkeep-button-success";

        // Notify all widgets that something changed - they'll check their own data
        this.widgetEventManager.notifyChange();

        if (onComplete) {
          onComplete();
        }

        setTimeout(() => {
          button.remove();
        }, 3000);
      } else {
        // Error state
        button.textContent = "❌ " + I18nUtils.t.ui.messages.error(result.error || "Unknown error");
        button.className = "recurring-upkeep-button recurring-upkeep-button-error";

        setTimeout(() => {
          // Reset to original state
          button.textContent = I18nUtils.t.ui.buttons.markComplete;
          const resetButtonClass = this.getButtonClass(task);
          button.className = `recurring-upkeep-button task-complete-btn ${resetButtonClass}`;
          button.disabled = false;
        }, 3000);
      }
    });
  }

  /**
   * Get appropriate button styling class based on task urgency
   * Uses centralized logic to determine visual urgency
   */
  private getButtonClass(task: ProcessedTask): string {
    const statusClass = TaskStyling.getStatusClass(task);
    
    switch (statusClass) {
      case 'recurring-upkeep-overdue':
        return 'recurring-upkeep-button-urgent';
      
      case 'recurring-upkeep-up-to-date':
        return ''; // Default styling
      
      default:
        return ''; // Default styling
    }
  }
}