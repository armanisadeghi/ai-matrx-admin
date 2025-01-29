import React from 'react';
import { Button } from '@/components/ui';
import { X, CheckCircle2, XCircle, ChevronUp, ChevronDown, Frown } from 'lucide-react';
import { cn } from '@/utils';
import { MatrxRecordId } from '@/types';
import { TailwindColor, COLOR_STYLES } from '@/features/rich-text-editor/constants';
import { ChipData } from '@/features/rich-text-editor/types/editor.types';
import { findChipsByBrokerIdGlobal } from '@/features/rich-text-editor/utils/chipFilnder';

interface BrokerRecord {
    name?: string;
    defaultComponent?: string;
    defaultSource?: string;
    isConnected?: boolean;
}

interface BrokerCardHeaderProps {
    recordId: MatrxRecordId;
    record: BrokerRecord;
    chips: ChipData[];
    color?: TailwindColor;
    isConnected?: boolean;
    isOpen: boolean;
    onToggle: () => void;
    onDelete: () => void;
}

const BrokerCardHeader: React.FC<BrokerCardHeaderProps> = ({ recordId, record, chips, color = 'blue', isConnected, isOpen, onToggle, onDelete }) => {
    const name = record?.name || 'Unnamed Broker';
    const hasChips = findChipsByBrokerIdGlobal(recordId).length > 0;


    const getStatusClasses = () => {
        return cn('h-6 w-6 flex items-center justify-center rounded-md relative', 'transition-all duration-300 ease-in-out');
    };


    const isConnectedClass = 'h-4 w-4 transition-all duration-300 text-emerald-600 dark:text-emerald-500 drop-shadow-[0_0_3px_rgba(16,185,129,0.3)] group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]'
    const missingChipsClass = 'h-4 w-4 transition-all duration-300 text-orange-600 dark:text-orange-500 drop-shadow-[0_0_3px_rgba(16,185,129,0.3)] group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]'
    const isDisconnectedClass = 'h-4 w-4 text-muted-foreground/50 transition-all duration-300';


    const getIconClasses = (isConnected: boolean) => {
        if (isConnected) {
            return cn(
                'h-4 w-4 transition-all duration-300 text-emerald-600 dark:text-emerald-500 drop-shadow-[0_0_3px_rgba(16,185,129,0.3)] group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]'
            );
        }
        return 'h-4 w-4 text-muted-foreground/50 transition-all duration-300';
    };

    return (
        <div
            className='group flex items-center gap-2 p-2 cursor-pointer hover:bg-elevation3/50 transition-colors'
            onClick={onToggle}
        >
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

            <div className='flex items-center gap-2 min-w-0 flex-1'>
                <span className='font-medium text-sm truncate'>{name}</span>
            </div>

            <div className='flex items-center gap-2 flex-shrink-0'>
                <div
                    className={getStatusClasses()}
                    title={isConnected ? 'Connected' : 'Disconnected'}
                >
                    {isConnected ? (
                        hasChips ? (
                            <CheckCircle2 className={isConnectedClass} />
                        ) : (
                            <Frown className={missingChipsClass} />
                        )
                    ) : (
                        <XCircle className={isDisconnectedClass} />
                    )}
                </div>

                {isOpen ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />}
            </div>
        </div>
    );
};

export default BrokerCardHeader;
