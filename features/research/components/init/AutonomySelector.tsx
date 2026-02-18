'use client';

import { cn } from '@/lib/utils';
import { Zap, SlidersHorizontal, Hand } from 'lucide-react';
import { AUTONOMY_CONFIG } from '../../constants';
import type { AutonomyLevel } from '../../types';

const ICON_MAP = { Zap, SlidersHorizontal, Hand } as const;

interface AutonomySelectorProps {
    value: AutonomyLevel;
    onChange: (level: AutonomyLevel) => void;
}

export function AutonomySelector({ value, onChange }: AutonomySelectorProps) {
    return (
        <div className="space-y-3">
            {(Object.entries(AUTONOMY_CONFIG) as [AutonomyLevel, typeof AUTONOMY_CONFIG[AutonomyLevel]][]).map(([level, config]) => {
                const Icon = ICON_MAP[config.icon as keyof typeof ICON_MAP];
                const isSelected = value === level;

                return (
                    <button
                        key={level}
                        onClick={() => onChange(level)}
                        className={cn(
                            'w-full rounded-xl border-2 p-4 text-left transition-colors min-h-[44px]',
                            isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/30',
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                            )}>
                                {Icon && <Icon className="h-5 w-5" />}
                            </div>
                            <div>
                                <div className="font-semibold text-sm">{config.label}</div>
                                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{config.description}</div>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
