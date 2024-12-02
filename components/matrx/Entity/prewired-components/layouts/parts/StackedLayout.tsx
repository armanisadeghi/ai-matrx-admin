import React from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {CardContent} from '@/components/ui/card';
import {ScrollArea} from "@/components/ui/scroll-area";
import {Button} from '@/components/ui/button';
import {Plus} from 'lucide-react';
import {cn} from '@/lib/utils';
import {densityConfig, layoutTransitions} from "@/config/ui/entity-layout-config";
import {EnhancedCard} from './EnhancedCard';
import {LayoutHeader} from './LayoutHeader';
import EntityContent from "@/components/matrx/Entity/prewired-components/development/EntityContent";
import {LayoutProps} from "@/types/componentConfigTypes";
import EntitySelection from "@/components/matrx/Entity/prewired-components/entity-management/EntitySelection";
import { useDynamicMeasurements } from './useDynamicMeasurements';
import MeasurementMonitor from './MeasurementMonitor';

export const StackedLayout: React.FC<LayoutProps> = ({
    selectedEntity,
    handleEntityChange,
    QuickReferenceComponent,
    rightColumnRef,
    selectHeight,
    density,
    animationPreset,
    formOptions,
    onCreateEntityClick,
    floatingLabel
}) => {
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
        return Math.max(0, height - 24); // 24px padding
    };

    return (
        <motion.div
            className="h-full overflow-hidden"
            variants={layoutTransitions.stacked.container}
            initial="initial"
            animate="animate"
            exit="exit"
            ref={containerRef}
        >
            <ScrollArea
                className="h-full"
                style={{ height: `${getAdjustedHeight()}px` }}
            >
                <div className={cn(
                    "flex flex-col",
                    densityConfig[density].spacing
                )}>
                    <motion.div
                        variants={layoutTransitions.stacked.item}
                        className="flex-shrink-0"
                    >
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
                                    animationPreset={animationPreset}
                                />
                            </CardContent>
                        </EnhancedCard>
                    </motion.div>

                    <MeasurementMonitor measurements={measurements}/>

                    <AnimatePresence mode="sync">
                        {selectedEntity && (
                            <>
                                <motion.div
                                    variants={layoutTransitions.stacked.item}
                                    className="flex-shrink-0"
                                >
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
                                                    className={densityConfig[density].buttonSize}
                                                >
                                                    <Plus className={densityConfig[density].iconSize}/>
                                                    <span className="ml-2">New Record</span>
                                                </Button>
                                            }
                                        />
                                        <CardContent className="p-4">
                                            {QuickReferenceComponent}
                                        </CardContent>
                                    </EnhancedCard>
                                </motion.div>

                                <motion.div
                                    variants={layoutTransitions.stacked.item}
                                >
                                    <EnhancedCard>
                                        <EntityContent
                                            entityKey={selectedEntity}
                                            density={density}
                                            animationPreset={animationPreset}
                                            formOptions={formOptions}
                                        />
                                    </EnhancedCard>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </ScrollArea>
        </motion.div>
    );
};

export default StackedLayout;
