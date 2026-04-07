'use client';

import { Folder } from 'lucide-react';
import * as icons from 'lucide-react';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectEntityScopesWithLabels } from '../redux/scope';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

type LucideIcon = React.ComponentType<{ className?: string }>;

function resolveIcon(name: string): LucideIcon {
    const pascalName = name
        .split(/[-_\s]+/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
    const Icon = (icons as Record<string, LucideIcon>)[pascalName];
    return Icon ?? Folder;
}

interface ScopeTagsDisplayProps {
    entityType: string;
    entityId: string;
    className?: string;
}

export function ScopeTagsDisplay({ entityType, entityId, className }: ScopeTagsDisplayProps) {
    const labels = useAppSelector((state) => selectEntityScopesWithLabels(state, entityType, entityId));

    if (labels.length === 0) return null;

    return (
        <div className={cn('flex flex-wrap gap-1', className)}>
            {labels.map((label) => {
                const Icon = resolveIcon(label.type_icon);
                return (
                    <Badge
                        key={label.assignment_id}
                        variant="outline"
                        className="gap-1 text-xs font-medium"
                        style={{
                            borderColor: label.type_color,
                            color: label.type_color,
                        }}
                    >
                        <Icon className="h-3 w-3" />
                        <span>{label.scope_name}</span>
                    </Badge>
                );
            })}
        </div>
    );
}
