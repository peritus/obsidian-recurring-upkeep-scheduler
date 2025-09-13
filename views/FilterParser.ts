import { FilterQuery, ProcessedTask } from '../types';

// Type for valid status values
type ValidStatus = 'all' | 'due' | 'overdue' | 'due-soon' | 'up-to-date' | 'never';

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
    return ['all', 'due', 'overdue', 'due-soon', 'up-to-date', 'never'].includes(value);
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
    const currentValue = filter[key];

    if (currentValue === undefined) {
      // TypeScript assertion here is safe because we know the value matches the expected type
      (filter[key] as any) = value;
    } else if (Array.isArray(currentValue)) {
      if (!currentValue.includes(value as any)) {
        currentValue.push(value as any);
      }
    } else {
      if (currentValue !== value) {
        // TypeScript assertion here is safe because we're creating a valid array
        (filter[key] as any) = [currentValue, value];
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
            const statusOrder: Record<string, number> = { 
              'overdue': 0, 
              'due': 1, 
              'due-soon': 2, 
              'up-to-date': 3, 
              'never': 4 
            };
            
            const getStatusCategory = (status: string): string => {
              if (status.includes('Overdue')) return 'overdue';
              if (status.includes('Due today')) return 'due';
              if (status.includes('Due in')) return 'due-soon';
              if (status.includes('Never')) return 'never';
              return 'up-to-date';
            };
            
            const aOrder = statusOrder[getStatusCategory(a.status)] ?? 5;
            const bOrder = statusOrder[getStatusCategory(b.status)] ?? 5;
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
