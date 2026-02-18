'use client';

import { RefreshCw, Pencil, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ITERATION_MODE_INFO } from '../../constants';

interface IterationControlsProps {
    onRebuild: () => void;
    onUpdate: () => void;
    onAddKeywords: () => void;
    isLoading: boolean;
}

export function IterationControls({ onRebuild, onUpdate, onAddKeywords, isLoading }: IterationControlsProps) {
    return (
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onAddKeywords} disabled={isLoading} className="gap-2 min-h-[44px] sm:min-h-0">
                <Plus className="h-4 w-4" />
                Add Keywords
            </Button>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={onRebuild} disabled={isLoading} className="gap-2 min-h-[44px] sm:min-h-0">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Rebuild
                    </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{ITERATION_MODE_INFO.rebuild.description}</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={onUpdate} disabled={isLoading} className="gap-2 min-h-[44px] sm:min-h-0">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                        Update
                    </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{ITERATION_MODE_INFO.update.description}</TooltipContent>
            </Tooltip>
        </div>
    );
}
