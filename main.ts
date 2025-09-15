import { Plugin, MarkdownPostProcessorContext, MarkdownView, TFile, WorkspaceLeaf } from 'obsidian';
import { UpkeepTask, ProcessedTask } from './types';
import { TaskProcessor } from './utils/TaskProcessor';
import { UpkeepTableView } from './views/UpkeepTableView';
import { UpkeepStatusView } from './views/UpkeepStatusView';
import { UpkeepSidebarView, UPKEEP_SIDEBAR_VIEW_TYPE } from './views/UpkeepSidebarView';
import { I18nUtils } from './i18n/I18nUtils';
import { WidgetEventManager } from './utils/WidgetEventManager';
import { RECURRING_UPKEEP_LOGGING_ENABLED } from './constants';

// Type definitions for Dataview page data
interface DataviewPage {
  file: TFile;
  last_done?: string;
  interval?: number;
  interval_unit?: string;
  complete_early_days?: number;
  type?: string;
}

// Type definitions for TFile with tags (extended Obsidian interface)
interface TFileWithTags extends TFile {
  tags?: string[];
}

// Type definitions for Dataview API
interface DataviewAPI {
  pages(): {
    where(predicate: (p: DataviewPage) => boolean): {
      values: DataviewPage[];
    };
  };
}

// Type definitions for Obsidian plugin system
interface ObsidianPluginSystem {
  plugins: {
    dataview?: {
      api?: DataviewAPI;
    };
  };
}

// Type definitions for global test runner
declare global {
  interface Window {
    RecurringUpkeepTests?: {
      runAllTests(): { passed: number; failed: number; total: number };
    };
  }
}

export default class RecurringUpkeepSchedulerPlugin extends Plugin {
  public dataviewApi: DataviewAPI | null = null;
  public widgetEventManager: WidgetEventManager;
  private sidebarView: UpkeepSidebarView | null = null;

  async onload() {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Plugin loading...');
    }

    try {
      // Phase 1: Initialize i18n system early in plugin lifecycle
      try {
        I18nUtils.init(this.app);
        const localeInfo = I18nUtils.getLocaleInfo();
        
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.info('[Recurring Upkeep] i18n system initialized', {
            current: localeInfo.current,
            available: localeInfo.available
          });
        }
      } catch (error) {
        console.error('[Recurring Upkeep] Failed to initialize i18n system', error);
        // Continue loading plugin even if i18n fails
      }

      // Phase 2: Initialize the centralized event manager
      this.widgetEventManager = new WidgetEventManager(this.app);
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Widget event manager initialized');
      }

      this.checkDataviewDependency();

      // Register sidebar view
      this.registerView(
        UPKEEP_SIDEBAR_VIEW_TYPE,
        (leaf) => new UpkeepSidebarView(leaf, this)
      );

      // Add ribbon icon for sidebar
      this.addRibbonIcon("repeat", "Recurring Tasks", () => {
        this.activateView();
      });

      // Add command to open sidebar
      this.addCommand({
        id: "open-recurring-tasks-sidebar",
        name: "Open Recurring Tasks Sidebar",
        callback: () => {
          this.activateView();
        }
      });

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

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.info('[Recurring Upkeep] Plugin loaded successfully');
      }
    } catch (error) {
      console.error('[Recurring Upkeep] Plugin loading failed', error);
      throw error;
    }
  }

  onunload() {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Plugin unloading...');
    }
    
    // Clean up the event manager
    if (this.widgetEventManager) {
      this.widgetEventManager.cleanup();
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Widget event manager cleaned up');
      }
    }
  }

  private enhanceCompletionHistoryTables(element: HTMLElement, context: MarkdownPostProcessorContext): void {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Enhancing completion history tables', {
        elementId: element.id,
        sourcePath: context.sourcePath
      });
    }

    const tables = element.querySelectorAll('table');
    
    tables.forEach((table, index) => {
      if (this.isCompletionHistoryTable(table as HTMLTableElement)) {
        this.addStatisticsDashboard(table as HTMLTableElement);
        
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug('[Recurring Upkeep] Enhanced completion history table', {
            tableIndex: index,
            sourcePath: context.sourcePath
          });
        }
      }
    });
  }

  private isCompletionHistoryTable(table: HTMLTableElement): boolean {
    const headers = table.querySelectorAll('th');
    const headerTexts = Array.from(headers).map(h => h.textContent?.toLowerCase().trim());
    
    // Check for completion history table headers
    const isHistoryTable = headerTexts.includes('date') && 
           headerTexts.includes('days since last') && 
           headerTexts.includes('days scheduled');

    if (RECURRING_UPKEEP_LOGGING_ENABLED && isHistoryTable) {
      console.debug('[Recurring Upkeep] Identified completion history table', {
        headers: headerTexts
      });
    }

    return isHistoryTable;
  }

  private addStatisticsDashboard(table: HTMLTableElement): void {
    const startTime = RECURRING_UPKEEP_LOGGING_ENABLED ? performance.now() : 0;

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

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Calculated statistics for dashboard', {
        totalCompletions,
        avgDaysBetween,
        onTimeCount,
        onTimeRate: `${onTimeRate}%`
      });
    }

    // Get number of columns for colspan
    const headerCells = table.querySelectorAll('thead th');
    const colCount = headerCells.length;

    // Create table footer
    const tfoot = document.createElement('tfoot');
    tfoot.className = 'recurring-upkeep-stats-footer';
    
    const footerRow = document.createElement('tr');
    const footerCell = document.createElement('td');
    footerCell.setAttribute('colspan', colCount.toString());
    
    // Create dashboard using DOM API instead of innerHTML for security
    const dashboard = footerCell.createEl('div', { cls: 'recurring-upkeep-stats-dashboard' });
    
    // Create header section
    const header = dashboard.createEl('div', { cls: 'recurring-upkeep-stats-header' });
    header.createEl('h3', { text: '📊 Maintenance Statistics' });
    header.createEl('span', { 
      text: 'Last 12 months', 
      cls: 'recurring-upkeep-stats-period' 
    });
    
    // Create stats grid
    const grid = dashboard.createEl('div', { cls: 'recurring-upkeep-stats-grid' });
    
    // Total Completions card
    const totalCard = grid.createEl('div', { cls: 'recurring-upkeep-stat-card' });
    totalCard.createEl('span', { 
      text: totalCompletions.toString(), 
      cls: 'recurring-upkeep-stat-value' 
    });
    totalCard.createEl('div', { 
      text: 'Total Completions', 
      cls: 'recurring-upkeep-stat-label' 
    });
    
    // Average Days Between card
    const avgCard = grid.createEl('div', { cls: 'recurring-upkeep-stat-card' });
    avgCard.createEl('span', { 
      text: avgDaysBetween.toString(), 
      cls: 'recurring-upkeep-stat-value' 
    });
    avgCard.createEl('div', { 
      text: 'Avg Days Between', 
      cls: 'recurring-upkeep-stat-label' 
    });
    
    // On-Time Rate card
    const rateCard = grid.createEl('div', { cls: 'recurring-upkeep-stat-card' });
    rateCard.createEl('span', { 
      text: `${onTimeRate}%`, 
      cls: 'recurring-upkeep-stat-value' 
    });
    rateCard.createEl('div', { 
      text: 'On-Time Rate', 
      cls: 'recurring-upkeep-stat-label' 
    });

    footerRow.appendChild(footerCell);
    tfoot.appendChild(footerRow);
    table.appendChild(tfoot);

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      const duration = performance.now() - startTime;
      console.debug('[Recurring Upkeep] Statistics dashboard added', {
        duration: `${duration.toFixed(2)}ms`,
        statsGenerated: 3
      });
    }
  }

  private async runTests() {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Running tests in development mode...');
    }

    try {
      // Load tests from external file (works in both Node.js and browser)
      if (typeof window !== 'undefined' && window.RecurringUpkeepTests) {
        const results = window.RecurringUpkeepTests.runAllTests();

        if (results.failed > 0) {
          console.error(`❌ ${results.failed} tests failed out of ${results.total}`);
        } else {
          console.log(`✅ All ${results.total} tests passed!`);
        }

        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug('[Recurring Upkeep] External test results', results);
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

        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug('[Recurring Upkeep] Fallback test results', results);
        }
      }
    } catch (error) {
      console.error('Failed to run tests:', error);
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.error('[Recurring Upkeep] Test execution error details', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }
  }

  private checkDataviewDependency(): void {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Checking Dataview dependency...');
    }

    // Safe access to plugin system using type assertion
    const pluginSystem = this.app as unknown as { plugins: ObsidianPluginSystem };
    const dataviewPlugin = pluginSystem.plugins.plugins.dataview;

    if (!dataviewPlugin) {
      console.error('[Recurring Upkeep] Dataview plugin not found');
      console.error('Recurring Upkeep Scheduler: Dataview plugin is required but not found');
      return;
    }

    this.dataviewApi = dataviewPlugin.api || null;

    if (!this.dataviewApi) {
      console.error('[Recurring Upkeep] Dataview API not available');
      console.error('Recurring Upkeep Scheduler: Dataview API is not available');
      return;
    }

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Dataview dependency check passed');
    }
  }

  private async renderUpkeepTable(filterQuery: string, container: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Rendering upkeep table', {
        filterQuery,
        sourcePath: ctx.sourcePath
      });
    }

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

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Tasks processed for table', {
          rawTaskCount: tasks.length,
          processedTaskCount: processedTasks.length,
          sortedTaskCount: sortedTasks.length
        });
      }

      const tableView = new UpkeepTableView(this.app, this.widgetEventManager, filterQuery);
      tableView.render(container, sortedTasks);

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.info('[Recurring Upkeep] Upkeep table rendered successfully');
      }

    } catch (error) {
      console.error('[Recurring Upkeep] Error rendering upkeep table', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        filterQuery,
        sourcePath: ctx.sourcePath
      });
      console.error('Error rendering upkeep table:', error);
      container.createEl('div', {
        text: `Error loading upkeep tasks: ${(error as Error).message}`,
        cls: 'recurring-upkeep-error'
      });
    }
  }

  private async renderUpkeepStatus(source: string, container: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Rendering upkeep status widget', {
        source,
        sourcePath: ctx.sourcePath
      });
    }

    try {
      const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);

      if (!file || !(file instanceof TFile)) {
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.warn('[Recurring Upkeep] Could not determine current file for status widget', {
            sourcePath: ctx.sourcePath,
            fileFound: !!file,
            fileType: file ? file.constructor.name : 'none'
          });
        }
        container.createEl('div', {
          text: 'Could not determine current file for status widget',
          cls: 'recurring-upkeep-error'
        });
        return;
      }

      const statusView = new UpkeepStatusView(this.app, this.widgetEventManager);
      await statusView.render(container, file);

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.info('[Recurring Upkeep] Upkeep status widget rendered successfully', {
          fileName: file.name
        });
      }

    } catch (error) {
      console.error('[Recurring Upkeep] Error rendering upkeep status', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        source,
        sourcePath: ctx.sourcePath
      });
      console.error('Error rendering upkeep status:', error);
      container.createEl('div', {
        text: `Error loading task status: ${(error as Error).message}`,
        cls: 'recurring-upkeep-error'
      });
    }
  }

  async getUpkeepTasks(): Promise<UpkeepTask[]> {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Fetching upkeep tasks from Dataview...');
    }

    if (!this.dataviewApi) {
      throw new Error('Dataview API not available');
    }

    try {
      const pages = this.dataviewApi.pages().where((p: DataviewPage) => {
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
          complete_early_days: page.complete_early_days,
          type: page.type,
          tags: fileWithTags.tags || []
        };

        if (task.interval && task.interval_unit) {
          tasks.push(task);

          if (RECURRING_UPKEEP_LOGGING_ENABLED) {
            console.debug('[Recurring Upkeep] Found valid upkeep task', {
              fileName: task.file.name,
              interval: task.interval,
              intervalUnit: task.interval_unit,
              lastDone: task.last_done
            });
          }
        }
      }

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.info('[Recurring Upkeep] Tasks fetched from Dataview', {
          totalTasksFound: tasks.length,
          tasksWithInterval: tasks.filter(t => t.interval && t.interval_unit).length
        });
      }

      return tasks;
    } catch (error) {
      console.error('[Recurring Upkeep] Error fetching tasks from Dataview', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      console.error('Error fetching tasks from Dataview:', error);
      throw new Error(`Failed to fetch tasks: ${(error as Error).message}`);
    }
  }

  async activateView() {
    const { workspace } = this.app;
    
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(UPKEEP_SIDEBAR_VIEW_TYPE);
    
    if (leaves.length > 0) {
      // A leaf with our view already exists, use that
      leaf = leaves[0];
    } else {
      // Our view could not be found in the workspace, create a new leaf
      // in the right sidebar for it
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: UPKEEP_SIDEBAR_VIEW_TYPE, active: true });
      }
    }
    
    // "Reveal" the leaf in case it is in a collapsed sidebar
    if (leaf) {
      workspace.revealLeaf(leaf);
    }

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Sidebar view activated');
    }
  }
}
