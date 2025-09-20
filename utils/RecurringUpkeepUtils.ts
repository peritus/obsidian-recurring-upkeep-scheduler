import { App, TFile, FrontMatterCache } from 'obsidian';
import { UpkeepTask, TaskStatus, MarkCompleteResult } from '../types';
import { DateUtils } from './DateUtils';
import { I18nUtils } from '../i18n/I18nUtils';
import { RECURRING_UPKEEP_LOGGING_ENABLED } from '../constants';

// Type definitions for OS module access (if available)
interface NodeOS {
  userInfo(): {
    username: string;
  };
}

// Type definitions for require function (if available in Node environment)
declare const require: ((id: string) => NodeOS) | undefined;

// Type definitions for Obsidian app with plugins
interface ObsidianAppWithPlugins extends App {
  plugins: {
    plugins: {
      dataview?: {
        api: {
          index: {
            touch(): void;
          };
        };
      };
    };
  };
}

export class RecurringUpkeepUtils {
  static calculateIntervalInDays(interval: number, intervalUnit: string): number {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Calculating interval in days', {
        interval,
        intervalUnit,
        intervalType: typeof interval
      });
    }

    const normalizedUnit = intervalUnit?.toLowerCase();

    let result: number;
    if (normalizedUnit === "day" || normalizedUnit === "days") {
      result = Number(interval);
    } else if (normalizedUnit === "week" || normalizedUnit === "weeks") {
      result = Number(interval) * 7;
    } else if (normalizedUnit === "month" || normalizedUnit === "months") {
      result = Number(interval) * 30;
    } else if (normalizedUnit === "year" || normalizedUnit === "years") {
      result = Number(interval) * 365;
    } else {
      result = Number(interval);
    }

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Interval calculated', {
        input: { interval, intervalUnit },
        normalizedUnit,
        result
      });
    }

    return result;
  }

  static getFrequencyDescription(interval: number, intervalUnit: string): string {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Getting frequency description', {
        interval,
        intervalUnit
      });
    }

    // Use the i18n system for consistent localization, with fallback
    try {
      const result = I18nUtils.formatFrequency(interval, intervalUnit);
      
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Frequency description from i18n', {
          input: { interval, intervalUnit },
          result
        });
      }
      
      return result;
    } catch {
      // Fallback to original logic when i18n is not available
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] i18n failed, using fallback logic');
      }

      const normalizedUnit = intervalUnit?.toLowerCase();

      let result: string;
      if (interval === 1) {
        if (normalizedUnit === "day" || normalizedUnit === "days") result = "daily";
        else if (normalizedUnit === "week" || normalizedUnit === "weeks") result = "weekly";
        else if (normalizedUnit === "month" || normalizedUnit === "months") result = "monthly";
        else if (normalizedUnit === "year" || normalizedUnit === "years") result = "yearly";
        else result = `every ${interval} ${normalizedUnit}`;
      } else {
        let displayUnit = normalizedUnit;
        if (normalizedUnit === "day") displayUnit = "days";
        if (normalizedUnit === "week") displayUnit = "weeks";
        if (normalizedUnit === "month") displayUnit = "months";
        if (normalizedUnit === "year") displayUnit = "years";

        result = `every ${interval} ${displayUnit}`;
      }

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Frequency description from fallback', {
          input: { interval, intervalUnit },
          normalizedUnit,
          result
        });
      }

      return result;
    }
  }

  static determineTaskStatus(task: UpkeepTask, now: string | null = null): TaskStatus {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Determining task status', {
        taskName: task.file?.name,
        lastDone: task.last_done,
        interval: task.interval,
        intervalUnit: task.interval_unit,
        now
      });
    }

    if (!task.last_done || task.last_done === "" || task.last_done === "never") {
      const result = {
        status: this.getLocalizedOverdue(),
        daysRemaining: -9999,
        calculatedNextDue: null
      };

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Task never completed', {
          taskName: task.file?.name,
          result
        });
      }

      return result;
    }

    const nextDue = DateUtils.calculateNextDueDate(task.last_done, task.interval, task.interval_unit);
    const daysRemaining = DateUtils.calculateDaysRemaining(nextDue || "", now);

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Task status calculations', {
        taskName: task.file?.name,
        nextDue,
        daysRemaining
      });
    }

    let status: string;

    if (DateUtils.isToday(task.last_done, now)) {
      const intervalInDays = this.calculateIntervalInDays(task.interval, task.interval_unit);

      const result = {
        status: this.getLocalizedUpToDate(),
        daysRemaining: intervalInDays,
        calculatedNextDue: nextDue
      };

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Task completed today', {
          taskName: task.file?.name,
          intervalInDays,
          result
        });
      }

      return result;
    }

    // Binary decision based on days remaining
    if (daysRemaining <= 0) {
      status = this.getLocalizedOverdue();
    } else {
      status = this.getLocalizedUpToDate();
    }

    const result = {
      status,
      daysRemaining,
      calculatedNextDue: nextDue
    };

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Task status determined', {
        taskName: task.file?.name,
        result
      });
    }

    return result;
  }

  // Helper methods with fallbacks for when i18n is not available
  private static getLocalizedOverdue(): string {
    try {
      return "⚠️ Overdue";
    } catch {
      return "⚠️ Overdue";
    }
  }

  private static getLocalizedUpToDate(): string {
    try {
      return I18nUtils.t.status.upToDate;
    } catch {
      return "✅ Up to date";
    }
  }

  static async markTaskComplete(app: App, filePath: string): Promise<MarkCompleteResult> {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Starting mark task complete', {
        filePath
      });
    }

    const startTime = RECURRING_UPKEEP_LOGGING_ENABLED ? performance.now() : 0;

    try {
      const today = new Date().toISOString().split('T')[0];
      const currentTimestamp = new Date().toISOString(); // Full timestamp for accurate days calculation
      
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Generated timestamps', {
          today,
          currentTimestamp
        });
      }

      const abstractFile = app.vault.getAbstractFileByPath(filePath);
      if (!abstractFile) throw new Error("File not found");

      if (!(abstractFile instanceof TFile)) {
        throw new Error("Path does not point to a file");
      }
      const file = abstractFile;
      
      if (!file.stat) throw new Error("File is not a regular file");

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] File validation passed', {
          fileName: file.name,
          fileSize: file.stat.size
        });
      }

      // Get current task data before updating frontmatter
      let previousLastDone: string | undefined;
      let intervalDays: number = -1; // Default to -1 for missing/invalid frontmatter
      
      await app.fileManager.processFrontMatter(file, (fm: FrontMatterCache) => {
        previousLastDone = fm.last_done;
        
        // Calculate interval in days
        if (fm.interval && fm.interval_unit) {
          intervalDays = this.calculateIntervalInDays(fm.interval, fm.interval_unit);
        }
        
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug('[Recurring Upkeep] Processing frontmatter', {
            previousLastDone,
            interval: fm.interval,
            intervalUnit: fm.interval_unit,
            intervalDays
          });
        }
        
        // Update frontmatter (existing logic) - keep using date only for consistency
        fm.last_done = today;
        if (fm.next_due) delete fm.next_due;
      });

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Frontmatter updated', {
          previousLastDone,
          newLastDone: today,
          intervalDays
        });
      }

      // NEW: Add completion history entry using full timestamp for accurate calculation
      try {
        await this.appendCompletionHistory(app, file, previousLastDone, currentTimestamp, intervalDays);
        
        if (RECURRING_UPKEEP_LOGGING_ENABLED) {
          console.debug('[Recurring Upkeep] Completion history updated successfully');
        }
      } catch (historyError) {
        const errorMessage = this.getLocalizedFailedToUpdateCompletionHistory();
        console.warn(`${errorMessage}:`, historyError);
        
        console.error('[Recurring Upkeep] Failed to update completion history', {
          error: historyError instanceof Error ? historyError.message : String(historyError),
          stack: historyError instanceof Error ? historyError.stack : undefined
        });
        // Don't fail the whole operation if history update fails
      }

      setTimeout(() => {
        const obsidianApp = app as ObsidianAppWithPlugins;
        const dataview = obsidianApp.plugins.plugins.dataview;
        if (dataview && dataview.api) {
          dataview.api.index.touch();
          
          if (RECURRING_UPKEEP_LOGGING_ENABLED) {
            console.debug('[Recurring Upkeep] Dataview index refreshed');
          }
        }
      }, 500);

      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        const duration = performance.now() - startTime;
        console.info('[Recurring Upkeep] Task completion successful', {
          filePath,
          duration: `${duration.toFixed(2)}ms`,
          today
        });
      }

      return { success: true, today };
    } catch (error) {
      console.error('[Recurring Upkeep] Task completion failed', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      console.error(error);
      return { success: false, error: (error as Error).message };
    }
  }

  // NEW: Helper methods for completion history feature

  private static daysBetween(date1: string, date2: string): string {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const days = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
    return this.formatDaysWithDecimal(days);
  }

  private static formatDaysWithDecimal(days: number): string {
    return parseFloat(days.toFixed(2)).toString();
  }

  private static formatDate(): string {
    const now = new Date();
    return now.getFullYear() + '-' + 
           String(now.getMonth() + 1).padStart(2, '0') + '-' + 
           String(now.getDate()).padStart(2, '0');
  }

  private static formatTime(): string {
    const now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' + 
           String(now.getMinutes()).padStart(2, '0');
  }

  private static getSystemUsername(): string {
    try {
      // Graceful fallback chain for username detection
      if (typeof require === 'undefined') return '-';
      
      const os = require('os');
      if (!os) return '-';
      
      if (typeof os.userInfo !== 'function') return '-';
      
      const userInfo = os.userInfo();
      if (!userInfo) return '-';
      
      if (typeof userInfo.username !== 'string') return '-';
      
      return userInfo.username;
    } catch (error) {
      // Any error in the chain results in fallback
      return '-';
    }
  }

  // NEW: Get localized completion history strings with fallbacks
  private static getLocalizedCompletionHistorySection(): string {
    try {
      return I18nUtils.t.ui.labels.completionHistory;
    } catch {
      return 'Completion history';
    }
  }

  private static getLocalizedCompletionHistoryHeaders(): { date: string; time: string; daysSinceLast: string; daysScheduled: string; user: string } {
    try {
      return {
        date: I18nUtils.t.ui.labels.date,
        time: I18nUtils.t.ui.labels.time,
        daysSinceLast: I18nUtils.t.ui.labels.daysSinceLast,
        daysScheduled: I18nUtils.t.ui.labels.daysScheduled,
        user: I18nUtils.t.ui.labels.user,
      };
    } catch {
      return {
        date: 'Date',
        time: 'Time',
        daysSinceLast: 'Days Since Last',
        daysScheduled: 'Days Scheduled',
        user: 'User',
      };
    }
  }

  private static getLocalizedFailedToUpdateCompletionHistory(): string {
    try {
      return I18nUtils.t.ui.messages.failedToUpdateCompletionHistory;
    } catch {
      return 'Failed to update completion history';
    }
  }

  /**
   * Smart append function for table rows that handles newlines correctly
   * - If content doesn't end with newline, add one before the new row
   * - If content already ends with newline, just append the row directly
   * This prevents both malformed tables and extra blank lines
   */
  private static smartAppendToTable(content: string, newRow: string): string {
    if (!content.endsWith('\n')) {
      return content + '\n' + newRow;
    }
    return content + newRow;
  }

  private static async appendCompletionHistory(
    app: App,
    file: TFile,
    previousLastDone: string | undefined,
    currentTimestamp: string,
    intervalDays: number
  ): Promise<void> {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Appending completion history', {
        fileName: file.name,
        previousLastDone,
        currentTimestamp,
        intervalDays
      });
    }

    const startTime = RECURRING_UPKEEP_LOGGING_ENABLED ? performance.now() : 0;

    const content = await app.vault.read(file);
    
    // Check for completion history section in any locale to prevent duplicates
    const completionHistorySections = [
      '## Completion history',  // English
      '## Erledigungsverlauf',  // German
      // Add more locales here as needed
    ];
    
    const hasCompletionHistorySection = completionHistorySections.some(section => 
      content.includes(section)
    );

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Completion history section detection', {
        hasCompletionHistorySection,
        contentLength: content.length,
        sectionsChecked: completionHistorySections
      });
    }
    
    // Calculate days since last completion
    const daysSinceLast = previousLastDone ? 
      this.daysBetween(previousLastDone, currentTimestamp) : '-';
    
    // Get current date and time as separate values
    const date = this.formatDate();
    const time = this.formatTime();
    
    // Get system username with graceful fallback
    const username = this.getSystemUsername();

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.debug('[Recurring Upkeep] Completion history row data', {
        daysSinceLast,
        date,
        time,
        username,
        intervalDays
      });
    }
    
    // Create new table row
    const newRow = `| ${date} | ${time} | ${daysSinceLast} | ${intervalDays} | ${username} |`;
    
    if (!hasCompletionHistorySection) {
      // Add new section with table using current locale
      const sectionTitle = this.getLocalizedCompletionHistorySection();
      const headers = this.getLocalizedCompletionHistoryHeaders();
      
      const tableSection = `\n\n## ${sectionTitle}\n\n| ${headers.date} | ${headers.time} | ${headers.daysSinceLast} | ${headers.daysScheduled} | ${headers.user} |\n|------|------|----------------|----------------|------|\n` + newRow;
      const newContent = content + tableSection;
      
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Creating new completion history section', {
          sectionTitle,
          headers,
          newSectionLength: tableSection.length,
          originalContentLength: content.length,
          newContentLength: newContent.length
        });
      }
      
      await app.vault.modify(file, newContent);
    } else {
      // Use smart append to handle existing table correctly
      const newContent = this.smartAppendToTable(content, newRow);
      
      if (RECURRING_UPKEEP_LOGGING_ENABLED) {
        console.debug('[Recurring Upkeep] Appending to existing completion history', {
          originalContentLength: content.length,
          newContentLength: newContent.length,
          rowAdded: newRow
        });
      }
      
      await app.vault.modify(file, newContent);
    }

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      const duration = performance.now() - startTime;
      console.debug('[Recurring Upkeep] Completion history updated successfully', {
        fileName: file.name,
        duration: `${duration.toFixed(2)}ms`,
        hasExistingSection: hasCompletionHistorySection
      });
    }
  }



  // Debug helper function for troubleshooting real tasks
  static debugTask(task: UpkeepTask, now: string | null = null): TaskStatus {
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Starting debug task analysis', {
        taskName: task.file?.name,
        now
      });
    }

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.log("🔍 DEBUGGING TASK:");
      console.log("==================");
      console.log("Task object:", task);
      console.log("Task name:", task.file?.name || "unknown");
      console.log("last_done value:", task.last_done);
      console.log("last_done type:", typeof task.last_done);
      console.log("last_done === null:", task.last_done === null);
      console.log("last_done === '':", task.last_done === "");
      console.log("last_done === 'never':", task.last_done === "never");
      console.log("!task.last_done:", !task.last_done);
      console.log("interval:", task.interval);
      console.log("interval_unit:", task.interval_unit);
      console.log("Current time:", now || new Date().toISOString().split('T')[0]);

      console.log("\n🔧 RUNNING CALCULATIONS:");
      console.log("=========================");
    }

    const result = this.determineTaskStatus(task, now);
    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.log("Final result:", result);
    }

    if (RECURRING_UPKEEP_LOGGING_ENABLED) {
      console.info('[Recurring Upkeep] Debug task analysis completed', {
        taskName: task.file?.name,
        result
      });
    }

    return result;
  }
}
