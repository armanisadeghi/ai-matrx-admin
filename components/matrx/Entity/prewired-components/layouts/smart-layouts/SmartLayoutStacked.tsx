import React from 'react';
import {cn} from '@/lib/utils';
import {
    CardContent,
    ScrollArea,
    Button
} from '@/components/ui';
import {
    densityConfig,
    EnhancedCard,
    LayoutHeader,
    EntitySelection,
    UnifiedLayoutProps
} from "@/components/matrx/Entity";
import {Plus} from 'lucide-react';
import EntitySmartContent from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/SmartEntityContent";
import { useDynamicMeasurements } from '../parts/useDynamicMeasurements';
import MeasurementMonitor from '../parts/MeasurementMonitor';

export const SmartLayoutStacked: React.FC<{ unifiedLayoutProps: UnifiedLayoutProps }> = ({unifiedLayoutProps}) => {
    const selectedEntity = unifiedLayoutProps.layoutState.selectedEntity;
    const rightColumnRef = unifiedLayoutProps.layoutState.rightColumnRef;
    const selectHeight = unifiedLayoutProps.layoutState.selectHeight;
    const handleEntityChange = unifiedLayoutProps.handlers.handleEntityChange;
    const onCreateEntityClick = unifiedLayoutProps.handlers.onCreateEntityClick;
    const QuickReferenceComponent = unifiedLayoutProps.QuickReferenceComponent;
    const formStyleOptions = unifiedLayoutProps.dynamicLayoutOptions.formStyleOptions;
    const density = unifiedLayoutProps.dynamicStyleOptions.density || 'normal';
    const spacingConfig = densityConfig[density].spacing;
    const buttonSize = densityConfig[density].buttonSize;
    const iconSize = densityConfig[density].iconSize;

    const {
        measurements,
        getRef
    } = useDynamicMeasurements({
        buffer: 8,
        debounceMs: 300,
        threshold: 10,
        initialPauseMs: 800,
    });

    const containerRef = getRef('container');

    const getAdjustedHeight = () => {
        const height = measurements.container?.availableHeight || 0;
        return Math.max(0, height - 24);
    };

    return (
        <div
            className={cn("h-full overflow-hidden")}
            ref={containerRef}
        >
            <ScrollArea
                className="h-full"
                style={{ height: `${getAdjustedHeight()}px` }}
            >
                <div className={cn("flex flex-col", spacingConfig)}>
                    {/* Entity Selection - Natural size */}
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
                                    layout="stacked"
                                    selectHeight={selectHeight}
                                    density={density}
                                />
                            </CardContent>
                        </EnhancedCard>
                    </div>

                    <MeasurementMonitor measurements={measurements}/>

                    {selectedEntity && (
                        <>
                            <div className="flex-shrink-0">
                                <EnhancedCard cardRef={rightColumnRef}>
                                    <LayoutHeader
                                        title="Quick Reference"
                                        tooltip="Quickly select or create records"
                                        density={density}
                                        actions={
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={onCreateEntityClick}
                                                className={buttonSize}
                                            >
                                                <Plus className={iconSize}/>
                                                <span className="ml-2">New Record</span>
                                            </Button>
                                        }
                                    />
                                    <CardContent className="p-4">
                                        {QuickReferenceComponent}
                                    </CardContent>
                                </EnhancedCard>
                            </div>

                            <div>
                                <EnhancedCard>
                                    <EntitySmartContent
                                        entityKey={selectedEntity}
                                        density={density}
                                        formOptions={formStyleOptions}
                                    />
                                </EnhancedCard>
                            </div>
                        </>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default SmartLayoutStacked;
