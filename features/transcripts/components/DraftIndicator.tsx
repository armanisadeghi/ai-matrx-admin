'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraftIndicatorProps {
    className?: string;
    size?: 'sm' | 'md';
}

export function DraftIndicator({ className, size = 'sm' }: DraftIndicatorProps) {
    return (
        <div 
            className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
                size === 'sm' && "text-xs",
                size === 'md' && "text-sm",
                className
            )}
        >
            <Clock className={cn(
                size === 'sm' && "h-3 w-3",
                size === 'md' && "h-3.5 w-3.5"
            )} />
            <span className="font-medium">Draft</span>
        </div>
    );
}

