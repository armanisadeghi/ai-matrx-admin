// ChipButtons.tsx
import React from 'react';
import { Plus, ArrowRightToLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChipButtonsProps {
    onInsertChip: () => void;
    onConvertToChip: () => void;
}

export const ChipButtons: React.FC<ChipButtonsProps> = ({ onInsertChip, onConvertToChip }) => {
    return (
        <div className="flex items-center gap-1">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onInsertChip}
                            className="h-8 w-8 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                            <Plus className="h-4 w-4 text-neutral-950 dark:text-neutral-50" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Insert New Chip</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onConvertToChip}
                            className="h-8 w-8 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                            <ArrowRightToLine className="h-4 w-4 text-neutral-950 dark:text-neutral-50" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Convert Selection to Chip</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
};

export default ChipButtons;