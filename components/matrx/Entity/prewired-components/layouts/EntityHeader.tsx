// EntityHeader.tsx
import React, {useRef, useEffect, useState} from 'react';
import {CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityError} from '@/lib/redux/entity/types';
import {
    EntityQuickReferenceAccordion,
    EntityQuickReferenceAccordionEnhanced,
    EntityQuickReferenceCards,
    EntityQuickReferenceCardsEnhanced,
    EntityQuickReferenceList,
    EntityQuickReferenceSelect
} from '../quick-reference';
import {cn} from '@nextui-org/react';
import EntitySelection from '../entity-management/EntitySelection';

type QuickReferenceComponentType =
    | 'cards'
    | 'cardsEnhanced'
    | 'accordion'
    | 'accordionEnhanced'
    | 'list'
    | 'select';

type LayoutType = 'stacked' | 'sideBySide';

interface EntityHeaderProps {
    onEntityChange?: (entity: EntityKeys | null) => void;
    onRecordLoad?: (record: EntityData<EntityKeys>) => void;
    onError?: (error: EntityError) => void;
    quickReferenceType?: QuickReferenceComponentType;
    layout?: LayoutType;
    className?: string;
}

const EntityHeader: React.FC<EntityHeaderProps> = (
    {
        onEntityChange,
        onRecordLoad,
        onError,
        quickReferenceType = 'cardsEnhanced',
        layout = 'sideBySide',
        className = '',
    }) => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const [hasSelection, setHasSelection] = useState(false);
    const [recordLabel, setRecordLabel] = useState<string>('Select Record');
    const [selectHeight, setSelectHeight] = useState<number>(0);
    const rightColumnRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (layout === 'sideBySide' && rightColumnRef.current) {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setSelectHeight(entry.contentRect.height);
                }
            });

            observer.observe(rightColumnRef.current);
            return () => observer.disconnect();
        }
    }, [layout, selectedEntity]);

    const handleEntityChange = (value: EntityKeys) => {
        setSelectedEntity(value);
        setHasSelection(false);
        setRecordLabel('Select Record');
        onEntityChange?.(value);
    };

    const handleRecordLoad = (record: EntityData<EntityKeys>) => {
        setHasSelection(true);
        onRecordLoad?.(record);
    };

    const handleRecordLabelChange = (label: string) => {
        setRecordLabel(label);
    };

    const onCreateEntityClick = () => {
        console.log('Create new entity clicked');
    };

    const QuickReferenceComponent = React.useMemo(() => {
        const commonProps = {
            entityKey: selectedEntity!,
            className: 'w-full',
        };

        const components = {
            cards: <EntityQuickReferenceCards {...commonProps} showCreateNewButton
                                              onCreateEntityClick={onCreateEntityClick}/>,
            cardsEnhanced: <EntityQuickReferenceCardsEnhanced {...commonProps} showCreateNewButton showMultiSelectButton
                                                              onCreateEntityClick={onCreateEntityClick}/>,
            accordion: <EntityQuickReferenceAccordion {...commonProps} />,
            accordionEnhanced: <EntityQuickReferenceAccordionEnhanced {...commonProps} />,
            list: <EntityQuickReferenceList {...commonProps} />,
            select: <EntityQuickReferenceSelect
                entityKey={selectedEntity!}
                onRecordLoad={handleRecordLoad}
                onError={onError}
                onLabelChange={handleRecordLabelChange}
            />,
        };

        return components[quickReferenceType];
    }, [selectedEntity, quickReferenceType, onError]);

    return (
        <CardHeader className={className}>
            <CardTitle className={cn(
                "flex gap-6",
                layout === 'stacked' ? 'flex-col' : 'flex-row items-start'
            )}>
                <div className={cn(
                    "flex justify-between items-start",
                    layout === 'sideBySide' && 'min-w-[400px]'
                )}>
                    <EntitySelection
                        selectedEntity={selectedEntity}
                        onEntityChange={handleEntityChange}
                        layout={layout}
                        selectHeight={selectHeight}
                    />
                </div>

                {selectedEntity && (
                    <div
                        ref={rightColumnRef}
                        className={cn(
                            layout === 'sideBySide' ? 'flex-1' : 'w-full'
                        )}
                    >
                        {QuickReferenceComponent}
                    </div>
                )}
            </CardTitle>
            {!hasSelection && (
                <CardDescription className="mt-2 text-base">
                    Browse records
                </CardDescription>
            )}
        </CardHeader>
    );
};

export default EntityHeader;
