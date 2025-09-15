import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { ProcessedTask } from '../types';
import { UpkeepTableView } from './UpkeepTableView';
import { TaskProcessor } from '../utils/TaskProcessor';
import { I18nUtils } from '../i18n/I18nUtils';
import { WidgetEventManager } from '../utils/WidgetEventManager';
import { RECURRING_UPKEEP_LOGGING_ENABLED } from '../constants';
import RecurringUpkeepSchedulerPlugin from '../main';

export const UPKEEP_SIDEBAR_VIEW_TYPE = "recurring-upkeep-sidebar";

export class UpkeepSidebarView extends ItemView {
  plugin: RecurringUpkeepSchedulerPlugin;
  private tableView: UpkeepTableView | null = null;
  private contentContainerEl: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: RecurringUpkeepSchedulerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return UPKEEP_SIDEBAR_VIEW_TYPE;
  }

  getDisplayText() {
    return I18nUtils.t.ui.labels.recurringTasks || "Recurring Tasks";
  }

  getIcon() {
    return "repeat";
  }

  async onOpen() {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Opening sidebar view');
    }

    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('recurring-upkeep-sidebar-container');

    this.contentContainerEl = container;

    // Create simple header matching Obsidian's sidebar style
    this.createSimpleHeader(container);

    // Create main content area
    const contentArea = container.createEl('div', {
      cls: 'recurring-upkeep-sidebar-content'
    });

    // Initial render
    await this.renderContent(contentArea);

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Sidebar view opened successfully');
    }
  }

  async onClose() {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Closing sidebar view');
    }

    // Cleanup table view
    if (this.tableView) {
      this.tableView = null;
    }
  }

  private createSimpleHeader(container: HTMLElement): void {
    const headerContainer = container.createEl('div', {
      cls: 'tree-item-self'
    });

    const headerInner = headerContainer.createEl('div', {
      text: this.getDisplayText(),
      cls: 'tree-item-inner'
    });
  }

  private async renderContent(container: HTMLElement): Promise<void> {
    // Clear existing content
    container.empty();

    // Show loading state
    const loadingEl = container.createEl('div', {
      text: I18nUtils.t.ui.messages.loading || 'Loading tasks...',
      cls: 'recurring-upkeep-loading'
    });

    try {
      // Get tasks from the plugin
      const tasks = await this.plugin.getUpkeepTasks();
      
      if (!tasks || tasks.length === 0) {
        loadingEl.remove();
        container.createEl('div', {
          text: I18nUtils.t.ui.messages.noTasks || 'No recurring tasks found.',
          cls: 'recurring-upkeep-empty-state'
        });
        return;
      }

      // Process and sort tasks
      const processedTasks = TaskProcessor.processTasks(tasks);
      const sortedTasks = TaskProcessor.sortTasks(processedTasks);

      // Remove loading state
      loadingEl.remove();

      // Create table view
      const tableContainer = container.createEl('div', {
        cls: 'recurring-upkeep-sidebar-table-container'
      });

      this.tableView = new UpkeepTableView(
        this.app, 
        this.plugin.widgetEventManager, 
        '' // No filter for sidebar view
      );
      
      this.tableView.render(tableContainer, sortedTasks);

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Sidebar content rendered', {
          taskCount: tasks.length,
          processedCount: processedTasks.length,
          sortedCount: sortedTasks.length
        });
      }

    } catch (error) {
      loadingEl.remove();
      console.error('[Recurring Upkeep] Error rendering sidebar content:', error);
      
      container.createEl('div', {
        text: `Error loading tasks: ${error instanceof Error ? error.message : String(error)}`,
        cls: 'recurring-upkeep-error'
      });
    }
  }
}
