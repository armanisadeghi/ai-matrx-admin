import * as React from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Plus, CheckSquare} from 'lucide-react';
import {EntityKeys} from '@/types/entityTypes';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';

interface QuickReferenceSidebarProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    onSelectionChange: (recordId: string | string[]) => void;
    onCreateNew?: () => void;
    className?: string;
}

export function QuickReferenceSidebar<TEntity extends EntityKeys>(
    {
        entityKey,
        onSelectionChange,
        onCreateNew,
        className = ''
    }: QuickReferenceSidebarProps<TEntity>) {
    const {
        quickReferenceRecords,
        selectedRecordIds,
        selectionMode,
        isSelected,
        handleMultiSelection,
        handleSingleSelection,
        toggleSelectionMode,
    } = useQuickReference(entityKey);

    React.useEffect(() => {
        if (selectionMode === 'multiple') {
            onSelectionChange(selectedRecordIds);
        } else if (selectedRecordIds.length === 1) {
            onSelectionChange(selectedRecordIds[0]);
        } else {
            onSelectionChange('');
        }
    }, [selectedRecordIds, selectionMode, onSelectionChange]);

    const getCardClassName = (recordKey: string) => {
        const baseClasses = "cursor-pointer transition-colors hover:bg-accent/50";
        const isMultiple = selectionMode === 'multiple';
        return `${baseClasses} ${
            isSelected(recordKey)
            ? `border-primary ${isMultiple ? 'bg-accent' : 'border-2 bg-accent'}`
            : 'border-transparent'
        }`;
    };

    return (
        <div className={`h-full flex flex-col border-r ${className}`}>
            <div className="p-4 border-b">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                        <Button
                            onClick={toggleSelectionMode}
                            size="sm"
                            variant={selectionMode === 'multiple' ? "secondary" : "outline"}
                        >
                            <CheckSquare className="h-4 w-4 mr-1"/>
                            {selectionMode === 'multiple' ? 'Cancel Multi' : 'Multi'}
                        </Button>
                        {onCreateNew && (
                            <Button
                                onClick={onCreateNew}
                                size="sm"
                            >
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
                            onClick={() => {
                                if (selectionMode === 'multiple') {
                                    handleMultiSelection(ref.recordKey);
                                } else {
                                    handleSingleSelection(ref.recordKey);
                                }
                            }}
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
