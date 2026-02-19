'use client';

import { cn } from '@/lib/utils';
import { SCRAPE_STATUS_CONFIG } from '../../constants';
import type { ScrapeStatus, TopicStatus } from '../../types';

const TOPIC_STATUS_CONFIG: Record<TopicStatus, { label: string; color: string; bgClass: string; textClass: string }> = {
    draft: { label: 'Draft', color: '#a1a1aa', bgClass: 'bg-zinc-200 dark:bg-zinc-700', textClass: 'text-zinc-700 dark:text-zinc-300' },
    active: { label: 'Active', color: '#22c55e', bgClass: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-700 dark:text-green-400' },
    paused: { label: 'Paused', color: '#eab308', bgClass: 'bg-yellow-100 dark:bg-yellow-900/30', textClass: 'text-yellow-700 dark:text-yellow-400' },
    completed: { label: 'Complete', color: '#3b82f6', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-700 dark:text-blue-400' },
    archived: { label: 'Archived', color: '#6b7280', bgClass: 'bg-gray-100 dark:bg-gray-800', textClass: 'text-gray-600 dark:text-gray-400' },
};

interface StatusBadgeProps {
    status: ScrapeStatus | TopicStatus | string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = TOPIC_STATUS_CONFIG[status as TopicStatus] ?? SCRAPE_STATUS_CONFIG[status as ScrapeStatus];
    if (!config) {
        return (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground', className)}>
                {status}
            </span>
        );
    }

    return (
        <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            config.bgClass,
            config.textClass,
            className,
        )}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.color }} />
            {config.label}
        </span>
    );
}
