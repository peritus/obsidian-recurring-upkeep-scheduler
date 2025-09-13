import { App, TFile, EventRef, debounce } from 'obsidian';
import { RECURRING_UPKEEP_LOGGING_ENABLED } from '../constants';

interface WidgetRegistration {
  id: string;
  containerElement: HTMLElement;
  refresh: () => Promise<void> | void;
  isActive: () => boolean; // Check if widget is still in DOM
}

export class WidgetEventManager {
  private app: App;
  private widgets: Map<string, WidgetRegistration> = new Map();
  private eventRefs: EventRef[] = [];
  private debouncedRefresh: () => void;

  constructor(app: App) {
    this.app = app;
    
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Initializing WidgetEventManager...');
    }
    
    // Simple debounced refresh - runs after any change
    this.debouncedRefresh = debounce(
      this.performRefresh.bind(this), 
      300, 
      true
    );

    this.setupEventListeners();

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] WidgetEventManager initialized successfully');
    }
  }

  /**
   * Register a widget to receive update notifications
   */
  registerWidget(registration: WidgetRegistration): void {
    this.widgets.set(registration.id, registration);
    
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Widget registered', {
        id: registration.id,
        totalWidgets: this.widgets.size
      });
    }
    
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug(`🔗 Widget registered: ${registration.id}`);
    }
  }

  /**
   * Unregister a widget (called when widget is destroyed)
   */
  unregisterWidget(id: string): void {
    const wasDeleted = this.widgets.delete(id);
    
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Widget unregistered', {
        id,
        wasDeleted,
        totalWidgets: this.widgets.size
      });
    }
    
    if (wasDeleted) {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug(`🔗 Widget unregistered: ${id}`);
      }
    }
  }

  /**
   * Notify all widgets that something changed - they decide if they need to refresh
   */
  notifyChange(): void {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Change notification triggered', {
        activeWidgets: this.widgets.size
      });
    }
    
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('🔄 Change notification - refreshing all widgets');
    }
    this.debouncedRefresh();
  }

  /**
   * Clean up all event listeners
   */
  cleanup(): void {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Cleaning up WidgetEventManager', {
        eventRefs: this.eventRefs.length,
        widgets: this.widgets.size
      });
    }

    this.eventRefs.forEach(ref => this.app.vault.offref(ref));
    this.eventRefs = [];
    this.widgets.clear();
    
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] WidgetEventManager cleanup completed');
    }
    
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('🔗 WidgetEventManager cleaned up');
    }
  }

  private setupEventListeners(): void {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Setting up event listeners...');
    }

    // File content changes
    const modifyRef = this.app.vault.on('modify', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug('[Recurring Upkeep] File modified', { fileName: file.name });
        }
        this.notifyChange();
      }
    });
    this.eventRefs.push(modifyRef);

    // Metadata/frontmatter changes
    const metadataRef = this.app.metadataCache.on('changed', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug('[Recurring Upkeep] Metadata changed', { fileName: file.name });
        }
        this.notifyChange();
      }
    });
    this.eventRefs.push(metadataRef);

    // File creation/deletion
    const createRef = this.app.vault.on('create', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug('[Recurring Upkeep] File created', { fileName: file.name });
        }
        this.notifyChange();
      }
    });
    this.eventRefs.push(createRef);

    const deleteRef = this.app.vault.on('delete', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug('[Recurring Upkeep] File deleted', { fileName: file.name });
        }
        this.notifyChange();
      }
    });
    this.eventRefs.push(deleteRef);

    // Workspace changes (tab switching, layout changes)
    const activeLeafRef = this.app.workspace.on('active-leaf-change', () => {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Active leaf changed');
      }
      // Small delay to let new document load
      setTimeout(() => this.notifyChange(), 100);
    });
    this.eventRefs.push(activeLeafRef);

    const layoutRef = this.app.workspace.on('layout-change', () => {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Layout changed');
      }
      this.notifyChange();
    });
    this.eventRefs.push(layoutRef);

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Event listeners set up', {
        totalListeners: this.eventRefs.length
      });
    }

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('🔗 WidgetEventManager event listeners set up');
    }
  }

  private async performRefresh(): Promise<void> {
    const startTime = RECURRING_UPKEEP_LOGGING_ENABLED ? performance.now() : 0;

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Starting widget refresh cycle...');
    }

    const activeWidgets = this.getActiveWidgets();
    
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Active widgets found', {
        activeCount: activeWidgets.length,
        totalRegistered: this.widgets.size
      });
    }
    
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug(`🔄 Refreshing ${activeWidgets.length} widgets`);
    }

    const refreshPromises = activeWidgets
      .map(widget => this.safeRefreshWidget(widget));

    await Promise.allSettled(refreshPromises);

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      const duration = performance.now() - startTime;
      console.info('[Recurring Upkeep] Widget refresh cycle completed', {
        activeWidgets: activeWidgets.length,
        duration: `${duration.toFixed(2)}ms`
      });
    }
  }

  private getActiveWidgets(): WidgetRegistration[] {
    const activeWidgets: WidgetRegistration[] = [];
    const deadWidgets: string[] = [];
    
    for (const [id, widget] of this.widgets) {
      // Check if widget is still in the DOM and active
      if (widget.isActive()) {
        activeWidgets.push(widget);
      } else {
        // Auto-cleanup dead widgets
        this.widgets.delete(id);
        deadWidgets.push(id);
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug(`🗑️ Auto-cleaned dead widget: ${id}`);
        }
      }
    }

    if (RECURRING_UPKEEP_LOGGING_ENABLED && deadWidgets.length > 0) {
      console.debug('[Recurring Upkeep] Cleaned up dead widgets', {
        deadWidgets,
        activeWidgets: activeWidgets.length,
        totalRegistered: this.widgets.size
      });
    }
    
    return activeWidgets;
  }

  private async safeRefreshWidget(widget: WidgetRegistration): Promise<void> {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Refreshing individual widget', {
        id: widget.id
      });
    }

    const startTime = RECURRING_UPKEEP_LOGGING_ENABLED ? performance.now() : 0;

    try {
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug(`🔄 Refreshing widget ${widget.id}`);
      }
      await widget.refresh();

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        const duration = performance.now() - startTime;
        console.debug('[Recurring Upkeep] Widget refresh completed', {
          id: widget.id,
          duration: `${duration.toFixed(2)}ms`
        });
      }
    } catch (error) {
      console.error('[Recurring Upkeep] Error refreshing widget', {
        id: widget.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      console.error(`❌ Error refreshing widget ${widget.id}:`, error);
    }
  }
}
