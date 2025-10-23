// features/notes/components/QuickCaptureButton.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus } from 'lucide-react';
import { QuickSaveModal } from './QuickSaveModal';

interface QuickCaptureButtonProps {
    defaultContent?: string;
    defaultFolder?: string;
    variant?: 'default' | 'outline' | 'ghost' | 'secondary';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    label?: string;
    className?: string;
    onSaved?: () => void;
}

/**
 * Button that opens QuickSaveModal for quick content capture
 * Great for toolbar buttons or floating action buttons
 */
export function QuickCaptureButton({
    defaultContent = '',
    defaultFolder = 'Scratch',
    variant = 'default',
    size = 'default',
    label = 'Quick Note',
    className,
    onSaved,
}: QuickCaptureButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={variant}
                            size={size}
                            onClick={() => setIsOpen(true)}
                            className={className}
                        >
                            <Plus className="h-4 w-4" />
                            {size !== 'icon' && label && (
                                <span className="ml-2">{label}</span>
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        Create quick note
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <QuickSaveModal
                open={isOpen}
                onOpenChange={setIsOpen}
                initialContent={defaultContent}
                defaultFolder={defaultFolder}
                onSaved={onSaved}
            />
        </>
    );
}

