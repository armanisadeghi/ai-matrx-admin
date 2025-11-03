// Task Sorting Types and Utilities

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
  description: string;
  icon?: string;
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
    description: 'Most recently modified first',
  },
  {
    field: 'dueDate',
    label: 'Due Date',
    description: 'Soonest due date first',
  },
  {
    field: 'priority',
    label: 'Priority',
    description: 'High priority first',
  },
  {
    field: 'title',
    label: 'Alphabetical',
    description: 'Sort by task name A-Z',
  },
  {
    field: 'created',
    label: 'Date Created',
    description: 'Most recently created first',
  },
];

/**
 * Get the sort option details by field
 */
export function getSortOption(field: TaskSortField): TaskSortOption {
  return TASK_SORT_OPTIONS.find(opt => opt.field === field) || TASK_SORT_OPTIONS[0];
}

