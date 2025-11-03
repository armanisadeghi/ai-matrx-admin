// Task Sort Control Component
'use client';

import React from 'react';
import IconDropdownMenu from '@/components/official/IconDropdownMenu';
import { TASK_SORT_OPTIONS, type TaskSortField } from '../types/sort';

interface TaskSortControlProps {
  currentSort: TaskSortField;
  onSortChange: (sort: TaskSortField) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Task sort control using the official IconDropdownMenu component
 */
export default function TaskSortControl({
  currentSort,
  onSortChange,
  className,
  compact = false,
}: TaskSortControlProps) {
  // Convert task sort options to IconDropdownMenu format
  const options = TASK_SORT_OPTIONS.map(opt => ({
    value: opt.field,
    label: opt.label,
    icon: opt.icon,
  }));

  return (
    <IconDropdownMenu
      options={options}
      value={currentSort}
      onValueChange={onSortChange}
      compact={compact}
      align="end"
      className={className}
    />
  );
}

