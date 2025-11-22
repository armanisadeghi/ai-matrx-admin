/**
 * Minimal VS Code-like Loading Indicator
 * 
 * Sleek, subtle loading state for diff processing
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface DiffLoadingIndicatorProps {
  message?: string;
  className?: string;
}

export const DiffLoadingIndicator: React.FC<DiffLoadingIndicatorProps> = ({
  message = 'Agent processing...',
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground', className)}>
      {/* VS Code style spinner - three dots */}
      <div className="flex gap-1">
        <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="font-mono">{message}</span>
    </div>
  );
};

