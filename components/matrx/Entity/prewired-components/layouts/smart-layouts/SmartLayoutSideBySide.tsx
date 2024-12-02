import React from 'react';
import {cn} from '@/lib/utils';
import {
    CardContent,
    ScrollArea
} from '@/components/ui';
import {
    densityConfig,
    EnhancedCard,
    LayoutHeader,
    EntitySelection,
    UnifiedLayoutProps
} from "@/components/matrx/Entity";
import {SmartExpandButton} from './SmartExpandButton';
import {useAppSelector} from "@/lib/redux/hooks";
import {selectEntityPrettyName} from "@/lib/redux/schema/globalCacheSelectors";
import {RootState} from "@/lib/redux/store";
import EntitySmartContent from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/SmartEntityContent";
import { useDynamicMeasurements } from '../parts/useDynamicMeasurements';
import MeasurementMonitor from '../parts/MeasurementMonitor';

export const SmartLayoutSideBySide: React.FC<{ unifiedLayoutProps: UnifiedLayoutProps }> = ({unifiedLayoutProps}) => {
    const selectedEntity = unifiedLayoutProps.layoutState.selectedEntity;
    const isExpanded = unifiedLayoutProps.layoutState.isExpanded;
    const rightColumnRef = unifiedLayoutProps.layoutState.rightColumnRef;
    const selectHeight = unifiedLayoutProps.layoutState.selectHeight;
    const setIsExpanded = unifiedLayoutProps.handlers.setIsExpanded;
    const handleEntityChange = unifiedLayoutProps.handlers.handleEntityChange;
    const QuickReferenceComponent = unifiedLayoutProps.QuickReferenceComponent;
    const formStyleOptions = unifiedLayoutProps.dynamicLayoutOptions.formStyleOptions;
    const density = unifiedLayoutProps.dynamicStyleOptions.density || 'normal';
    const spacingConfig = densityConfig[density].spacing;
    const entityPrettyName = useAppSelector((state: RootState) => selectEntityPrettyName(state, selectedEntity));

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
        <div className={cn(
            "grid h-full relative",
            isExpanded ? 'grid-cols-1' : 'grid-cols-2',
            spacingConfig,
            "overflow-hidden"
        )}>
            {!isExpanded && (
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex-shrink-0">
                        <EnhancedCard>
                            <LayoutHeader
                                title="Entity Selection"
                                tooltip="Select an entity to begin working"
                                density={density}
                            />
                            <CardContent>
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
                        <div className="flex-1 min-h-0 mt-4">
                            <EnhancedCard className="h-full" ref={rightColumnRef}>
                                <LayoutHeader
                                    title="Quick Reference"
                                    tooltip="Quickly select or create records"
                                    density={density}
                                />
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
                        <CardContent className="p-0">
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
    );
};

export default SmartLayoutSideBySide;
