// Task Sorting Types and Utilities
import { 
  LucideIcon, 
  Clock, 
  Calendar, 
  Flag, 
  ArrowDownAZ, 
  Plus 
} from 'lucide-react';

export type TaskSortField = 
  | 'lastUpdated'
  | 'dueDate'
  | 'priority'
  | 'title'
  | 'created';

export type TaskSortDirection = 'asc' | 'desc';

export interface TaskSortOption {
  field: TaskSortField;
  label: string;
  icon: LucideIcon;
}

export interface TaskSortConfig {
  primarySort: TaskSortField;
  direction: TaskSortDirection;
}

/**
 * Available sort options for tasks
 */
export const TASK_SORT_OPTIONS: TaskSortOption[] = [
  {
    field: 'lastUpdated',
    label: 'Last Updated',
    icon: Clock,
  },
  {
    field: 'dueDate',
    label: 'Due Date',
    icon: Calendar,
  },
  {
    field: 'priority',
    label: 'Priority',
    icon: Flag,
  },
  {
    field: 'title',
    label: 'Alphabetical',
    icon: ArrowDownAZ,
  },
  {
    field: 'created',
    label: 'Date Created',
    icon: Plus,
  },
];

/**
 * Get the sort option details by field
 */
export function getSortOption(field: TaskSortField): TaskSortOption {
  return TASK_SORT_OPTIONS.find(opt => opt.field === field) || TASK_SORT_OPTIONS[0];
}

