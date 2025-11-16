import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { densityConfig, layoutTransitions } from "@/config/ui/entity-layout-config";
import { EnhancedCard } from "./EnhancedCard";
import { LayoutHeader } from "./LayoutHeader";
import EntitySelection from "@/components/matrx/Entity/prewired-components/entity-management/EntitySelection";
import { useDynamicMeasurements } from "@/hooks/ui/useDynamicMeasurements";
import MeasurementMonitor from "./MeasurementMonitor";
import { UnifiedLayoutProps } from "@/components/matrx/Entity/prewired-components/layouts/types";
import { EntityKeys } from "@/types/entityTypes";
import UnifiedQuickReference from "../../quick-reference/UnifiedQuickReference";
import UnifiedEntityForm from "./UnifiedEntityForm";

interface StackedLayoutProps {
    unifiedLayoutProps: UnifiedLayoutProps;
    className?: string;
}

export const StackedLayout: React.FC<StackedLayoutProps> = ({ unifiedLayoutProps, className }) => {
    // Local state management
    const [updateKey, setUpdateKey] = useState(0);

    // Extract values from unified props at the top
    const selectedEntity = unifiedLayoutProps.layoutState.selectedEntity;
    const density = unifiedLayoutProps.dynamicStyleOptions.density;
    const animationPreset = unifiedLayoutProps.dynamicStyleOptions.animationPreset;

    // Create handlers
    const handleEntityChange = (value: EntityKeys) => {
        unifiedLayoutProps.layoutState.selectedEntity = value;
        setUpdateKey((prev) => prev + 1);
        // Call parent handler if provided
        if (unifiedLayoutProps.handlers?.handleEntityChange) {
            unifiedLayoutProps.handlers.handleEntityChange(value);
        }
    };

    const onCreateEntityClick = () => {
        // Call parent handler if provided, otherwise use default behavior
        if (unifiedLayoutProps.handlers?.onCreateEntityClick) {
            unifiedLayoutProps.handlers.onCreateEntityClick();
        } else {
            console.log("Create new entity clicked");
        }
    };

    const modifiedProps: UnifiedLayoutProps = {
        ...unifiedLayoutProps,
        handlers: {
            ...unifiedLayoutProps.handlers,
            handleEntityChange,
            onCreateEntityClick,
        },
        layoutState: {
            ...unifiedLayoutProps.layoutState,
        },
    };
    const showEntitySelection = unifiedLayoutProps.dynamicLayoutOptions.componentOptions.allowEntitySelection;

    const { measurements, getRef } = useDynamicMeasurements({
        buffer: 8,
        debounceMs: 300,
        threshold: 10,
        initialPauseMs: 800,
    });

    const containerRef = getRef("container");

    const getAdjustedHeight = () => {
        const height = measurements.container?.availableHeight || 0;
        return Math.max(0, height - 24); // 24px padding
    };

    return (
        <motion.div
            className={cn("h-full overflow-hidden", className)}
            variants={layoutTransitions.stacked.container}
            initial="initial"
            animate="animate"
            exit="exit"
            ref={containerRef}
        >
            <ScrollArea className="h-full" style={{ height: `${getAdjustedHeight()}px` }}>
                <div className={cn("flex flex-col", densityConfig[density].spacing)}>
                    {showEntitySelection && (
                        <motion.div variants={layoutTransitions.stacked.item} className="flex-shrink-0">
                            <EnhancedCard>
                                <LayoutHeader title="Entity Selection" tooltip="Select an entity to begin working" density={density} />
                                <CardContent>
                                    <EntitySelection
                                        selectedEntity={selectedEntity}
                                        onEntityChange={handleEntityChange}
                                        layout="stacked"
                                        selectHeight={0}
                                        density={density}
                                        animationPreset={animationPreset}
                                    />
                                </CardContent>
                            </EnhancedCard>
                        </motion.div>
                    )}

                    {/*<MeasurementMonitor measurements={measurements}/>*/}

                    <AnimatePresence mode="sync">
                        {selectedEntity && (
                            <>
                                <motion.div variants={layoutTransitions.stacked.item} className="flex-shrink-0">
                                    <EnhancedCard>
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
                                                    <Plus className={densityConfig[density].iconSize} />
                                                    <span className="ml-2">New Record</span>
                                                </Button>
                                            }
                                        />
                                        <CardContent className="p-4">
                                            <UnifiedQuickReference unifiedLayoutProps={modifiedProps} />
                                        </CardContent>
                                    </EnhancedCard>
                                </motion.div>

                                <motion.div variants={layoutTransitions.stacked.item}>
                                    <EnhancedCard>
                                        <UnifiedEntityForm
                                            selectedEntity={selectedEntity}
                                            unifiedLayoutProps={modifiedProps}
                                            useScrollArea={false}
                                            className="p-4"
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
