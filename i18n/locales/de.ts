import { LocaleDefinition } from '../types';

export const de: LocaleDefinition = {
  status: {
    upToDate: '✅ Aktuell',
    overdue: (days: number) => `⚠️ Überfällig seit ${days} ${days === 1 ? 'Tag' : 'Tagen'}`,
    dueToday: '⏰ Heute fällig',
    dueSoon: (days: number) => `⏰ Fällig in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`,
    neverCompleted: '⚠️ Nie erledigt',
  },

  time: {
    units: {
      day: 'Tag',
      days: 'Tage',
      week: 'Woche',
      weeks: 'Wochen',
      month: 'Monat',
      months: 'Monate',
      year: 'Jahr',
      years: 'Jahre',
    },
    frequencies: {
      daily: 'Täglich',
      weekly: 'Wöchentlich',
      monthly: 'Monatlich',
      yearly: 'Jährlich',
      every: (count: number, unit: string) => `Alle ${count} ${unit}`,
    },
    relative: {
      today: 'heute',
      tomorrow: 'morgen',
      yesterday: 'gestern',
      inDays: (days: number) => `in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`,
      daysAgo: (days: number) => `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`,
      inWeeks: (weeks: number) => `in ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}`,
      weeksAgo: (weeks: number) => `vor ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}`,
      inMonths: (months: number) => `in ${months} ${months === 1 ? 'Monat' : 'Monaten'}`,
      monthsAgo: (months: number) => `vor ${months} ${months === 1 ? 'Monat' : 'Monaten'}`,
      inYears: (years: number) => `in ${years} ${years === 1 ? 'Jahr' : 'Jahren'}`,
      yearsAgo: (years: number) => `vor ${years} ${years === 1 ? 'Jahr' : 'Jahren'}`,
      onWeekday: (weekday: string) => `am ${weekday}`,
    },
  },

  ui: {
    buttons: {
      markComplete: 'Als erledigt markieren',
      setup: 'Aufgabe einrichten',
    },
    labels: {
      task: 'Aufgabe',
      status: 'Status',
      lastDone: 'Zuletzt erledigt',
      nextDue: 'Nächste Fälligkeit',
      frequency: 'Häufigkeit',
      progress: 'Fortschritt',
      wasDue: 'War fällig',
      due: 'Fällig',
      never: 'Nie',
      notScheduled: 'Nicht geplant',
      completionHistory: 'Erledigungsverlauf',
      date: 'Datum',
      time: 'Zeit',
      daysSinceLast: 'Tage seit letztem',
      daysScheduled: 'Tage vorgesehen',
      user: 'Benutzer',
      recurringTasks: 'Wiederkehrende Aufgaben',
      totalTasks: 'Gesamt',
      needsAttention: 'Braucht Aufmerksamkeit',
      dueSoon: 'Bald fällig',
    },
    statusText: {
      thisIsTask: (frequencyDesc: string) => `Dies ist eine ${frequencyDesc}`,
      taskLastDone: (frequencyDesc: string, lastDone: string) => `${frequencyDesc} (zuletzt erledigt ${lastDone})`,
      dueWithFrequency: (due: string, frequencyDesc: string) => `Fällig ${due} (${frequencyDesc})`,
      dueInDays: (days: number, frequencyDesc: string) => `Fällig in ${days} ${days === 1 ? 'Tag' : 'Tagen'} (${frequencyDesc})`,
      approximateDueDate: (days: number) => `Ungefähres Fälligkeitsdatum (${days} ${days === 1 ? 'Tag' : 'Tage'} nach Abschluss)`,
    },
    messages: {
      setupTitle: '⚙️ Wiederkehrende Aufgabe einrichten',
      setupDescription: 'Um dieses Status-Widget zu verwenden, fügen Sie folgendes zu Ihrem Dokument-Frontmatter hinzu:',
      setupFields: {
        tags: 'tags: "recurring-task" hinzufügen',
        lastDone: 'last_done: Datum der letzten Erledigung (YYYY-MM-DD)',
        interval: 'interval: Wie oft (Zahl)',
        intervalUnit: 'interval_unit: days, weeks, months, oder years',
        completeEarlyDays: 'complete_early_days: Tage vor Fälligkeit für vorzeitige Erledigung (optional)',
      },
      noTasks: 'Keine wiederkehrenden Aufgaben gefunden',
      noTasksFilter: 'Keine Aufgaben entsprechen dem aktuellen Filter.',
      error: (message: string) => `Fehler: ${message}`,
      loading: 'Lade Aufgaben...',
      failedToUpdateCompletionHistory: 'Fehler beim Aktualisieren des Erledigungsverlaufs',
    },
  },

  filters: {
    status: {
      all: 'Alle Aufgaben',
      due: 'Fällige Aufgaben',
      overdue: 'Überfällige Aufgaben',
      dueSoon: 'Bald fällig',
      upToDate: 'Aktuell',
      never: 'Nie erledigt',
    },
    sort: {
      dueDate: 'Fälligkeitsdatum',
      status: 'Status',
      name: 'Name',
    },
  },

  help: {
    tooltips: {
      due: 'Wann diese Aufgabe zur Erledigung fällig ist',
      lastDone: 'Wann diese Aufgabe zuletzt erledigt wurde',
      progress: 'Visueller Indikator der verbleibenden Zeit bis zur Fälligkeit',
      status: 'Aktueller Status der wiederkehrenden Aufgabe',
    },
    dateTooltip: (prefix: string, date: string, days?: number) => {
      if (days !== undefined) {
        if (days === 0) {
          return `${prefix}: ${date} (heute)`;
        } else if (days > 0) {
          return `${prefix}: ${date} (${days} ${days === 1 ? 'Tag' : 'Tage'})`;
        } else {
          const absDays = Math.abs(days);
          return `${prefix}: ${date} (vor ${absDays} ${absDays === 1 ? 'Tag' : 'Tagen'})`;
        }
      }
      return `${prefix}: ${date}`;
    },
  },
};
