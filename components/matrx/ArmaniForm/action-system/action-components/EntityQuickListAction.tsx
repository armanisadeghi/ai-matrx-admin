import * as React from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Plus, CheckSquare} from 'lucide-react';
import {EntityKeys} from '@/types/entityTypes';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';

interface EntityQuickListProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    onSelectionChange?: (recordId: string | string[]) => void;
    onCreateEntityClick?: () => void;
    showCreateNewButton?: boolean;
    className?: string;
    onAnyChange?: (
        entityKey: EntityKeys,
        selectionMode: string,
        selectedRecordIds: string[],
        selectedRecords: Record<string, any>[]
    ) => void;
}

export function EntityQuickListAction<TEntity extends EntityKeys>(
    {
        entityKey,
        onAnyChange,
        onCreateEntityClick,
        showCreateNewButton = false,
        className = ''
    }: EntityQuickListProps<TEntity>) {
    const {
        quickReferenceRecords,
        selectionMode,
        isSelected,
        handleRecordSelect,
        toggleSelectionMode,
        selectedRecords,
        selectedRecordIds,
    } = useQuickReference(entityKey);

    // Notify on any change
    const notifyAnyChange = React.useCallback(() => {
        if (onAnyChange) {
            onAnyChange(entityKey, selectionMode, selectedRecordIds, selectedRecords);
        }
    }, [entityKey, selectionMode, selectedRecordIds, selectedRecords, onAnyChange]);

    // Notify when selection mode changes
    const handleToggleSelectionMode = React.useCallback(() => {
        toggleSelectionMode();
        notifyAnyChange();
    }, [toggleSelectionMode, notifyAnyChange]);

    // Notify when a record is selected or deselected
    const handleSelectRecord = React.useCallback(
        (recordKey: string) => {
            handleRecordSelect(recordKey);
            notifyAnyChange();
        },
        [handleRecordSelect, notifyAnyChange]
    );

    // Notify when "New" button is clicked
    const handleCreateNewClick = React.useCallback(() => {
        if (onCreateEntityClick) {
            onCreateEntityClick();
        }
        notifyAnyChange();
    }, [onCreateEntityClick, notifyAnyChange]);

    const getCardClassName = React.useCallback((recordKey: string) => {
        const baseClasses = "cursor-pointer transition-colors hover:bg-accent/50";
        const isMultiple = selectionMode === 'multiple';
        return `${baseClasses} ${
            isSelected(recordKey)
            ? `border-primary ${isMultiple ? 'bg-accent' : 'border-2 bg-accent'}`
            : 'border-transparent'
        }`;
    }, [selectionMode, isSelected]);

    return (
        <div className={`h-full flex flex-col border-r ${className}`}>
            <div className="p-4 border-b">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                        {selectionMode !== 'none' && (
                            <Button
                                onClick={handleToggleSelectionMode}
                                size="sm"
                                variant={selectionMode === 'multiple' ? "secondary" : "outline"}
                            >
                                <CheckSquare className="h-4 w-4 mr-1"/>
                                {selectionMode === 'multiple' ? 'Cancel Multi' : 'Multi'}
                            </Button>
                        )}
                        {onCreateEntityClick && showCreateNewButton && (
                            <Button onClick={handleCreateNewClick} size="sm">
                                <Plus className="h-4 w-4 mr-1"/>
                                New
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            <ScrollArea className="flex-grow">
                <div className="p-2 space-y-2">
                    {quickReferenceRecords.map(ref => (
                        <Card
                            key={ref.recordKey}
                            className={getCardClassName(ref.recordKey)}
                            onClick={() => handleSelectRecord(ref.recordKey)}
                        >
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    {selectionMode === 'multiple' && (
                                        <Checkbox
                                            checked={isSelected(ref.recordKey)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}
                                    <div className="text-sm">
                                        {ref.displayValue}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

export default EntityQuickListAction;
