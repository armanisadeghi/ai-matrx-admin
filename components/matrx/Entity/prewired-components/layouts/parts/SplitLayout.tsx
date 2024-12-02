// SplitLayout.tsx
import React from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ScrollArea} from "@/components/ui/scroll-area";
import {Button} from '@/components/ui/button';
import {Maximize2, Minimize2} from 'lucide-react';
import {TooltipProvider, Tooltip, TooltipTrigger, TooltipContent} from "@/components/ui/tooltip";
import {cn} from '@/lib/utils';
import {densityConfig, containerVariants} from "@/config/ui/entity-layout-config";
import {EnhancedCard} from './EnhancedCard';
import EntityContent from "@/components/matrx/Entity/prewired-components/development/EntityContent";
import {LayoutProps} from "@/types/componentConfigTypes";
import EntitySelection from "@/components/matrx/Entity/prewired-components/entity-management/EntitySelection";
import MeasurementMonitor from './MeasurementMonitor';
import {
    useDynamicMeasurements
} from "@/components/matrx/Entity/prewired-components/layouts/parts/useDynamicMeasurements";


export const SplitLayout: React.FC<LayoutProps> = (
    {
        selectedEntity,
        isExpanded,
        setIsExpanded,
        handleEntityChange,
        QuickReferenceComponent,
        rightColumnRef,
        selectHeight,
        density,
        animationPreset,
        splitRatio,
        formOptions
    }) => {

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

    const quickRefRef = getRef('quickReference');
    const mainContentRef = getRef('mainContent');

    const getAdjustedHeight = (key: string) => {
        const height = measurements[key]?.availableHeight || 0;
        const padding = key === 'quickReference' ? 16 : 24;
        return Math.max(0, height - padding);
    };

    return (
        <motion.div className="relative h-full overflow-hidden">
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
                            <EnhancedCard>
                                <CardContent className="p-2">
                                    <EntitySelection
                                        selectedEntity={selectedEntity}
                                        onEntityChange={handleEntityChange}
                                        layout="sideBySide"
                                        selectHeight={selectHeight}
                                        density={density}
                                        animationPreset={animationPreset}
                                    />
                                </CardContent>
                            </EnhancedCard>

                            {/* Measurement Monitor */}
                            <EnhancedCard>
                                <CardContent>
                                    <MeasurementMonitor measurements={measurements}/>
                                </CardContent>
                            </EnhancedCard>

                            {selectedEntity && (
                                <EnhancedCard cardRef={rightColumnRef}>
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
                                                {QuickReferenceComponent}
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
                                <div className="absolute top-4 right-4 z-20 flex gap-2">
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
                                        <ScrollArea
                                            style={{
                                                height: `${getAdjustedHeight('mainContent')}px`
                                            }}
                                        >
                                            <EntityContent
                                                entityKey={selectedEntity}
                                                density={density}
                                                animationPreset={animationPreset}
                                                formOptions={formOptions}
                                            />
                                        </ScrollArea>
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
