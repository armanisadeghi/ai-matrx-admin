'use client';

import React from 'react';
import { Plus, ArrowRightToLine } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditorChipButtonProps {
    editorId: string;
    onInsertChip: () => void;
    onConvertToChip: () => void;
    hasSelection: boolean;
}

export const EditorChipButton: React.FC<EditorChipButtonProps> = ({
    onInsertChip,
    onConvertToChip,
    hasSelection
}) => {
    const handleAction = () => {
        if (hasSelection) {
            onConvertToChip();
        } else {
            onInsertChip();
        }
    };

    return (
        <Button
            variant='ghost'
            size='sm'
            onClick={handleAction}
            className='absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100
                      hover:bg-neutral-100 dark:hover:bg-neutral-800'
        >
            {hasSelection ? (
                <ArrowRightToLine className='h-4 w-4 text-neutral-950 dark:text-neutral-50' />
            ) : (
                <Plus className='h-4 w-4 text-neutral-950 dark:text-neutral-50' />
            )}
        </Button>
    );
};