'use client';

import { RefreshCw, Pencil, Plus, Loader2 } from 'lucide-react';
import { Button, ControlRow } from '@ai-matrx/design-system/controls';
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
        <ControlRow>
            <Button variant="outline" onClick={onAddKeywords} disabled={isLoading} icon={<Plus />}>
                <span className="hidden sm:inline">Add Keywords</span>
            </Button>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" onClick={onRebuild} disabled={isLoading} icon={isLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}>
                        <span className="hidden sm:inline">Rebuild</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs type-secondary">{ITERATION_MODE_INFO.rebuild.description}</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" onClick={onUpdate} disabled={isLoading} icon={isLoading ? <Loader2 className="animate-spin" /> : <Pencil />}>
                        <span className="hidden sm:inline">Update</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs type-secondary">{ITERATION_MODE_INFO.update.description}</TooltipContent>
            </Tooltip>
        </ControlRow>
    );
}
