/**
 * Audio Level Indicator Component
 * 
 * Visual feedback showing real-time audio input levels
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface AudioLevelIndicatorProps {
  level: number; // 0-100
  className?: string;
  barCount?: number;
  color?: 'blue' | 'purple' | 'green';
}

export function AudioLevelIndicator({
  level,
  className,
  barCount = 5,
  color = 'blue',
}: AudioLevelIndicatorProps) {
  
  // Color configurations
  const colorConfig = {
    blue: {
      inactive: 'bg-blue-200 dark:bg-blue-900/30',
      active: 'bg-blue-500 dark:bg-blue-400',
    },
    purple: {
      inactive: 'bg-purple-200 dark:bg-purple-900/30',
      active: 'bg-purple-500 dark:bg-purple-400',
    },
    green: {
      inactive: 'bg-green-200 dark:bg-green-900/30',
      active: 'bg-green-500 dark:bg-green-400',
    },
  };

  const colors = colorConfig[color];
  
  // Calculate how many bars should be active
  const activeBars = Math.ceil((level / 100) * barCount);

  return (
    <div className={cn('flex items-end gap-0.5', className)}>
      {Array.from({ length: barCount }).map((_, index) => {
        const isActive = index < activeBars;
        const height = ((index + 1) / barCount) * 100;
        
        return (
          <div
            key={index}
            className={cn(
              'w-1 rounded-full transition-all duration-75',
              isActive ? colors.active : colors.inactive
            )}
            style={{ 
              height: `${height}%`,
              maxHeight: '20px',
            }}
          />
        );
      })}
    </div>
  );
}

