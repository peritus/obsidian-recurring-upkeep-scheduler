import { LocaleDefinition } from '../types';

export const en: LocaleDefinition = {
  status: {
    upToDate: '✅ Up to date',
    overdue: (days: number) => `⚠️ Overdue by ${days} ${days === 1 ? 'day' : 'days'}`,
    dueToday: '⏰ Due today',
    neverCompleted: '⚠️ Never completed',
  },

  time: {
    units: {
      day: 'day',
      days: 'days',
      week: 'week',
      weeks: 'weeks',
      month: 'month',
      months: 'months',
      year: 'year',
      years: 'years',
    },
    frequencies: {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
      every: (count: number, unit: string) => `Every ${count} ${unit}`,
    },
    relative: {
      today: 'today',
      tomorrow: 'tomorrow',
      yesterday: 'yesterday',
      inDays: (days: number) => `in ${days} ${days === 1 ? 'day' : 'days'}`,
      daysAgo: (days: number) => `${days} ${days === 1 ? 'day' : 'days'} ago`,
      inWeeks: (weeks: number) => `in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`,
      weeksAgo: (weeks: number) => `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`,
      inMonths: (months: number) => `in ${months} ${months === 1 ? 'month' : 'months'}`,
      monthsAgo: (months: number) => `${months} ${months === 1 ? 'month' : 'months'} ago`,
      inYears: (years: number) => `in ${years} ${years === 1 ? 'year' : 'years'}`,
      yearsAgo: (years: number) => `${years} ${years === 1 ? 'year' : 'years'} ago`,
      onWeekday: (weekday: string) => `on ${weekday}`,
    },
  },

  ui: {
    buttons: {
      markComplete: 'Mark Complete',
      setup: 'Setup Task',
    },
    labels: {
      task: 'Task',
      status: 'Status',
      lastDone: 'Last Done',
      nextDue: 'Next Due',
      frequency: 'Frequency',
      progress: 'Progress',
      wasDue: 'Was due',
      due: 'Due',
      never: 'Never',
      notScheduled: 'Not scheduled',
      completionHistory: 'Completion history',
      date: 'Date',
      time: 'Time',
      daysSinceLast: 'Days Since Last',
      daysScheduled: 'Days Scheduled',
      user: 'User',
      recurringTasks: 'Recurring Tasks',
      totalTasks: 'Total',
      needsAttention: 'Needs Attention',
    },
    statusText: {
      thisIsTask: (frequencyDesc: string) => `This is a ${frequencyDesc} task`,
      taskLastDone: (frequencyDesc: string, lastDone: string) => `${frequencyDesc} task (last done ${lastDone})`,
      dueWithFrequency: (due: string, frequencyDesc: string) => `Due ${due} (${frequencyDesc})`,
      dueInDays: (days: number, frequencyDesc: string) => `Due in ${days} ${days === 1 ? 'day' : 'days'} (${frequencyDesc})`,
      approximateDueDate: (days: number) => `Approximate due date (${days} ${days === 1 ? 'day' : 'days'} from completion)`,
    },
    messages: {
      setupTitle: '⚙️ Setup Recurring Task',
      setupDescription: 'To use this status widget, add the following to your document frontmatter:',
      setupFields: {
        tags: 'tags: Include "recurring-task"',
        lastDone: 'last_done: Last completion date (YYYY-MM-DD)',
        interval: 'interval: How often (number)',
        intervalUnit: 'interval_unit: days, weeks, months, or years',
      },
      noTasks: 'No recurring tasks found',
      noTasksFilter: 'No tasks found matching the current filter.',
      error: (message: string) => `Error: ${message}`,
      loading: 'Loading tasks...',
      failedToUpdateCompletionHistory: 'Failed to update completion history',
    },
  },

  filters: {
    status: {
      all: 'All tasks',
      overdue: 'Overdue tasks',
      upToDate: 'Up to date',
    },
    sort: {
      dueDate: 'Due date',
      status: 'Status',
      name: 'Name',
    },
  },

  help: {
    tooltips: {
      due: 'When this task is due for completion',
      lastDone: 'When this task was last completed',
      progress: 'Visual indicator of time remaining until due',
      status: 'Current status of the recurring task',
    },
    dateTooltip: (prefix: string, date: string, days?: number) => {
      if (days !== undefined) {
        if (days === 0) {
          return `${prefix}: ${date} (today)`;
        } else if (days > 0) {
          return `${prefix}: ${date} (${days} ${days === 1 ? 'day' : 'days'})`;
        } else {
          return `${prefix}: ${date} (${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago)`;
        }
      }
      return `${prefix}: ${date}`;
    },
  },
};
