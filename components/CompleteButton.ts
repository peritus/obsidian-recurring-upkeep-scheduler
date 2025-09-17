import { App, TFile } from 'obsidian';
import { ProcessedTask } from '../types';
import { RecurringUpkeepUtils } from '../utils/RecurringUpkeepUtils';
import { I18nUtils } from '../i18n/I18nUtils';
import { TaskStyling } from '../utils/TaskStyling';

export class CompleteButton {
  private app: App;

  constructor(app: App) {
    this.app = app;
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
        // File change will automatically trigger UI updates via metadataCache event
        // No manual notification needed!

        if (onComplete) {
          onComplete();
        }

        // Immediately remove button after successful completion
        button.remove();
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
