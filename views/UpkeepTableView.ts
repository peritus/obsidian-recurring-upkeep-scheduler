import { App, TFile } from 'obsidian';
import { ProcessedTask, FilterQuery, UpkeepTask } from '../types';
import { DateUtils } from '../utils/DateUtils';
import { CompleteButton } from '../components/CompleteButton';
import { ProgressBar } from '../components/ProgressBar';
import { StatusIndicator } from '../components/StatusIndicator';
import { FilterParser } from './FilterParser';
import { I18nUtils } from '../i18n/I18nUtils';
import { WidgetEventManager } from '../utils/WidgetEventManager';
import { TaskStyling } from '../utils/TaskStyling';
import { RECURRING_UPKEEP_LOGGING_ENABLED } from '../constants';

// Type definitions for TFile with tags (extended Obsidian interface)
interface TFileWithTags extends TFile {
  tags?: string[];
}

// Type definitions for Dataview page data
interface DataviewPage {
  file: TFile;
  last_done?: string;
  interval?: number;
  interval_unit?: string;
  type?: string;
}

// Type definitions for Dataview API
interface DataviewAPI {
  pages(): {
    where(predicate: (p: DataviewPage) => boolean): {
      values: DataviewPage[];
    };
  };
}

// Type definitions for plugin access
interface PluginWithDataview {
  dataviewApi?: DataviewAPI;
}

export class UpkeepTableView {
  private app: App;
  private widgetEventManager: WidgetEventManager;
  private filterQuery: string;
  private now: string;
  private container: HTMLElement | null = null;
  private widgetId: string;
  private currentTasks: ProcessedTask[] = [];

  constructor(app: App, widgetEventManager: WidgetEventManager, filterQuery: string = '') {
    this.app = app;
    this.widgetEventManager = widgetEventManager;
    this.filterQuery = filterQuery;
    this.now = new Date().toISOString().split('T')[0];
    this.widgetId = `table-${Date.now()}-${Math.random()}`;
  }

  render(container: HTMLElement, tasks: ProcessedTask[]): void {
    this.container = container;
    this.currentTasks = tasks;
    container.empty();

    // Register this widget with the event manager
    this.widgetEventManager.registerWidget({
      id: this.widgetId,
      containerElement: container,
      refresh: this.refresh.bind(this),
      isActive: this.isActive.bind(this)
    });

    const filter = FilterParser.parse(this.filterQuery);
    const filteredTasks = FilterParser.apply(tasks, filter);

    this.createTable(container, filteredTasks);
  }

  private async refresh(): Promise<void> {
    if (!this.container) return;

    try {
      // Re-fetch and re-process tasks
      const tasks = await this.getUpkeepTasks();
      const filter = FilterParser.parse(this.filterQuery);
      const filteredTasks = FilterParser.apply(tasks, filter);
      
      // Check if anything actually changed by comparing task data
      if (this.hasDataChanged(tasks)) {
        // Update current tasks
        this.currentTasks = tasks;
        
        // Clear and re-render
        this.container.empty();
        this.createTable(this.container, filteredTasks);
        
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug(`🔄 Table widget ${this.widgetId} refreshed - data changed`);
        }
      } else {
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug(`🔄 Table widget ${this.widgetId} - no data changes, skipping refresh`);
        }
      }
    } catch (error) {
      console.error(`❌ Error refreshing table widget ${this.widgetId}:`, error);
    }
  }

  private hasDataChanged(newTasks: ProcessedTask[]): boolean {
    // Simple comparison - if task count changed or any task status changed
    if (newTasks.length !== this.currentTasks.length) {
      return true;
    }

    // Check if any task's last_done or status has changed
    for (let i = 0; i < newTasks.length; i++) {
      const newTask = newTasks[i];
      const currentTask = this.currentTasks[i];
      
      if (!currentTask || 
          newTask.file.path !== currentTask.file.path ||
          newTask.last_done !== currentTask.last_done ||
          newTask.status !== currentTask.status) {
        return true;
      }
    }

    return false;
  }

  private isActive(): boolean {
    // Check if the container is still in the DOM
    return this.container?.isConnected ?? false;
  }

  private async getUpkeepTasks(): Promise<ProcessedTask[]> {
    // Get the main plugin instance through the app with safe type casting
    const pluginSystem = this.app as unknown as { 
      plugins: { 
        plugins: { 
          'recurring-upkeep-scheduler'?: PluginWithDataview 
        } 
      } 
    };
    
    const plugin = pluginSystem.plugins.plugins['recurring-upkeep-scheduler'];
    
    if (!plugin || !plugin.dataviewApi) {
      throw new Error('Plugin or Dataview API not available');
    }

    try {
      const pages = plugin.dataviewApi.pages().where((p: DataviewPage) => {
        const fileWithTags = p.file as TFileWithTags;
        return fileWithTags.tags?.includes("recurring-task") ||
               fileWithTags.tags?.includes("#recurring-task") ||
               p.type === "recurring-task";
      });

      const tasks: UpkeepTask[] = [];
      for (const page of pages.values) {
        const fileWithTags = page.file as TFileWithTags;
        const task: UpkeepTask = {
          file: page.file,
          last_done: page.last_done,
          interval: page.interval || 0,
          interval_unit: page.interval_unit || '',
          type: page.type,
          tags: fileWithTags.tags || []
        };

        if (task.interval && task.interval_unit) {
          tasks.push(task);
        }
      }

      // Process and sort tasks
      const { TaskProcessor } = await import('../utils/TaskProcessor');
      const processedTasks = TaskProcessor.processTasks(tasks);
      return TaskProcessor.sortTasks(processedTasks);

    } catch (error) {
      console.error('Error fetching tasks for refresh:', error);
      return [];
    }
  }

  private createTable(container: HTMLElement, tasks: ProcessedTask[]): void {
    const table = container.createEl('table', {
      cls: 'recurring-upkeep-table'
    });

    this.createTableHeader(table);
    this.createTableBody(table, tasks);
  }

  private createTableHeader(table: HTMLElement): void {
    const thead = table.createEl('thead');
    const headerRow = thead.createEl('tr');

    // Localized table headers
    const taskHeader = headerRow.createEl('th', { text: I18nUtils.t.ui.labels.task });

    const statusHeader = headerRow.createEl('th');
    const headerContainer = statusHeader.createEl('div', {
      cls: 'recurring-upkeep-table-header-container'
    });

    const headerText = headerContainer.createEl('span', { text: I18nUtils.t.ui.labels.status });

    const sortIndicator = headerContainer.createEl('span', {
      text: ' ▼',
      cls: 'recurring-upkeep-sort-indicator',
      attr: { title: I18nUtils.t.filters.sort.dueDate }
    });
  }

  private createTableBody(table: HTMLElement, tasks: ProcessedTask[]): void {
    const tbody = table.createEl('tbody');

    if (tasks.length === 0) {
      const row = tbody.createEl('tr');
      const cell = row.createEl('td', {
        text: I18nUtils.t.ui.messages.noTasksFilter,
        cls: 'recurring-upkeep-table-empty-cell',
        attr: { colspan: '2' }
      });
      return;
    }

    tasks.forEach((task, index) => {
      this.createTaskRow(tbody, task, index);
    });
  }

  private createTaskRow(tbody: HTMLElement, task: ProcessedTask, index: number): void {
    const row = tbody.createEl('tr');
    // Row styling is handled by CSS nth-child selectors

    this.createTaskNameCell(row, task);
    this.createStatusCell(row, task);
  }

  private createTaskNameCell(row: HTMLElement, task: ProcessedTask): void {
    const nameCell = row.createEl('td');

    const nameContainer = nameCell.createEl('div', {
      cls: 'recurring-upkeep-task-container'
    });

    const nameLink = nameContainer.createEl('a', {
      text: task.file.name,
      cls: 'recurring-upkeep-task-link',
      attr: { href: task.file.path }
    });
    
    nameLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.app.workspace.openLinkText(task.file.path, '');
    });

    // Show complete button if task is overdue or never completed (daysRemaining <= 0)
    // Don't show if completed today
    const today = this.now;
    const canComplete = (!task.last_done || (task.last_done !== today && task.daysRemaining <= 0));
    
    if (canComplete) {
      const completeButton = new CompleteButton(this.app, this.widgetEventManager);
      const buttonContainer = nameContainer.createEl('div', {
        cls: 'recurring-upkeep-button-container'
      });
      completeButton.render(buttonContainer, task);
    }
  }

  private createStatusCell(row: HTMLElement, task: ProcessedTask): void {
    const statusCell = row.createEl('td');

    const statusContainer = statusCell.createEl('div', {
      cls: 'recurring-upkeep-status-container'
    });

    const statusIndicator = new StatusIndicator();
    statusIndicator.render(statusContainer, task);

    const progressBar = new ProgressBar();
    progressBar.render(statusContainer, task, this.now);
  }
}
