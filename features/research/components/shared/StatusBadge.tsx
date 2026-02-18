'use client';

import { cn } from '@/lib/utils';
import { SCRAPE_STATUS_CONFIG } from '../../constants';
import type { ScrapeStatus } from '../../types';

interface StatusBadgeProps {
    status: ScrapeStatus;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = SCRAPE_STATUS_CONFIG[status];
    if (!config) return null;

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
