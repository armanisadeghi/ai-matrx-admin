// Task Sort Control Component
'use client';

import React from 'react';
import { IconDropdownMenu } from "@ai-matrx/design-system/controls";
import { TASK_SORT_OPTIONS, type TaskSortField } from '../types/sort';

interface TaskSortControlProps {
  currentSort: TaskSortField;
  onSortChange: (sort: TaskSortField) => void;
  className?: string;
}

/**
 * Task sort control using the official IconDropdownMenu component
 */
export default function TaskSortControl({
  currentSort,
  onSortChange,
  className,
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
      align="end"
      className={className}
    />
  );
}

