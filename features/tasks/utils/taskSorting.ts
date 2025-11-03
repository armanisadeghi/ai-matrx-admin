// Task Sorting Utilities
import type { TaskWithProject } from '../types';
import type { TaskSortField, TaskSortConfig } from '../types/sort';

/**
 * Priority order for sorting (higher number = higher priority)
 */
const PRIORITY_ORDER: Record<string, number> = {
  'high': 3,
  'medium': 2,
  'low': 1,
};

/**
 * Multi-level task sorting function
 * Applies primary sort first, then uses secondary sorts as tie-breakers
 * 
 * Default tie-breaker order:
 * 1. Primary sort (user selected)
 * 2. Last Updated (most recent first)
 * 3. Due Date (soonest first, null dates go to end)
 * 4. Priority (highest first, null priorities go to end)
 * 5. Title (alphabetical)
 */
export function sortTasks(
  tasks: TaskWithProject[],
  config: TaskSortConfig
): TaskWithProject[] {
  const { primarySort } = config;
  
  return [...tasks].sort((a, b) => {
    // 1. Apply primary sort
    const primaryResult = compareTasks(a, b, primarySort);
    if (primaryResult !== 0) return primaryResult;
    
    // 2. Apply tie-breakers in order (skip if it's the primary sort)
    const tieBreakers = (['lastUpdated', 'dueDate', 'priority', 'title'] as TaskSortField[])
      .filter(field => field !== primarySort);
    
    for (const field of tieBreakers) {
      const result = compareTasks(a, b, field);
      if (result !== 0) return result;
    }
    
    return 0;
  });
}

/**
 * Compare two tasks based on a specific field
 * Returns: negative if a < b, positive if a > b, 0 if equal
 */
function compareTasks(
  a: TaskWithProject,
  b: TaskWithProject,
  field: TaskSortField
): number {
  switch (field) {
    case 'lastUpdated':
      return compareLastUpdated(a, b);
    
    case 'dueDate':
      return compareDueDate(a, b);
    
    case 'priority':
      return comparePriority(a, b);
    
    case 'title':
      return compareTitle(a, b);
    
    case 'created':
      return compareCreated(a, b);
    
    default:
      return 0;
  }
}

/**
 * Compare by last updated date (most recent first)
 */
function compareLastUpdated(a: TaskWithProject, b: TaskWithProject): number {
  const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  return bTime - aTime; // Most recent first (descending)
}

/**
 * Compare by due date (soonest first)
 * Tasks without due dates go to the end
 */
function compareDueDate(a: TaskWithProject, b: TaskWithProject): number {
  // If both have no due date, they're equal
  if (!a.dueDate && !b.dueDate) return 0;
  
  // Tasks with due dates come before tasks without
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  
  // Compare dates - earlier dates first (ascending)
  const aTime = new Date(a.dueDate).getTime();
  const bTime = new Date(b.dueDate).getTime();
  return aTime - bTime;
}

/**
 * Compare by priority (high to low)
 * Tasks without priority go to the end
 */
function comparePriority(a: TaskWithProject, b: TaskWithProject): number {
  // If both have no priority, they're equal
  if (!a.priority && !b.priority) return 0;
  
  // Tasks with priority come before tasks without
  if (!a.priority) return 1;
  if (!b.priority) return -1;
  
  // Compare priority levels (higher priority first - descending)
  const aPriority = PRIORITY_ORDER[a.priority] || 0;
  const bPriority = PRIORITY_ORDER[b.priority] || 0;
  return bPriority - aPriority;
}

/**
 * Compare by title (alphabetical A-Z)
 */
function compareTitle(a: TaskWithProject, b: TaskWithProject): number {
  return a.title.localeCompare(b.title, undefined, { 
    sensitivity: 'base',
    numeric: true 
  });
}

/**
 * Compare by creation date (most recent first)
 * Falls back to ID comparison if dates unavailable
 */
function compareCreated(a: TaskWithProject, b: TaskWithProject): number {
  // For now, use ID comparison as proxy for creation order
  // If created_at is added to the Task type, use that instead
  return b.id.localeCompare(a.id);
}

