import { TFile } from 'obsidian';

// Generic file interface that can handle both TFile and Dataview file objects
export interface FileInfo {
  name: string;
  path: string;
  basename?: string;
  extension?: string;
  stat?: {
    ctime: number;
    mtime: number;
    size: number;
  };
}

export interface UpkeepTask {
  file: TFile;
  last_done?: string;
  interval: number;
  interval_unit: string;
  type?: string;
  tags?: string[];
  [key: string]: any;
}

export interface TaskStatus {
  status: string;
  daysRemaining: number;
  calculatedNextDue: string | null;
}

export interface ProcessedTask extends UpkeepTask, TaskStatus {}

export interface FilterQuery {
  status?: ('all' | 'overdue' | 'up-to-date') | ('all' | 'overdue' | 'up-to-date')[];
  tag?: string | string[];
  interval?: string | string[];
  limit?: number;
  sort?: 'due-date' | 'status' | 'name';
}

export interface DateFormatOptions {
  weekday?: 'short' | 'long';
  year?: 'numeric' | '2-digit';
  month?: 'short' | 'long' | 'numeric' | '2-digit';
  day?: 'numeric' | '2-digit';
}

export interface MarkCompleteResult {
  success: boolean;
  today?: string;
  error?: string;
}