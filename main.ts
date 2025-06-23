import { Plugin, MarkdownPostProcessorContext, MarkdownView, TFile } from 'obsidian';
import { UpkeepTask, ProcessedTask } from './types';
import { TaskProcessor } from './utils/TaskProcessor';
import { UpkeepTableView } from './views/UpkeepTableView';
import { UpkeepStatusView } from './views/UpkeepStatusView';
import { I18nUtils } from './i18n/I18nUtils';
import { WidgetEventManager } from './utils/WidgetEventManager';

export default class RecurringUpkeepSchedulerPlugin extends Plugin {
  public dataviewApi: any; // Make this public so views can access it
  private widgetEventManager: WidgetEventManager;

  async onload() {
    console.log('Loading Recurring Upkeep Scheduler plugin');

    // Phase 1: Initialize i18n system early in plugin lifecycle
    try {
      I18nUtils.init(this.app);
      const localeInfo = I18nUtils.getLocaleInfo();
      console.log('🌍 Plugin loaded with locale:', localeInfo.current,
                  '(available:', localeInfo.available.join(', '), ')');
    } catch (error) {
      console.error('Failed to initialize i18n system:', error);
      // Continue loading plugin even if i18n fails
    }

    // Phase 2: Initialize the centralized event manager
    this.widgetEventManager = new WidgetEventManager(this.app);

    this.checkDataviewDependency();

    // Register table view codeblock processor
    this.registerMarkdownCodeBlockProcessor('recurring-upkeep-table', (source, el, ctx) => {
      this.renderUpkeepTable(source, el, ctx);
    });

    // Register individual status widget codeblock processor
    this.registerMarkdownCodeBlockProcessor('recurring-upkeep-status', (source, el, ctx) => {
      this.renderUpkeepStatus(source, el, ctx);
    });

    // Register post-processor for completion history tables
    this.registerMarkdownPostProcessor((element, context) => {
      this.enhanceCompletionHistoryTables(element, context);
    });

    // Run tests in development mode
    if (process.env.NODE_ENV === 'development') {
      this.runTests();
    }
  }

  onunload() {
    console.log('Unloading Recurring Upkeep Scheduler plugin');
    
    // Clean up the event manager
    if (this.widgetEventManager) {
      this.widgetEventManager.cleanup();
    }
  }

  private enhanceCompletionHistoryTables(element: HTMLElement, context: MarkdownPostProcessorContext): void {
    const tables = element.querySelectorAll('table');
    
    tables.forEach(table => {
      if (this.isCompletionHistoryTable(table as HTMLTableElement)) {
        this.addStatisticsDashboard(table as HTMLTableElement);
      }
    });
  }

  private isCompletionHistoryTable(table: HTMLTableElement): boolean {
    const headers = table.querySelectorAll('th');
    const headerTexts = Array.from(headers).map(h => h.textContent?.toLowerCase().trim());
    
    // Check for completion history table headers
    return headerTexts.includes('date') && 
           headerTexts.includes('days since last') && 
           headerTexts.includes('days scheduled');
  }

  private addStatisticsDashboard(table: HTMLTableElement): void {
    // Parse table data
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    if (rows.length === 0) return;

    const completions = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      return {
        date: cells[0]?.textContent?.trim() || '',
        daysSinceLast: parseInt(cells[2]?.textContent?.trim() || '0'),
        daysScheduled: parseInt(cells[3]?.textContent?.trim() || '0')
      };
    }).filter(completion => completion.date);

    if (completions.length === 0) return;

    // Calculate statistics
    const totalCompletions = completions.length;
    const avgDaysBetween = Math.round((completions.reduce((sum, c) => sum + c.daysSinceLast, 0) / completions.length) * 10) / 10;
    const onTimeCount = completions.filter(c => c.daysSinceLast <= c.daysScheduled).length;
    const onTimeRate = Math.round((onTimeCount / totalCompletions) * 100);

    // Get number of columns for colspan
    const headerCells = table.querySelectorAll('thead th');
    const colCount = headerCells.length;

    // Create table footer
    const tfoot = document.createElement('tfoot');
    tfoot.className = 'recurring-upkeep-stats-footer';
    
    const footerRow = document.createElement('tr');
    const footerCell = document.createElement('td');
    footerCell.setAttribute('colspan', colCount.toString());
    
    footerCell.innerHTML = `
      <div class="recurring-upkeep-stats-dashboard">
        <div class="recurring-upkeep-stats-header">
          <h3>📊 Maintenance Statistics</h3>
          <span class="recurring-upkeep-stats-period">Last 12 months</span>
        </div>
        <div class="recurring-upkeep-stats-grid">
          <div class="recurring-upkeep-stat-card">
            <span class="recurring-upkeep-stat-value">${totalCompletions}</span>
            <div class="recurring-upkeep-stat-label">Total Completions</div>
          </div>
          <div class="recurring-upkeep-stat-card">
            <span class="recurring-upkeep-stat-value">${avgDaysBetween}</span>
            <div class="recurring-upkeep-stat-label">Avg Days Between</div>
          </div>
          <div class="recurring-upkeep-stat-card">
            <span class="recurring-upkeep-stat-value">${onTimeRate}%</span>
            <div class="recurring-upkeep-stat-label">On-Time Rate</div>
          </div>
        </div>
      </div>
    `;

    footerRow.appendChild(footerCell);
    tfoot.appendChild(footerRow);
    table.appendChild(tfoot);
  }

  private async runTests() {
    try {
      // Load tests from external file (works in both Node.js and browser)
      if (typeof window !== 'undefined' && (window as any).RecurringUpkeepTests) {
        const results = (window as any).RecurringUpkeepTests.runAllTests();

        if (results.failed > 0) {
          console.error(`❌ ${results.failed} tests failed out of ${results.total}`);
        } else {
          console.log(`✅ All ${results.total} tests passed!`);
        }
      } else {
        // Fallback: run basic tests using plugin utilities
        const { RecurringUpkeepUtils } = await import('./utils/RecurringUpkeepUtils');
        const results = RecurringUpkeepUtils.runUnitTests();

        if (results.failed > 0) {
          console.error(`❌ ${results.failed} tests failed out of ${results.total}`);
        } else {
          console.log(`✅ All ${results.total} tests passed!`);
        }
      }
    } catch (error) {
      console.error('Failed to run tests:', error);
    }
  }

  private checkDataviewDependency(): void {
    const dataviewPlugin = (this.app as any).plugins.plugins.dataview;

    if (!dataviewPlugin) {
      console.error('Recurring Upkeep Scheduler: Dataview plugin is required but not found');
      return;
    }

    this.dataviewApi = dataviewPlugin.api;

    if (!this.dataviewApi) {
      console.error('Recurring Upkeep Scheduler: Dataview API is not available');
      return;
    }
  }

  private async renderUpkeepTable(filterQuery: string, container: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
    try {
      if (!this.dataviewApi) {
        container.createEl('div', {
          text: 'Dataview plugin is required for Recurring Upkeep Scheduler',
          cls: 'recurring-upkeep-error'
        });
        return;
      }

      const tasks = await this.getUpkeepTasks();
      const processedTasks = TaskProcessor.processTasks(tasks);
      const sortedTasks = TaskProcessor.sortTasks(processedTasks);

      const tableView = new UpkeepTableView(this.app, this.widgetEventManager, filterQuery);
      tableView.render(container, sortedTasks);

    } catch (error) {
      console.error('Error rendering upkeep table:', error);
      container.createEl('div', {
        text: `Error loading upkeep tasks: ${(error as Error).message}`,
        cls: 'recurring-upkeep-error'
      });
    }
  }

  private async renderUpkeepStatus(source: string, container: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
    try {
      const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);

      if (!file || !(file instanceof TFile)) {
        container.createEl('div', {
          text: 'Could not determine current file for status widget',
          cls: 'recurring-upkeep-error'
        });
        return;
      }

      const statusView = new UpkeepStatusView(this.app, this.widgetEventManager);
      await statusView.render(container, file);

    } catch (error) {
      console.error('Error rendering upkeep status:', error);
      container.createEl('div', {
        text: `Error loading task status: ${(error as Error).message}`,
        cls: 'recurring-upkeep-error'
      });
    }
  }

  async getUpkeepTasks(): Promise<UpkeepTask[]> {
    if (!this.dataviewApi) {
      throw new Error('Dataview API not available');
    }

    try {
      const pages = this.dataviewApi.pages().where((p: any) =>
        p.file.tags?.includes("recurring-task") ||
        p.file.tags?.includes("#recurring-task") ||
        p.type === "recurring-task"
      );

      const tasks: UpkeepTask[] = [];

      for (const page of pages.values) {
        const task: UpkeepTask = {
          file: page.file,
          last_done: page.last_done,
          interval: page.interval,
          interval_unit: page.interval_unit,
          complete_early_days: page.complete_early_days,
          type: page.type,
          tags: page.file.tags || []
        };

        if (task.interval && task.interval_unit) {
          tasks.push(task);
        }
      }

      return tasks;
    } catch (error) {
      console.error('Error fetching tasks from Dataview:', error);
      throw new Error(`Failed to fetch tasks: ${(error as Error).message}`);
    }
  }
}
