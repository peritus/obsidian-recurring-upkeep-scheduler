import { App, TFile, EventRef, debounce } from 'obsidian';

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
    
    // Simple debounced refresh - runs after any change
    this.debouncedRefresh = debounce(
      this.performRefresh.bind(this), 
      300, 
      true
    );

    this.setupEventListeners();
  }

  /**
   * Register a widget to receive update notifications
   */
  registerWidget(registration: WidgetRegistration): void {
    this.widgets.set(registration.id, registration);
    console.debug(`🔗 Widget registered: ${registration.id}`);
  }

  /**
   * Unregister a widget (called when widget is destroyed)
   */
  unregisterWidget(id: string): void {
    if (this.widgets.delete(id)) {
      console.debug(`🔗 Widget unregistered: ${id}`);
    }
  }

  /**
   * Notify all widgets that something changed - they decide if they need to refresh
   */
  notifyChange(): void {
    console.debug('🔄 Change notification - refreshing all widgets');
    this.debouncedRefresh();
  }

  /**
   * Clean up all event listeners
   */
  cleanup(): void {
    this.eventRefs.forEach(ref => this.app.vault.offref(ref));
    this.eventRefs = [];
    this.widgets.clear();
    console.debug('🔗 WidgetEventManager cleaned up');
  }

  private setupEventListeners(): void {
    // File content changes
    const modifyRef = this.app.vault.on('modify', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        this.notifyChange();
      }
    });
    this.eventRefs.push(modifyRef);

    // Metadata/frontmatter changes
    const metadataRef = this.app.metadataCache.on('changed', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        this.notifyChange();
      }
    });
    this.eventRefs.push(metadataRef);

    // File creation/deletion
    const createRef = this.app.vault.on('create', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        this.notifyChange();
      }
    });
    this.eventRefs.push(createRef);

    const deleteRef = this.app.vault.on('delete', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        this.notifyChange();
      }
    });
    this.eventRefs.push(deleteRef);

    // Workspace changes (tab switching, layout changes)
    const activeLeafRef = this.app.workspace.on('active-leaf-change', () => {
      // Small delay to let new document load
      setTimeout(() => this.notifyChange(), 100);
    });
    this.eventRefs.push(activeLeafRef);

    const layoutRef = this.app.workspace.on('layout-change', () => {
      this.notifyChange();
    });
    this.eventRefs.push(layoutRef);

    console.debug('🔗 WidgetEventManager event listeners set up');
  }

  private async performRefresh(): Promise<void> {
    const activeWidgets = this.getActiveWidgets();
    console.debug(`🔄 Refreshing ${activeWidgets.length} widgets`);

    const refreshPromises = activeWidgets
      .map(widget => this.safeRefreshWidget(widget));

    await Promise.allSettled(refreshPromises);
  }

  private getActiveWidgets(): WidgetRegistration[] {
    const activeWidgets: WidgetRegistration[] = [];
    
    for (const [id, widget] of this.widgets) {
      // Check if widget is still in the DOM and active
      if (widget.isActive()) {
        activeWidgets.push(widget);
      } else {
        // Auto-cleanup dead widgets
        this.widgets.delete(id);
        console.debug(`🗑️ Auto-cleaned dead widget: ${id}`);
      }
    }
    
    return activeWidgets;
  }

  private async safeRefreshWidget(widget: WidgetRegistration): Promise<void> {
    try {
      console.debug(`🔄 Refreshing widget ${widget.id}`);
      await widget.refresh();
    } catch (error) {
      console.error(`❌ Error refreshing widget ${widget.id}:`, error);
    }
  }
}
