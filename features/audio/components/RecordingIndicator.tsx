/**
 * Recording Indicator Component
 * 
 * Visual indicator that shows recording is in progress with duration
 */

'use client';

import React from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RecordingIndicatorProps {
  duration: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export function RecordingIndicator({
  duration,
  className,
  size = 'md',
  showPulse = true,
}: RecordingIndicatorProps) {
  
  // Size configurations
  const sizeConfig = {
    sm: {
      icon: 'h-3 w-3',
      dot: 'h-2 w-2',
      text: 'text-xs',
    },
    md: {
      icon: 'h-4 w-4',
      dot: 'h-3 w-3',
      text: 'text-sm',
    },
    lg: {
      icon: 'h-5 w-5',
      dot: 'h-4 w-4',
      text: 'text-base',
    },
  };

  const config = sizeConfig[size];

  // Format duration
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const formattedDuration = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Pulsing red dot */}
      <div className="relative flex items-center justify-center">
        <div className={cn(
          config.dot,
          'rounded-full bg-red-500',
          showPulse && 'animate-pulse'
        )} />
        {showPulse && (
          <div className={cn(
            config.dot,
            'absolute rounded-full bg-red-500 animate-ping'
          )} />
        )}
      </div>
      
      {/* Recording text */}
      <div className="flex items-center gap-1.5">
        <Mic className={cn(config.icon, 'text-red-600 dark:text-red-400')} />
        <span className={cn(config.text, 'text-red-600 dark:text-red-400 font-medium')}>
          Recording
        </span>
        <span className={cn(config.text, 'text-gray-600 dark:text-gray-400 font-mono')}>
          {formattedDuration}
        </span>
      </div>
    </div>
  );
}

