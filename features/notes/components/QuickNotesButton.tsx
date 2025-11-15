// features/notes/components/QuickNotesButton.tsx
"use client";

import React from 'react';
import { StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuickActions } from '@/features/quick-actions/hooks/useQuickActions';

interface QuickNotesButtonProps {
    className?: string;
}

export function QuickNotesButton({ className }: QuickNotesButtonProps) {
    const { openQuickNotes } = useQuickActions();

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={className}
                        onClick={() => openQuickNotes()}
                    >
                        <StickyNote className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Quick Notes</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

