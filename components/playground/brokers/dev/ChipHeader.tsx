import React from 'react';
import { Button } from '@/components/ui';
import { X, ArrowUpRight, Database, CloudOff, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/utils';
import { ChipData } from '@/types/editor.types';
import { TailwindColor } from '@/constants/rich-text-constants';

interface ChipHeaderProps {
    chip: ChipData;
    color?: TailwindColor;
    status: 'disconnected' | 'notFetched' | 'error';
    isOpen: boolean;
    onToggle: () => void;
    onDelete?: () => void;
}

const ChipHeader: React.FC<ChipHeaderProps> = ({
    chip,
    color = 'blue',
    status,
    isOpen,
    onToggle,
    onDelete
}) => {
    const getStatusClasses = () => {
        return cn(
            'h-6 w-6 flex items-center justify-center rounded-md relative',
            'transition-all duration-300 ease-in-out'
        );
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'disconnected':
                return <CloudOff className={getIconClasses('text-muted-foreground/50')} />;
            case 'notFetched':
                return <Database className={getIconClasses('text-yellow-500 dark:text-yellow-400')} />;
            case 'error':
                return <ArrowUpRight className={getIconClasses('text-red-500 dark:text-red-400')} />;
        }
    };

    const getIconClasses = (colorClass: string) => {
        return cn(
            'h-4 w-4 transition-all duration-300',
            colorClass,
            'drop-shadow-[0_0_3px_rgba(0,0,0,0.2)]'
        );
    };

    return (
        <div
            className='group flex items-center gap-2 p-2 cursor-pointer hover:bg-elevation3/50 transition-colors'
            onClick={onToggle}
        >
            {onDelete && (
                <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 hover:bg-destructive/10 hover:text-destructive shrink-0'
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                >
                    <X className='h-4 w-4' />
                </Button>
            )}

            <div className='flex items-center gap-2 min-w-0 flex-1'>
                <span className='font-medium text-sm truncate'>
                    {chip.label || 'Unnamed Chip'}
                </span>
            </div>

            <div className='flex items-center gap-2 flex-shrink-0'>
                <div
                    className={getStatusClasses()}
                    title={`Status: ${status}`}
                >
                    {getStatusIcon()}
                </div>

                {isOpen ? (
                    <ChevronUp className='h-4 w-4' />
                ) : (
                    <ChevronDown className='h-4 w-4' />
                )}
            </div>
        </div>
    );
};

export default ChipHeader;