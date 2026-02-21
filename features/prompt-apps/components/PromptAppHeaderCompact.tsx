'use client';

import { Eye, Code2, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PromptAppMode = 'view' | 'edit' | 'run';

interface PromptAppHeaderCompactProps {
    mode: PromptAppMode;
    onModeChange: (mode: PromptAppMode) => void;
    isSaving?: boolean;
    onAIEdit?: () => void;
}

export function PromptAppHeaderCompact({ mode, onModeChange, isSaving, onAIEdit }: PromptAppHeaderCompactProps) {
    return (
        <div className="inline-flex items-center gap-2">
            <div className="inline-flex p-0.5 rounded-lg bg-muted/50 border border-border/50 gap-0.5">
                <Button
                    variant={mode === 'view' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onModeChange('view')}
                    className={cn('h-7 px-2.5 text-xs transition-all', mode === 'view' && 'shadow-sm')}
                >
                    <Eye className="w-3.5 h-3.5 mr-0 sm:mr-1.5" />
                    <span className="hidden sm:inline">View</span>
                </Button>
                <Button
                    variant={mode === 'edit' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onModeChange('edit')}
                    disabled={isSaving}
                    className={cn('h-7 px-2.5 text-xs transition-all', mode === 'edit' && 'shadow-sm')}
                >
                    <Code2 className="w-3.5 h-3.5 mr-0 sm:mr-1.5" />
                    <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                    variant={mode === 'run' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onModeChange('run')}
                    className={cn('h-7 px-2.5 text-xs transition-all', mode === 'run' && 'shadow-sm')}
                >
                    <Play className="w-3.5 h-3.5 mr-0 sm:mr-1.5" />
                    <span className="hidden sm:inline">Run</span>
                </Button>
            </div>
            {onAIEdit && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onAIEdit}
                    disabled={isSaving}
                    className="h-7 px-2.5 text-xs border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
                >
                    <Sparkles className="w-3.5 h-3.5 mr-0 sm:mr-1.5 text-primary" />
                    <span className="hidden sm:inline">AI Edit</span>
                </Button>
            )}
        </div>
    );
}
