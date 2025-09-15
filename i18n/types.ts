export interface LocaleDefinition {
  // Status messages
  status: {
    upToDate: string;
    overdue: (days: number) => string;
    dueToday: string;
    dueSoon: (days: number) => string;
    neverCompleted: string;
  };

  // Time units and frequencies
  time: {
    units: {
      day: string;
      days: string;
      week: string;
      weeks: string;
      month: string;
      months: string;
      year: string;
      years: string;
    };
    frequencies: {
      daily: string;
      weekly: string;
      monthly: string;
      yearly: string;
      every: (count: number, unit: string) => string;
    };
    relative: {
      today: string;
      tomorrow: string;
      yesterday: string;
      inDays: (days: number) => string;
      daysAgo: (days: number) => string;
      inWeeks: (weeks: number) => string;
      weeksAgo: (weeks: number) => string;
      inMonths: (months: number) => string;
      monthsAgo: (months: number) => string;
      inYears: (years: number) => string;
      yearsAgo: (years: number) => string;
      onWeekday: (weekday: string) => string;
    };
  };

  // UI elements
  ui: {
    buttons: {
      markComplete: string;
      setup: string;
    };
    labels: {
      task: string;
      status: string;
      lastDone: string;
      nextDue: string;
      frequency: string;
      progress: string;
      wasDue: string;
      due: string;
      never: string;
      notScheduled: string;
      completionHistory: string;
      date: string;
      time: string;
      daysSinceLast: string;
      daysScheduled: string;
      user: string;
      recurringTasks: string;
      totalTasks: string;
      needsAttention: string;
      dueSoon: string;
    };
    statusText: {
      thisIsTask: (frequencyDesc: string) => string;
      taskLastDone: (frequencyDesc: string, lastDone: string) => string;
      dueWithFrequency: (due: string, frequencyDesc: string) => string;
      dueInDays: (days: number, frequencyDesc: string) => string;
      approximateDueDate: (days: number) => string;
    };
    messages: {
      setupTitle: string;
      setupDescription: string;
      setupFields: {
        tags: string;
        lastDone: string;
        interval: string;
        intervalUnit: string;
        completeEarlyDays: string;
      };
      noTasks: string;
      noTasksFilter: string;
      error: (message: string) => string;
      loading: string;
      failedToUpdateCompletionHistory: string;
    };
  };

  // Filters and sorting
  filters: {
    status: {
      all: string;
      due: string;
      overdue: string;
      dueSoon: string;
      upToDate: string;
      never: string;
    };
    sort: {
      dueDate: string;
      status: string;
      name: string;
    };
  };

  // Tooltips and help text
  help: {
    tooltips: {
      due: string;
      lastDone: string;
      progress: string;
      status: string;
    };
    dateTooltip: (prefix: string, date: string, days?: number) => string;
  };
}

export type LocaleKey = 'en' | 'de';

export interface I18nOptions {
  locale?: LocaleKey;
  fallbackLocale?: LocaleKey;
}
