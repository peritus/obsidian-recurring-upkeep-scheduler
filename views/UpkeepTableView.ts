import { App, TFile, EventRef } from 'obsidian';
import { ProcessedTask, FilterQuery, UpkeepTask } from '../types';
import { DateUtils } from '../utils/DateUtils';
import { CompleteButton } from '../components/CompleteButton';
import { ProgressBar } from '../components/ProgressBar';
import { StatusIndicator } from '../components/StatusIndicator';
import { FilterParser } from './FilterParser';
import { I18nUtils } from '../i18n/I18nUtils';
import { TaskStyling } from '../utils/TaskStyling';
import { RECURRING_UPKEEP_LOGGING_ENABLED } from '../constants';
import RecurringUpkeepSchedulerPlugin from '../main';

// Type definitions for TFile with tags (extended Obsidian interface)
interface TFileWithTags extends TFile {
  tags?: string[];
}

export class UpkeepTableView {
  private app: App;
  private plugin: RecurringUpkeepSchedulerPlugin;
  private filterQuery: string;
  private now: string;
  private container: HTMLElement | null = null;
  private eventRef: EventRef | null = null;
  private currentTasks: ProcessedTask[] = [];

  constructor(app: App, plugin: RecurringUpkeepSchedulerPlugin, filterQuery: string = '') {
    this.app = app;
    this.plugin = plugin;
    this.filterQuery = filterQuery;
    this.now = new Date().toISOString().split('T')[0];
  }

  render(container: HTMLElement, tasks: ProcessedTask[]): void {
    this.container = container;
    this.currentTasks = tasks;
    container.empty();

    const filter = FilterParser.parse(this.filterQuery);
    const filteredTasks = FilterParser.apply(tasks, filter);

    this.createTable(container, filteredTasks);
    
    // Widget manages its own updates
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    // Clean up any existing listener
    if (this.eventRef) {
      this.app.metadataCache.offref(this.eventRef);
    }

    this.eventRef = this.app.metadataCache.on('changed', async (file: TFile) => {
      if (this.isRecurringTaskFile(file)) {
        // Add a small delay to ensure metadata cache and Dataview are fully updated
        setTimeout(async () => {
          // UPDATE IN-PLACE: No reordering, no DOM destruction  
          await this.updateTaskRowInPlace(file);
        }, 50); // 50ms delay should be sufficient
      }
    });
  }

  private async updateTaskRowInPlace(changedFile: TFile): Promise<void> {
    if (!this.container) return;
    
    // Find the row for this specific file
    const row = this.container.querySelector(`tr[data-task-path="${changedFile.path}"]`) as HTMLElement;
    
    try {
      // Get updated task data from the same source as the sidebar view
      // to ensure data consistency
      const allTasks = await this.getUpkeepTasks();
      const updatedTask = allTasks.find(task => task.file.path === changedFile.path);
      
      if (!updatedTask) {
        // Task is no longer a recurring task, remove the row if it exists
        if (row) {
          row.remove();
        }
        return;
      }

      // If the row doesn't exist but task is valid, we need full refresh
      // (new task was added)
      if (!row) {
        await this.fullRefresh();
        return;
      }

      // Use the processed task data from the consistent data source
      const processedTask = updatedTask;
      
      // Update the status cell content
      const statusCell = row.querySelector('td:nth-child(2)'); // Second column (status column)
      if (statusCell) {
        // Clear the entire status cell and rebuild both components
        statusCell.empty();
        
        // Create the status container 
        const statusContainer = statusCell.createEl('div', {
          cls: 'recurring-upkeep-status-container'
        });
        
        // Rebuild status components in the new container
        const statusIndicator = new StatusIndicator();
        statusIndicator.render(statusContainer as HTMLElement, processedTask);

        const progressBar = new ProgressBar();
        progressBar.render(statusContainer as HTMLElement, processedTask, this.now);
      }
      
      // Update complete button visibility
      const buttonContainer = row.querySelector('.recurring-upkeep-button-container') as HTMLElement;
      
      if (buttonContainer) {
        const today = this.now;
        const canComplete = (!processedTask.last_done || (processedTask.last_done !== today && processedTask.daysRemaining <= 0));
        
        // Set data attribute for CSS-driven visibility
        buttonContainer.setAttribute('data-can-complete', canComplete.toString());
        
        if (canComplete && buttonContainer.children.length === 0) {
          // Add complete button if it should be visible and isn't already
          const completeButton = new CompleteButton(this.app);
          completeButton.render(buttonContainer, processedTask);
        }
      }
      
    } catch (error) {
      console.error('Error updating task row in-place:', error);
      // On error, try a full refresh as fallback
      await this.fullRefresh();
    }
  }

  private async fullRefresh(): Promise<void> {
    if (!this.container) return;
    
    try {
      // Re-fetch all tasks
      const tasks = await this.getUpkeepTasks();
      const filter = FilterParser.parse(this.filterQuery);
      const filteredTasks = FilterParser.apply(tasks, filter);
      
      // Clear and re-render
      this.container.empty();
      this.createTable(this.container, filteredTasks);
      
      // Update stored tasks
      this.currentTasks = tasks;
      
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Table fully refreshed');
      }
    } catch (error) {
      console.error('Error during full refresh:', error);
    }
  }

  private isRecurringTaskFile(file: TFile): boolean {
    if (file.extension !== 'md') return false;
    
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
    
    return frontmatter?.tags?.includes("recurring-task") ||
           frontmatter?.type === "recurring-task";
  }

  private async getUpkeepTasks(): Promise<ProcessedTask[]> {
    // Get tasks directly from the plugin instance
    const tasks = await this.plugin.getUpkeepTasks();
    
    // Process and sort tasks
    const processedTasks = TaskProcessor.processTasks(tasks);
    return TaskProcessor.sortTasks(processedTasks);
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
    const row = tbody.createEl('tr', {
      attr: { 'data-task-path': task.file.path } // Add tracking attribute for in-place updates
    });

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

    // Always create button container for consistent update behavior
    const buttonContainer = nameContainer.createEl('div', {
      cls: 'recurring-upkeep-button-container'
    });

    // Show complete button if task is overdue or never completed (daysRemaining <= 0)
    // Don't show if completed today
    const today = this.now;
    const canComplete = (!task.last_done || (task.last_done !== today && task.daysRemaining <= 0));
    
    // Set data attribute for CSS-driven visibility
    buttonContainer.setAttribute('data-can-complete', canComplete.toString());
    
    if (canComplete) {
      const completeButton = new CompleteButton(this.app);
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

  // Cleanup method for when widget is destroyed
  destroy(): void {
    if (this.eventRef) {
      this.app.metadataCache.offref(this.eventRef);
      this.eventRef = null;
    }
  }
}
