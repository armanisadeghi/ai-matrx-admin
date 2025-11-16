// SplitLayout.tsx
import React, { useState } from 'react';
import {motion, AnimatePresence} from 'motion/react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ScrollArea} from "@/components/ui/scroll-area";
import {Button} from '@/components/ui/button';
import {Maximize2, Minimize2} from 'lucide-react';
import {TooltipProvider, Tooltip, TooltipTrigger, TooltipContent} from "@/components/ui/tooltip";
import {cn} from '@/lib/utils';
import {densityConfig, containerVariants} from "@/config/ui/entity-layout-config";
import {EnhancedCard} from './EnhancedCard';
import EntitySelection from "@/components/matrx/Entity/prewired-components/entity-management/EntitySelection";
import MeasurementMonitor from './MeasurementMonitor';
import { useDynamicMeasurements } from "@/hooks/ui/useDynamicMeasurements";
import { UnifiedLayoutProps } from '@/components/matrx/Entity/prewired-components/layouts/types';
import { EntityKeys } from '@/types/entityTypes';
import UnifiedQuickReference from '../../quick-reference/UnifiedQuickReference';
import UnifiedEntityForm from './UnifiedEntityForm';

interface SplitLayoutProps {
    unifiedLayoutProps: UnifiedLayoutProps;
    className?: string;
}

export const SplitLayout: React.FC<SplitLayoutProps> = ({
    unifiedLayoutProps,
    className,
}) => {
    // Local state management
    const [isExpanded, setIsExpanded] = useState(unifiedLayoutProps.layoutState.isExpanded || false);
    const [updateKey, setUpdateKey] = useState(0);

    // Extract values from unified props at the top
    const selectedEntity = unifiedLayoutProps.layoutState.selectedEntity;
    const density = unifiedLayoutProps.dynamicStyleOptions.density;
    const animationPreset = unifiedLayoutProps.dynamicStyleOptions.animationPreset;
    const splitRatio = unifiedLayoutProps.dynamicLayoutOptions.formStyleOptions?.splitRatio || 20;
    
    // Create handlers
    const handleEntityChange = (value: EntityKeys) => {
        unifiedLayoutProps.layoutState.selectedEntity = value;
        setUpdateKey(prev => prev + 1);
        // Call parent handler if provided
        if (unifiedLayoutProps.handlers?.handleEntityChange) {
            unifiedLayoutProps.handlers.handleEntityChange(value);
        }
    };

    const {
        measurements,
        getRef,
        pauseMeasurements,
        resumeMeasurements
    } = useDynamicMeasurements({
        buffer: 8,
        debounceMs: 300,
        threshold: 10,
        initialPauseMs: 800,
        initialMeasurements: {
            mainContent: { availableHeight: 1087 },
            quickReference: { availableHeight: 937 }
        }
    });

    const handleExpandToggle = () => {
        pauseMeasurements(800);
        setIsExpanded(!isExpanded);
    };

    // Create modified props to pass to child components
    const modifiedProps: UnifiedLayoutProps = {
        ...unifiedLayoutProps,
        handlers: {
            ...unifiedLayoutProps.handlers,
            handleEntityChange,
            setIsExpanded,
        },
        layoutState: {
            ...unifiedLayoutProps.layoutState,
            isExpanded,
        }
    };


    const showEntitySelection = unifiedLayoutProps.dynamicLayoutOptions.componentOptions.allowEntitySelection || true;

    const quickRefRef = getRef('quickReference');
    const mainContentRef = getRef('mainContent');

    const getAdjustedHeight = (key: string) => {
        const height = measurements[key]?.availableHeight || 0;
        const padding = key === 'quickReference' ? 16 : 24;
        return Math.max(0, height - padding);
    };

    return (
        <motion.div className={cn("relative h-full overflow-hidden", className)}>
            <motion.div
                className={cn(
                    "grid h-full overflow-hidden",
                    isExpanded ? 'grid-cols-1' : 'grid-cols-[minmax(300px,1fr)_1fr]',
                    densityConfig[density].spacing
                )}
                style={{
                    gridTemplateColumns: isExpanded ? '1fr' : `${splitRatio}% ${100 - splitRatio}%`
                }}
                variants={containerVariants[animationPreset]}
                initial="initial"
                animate="animate"
                exit="exit"
            >
                <AnimatePresence mode="sync">
                    {!isExpanded && (
                        <motion.div
                            className="flex flex-col gap-4 min-w-0"
                            initial={{opacity: 0, x: -20}}
                            animate={{opacity: 1, x: 0}}
                            exit={{opacity: 0, x: -20}}
                        >

                            {showEntitySelection && (
                                <EnhancedCard>
                                    <CardContent className="p-2">
                                        <EntitySelection
                                        selectedEntity={selectedEntity}
                                        onEntityChange={handleEntityChange}
                                        layout="sideBySide"
                                        selectHeight={0}
                                        density={density}
                                        animationPreset={animationPreset}
                                        />
                                    </CardContent>
                                </EnhancedCard>
                            )}

                            {/* Measurement Monitor */}
                            <EnhancedCard>
                                <CardContent>
                                    {/*<MeasurementMonitor measurements={measurements}/>*/}
                                </CardContent>
                            </EnhancedCard>

                            {selectedEntity && (
                                <EnhancedCard>
                                    <CardHeader>
                                        <CardTitle className={densityConfig[density].fontSize}>
                                            Quick Reference
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div ref={quickRefRef}>
                                            <ScrollArea
                                                style={{
                                                    height: `${getAdjustedHeight('quickReference')}px`
                                                }}
                                            >
                                                <UnifiedQuickReference unifiedLayoutProps={modifiedProps} />
                                            </ScrollArea>
                                        </div>
                                    </CardContent>
                                </EnhancedCard>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div className="min-w-0 relative" layout>
                    <AnimatePresence mode="sync">
                        {selectedEntity && (
                            <EnhancedCard className="h-full">
                                <div className="absolute top-4 right-16 z-20 flex gap-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={handleExpandToggle}
                                                >
                                                    {isExpanded ?
                                                     <Minimize2 className={densityConfig[density].iconSize}/> :
                                                     <Maximize2 className={densityConfig[density].iconSize}/>
                                                    }
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{isExpanded ? 'Show sidebar' : 'Hide sidebar'}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <CardContent className="p-0 gap-0">
                                    <div ref={mainContentRef}>
                                        <UnifiedEntityForm
                                            selectedEntity={selectedEntity}
                                            unifiedLayoutProps={modifiedProps}
                                            availableHeight={getAdjustedHeight('mainContent')}
                                            useScrollArea={true}
                                        />
                                    </div>
                                </CardContent>
                            </EnhancedCard>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

export default SplitLayout;
