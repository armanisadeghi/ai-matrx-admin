// Task Sort Control Component
'use client';

import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TASK_SORT_OPTIONS, getSortOption, type TaskSortField } from '../types/sort';
import { cn } from '@/lib/utils';

interface TaskSortControlProps {
  currentSort: TaskSortField;
  onSortChange: (sort: TaskSortField) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Reusable sort control component for tasks
 * Displays icon-only button with elegant iOS-style dropdown menu
 */
export default function TaskSortControl({
  currentSort,
  onSortChange,
  className,
  compact = false,
}: TaskSortControlProps) {
  const currentOption = getSortOption(currentSort);
  const CurrentIcon = currentOption.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? 'sm' : 'default'}
          className={cn('gap-1.5', className)}
        >
          <CurrentIcon size={compact ? 14 : 16} />
          <ChevronDown size={compact ? 12 : 14} className="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl p-1">
        {TASK_SORT_OPTIONS.map((option) => {
          const isSelected = option.field === currentSort;
          const OptionIcon = option.icon;
          
          return (
            <DropdownMenuItem
              key={option.field}
              onClick={() => onSortChange(option.field)}
              className={cn(
                "flex items-center gap-3 cursor-pointer rounded-lg py-2.5 px-3 transition-colors",
                isSelected && "bg-blue-50 dark:bg-blue-950/30"
              )}
            >
              <OptionIcon 
                size={16} 
                className={cn(
                  "flex-shrink-0",
                  isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                )}
              />
              <span className={cn(
                "text-sm flex-1 leading-tight",
                isSelected ? "font-medium text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
              )}>
                {option.label}
              </span>
              {isSelected && (
                <Check size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

