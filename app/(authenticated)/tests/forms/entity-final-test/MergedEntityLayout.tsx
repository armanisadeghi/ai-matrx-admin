'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
    ScrollArea,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui';
import {
    EnhancedCard,
    densityConfig,
    EntitySelection,
    UnifiedLayoutProps,
} from "@/components/matrx/Entity";
import { useAppSelector } from "@/lib/redux/hooks";
import { RootState } from "@/lib/redux/store";
import { selectEntityPrettyName } from "@/lib/redux/schema/globalCacheSelectors";
import EntityQuickReferenceCards from '@/components/matrx/Entity/prewired-components/quick-reference/EntityQuickReferenceCards';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import EntitySmartContent from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/SmartEntityContent";
import { useMeasure } from "@uidotdev/usehooks";

const MergedEntityLayout: React.FC<UnifiedLayoutProps> = (props) => {
    const {
        dynamicLayoutOptions,
        dynamicStyleOptions,
        layoutState,
        className,
    } = props;
    const [layoutRef, { height: layoutHeight }] = useMeasure();

    const density = dynamicStyleOptions.density || 'normal';
    const splitRatio = dynamicLayoutOptions.formStyleOptions.splitRatio;
    const spacingConfig = densityConfig[density].spacing;
    const [isExpanded, setIsExpanded] = useState(false);
    const [updateKey, setUpdateKey] = useState(0);

    const selectedEntity = layoutState?.selectedEntity || null;
    const entityPrettyName = useAppSelector((state: RootState) =>
        selectEntityPrettyName(state, selectedEntity)
    );

    useEffect(() => {
        setUpdateKey(prev => prev + 1);
    }, [layoutState.selectedEntity]);

    const handleEntityChange = (value: EntityKeys) => {
        layoutState.selectedEntity = value;
        setUpdateKey(prev => prev + 1);
    };

    const handleCreateEntityClick = () => {
        layoutState.selectedEntity = null;
        setUpdateKey(prev => prev + 1);
        setIsExpanded(false);
    };

    const modifiedProps: UnifiedLayoutProps = {
        ...props,
        handlers: {
            setIsExpanded,
            handleEntityChange,
            onCreateEntityClick: handleCreateEntityClick,
        },
        layoutState: {
            ...layoutState,
            isExpanded,
        }
    };

    return (
        <div className={cn(
            'w-full h-full relative overflow-hidden',
            spacingConfig,
            className
        )}>
            <div ref={layoutRef} className="h-full p-0 gap-0 overflow-hidden">
                <div
                    className={cn("grid h-full p-0", spacingConfig)}
                    style={{
                        gridTemplateColumns: isExpanded
                                             ? '1fr'
                                             : `minmax(300px, ${splitRatio}%) minmax(300px, ${100 - splitRatio}%)`
                    }}
                >
                    {!isExpanded && (
                        <div className="flex flex-col p-0 gap-0 overflow-hidden">
                            <EntitySelection
                                selectedEntity={selectedEntity}
                                onEntityChange={handleEntityChange}
                                layout="sideBySide"
                                density={density}
                            />

                            {selectedEntity && (
                                <div className="flex-1 min-h-0">
                                    <EntityQuickReferenceCards
                                        key={`${selectedEntity}-${updateKey}`}
                                        entityKey={selectedEntity}
                                        onCreateEntityClick={handleCreateEntityClick}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {selectedEntity && (
                        <div className="h-full overflow-hidden p-0 gap-0">
                            <EnhancedCard className="h-full">
                                <CardContent className="p-0 gap-0">
                                    <ScrollArea
                                        style={{
                                            height: `${layoutHeight * 0.6}px`
                                        }}
                                    >
                                        <EntitySmartContent {...modifiedProps} />
                                    </ScrollArea>
                                </CardContent>
                            </EnhancedCard>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MergedEntityLayout;
