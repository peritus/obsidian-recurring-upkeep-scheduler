import { FilterQuery, ProcessedTask } from '../types';

// Type for valid status values
type ValidStatus = 'all' | 'overdue' | 'up-to-date';

// Type for valid sort values  
type ValidSort = 'due-date' | 'status' | 'name';

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
        if (this.isValidStatus(value)) {
          this.addToFilterArray(filter, 'status', value);
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
        if (this.isValidSort(value)) {
          filter.sort = value;
        }
        break;
    }
  }

  private static isValidStatus(value: string): value is ValidStatus {
    return ['all', 'overdue', 'up-to-date'].includes(value);
  }

  private static isValidSort(value: string): value is ValidSort {
    return ['due-date', 'status', 'name'].includes(value);
  }

  private static addSimpleStatus(status: string, filter: FilterQuery): void {
    if (this.isValidStatus(status)) {
      this.addToFilterArray(filter, 'status', status);
    }
  }

  private static addToFilterArray<K extends keyof FilterQuery>(
    filter: FilterQuery,
    key: K,
    value: NonNullable<FilterQuery[K]> extends (infer U)[] ? U : NonNullable<FilterQuery[K]>
  ): void {
    // Handle each property type-safely
    if (key === 'status') {
      this.addStatusToFilter(filter, value as 'all' | 'overdue' | 'up-to-date');
    } else if (key === 'tag') {
      this.addTagToFilter(filter, value as string);
    } else if (key === 'interval') {
      this.addIntervalToFilter(filter, value as string);
    }
  }

  private static addStatusToFilter(filter: FilterQuery, value: 'all' | 'overdue' | 'up-to-date'): void {
    if (filter.status === undefined) {
      filter.status = value;
      return;
    }
    
    if (Array.isArray(filter.status)) {
      if (!filter.status.includes(value)) {
        filter.status.push(value);
      }
      return;
    }
    
    if (filter.status !== value) {
      filter.status = [filter.status, value];
    }
  }

  private static addTagToFilter(filter: FilterQuery, value: string): void {
    if (filter.tag === undefined) {
      filter.tag = value;
      return;
    }
    
    if (Array.isArray(filter.tag)) {
      if (!filter.tag.includes(value)) {
        filter.tag.push(value);
      }
      return;
    }
    
    if (filter.tag !== value) {
      filter.tag = [filter.tag, value];
    }
  }

  private static addIntervalToFilter(filter: FilterQuery, value: string): void {
    if (filter.interval === undefined) {
      filter.interval = value;
      return;
    }
    
    if (Array.isArray(filter.interval)) {
      if (!filter.interval.includes(value)) {
        filter.interval.push(value);
      }
      return;
    }
    
    if (filter.interval !== value) {
      filter.interval = [filter.interval, value];
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
              case 'overdue':
                return task.daysRemaining < 0;
              case 'up-to-date':
                return task.daysRemaining >= 0;
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
            const statusOrder: Record<string, number> = { 
              'overdue': 0, 
              'up-to-date': 1 
            };
            
            // Determine status category directly from task properties instead of parsing text
            const getStatusCategory = (task: ProcessedTask): string => {
              if (task.daysRemaining < 0) return 'overdue';
              return 'up-to-date';
            };
            
            const aOrder = statusOrder[getStatusCategory(a)] ?? 2;
            const bOrder = statusOrder[getStatusCategory(b)] ?? 2;
            return aOrder - bOrder;
          });
          break;
        case 'due-date':
        default:
          filteredTasks.sort((a, b) => {
            if (!a.calculatedNextDue && b.calculatedNextDue) return -1;
            if (a.calculatedNextDue && !b.calculatedNextDue) return 1;
            if (!a.calculatedNextDue && !b.calculatedNextDue) return 0;

            // Safe null check before creating Date objects - use non-null assertion since we checked above
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
