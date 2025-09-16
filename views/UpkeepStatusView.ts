import { App, TFile, EventRef } from 'obsidian';
import { UpkeepTask } from '../types';
import { TaskProcessor } from '../utils/TaskProcessor';
import { CompleteButton } from '../components/CompleteButton';
import { ProgressBar } from '../components/ProgressBar';
import { I18nUtils } from '../i18n/I18nUtils';
import { TaskStyling } from '../utils/TaskStyling';
import { RECURRING_UPKEEP_LOGGING_ENABLED } from '../constants';

export class UpkeepStatusView {
  private app: App;
  private now: string;
  private container: HTMLElement | null = null;
  private currentFile: TFile | null = null;
  private eventRef: EventRef | null = null;

  constructor(app: App) {
    this.app = app;
    this.now = new Date().toISOString().split('T')[0];
  }

  async render(container: HTMLElement, file: TFile): Promise<void> {
    this.container = container;
    this.currentFile = file;
    container.empty();

    try {
      const task = await this.getCurrentFileTask(file);

      if (!task) {
        this.renderNoTaskMessage(container);
        return;
      }

      const processedTask = TaskProcessor.processTask(task, this.now);
      this.renderTaskStatus(container, processedTask);

    } catch (error) {
      console.error('Error in UpkeepStatusView:', error);
      this.renderErrorMessage(container, error as Error);
    }

    // Widget manages its own updates
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.container || !this.currentFile) return;

    // Clean up any existing listener
    if (this.eventRef) {
      this.app.metadataCache.offref(this.eventRef);
    }

    this.eventRef = this.app.metadataCache.on('changed', async (changedFile: TFile) => {
      // Update if the current file changed OR if any recurring task changed
      // (other task changes might affect context/ordering)
      if (changedFile.path === this.currentFile!.path || this.isRecurringTaskFile(changedFile)) {
        // Add a small delay to ensure metadata cache is fully updated
        setTimeout(async () => {
          await this.quickRender();
        }, 50); // 50ms delay should be sufficient
      }
    });
  }

  private async quickRender(): Promise<void> {
    if (!this.container || !this.currentFile) return;

    try {
      const task = await this.getCurrentFileTask(this.currentFile);

      // Clear and re-render (status widgets are simple enough for full re-render)
      this.container.empty();

      if (!task) {
        this.renderNoTaskMessage(this.container);
        return;
      }

      const processedTask = TaskProcessor.processTask(task, this.now);
      this.renderTaskStatus(this.container, processedTask);

    } catch (error) {
      console.error('Error refreshing status widget:', error);
      this.container.empty();
      this.renderErrorMessage(this.container, error as Error);
    }
  }

  private isRecurringTaskFile(file: TFile): boolean {
    if (file.extension !== 'md') return false;
    
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
    
    return frontmatter?.tags?.includes("recurring-task") ||
           frontmatter?.type === "recurring-task";
  }

  private async getCurrentFileTask(file: TFile): Promise<UpkeepTask | null> {
    try {
      const cache = this.app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter;

      if (!frontmatter) {
        return null;
      }

      // Check if this file is configured as a recurring task
      const hasRecurringTag = frontmatter.tags?.includes("recurring-task") ||
                             frontmatter.type === "recurring-task";

      if (!hasRecurringTag || !frontmatter.interval || !frontmatter.interval_unit) {
        return null;
      }

      return {
        file,
        last_done: frontmatter.last_done,
        interval: frontmatter.interval,
        interval_unit: frontmatter.interval_unit,
        type: frontmatter.type,
        tags: frontmatter.tags || []
      };

    } catch (error) {
      console.error('Error getting current file task:', error);
      return null;
    }
  }

  private renderTaskStatus(container: HTMLElement, task: any): void {
    const statusContainer = container.createEl('div', {
      cls: 'recurring-upkeep-status-widget'
    });

    // Main status display - using CSS class instead of inline styles
    const statusRow = statusContainer.createEl('div', {
      cls: 'recurring-upkeep-status-row'
    });

    // Localized primary status - using centralized styling
    const primaryStatus = statusRow.createEl('div', {
      cls: 'recurring-upkeep-status-primary'
    });

    // Convert status to localized text and use centralized styling
    primaryStatus.textContent = this.getLocalizedStatus(task);
    const statusClass = TaskStyling.getStatusClass(task);
    primaryStatus.addClasses([statusClass]);
    // Font weight is now handled by CSS classes

    // Complete button (if eligible) - localized button text
    // Show button if task is overdue or never completed (daysRemaining <= 0)
    // Don't show if completed today
    const today = this.now;
    const canComplete = (!task.last_done || (task.last_done !== today && task.daysRemaining <= 0));
    
    if (canComplete) {
      const buttonContainer = statusRow.createEl('div');
      const completeButton = new CompleteButton(this.app);
      completeButton.render(buttonContainer, task);
    }

    // Progress bar - uses centralized styling automatically
    const progressBar = new ProgressBar();
    progressBar.render(statusContainer, task, this.now);

    // Localized task info with emojis
    this.renderTaskInfo(statusContainer, task);
  }

  private getLocalizedStatus(task: any): string {
    // Use centralized status text generation
    return TaskStyling.getStatusText(task);
  }

  private renderTaskInfo(container: HTMLElement, task: any): void {
    const infoContainer = container.createEl('div', {
      cls: 'recurring-upkeep-task-info'
    });

    // Use centralized task info display text
    infoContainer.textContent = TaskStyling.getTaskInfoDisplayText(task, this.now);

    // Add localized tooltip if we have a due date
    if (task.calculatedNextDue) {
      try {
        I18nUtils.addDateTooltip(
          infoContainer,
          task.calculatedNextDue,
          I18nUtils.t.ui.labels.due,
          this.now
        );
      } catch (error) {
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.warn('Error adding localized tooltip:', error);
        }
      }
    }
  }

  private renderNoTaskMessage(container: HTMLElement): void {
    const messageContainer = container.createEl('div', {
      cls: 'recurring-upkeep-setup-message'
    });

    // Localized setup title
    const title = messageContainer.createEl('h4', {
      text: I18nUtils.t.ui.messages.setupTitle,
      cls: 'recurring-upkeep-setup-title'
    });

    // Localized description
    const description = messageContainer.createEl('p', {
      text: I18nUtils.t.ui.messages.setupDescription,
      cls: 'recurring-upkeep-setup-description'
    });

    // Code block - using CSS class instead of inline styles
    const codeBlock = messageContainer.createEl('pre', {
      cls: 'recurring-upkeep-code-block'
    });

    const code = codeBlock.createEl('code');
    code.textContent = `---
tags:
  - recurring-task
last_done: 2024-01-15
interval: 1
interval_unit: months
---`;

    // Localized field descriptions - using CSS classes instead of inline styles
    const fieldDescription = messageContainer.createEl('div', {
      cls: 'recurring-upkeep-field-description'
    });

    const t = I18nUtils.t;
    const fields = [
      t.ui.messages.setupFields.tags,
      t.ui.messages.setupFields.lastDone,
      t.ui.messages.setupFields.interval,
      t.ui.messages.setupFields.intervalUnit
    ];

    const fieldList = fieldDescription.createEl('ul', {
      cls: 'recurring-upkeep-field-list'
    });

    fields.forEach(field => {
      const listItem = fieldList.createEl('li');
      listItem.textContent = field;
    });
  }

  private renderErrorMessage(container: HTMLElement, error: Error): void {
    const errorContainer = container.createEl('div', {
      cls: 'recurring-upkeep-error'
    });

    // Localized error message
    errorContainer.createEl('div', {
      text: I18nUtils.t.ui.messages.error(error.message),
      cls: 'recurring-upkeep-error-message'
    });
  }

  // Cleanup method for when widget is destroyed
  destroy(): void {
    if (this.eventRef) {
      this.app.metadataCache.offref(this.eventRef);
      this.eventRef = null;
    }
  }
}
