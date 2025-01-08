import React, { useEffect, useState } from 'react';
import { Plus, ArrowRightToLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import ChipSelectionContent from './ChipSelectionContent';

interface EditorChipButtonProps {
    editorId: string;
    onInsertChip: () => void;
    onConvertToChip: () => void;
    children?: React.ReactNode;
}

export const EditorChipButton: React.FC<EditorChipButtonProps> = ({
    editorId,
    onInsertChip,
    onConvertToChip,
    children
}) => {
    const [hasSelection, setHasSelection] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const editor = document.querySelector(`[data-editor-id="${editorId}"]`);
        if (!editor) return;

        const handleSelectionChange = () => {
            const selection = window.getSelection();
            const hasTextSelected = selection && 
                selection.toString().length > 0 && 
                editor.contains(selection.anchorNode);
            setHasSelection(!!hasTextSelected);
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [editorId]);

    const handleAction = () => {
        if (hasSelection) {
            onConvertToChip();
        } else {
            onInsertChip();
        }
    };

    const handleSave = (records: any[]) => {
        // Implement your save logic here
        console.log('Saving records:', records);
        setIsOpen(false);
    };

    const handleCancel = () => {
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <TooltipProvider>
                <Tooltip>
                    <DialogTrigger asChild>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleAction}
                                className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100
                                    hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                                {hasSelection ? (
                                    <ArrowRightToLine className="h-4 w-4 text-neutral-950 dark:text-neutral-50" />
                                ) : (
                                    <Plus className="h-4 w-4 text-neutral-950 dark:text-neutral-50" />
                                )}
                            </Button>
                        </TooltipTrigger>
                    </DialogTrigger>
                    <TooltipContent>
                        {hasSelection ? 'Convert Selection to Chip' : 'Insert New Chip'}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            
            <DialogContent className="sm:max-w-7xl">
                <DialogTitle>
                    {hasSelection ? 'Convert Selection to Chip' : 'Insert New Chip'}
                </DialogTitle>
                {children || (
                    <ChipSelectionContent
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};

export default EditorChipButton;