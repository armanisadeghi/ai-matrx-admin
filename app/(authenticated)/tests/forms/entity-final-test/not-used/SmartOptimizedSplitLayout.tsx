'use client';

import React from 'react';
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
import EntitySmartContent from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/SmartEntityContent";
import { useMeasure } from "@uidotdev/usehooks";

export const SmartOptimizedSplitLayout: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const selectedEntity = unifiedLayoutProps.layoutState?.selectedEntity || null;
    const isExpanded = unifiedLayoutProps.layoutState.isExpanded;
    const rightColumnRef = unifiedLayoutProps.layoutState.rightColumnRef;
    const selectHeight = unifiedLayoutProps.layoutState.selectHeight;
    const handleEntityChange = unifiedLayoutProps.handlers.handleEntityChange;
    const QuickReferenceComponent = unifiedLayoutProps.QuickReferenceComponent;
    const density = unifiedLayoutProps.dynamicStyleOptions.density || 'normal';
    const splitRatio = unifiedLayoutProps.dynamicLayoutOptions.formStyleOptions.splitRatio;
    const spacingConfig = densityConfig[density].spacing;
    const fontSize = densityConfig[density].fontSize;
    const entityPrettyName = useAppSelector((state: RootState) => selectEntityPrettyName(state, selectedEntity));
    const [layoutRef, { height: layoutHeight }] = useMeasure();

    return (
        <div ref={layoutRef} className="h-full p-0 gap-0 overflow-hidden">
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
                                            {`${entityPrettyName} List`}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <ScrollArea
                                            style={{
                                                height: `${layoutHeight * 0.4}px` // Adjust proportionally or dynamically
                                            }}
                                        >
                                            {QuickReferenceComponent}
                                        </ScrollArea>
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
                                <ScrollArea
                                    style={{
                                        height: `${layoutHeight * 0.6}px`
                                    }}
                                >
                                    <EntitySmartContent {...unifiedLayoutProps} />
                                </ScrollArea>
                            </CardContent>
                        </EnhancedCard>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartOptimizedSplitLayout;
