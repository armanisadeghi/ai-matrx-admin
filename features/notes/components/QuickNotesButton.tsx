// features/notes/components/QuickNotesButton.tsx
"use client";

import React, { useState } from 'react';
import { StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import FloatingSheet from '@/components/ui/matrx/FloatingSheet';
import { QuickNotesSheet } from './QuickNotesSheet';

interface QuickNotesButtonProps {
    className?: string;
}

export function QuickNotesButton({ className }: QuickNotesButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={className}
                            onClick={() => setIsOpen(true)}
                        >
                            <StickyNote className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Quick Notes</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <FloatingSheet
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Quick Notes"
                description="Quickly capture or retrieve notes without losing focus"
                position="right"
                width="xl"
                height="full"
                closeOnBackdropClick={true}
                closeOnEsc={true}
                showCloseButton={true}
            >
                <QuickNotesSheet onClose={() => setIsOpen(false)} />
            </FloatingSheet>
        </>
    );
}

