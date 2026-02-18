'use client';

import { cn } from '@/lib/utils';
import { ORIGIN_CONFIG } from '../../constants';
import type { SourceOrigin } from '../../types';

interface OriginBadgeProps {
    origin: SourceOrigin;
    className?: string;
}

export function OriginBadge({ origin, className }: OriginBadgeProps) {
    const config = ORIGIN_CONFIG[origin];
    if (!config) return null;

    return (
        <span className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
            config.color,
            className,
        )}>
            {config.label}
        </span>
    );
}
