'use client';

import React from 'react';
import {cn} from '@/lib/utils';
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
import {useAppSelector} from "@/lib/redux/hooks";
import {RootState} from "@/lib/redux/store";
import {selectEntityPrettyName} from "@/lib/redux/schema/globalCacheSelectors";
import {SmartExpandButton} from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/SmartExpandButton";
import EntitySmartContent from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/SmartEntityContent";
import { useDynamicMeasurements } from '@/hooks/ui/useDynamicMeasurements';

export const SmartLayoutSplit: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const selectedEntity = unifiedLayoutProps.layoutState?.selectedEntity || null;
    const isExpanded = unifiedLayoutProps.layoutState.isExpanded;
    const rightColumnRef = unifiedLayoutProps.layoutState.rightColumnRef;
    const selectHeight = unifiedLayoutProps.layoutState.selectHeight;
    const setIsExpanded = unifiedLayoutProps.handlers.setIsExpanded;
    const handleEntityChange = unifiedLayoutProps.handlers.handleEntityChange;
    const QuickReferenceComponent = unifiedLayoutProps.QuickReferenceComponent;
    const density = unifiedLayoutProps.dynamicStyleOptions.density || 'normal';
    const splitRatio = unifiedLayoutProps.dynamicLayoutOptions.formStyleOptions.splitRatio;
    const spacingConfig = densityConfig[density].spacing;
    const fontSize = densityConfig[density].fontSize;
    const entityPrettyName = useAppSelector((state: RootState) => selectEntityPrettyName(state, selectedEntity));

    const {
        measurements,
        getRef,
        pauseMeasurements,
    } = useDynamicMeasurements({
        buffer: 8,
        debounceMs: 300,
        threshold: 10,
        initialPauseMs: 800
    });

    const quickRefRef = getRef('quickReference');
    const mainContentRef = getRef('mainContent');

    const getAdjustedHeight = (key: string) => {
        const height = measurements[key]?.availableHeight || 0;
        const padding = key === 'quickReference' ? 16 : 24;
        return Math.max(0, height - padding);
    };

    const handleExpandToggle = () => {
        pauseMeasurements(800);
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="h-full p-0 gap-0 overflow-hidden">
            <div
                className={cn(
                    "grid h-full p-0",
                    spacingConfig
                )}
                style={{
                    gridTemplateColumns: isExpanded
                                         ? '1fr'
                                         : `minmax(300px, ${splitRatio}%) minmax(300px, ${100 - splitRatio}%)`
                }}
            >
                {!isExpanded && (
                    <div className="flex flex-col p-0 gap-0 overflow-hidden">
                        <div className="flex-shrink-0 pt-2 p-0 gap-0">
                            <EnhancedCard>
                                <CardContent className="p-0 gap-0">
                                    <EntitySelection
                                        selectedEntity={selectedEntity}
                                        onEntityChange={handleEntityChange}
                                        layout="sideBySide"
                                        selectHeight={selectHeight}
                                        density={density}
                                    />
                                </CardContent>
                            </EnhancedCard>
                        </div>

                        {selectedEntity && (
                            <div className="flex-1 min-h-0">
                                <EnhancedCard className="h-full" cardRef={rightColumnRef}>
                                    <CardHeader>
                                        <CardTitle className={fontSize}>
                                            {`${entityPrettyName} Records`}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div ref={quickRefRef}>
                                            <ScrollArea
                                                style={{
                                                    height: `${getAdjustedHeight('quickReference')}px`
                                                }}
                                            >
                                                {QuickReferenceComponent}
                                            </ScrollArea>
                                        </div>
                                    </CardContent>
                                </EnhancedCard>
                            </div>
                        )}
                    </div>
                )}

                {selectedEntity && (
                    <div className="h-full overflow-hidden p-0 gap-0">
                        <EnhancedCard className="h-full">
                            <CardContent className="p-0 gap-0">
                                <div ref={mainContentRef}>
                                    <ScrollArea
                                        style={{
                                            height: `${getAdjustedHeight('mainContent')}px`
                                        }}
                                    >
                                        <EntitySmartContent {...unifiedLayoutProps} />
                                    </ScrollArea>
                                </div>
                            </CardContent>
                        </EnhancedCard>
                    </div>
                )}

                {selectedEntity && (
                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                        <SmartExpandButton
                            isExpanded={isExpanded}
                            onClick={handleExpandToggle}
                            density={density}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartLayoutSplit;
