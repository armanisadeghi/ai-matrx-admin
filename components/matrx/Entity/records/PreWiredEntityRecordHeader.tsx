import React, {useState, useRef, useEffect} from 'react';
import {CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {useAppSelector} from '@/lib/redux/hooks';
import {selectFormattedEntityOptions} from '@/lib/redux/schema/globalCacheSelectors';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityError} from '@/lib/redux/entity/types/stateTypes';
import {
    EntityQuickReferenceAccordion,
    EntityQuickReferenceAccordionEnhanced,
    EntityQuickReferenceCards,
    EntityQuickReferenceCardsEnhanced,
    EntityQuickReferenceList,
    EntityQuickReferenceSelect
} from '../prewired-components/quick-reference';
import { cn } from '@/utils';


type QuickReferenceComponentType =
    | 'cards'
    | 'cardsEnhanced'
    | 'accordion'
    | 'accordionEnhanced'
    | 'list'
    | 'select';

type LayoutType = 'stacked' | 'sideBySide';

interface PreWiredEntityRecordHeaderProps {
    onEntityChange?: (entity: EntityKeys | null) => void;
    onRecordLoad?: (record: EntityData<EntityKeys>) => void;
    onError?: (error: EntityError) => void;
    quickReferenceType?: QuickReferenceComponentType;
    layout?: LayoutType;
    className?: string;
}

const PreWiredEntityRecordHeader: React.FC<PreWiredEntityRecordHeaderProps> = (
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
    const entitySelectOptions = useAppSelector(selectFormattedEntityOptions);
    const rightColumnRef = useRef<HTMLDivElement>(null);

    // Update select height based on right column height
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

    const getVisibleItems = () => {
        if (layout !== 'sideBySide' || !selectHeight) return undefined;
        const itemHeight = 44; // Height of each select item in pixels
        return Math.max(3, Math.min(5, Math.floor(selectHeight / itemHeight)));
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
                    <Select
                        value={selectedEntity || undefined}
                        onValueChange={(value) => handleEntityChange(value as EntityKeys)}
                    >
                        <SelectTrigger
                            className={cn(
                                "w-[400px] bg-card text-card-foreground border-matrxBorder",
                                "h-12 text-base"
                            )}
                        >
                            <SelectValue placeholder={
                                <span className="text-base">
                                    {selectedEntity
                                     ? entitySelectOptions.find(option => option.value === selectedEntity)?.label
                                     : 'Select Entity...'}
                                </span>
                            }/>
                        </SelectTrigger>
                        <SelectContent
                            position={layout === 'sideBySide' ? 'popper' : 'item-aligned'}
                            className={cn(
                                "bg-card",
                                layout === 'sideBySide' && selectHeight && `max-h-[${selectHeight}px]`
                            )}
                            sideOffset={0}
                            align="start"
                            side="bottom"
                        >
                            <div className={cn(
                                "overflow-auto",
                                layout === 'sideBySide' && selectHeight && `max-h-[${selectHeight}px]`
                            )}>
                                {entitySelectOptions.map(({value, label}) => (
                                    <SelectItem
                                        key={value}
                                        value={value}
                                        className="bg-card text-card-foreground hover:bg-muted py-3 text-base"
                                    >
                                        {label}
                                    </SelectItem>
                                ))}
                            </div>
                        </SelectContent>
                    </Select>
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

export default PreWiredEntityRecordHeader;
