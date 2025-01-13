import { useCallback } from 'react';
import { EntityKeys } from '@/types/entityTypes';
import ConfirmationDialog from './ConfirmationDialog';
import { useAppSelector } from '@/lib/redux/hooks';
import { useEntityTools } from '@/lib/redux';
import { useCreateRecord } from '@/app/entities/hooks/unsaved-records/useCreateRecord';
import { formatFieldValue } from './utils';

interface SmartCreateConfirmationProps {
    entityKey: EntityKeys;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SmartCreateConfirmation = ({ entityKey, open, onOpenChange }: SmartCreateConfirmationProps) => {
    const { selectors } = useEntityTools(entityKey);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const comparison = useAppSelector(state => 
        selectors.selectChangeComparisonById(state, activeRecordId)
    );
    const { createRecord } = useCreateRecord(entityKey);

    const handleConfirm = useCallback(() => {
        if (!activeRecordId) return;
        createRecord(activeRecordId);
        onOpenChange(false);
    }, [activeRecordId, createRecord, onOpenChange]);

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title='Create New Record'
            onConfirm={handleConfirm}
            onCancel={() => onOpenChange(false)}
            confirmText='Create'
            intent='default'
        >
            <div>
                {/* Table Header */}
                <div className='grid grid-cols-3 gap-4 mb-4 px-4 py-2 bg-muted/50 rounded-md'>
                    <div className='text-sm font-medium text-muted-foreground'>Field</div>
                    <div className='text-sm font-medium text-muted-foreground'>Value</div>
                    <div className='text-sm font-medium text-muted-foreground text-right'>Status</div>
                </div>

                {/* Table Content */}
                <div className='space-y-2'>
                    {comparison.fieldInfo.map((field) => (
                        <div
                            key={field.name}
                            className='grid grid-cols-3 gap-4 px-4 py-3 hover:bg-muted/50 rounded-md'
                        >
                            <div className='text-sm font-medium'>{field.displayName}</div>
                            <div className='text-sm text-primary whitespace-pre-wrap font-mono text-xs'>
                                {formatFieldValue(field.newValue)}
                            </div>
                            <div className='text-right'>
                                <span className='text-xs bg-primary/10 text-primary px-2 py-0.5 rounded'>New</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ConfirmationDialog>
    );
};

export default SmartCreateConfirmation;