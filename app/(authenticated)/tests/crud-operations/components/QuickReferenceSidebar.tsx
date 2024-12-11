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
    onSelectionChange?: (recordId: string | string[]) => void;
    onCreateEntityClick?: () => void;
    showCreateNewButton?: boolean;
    className?: string;
    onAnyChange?: (entityKey: EntityKeys, selectionMode: string, selectedRecordIds: string[], selectedRecords: Record<string, any>[]) => void;
}

export function QuickReferenceDesktop<TEntity extends EntityKeys>(
    {
        entityKey,
        onCreateEntityClick,
        showCreateNewButton = false,
        className = ''
    }: QuickReferenceSidebarProps<TEntity>) {
    const {
        quickReferenceRecords,
        selectionMode,
        isSelected,
        handleRecordSelect,
        toggleSelectionMode,
        selectedRecords,
        selectedRecordIds,
    } = useQuickReference(entityKey);

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
                                onClick={toggleSelectionMode}
                                size="sm"
                                variant={selectionMode === 'multiple' ? "secondary" : "outline"}
                            >
                                <CheckSquare className="h-4 w-4 mr-1"/>
                                {selectionMode === 'multiple' ? 'Cancel Multi' : 'Multi'}
                            </Button>
                        )}
                        {onCreateEntityClick && showCreateNewButton && (
                            <Button onClick={onCreateEntityClick} size="sm">
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
                            onClick={() => handleRecordSelect(ref.recordKey)}
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


interface MobileQuickReferenceProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    onCreateEntityClick?: () => void;
    showCreateNewButton?: boolean;
    className?: string;
}

export function MobileQuickReference<TEntity extends EntityKeys>(
    {
        entityKey,
        onCreateEntityClick,
        showCreateNewButton = false,
        className = ''
    }: MobileQuickReferenceProps<TEntity>) {
    const {
        quickReferenceRecords,
        selectionMode,
        isSelected,
        handleRecordSelect,
        toggleSelectionMode,
    } = useQuickReference(entityKey);

    return (
        <div className={`h-full flex flex-col bg-background ${className}`}>
            {/* Action buttons - made larger and more touch-friendly */}
            <div className="flex items-center gap-2 p-3 border-b border-border">
                {selectionMode !== 'none' && (
                    <Button
                        onClick={toggleSelectionMode}
                        className="h-10 flex-1"
                        variant={selectionMode === 'multiple' ? "secondary" : "outline"}
                    >
                        <CheckSquare className="h-5 w-5 mr-2"/>
                        {selectionMode === 'multiple' ? 'Done' : 'Select Multiple'}
                    </Button>
                )}
                {onCreateEntityClick && showCreateNewButton && (
                    <Button
                        onClick={onCreateEntityClick}
                        className="h-10 flex-1"
                    >
                        <Plus className="h-5 w-5 mr-2"/>
                        Add New
                    </Button>
                )}
            </div>

            {/* Scrollable list with efficient item layout */}
            <div className="flex-1 overflow-y-auto max-h-[50vh]">
                <div className="divide-y divide-border">
                    {quickReferenceRecords.map(ref => (
                        <button
                            key={ref.recordKey}
                            onClick={() => handleRecordSelect(ref.recordKey)}
                            className={`w-full min-h-[48px] flex items-center px-4 py-3 transition-colors
                                ${isSelected(ref.recordKey)
                                  ? 'bg-accent text-accent-foreground'
                                  : 'hover:bg-accent/10'
                            }`}
                        >
                            <div className="flex items-center gap-3 w-full">
                                {selectionMode === 'multiple' && (
                                    <div
                                        className={`h-5 w-5 rounded border ${
                                            isSelected(ref.recordKey)
                                            ? 'bg-primary border-primary'
                                            : 'border-muted-foreground'
                                        }`}
                                    >
                                        {isSelected(ref.recordKey) && (
                                            <CheckSquare className="h-full w-full text-primary-foreground"/>
                                        )}
                                    </div>
                                )}
                                <span className="flex-1 text-base text-left">
                                    {ref.displayValue}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function QuickReferenceSidebar<TEntity extends EntityKeys>(props: QuickReferenceSidebarProps<TEntity>) {
    return (
        <div className="h-full w-full">
            <div className="hidden md:block h-full">
                <QuickReferenceDesktop {...props} />
            </div>
            <div className="block md:hidden h-full">
                <MobileQuickReference {...props} />
            </div>
        </div>
    );
}
