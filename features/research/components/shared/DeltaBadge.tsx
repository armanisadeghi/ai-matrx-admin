'use client';

import { cn } from '@/lib/utils';

type DeltaType = 'new' | 'changed' | 'stale';

interface DeltaBadgeProps {
    type: DeltaType;
    className?: string;
}

const CONFIG: Record<DeltaType, { label: string; classes: string }> = {
    new: { label: 'New', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    changed: { label: 'Changed', classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    stale: { label: 'Stale', classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

export function DeltaBadge({ type, className }: DeltaBadgeProps) {
    const config = CONFIG[type];
    return (
        <span className={cn(
            'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            config.classes,
            className,
        )}>
            {config.label}
        </span>
    );
}
