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
    LayoutHeader
} from "@/components/matrx/Entity";
import {useAppSelector} from "@/lib/redux/hooks";
import {RootState} from "@/lib/redux/store";
import {selectEntityPrettyName} from "@/lib/redux/schema/globalCacheSelectors";
import {SmartExpandButton} from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/SmartExpandButton";
import EntitySmartContent from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/SmartEntityContent";
import { useDynamicMeasurements } from '@/hooks/ui/useDynamicMeasurements';
import MeasurementMonitor from '../parts/MeasurementMonitor';

export const SmartLayoutSplit: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const selectedEntity = unifiedLayoutProps.layoutState?.selectedEntity || null;
    const isExpanded = unifiedLayoutProps.layoutState.isExpanded;
    const rightColumnRef = unifiedLayoutProps.layoutState.rightColumnRef;
    const selectHeight = unifiedLayoutProps.layoutState.selectHeight;
    const setIsExpanded = unifiedLayoutProps.handlers.setIsExpanded;
    const handleEntityChange = unifiedLayoutProps.handlers.handleEntityChange;
    const onCreateEntityClick = unifiedLayoutProps.handlers.onCreateEntityClick;
    const QuickReferenceComponent = unifiedLayoutProps.QuickReferenceComponent;
    const formStyleOptions = unifiedLayoutProps.dynamicLayoutOptions.formStyleOptions;
    const density = unifiedLayoutProps.dynamicStyleOptions.density || 'normal';
    const splitRatio = unifiedLayoutProps.dynamicLayoutOptions.formStyleOptions.splitRatio;
    const spacingConfig = densityConfig[density].spacing;
    const fontSize = densityConfig[density].fontSize;
    const entityPrettyName = useAppSelector((state: RootState) => selectEntityPrettyName(state, selectedEntity));
    const buttonSize = densityConfig[density].buttonSize;
    const iconSize = densityConfig[density].iconSize;

    const {
        measurements,
        getRef,
        pauseMeasurements,
        resumeMeasurements
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
                    isExpanded ? 'grid-cols-1' : 'grid-cols-[minmax(300px,1fr)_1fr]',
                    spacingConfig
                )}
                style={{
                    gridTemplateColumns: isExpanded
                                         ? '1fr'
                                         : `${splitRatio}% ${100 - splitRatio}%`
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

                        <MeasurementMonitor measurements={measurements}/>

                        {selectedEntity && (
                            <div className="flex-1 min-h-0">
                                <EnhancedCard className="h-full" cardRef={rightColumnRef}>
                                    <CardHeader>
                                        <CardTitle className={fontSize}>
                                            {`${entityPrettyName} List`}
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
                            <LayoutHeader
                                title={`${entityPrettyName} Data`}
                                tooltip="View and edit entity records"
                                density={density}
                            />
                            <CardContent className="p-0 gap-0">
                                <div ref={mainContentRef}>
                                    <ScrollArea
                                        style={{
                                            height: `${getAdjustedHeight('mainContent')}px`
                                        }}
                                    >
                                        <EntitySmartContent
                                            entityKey={selectedEntity}
                                            density={density}
                                            formOptions={formStyleOptions}
                                        />
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
