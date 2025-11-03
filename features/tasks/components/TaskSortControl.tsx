// Task Sort Control Component
'use client';

import React from 'react';
import { ArrowUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TASK_SORT_OPTIONS, type TaskSortField } from '../types/sort';
import { cn } from '@/lib/utils';

interface TaskSortControlProps {
  currentSort: TaskSortField;
  onSortChange: (sort: TaskSortField) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Reusable sort control component for tasks
 * Displays a dropdown menu with available sort options
 */
export default function TaskSortControl({
  currentSort,
  onSortChange,
  className,
  compact = false,
}: TaskSortControlProps) {
  const currentOption = TASK_SORT_OPTIONS.find(opt => opt.field === currentSort);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? 'sm' : 'default'}
          className={cn('gap-2', className)}
        >
          <ArrowUpDown size={compact ? 14 : 16} />
          {!compact && <span>{currentOption?.label || 'Sort'}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
          Sort by
        </div>
        {TASK_SORT_OPTIONS.map((option) => {
          const isSelected = option.field === currentSort;
          
          return (
            <DropdownMenuItem
              key={option.field}
              onClick={() => onSortChange(option.field)}
              className="flex items-start gap-2 cursor-pointer"
            >
              <div className="flex items-center justify-center w-4 h-4 mt-0.5">
                {isSelected && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
        <div className="px-2 py-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 mt-1">
          Secondary sorts apply as tie-breakers
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

