import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardContent } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ResizablePanel,
    ResizablePanelGroup,
    ResizableHandle,
} from '@/components/ui/resizable';
import {
    densityConfig,
    containerVariants,
    layoutTransitions,
    getAnimationVariants
} from "@/config/ui/entity-layout-config";
import { EnhancedCard } from './EnhancedCard';
import { LayoutHeader } from './LayoutHeader';
import { ExpandButton } from './ExpandButton';
import EntitySelection from "@/components/matrx/Entity/prewired-components/entity-management/EntitySelection";
import { useDynamicMeasurements } from '@/hooks/ui/useDynamicMeasurements';
import { UnifiedLayoutProps } from '@/components/matrx/Entity/prewired-components/layouts/types';
import { EntityKeys } from '@/types/entityTypes';
import UnifiedQuickReference from '../../quick-reference/UnifiedQuickReference';
import UnifiedEntityForm from './UnifiedEntityForm';

interface ResizableLayoutProps {
    unifiedLayoutProps: UnifiedLayoutProps;
    className?: string;
}

export const ResizableLayout: React.FC<ResizableLayoutProps> = ({
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
    const splitRatio = unifiedLayoutProps.dynamicLayoutOptions.formStyleOptions?.splitRatio || 30;
    
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
    } = useDynamicMeasurements({
        buffer: 8,
        debounceMs: 300,
        threshold: 10,
        initialPauseMs: 800,
        initialMeasurements: {
            mainContent: { availableHeight: 1087 },
            quickReference: { availableHeight: 946 }
        }
    });

    const quickRefRef = getRef('quickReference');
    const mainContentRef = getRef('mainContent');

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

    const getAdjustedHeight = (key: string) => {
        const height = measurements[key]?.availableHeight || 0;
        const padding = key === 'quickReference' ? 16 : 24;
        return Math.max(0, height - padding);
    };

    if (isExpanded) {
        // When expanded, show only the main content (similar to other layouts)
        return (
            <motion.div
                className={cn("h-full", className)}
                variants={containerVariants[animationPreset]}
                initial="initial"
                animate="animate"
                exit="exit"
            >
                {showEntitySelection && (
                    <AnimatePresence mode="sync">
                    {selectedEntity ? (
                        <EnhancedCard className="h-full relative">
                            <div className="absolute top-4 right-4 z-20 flex gap-2">
                                <ExpandButton
                                    isExpanded={isExpanded}
                                    onClick={handleExpandToggle}
                                    density={density}
                                />
                            </div>
                            <div ref={mainContentRef}>
                                <UnifiedEntityForm
                                    selectedEntity={selectedEntity}
                                    unifiedLayoutProps={modifiedProps}
                                    availableHeight={getAdjustedHeight('mainContent')}
                                    useScrollArea={true}
                                />
                            </div>
                        </EnhancedCard>
                    ) : (
                        <motion.div
                            className="h-full flex items-center justify-center"
                            variants={getAnimationVariants(animationPreset)}
                        >
                            <EnhancedCard className="text-center max-w-md mx-auto">
                                <CardContent className="flex flex-col items-center gap-4 py-8">
                                    <HelpCircle className={cn(
                                        "text-muted-foreground",
                                        densityConfig[density].iconSize
                                    )} />
                                    <p className={cn(
                                        "text-muted-foreground",
                                        densityConfig[density].fontSize
                                    )}>
                                        Select an entity to begin working
                                    </p>
                                </CardContent>
                            </EnhancedCard>
                        </motion.div>
                    )}
                    </AnimatePresence>
                )}
            </motion.div>
        );
    }

    return (
        <motion.div
            className={cn("h-full", className)}
            variants={containerVariants[animationPreset]}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <ResizablePanelGroup direction="horizontal" className="h-full">
                <ResizablePanel
                    defaultSize={splitRatio}
                    minSize={15}
                    maxSize={60}
                    className="min-w-0"
                >
                    <motion.div
                        className={cn("flex flex-col min-w-0 h-full", densityConfig[density].spacing)}
                        variants={layoutTransitions.sideBySide.left}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <EnhancedCard className="flex-shrink-0">
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
                                    selectHeight={0}
                                    density={density}
                                    animationPreset={animationPreset}
                                />
                            </CardContent>
                        </EnhancedCard>

                        <AnimatePresence mode="sync">
                            {selectedEntity && (
                                <EnhancedCard className="flex-1 overflow-hidden">
                                    <LayoutHeader
                                        title="Quick Reference"
                                        tooltip="Quickly select or create records"
                                        density={density}
                                    />
                                    <CardContent className="p-0 h-full">
                                        <div ref={quickRefRef}>
                                            <UnifiedQuickReference
                                                unifiedLayoutProps={modifiedProps}
                                                className="p-4"
                                            />
                                        </div>
                                    </CardContent>
                                </EnhancedCard>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={100 - splitRatio} className="min-w-0">
                    <motion.div
                        className="h-full"
                        variants={layoutTransitions.sideBySide.right}
                        layout
                    >
                        <AnimatePresence mode="sync">
                            {selectedEntity ? (
                                <EnhancedCard className="h-full relative">
                                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                                        <ExpandButton
                                            isExpanded={isExpanded}
                                            onClick={handleExpandToggle}
                                            density={density}
                                        />
                                    </div>
                                    <div ref={mainContentRef}>
                                        <UnifiedEntityForm
                                            selectedEntity={selectedEntity}
                                            unifiedLayoutProps={modifiedProps}
                                            availableHeight={getAdjustedHeight('mainContent')}
                                            useScrollArea={true}
                                        />
                                    </div>
                                </EnhancedCard>
                            ) : (
                                <motion.div
                                    className="h-full flex items-center justify-center"
                                    variants={getAnimationVariants(animationPreset)}
                                >
                                    <EnhancedCard className="text-center max-w-md mx-auto">
                                        <CardContent className="flex flex-col items-center gap-4 py-8">
                                            <HelpCircle className={cn(
                                                "text-muted-foreground",
                                                densityConfig[density].iconSize
                                            )} />
                                            <p className={cn(
                                                "text-muted-foreground",
                                                densityConfig[density].fontSize
                                            )}>
                                                Select an entity to begin working
                                            </p>
                                        </CardContent>
                                    </EnhancedCard>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </motion.div>
    );
};

export default ResizableLayout; 