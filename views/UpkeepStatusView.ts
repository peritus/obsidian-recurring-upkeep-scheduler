import { App, TFile } from 'obsidian';
import { UpkeepTask } from '../types';
import { TaskProcessor } from '../utils/TaskProcessor';
import { CompleteButton } from '../components/CompleteButton';
import { ProgressBar } from '../components/ProgressBar';
import { I18nUtils } from '../i18n/I18nUtils';
import { WidgetEventManager } from '../utils/WidgetEventManager';
import { TaskStyling } from '../utils/TaskStyling';
import { RECURRING_UPKEEP_LOGGING_ENABLED } from '../constants';

export class UpkeepStatusView {
  private app: App;
  private widgetEventManager: WidgetEventManager;
  private now: string;
  private container: HTMLElement | null = null;
  private currentFile: TFile | null = null;
  private widgetId: string;
  private lastTaskData: any = null; // Cache last task data to detect changes

  constructor(app: App, widgetEventManager: WidgetEventManager) {
    this.app = app;
    this.widgetEventManager = widgetEventManager;
    this.now = new Date().toISOString().split('T')[0];
    this.widgetId = `status-${Date.now()}-${Math.random()}`;
  }

  async render(container: HTMLElement, file: TFile): Promise<void> {
    this.container = container;
    this.currentFile = file;
    container.empty();

    // Register this widget with the event manager
    this.widgetEventManager.registerWidget({
      id: this.widgetId,
      containerElement: container,
      refresh: this.refresh.bind(this),
      isActive: this.isActive.bind(this)
    });

    try {
      const task = await this.getCurrentFileTask(file);

      if (!task) {
        this.renderNoTaskMessage(container);
        this.lastTaskData = null;
        return;
      }

      const processedTask = TaskProcessor.processTask(task, this.now);
      this.renderTaskStatus(container, processedTask);
      this.lastTaskData = processedTask;

    } catch (error) {
      console.error('Error in UpkeepStatusView:', error);
      this.renderErrorMessage(container, error as Error);
    }
  }

  private async refresh(): Promise<void> {
    if (!this.container || !this.currentFile) return;

    try {
      const task = await this.getCurrentFileTask(this.currentFile);

      if (!task) {
        // Task was removed - check if we need to update
        if (this.lastTaskData !== null) {
          this.container.empty();
          this.renderNoTaskMessage(this.container);
          this.lastTaskData = null;
          if (RECURRING_UPKEEP_LOGGING_ENABLED) {
            console.debug(`🔄 Status widget ${this.widgetId} refreshed - task removed`);
          }
        }
        return;
      }

      const processedTask = TaskProcessor.processTask(task, this.now);

      // Check if the task data actually changed
      if (this.hasTaskDataChanged(processedTask)) {
        this.container.empty();
        this.renderTaskStatus(this.container, processedTask);
        this.lastTaskData = processedTask;
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug(`🔄 Status widget ${this.widgetId} refreshed - data changed`);
        }
      } else {
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug(`🔄 Status widget ${this.widgetId} - no data changes, skipping refresh`);
        }
      }
    } catch (error) {
      console.error(`❌ Error refreshing status widget ${this.widgetId}:`, error);
    }
  }

  private hasTaskDataChanged(newTask: any): boolean {
    if (!this.lastTaskData) return true;

    // Compare key task properties that would affect the display
    return (
      newTask.last_done !== this.lastTaskData.last_done ||
      newTask.status !== this.lastTaskData.status ||
      newTask.daysRemaining !== this.lastTaskData.daysRemaining ||
      newTask.calculatedNextDue !== this.lastTaskData.calculatedNextDue ||
      newTask.isEligibleForCompletion !== this.lastTaskData.isEligibleForCompletion
    );
  }

  private isActive(): boolean {
    // Check if the container is still in the DOM
    return this.container?.isConnected ?? false;
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
    if (TaskStyling.isEligibleForCompletion(task, this.now)) {
      const buttonContainer = statusRow.createEl('div');
      const completeButton = new CompleteButton(this.app, this.widgetEventManager);
      completeButton.render(buttonContainer, task);
    }

    // Progress bar - uses centralized styling automatically
    const progressBar = new ProgressBar();
    progressBar.render(statusContainer, task, this.now);

    // Localized task info with emojis
    this.renderTaskInfo(statusContainer, task);
  }

  private getLocalizedStatus(task: any): string {
    // Use the task properties to determine status instead of parsing English text
    try {
      if (!task.last_done) {
        return I18nUtils.t.status.neverCompleted;
      } else if (task.daysRemaining < 0) {
        const days = Math.abs(task.daysRemaining);
        return I18nUtils.formatOverdue(days);
      } else if (task.daysRemaining === 0) {
        return I18nUtils.t.status.dueToday;
      } else if (task.daysRemaining <= 7) {
        return I18nUtils.formatDueSoon(task.daysRemaining);
      } else {
        return I18nUtils.t.status.upToDate;
      }
    } catch (error) {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.warn('Error localizing status, using fallback:', error);
      }
      return task.status; // Fallback to original if i18n fails
    }
  }

  private renderTaskInfo(container: HTMLElement, task: any): void {
    const infoContainer = container.createEl('div', {
      cls: 'recurring-upkeep-task-info'
    });

    // Localized frequency text with emoji
    const frequencyText = `🔁 ${I18nUtils.formatFrequency(task.interval, task.interval_unit)}`;

    // Status-specific due date information - all localized, using task properties instead of text matching
    let dueDateText = '';

    try {
      if (!task.last_done) {
        dueDateText = `📅 ${I18nUtils.t.ui.labels.never}`;
      } else if (task.daysRemaining < 0) {
        if (task.calculatedNextDue) {
          const wasDueText = I18nUtils.formatRelativeDate(task.calculatedNextDue, this.now);
          dueDateText = `📅 ${I18nUtils.t.ui.labels.wasDue} ${wasDueText}`;
        } else {
          dueDateText = `📅 ${I18nUtils.t.filters.status.overdue}`;
        }
      } else if (task.daysRemaining === 0) {
        dueDateText = `📅 ${I18nUtils.t.time.relative.today}`;
      } else if (task.daysRemaining <= 7) {
        if (task.calculatedNextDue) {
          const dueDateFormatted = this.formatAbsoluteDate(task.calculatedNextDue);
          dueDateText = `📅 ${I18nUtils.t.ui.labels.due} ${dueDateFormatted}`;
        } else {
          dueDateText = `📅 ${I18nUtils.t.filters.status.dueSoon}`;
        }
      } else if (task.calculatedNextDue) {
        const nextDueText = I18nUtils.formatRelativeDate(task.calculatedNextDue, this.now);
        dueDateText = `📅 ${I18nUtils.t.ui.labels.nextDue} ${nextDueText}`;
      } else {
        dueDateText = `📅 ${I18nUtils.t.ui.labels.notScheduled}`;
      }
    } catch (error) {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.warn('Error localizing date info, using fallback:', error);
      }
      dueDateText = `📅 ${task.calculatedNextDue ? this.formatAbsoluteDate(task.calculatedNextDue) : I18nUtils.t.ui.labels.notScheduled}`;
    }

    infoContainer.textContent = `${frequencyText} • ${dueDateText}`;

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

  private formatAbsoluteDate(dateString: string): string {
    if (!dateString) return I18nUtils.t.ui.labels.never;

    // Use the i18n manager's date formatting
    try {
      return I18nUtils.i18n.formatDate(dateString, {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.warn('Error formatting absolute date, using fallback:', error);
      }
      return dateString;
    }
  }
}