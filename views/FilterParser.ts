import { FilterQuery, ProcessedTask } from '../types';

export class FilterParser {
  static parse(query: string): FilterQuery {
    const filter: FilterQuery = {};

    if (!query || query.trim() === '') {
      return filter;
    }

    const lines = query.trim().split('\n').map(line => line.trim()).filter(line => line);

    for (const line of lines) {
      if (line.includes(':')) {
        // Handle key:value pairs, potentially with OR logic
        this.parseKeyValueLine(line, filter);
      } else {
        // Handle simple status keywords, potentially with OR logic
        this.parseSimpleStatusLine(line, filter);
      }
    }

    return filter;
  }

  private static parseKeyValueLine(line: string, filter: FilterQuery): void {
    // Check if the line contains OR logic
    if (line.toUpperCase().includes(' OR ')) {
      // Split by OR and process each part
      const orParts = line.split(/\s+OR\s+/i).map(part => part.trim());

      for (const part of orParts) {
        if (part.includes(':')) {
          const [key, value] = part.split(':').map(s => s.trim());
          this.addFilterValue(key.toLowerCase(), value, filter);
        }
      }
    } else {
      // Single key:value pair
      const [key, value] = line.split(':').map(s => s.trim());
      this.addFilterValue(key.toLowerCase(), value, filter);
    }
  }

  private static parseSimpleStatusLine(line: string, filter: FilterQuery): void {
    // Check if the line contains OR logic for simple status keywords
    if (line.toUpperCase().includes(' OR ')) {
      const orParts = line.split(/\s+OR\s+/i).map(part => part.trim());

      for (const part of orParts) {
        this.addSimpleStatus(part.toLowerCase(), filter);
      }
    } else {
      this.addSimpleStatus(line.toLowerCase(), filter);
    }
  }

  private static addFilterValue(key: string, value: string, filter: FilterQuery): void {
    switch (key) {
      case 'status':
        if (['all', 'due', 'overdue', 'due-soon', 'up-to-date', 'never'].includes(value)) {
          this.addToFilterArray(filter, 'status', value as any);
        }
        break;
      case 'tag':
        this.addToFilterArray(filter, 'tag', value);
        break;
      case 'interval':
        this.addToFilterArray(filter, 'interval', value);
        break;
      case 'limit':
        const limitNum = parseInt(value, 10);
        if (!isNaN(limitNum) && limitNum > 0) {
          filter.limit = limitNum;
        }
        break;
      case 'sort':
        if (['due-date', 'status', 'name'].includes(value)) {
          filter.sort = value as FilterQuery['sort'];
        }
        break;
    }
  }

  private static addSimpleStatus(status: string, filter: FilterQuery): void {
    switch (status) {
      case 'due':
      case 'overdue':
      case 'due-soon':
      case 'up-to-date':
      case 'never':
      case 'all':
        this.addToFilterArray(filter, 'status', status as any);
        break;
    }
  }

  private static addToFilterArray<K extends keyof FilterQuery>(
    filter: FilterQuery,
    key: K,
    value: any
  ): void {
    const currentValue = filter[key];

    if (currentValue === undefined) {
      filter[key] = value as any;
    } else if (Array.isArray(currentValue)) {
      if (!currentValue.includes(value)) {
        currentValue.push(value);
      }
    } else {
      if (currentValue !== value) {
        filter[key] = [currentValue, value] as any;
      }
    }
  }

  static apply(tasks: ProcessedTask[], filter: FilterQuery): ProcessedTask[] {
    let filteredTasks = [...tasks];

    // Apply status filter with OR logic
    if (filter.status) {
      const statusValues = Array.isArray(filter.status) ? filter.status : [filter.status];

      if (!statusValues.includes('all')) {
        filteredTasks = filteredTasks.filter(task => {
          return statusValues.some(status => {
            switch (status) {
              case 'due':
                return task.daysRemaining === 0;
              case 'overdue':
                return task.daysRemaining < 0;
              case 'due-soon':
                return task.daysRemaining > 0 && task.daysRemaining <= 7;
              case 'up-to-date':
                return task.daysRemaining > 7;
              case 'never':
                return task.daysRemaining === -9999;
              default:
                return false;
            }
          });
        });
      }
    }

    // Apply tag filter with OR logic
    if (filter.tag) {
      const tagValues = Array.isArray(filter.tag) ? filter.tag : [filter.tag];

      filteredTasks = filteredTasks.filter(task => {
        const taskTags = task.tags || [];
        return tagValues.some(tagFilter =>
          taskTags.some((tag: string) => tag.includes(tagFilter))
        );
      });
    }

    // Apply interval filter with OR logic
    if (filter.interval) {
      const intervalValues = Array.isArray(filter.interval) ? filter.interval : [filter.interval];

      filteredTasks = filteredTasks.filter(task => {
        return intervalValues.some(intervalFilter =>
          task.interval_unit.toLowerCase().includes(intervalFilter.toLowerCase())
        );
      });
    }

    // Apply sorting
    if (filter.sort) {
      switch (filter.sort) {
        case 'name':
          filteredTasks.sort((a, b) => a.file.name.localeCompare(b.file.name));
          break;
        case 'status':
          filteredTasks.sort((a, b) => {
            const statusOrder = { 'overdue': 0, 'due': 1, 'due-soon': 2, 'up-to-date': 3, 'never': 4 };
            const aOrder = statusOrder[a.status.includes('Overdue') ? 'overdue' :
                                       a.status.includes('Due today') ? 'due' :
                                       a.status.includes('Due in') ? 'due-soon' :
                                       a.status.includes('Never') ? 'never' : 'up-to-date'] || 5;
            const bOrder = statusOrder[b.status.includes('Overdue') ? 'overdue' :
                                       b.status.includes('Due today') ? 'due' :
                                       b.status.includes('Due in') ? 'due-soon' :
                                       b.status.includes('Never') ? 'never' : 'up-to-date'] || 5;
            return aOrder - bOrder;
          });
          break;
        case 'due-date':
        default:
          filteredTasks.sort((a, b) => {
            if (!a.calculatedNextDue && b.calculatedNextDue) return -1;
            if (a.calculatedNextDue && !b.calculatedNextDue) return 1;
            if (!a.calculatedNextDue && !b.calculatedNextDue) return 0;

            const dateA = new Date(a.calculatedNextDue!);
            const dateB = new Date(b.calculatedNextDue!);

            return dateA.getTime() - dateB.getTime();
          });
          break;
      }
    }

    // Apply limit
    if (filter.limit && filter.limit > 0) {
      filteredTasks = filteredTasks.slice(0, filter.limit);
    }

    return filteredTasks;
  }
}
