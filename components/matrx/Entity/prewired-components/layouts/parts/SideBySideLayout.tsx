// SideBySideLayout.tsx
import React from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {Card, CardContent} from '@/components/ui/card';
import {ScrollArea} from "@/components/ui/scroll-area";
import {HelpCircle} from 'lucide-react';
import {cn} from '@/lib/utils';
import {
    densityConfig,
    containerVariants,
    layoutTransitions,
    getAnimationVariants
} from "@/config/ui/entity-layout-config";
import {EnhancedCard} from './EnhancedCard';
import {LayoutHeader} from './LayoutHeader';
import {ExpandButton} from './ExpandButton';
import EntityContent from "@/components/matrx/Entity/prewired-components/development/EntityContent";
import {LayoutProps} from "@/types/componentConfigTypes";
import EntitySelection from "@/components/matrx/Entity/prewired-components/entity-management/EntitySelection";

export const SideBySideLayout: React.FC<LayoutProps> = (
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
        formOptions
    }) => (
    <motion.div
        className={cn(
            "grid h-full overflow-hidden",
            isExpanded ? 'grid-cols-1' : 'grid-cols-2',
            densityConfig[density].spacing
        )}
        variants={containerVariants[animationPreset]}
        initial="initial"
        animate="animate"
        exit="exit"
    >
        <AnimatePresence mode="sync">
            {!isExpanded && (
                <motion.div
                    className="flex flex-col min-w-0"
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
                                selectHeight={selectHeight}
                                density={density}
                                animationPreset={animationPreset}
                            />
                        </CardContent>
                    </EnhancedCard>

                    <AnimatePresence mode="sync">
                        {selectedEntity && (
                            <EnhancedCard
                                className="flex-1 overflow-hidden"
                                ref={rightColumnRef}
                            >
                                <LayoutHeader
                                    title="Quick Reference"
                                    tooltip="Quickly select or create records"
                                    density={density}
                                />
                                <CardContent className="p-0 h-full">
                                    <ScrollArea className={cn(
                                        densityConfig[density].maxHeight,
                                        "px-4"
                                    )}>
                                        {QuickReferenceComponent}
                                    </ScrollArea>
                                </CardContent>
                            </EnhancedCard>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>

        <motion.div
            className="min-w-0 h-full"
            variants={layoutTransitions.sideBySide.right}
            layout
        >
            <AnimatePresence mode="sync">
                {selectedEntity ? (
                    <EnhancedCard className="h-full relative">
                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                            <ExpandButton
                                isExpanded={isExpanded}
                                onClick={() => setIsExpanded(!isExpanded)}
                                density={density}
                            />
                        </div>
                        <EntityContent
                            entityKey={selectedEntity}
                            density={density}
                            animationPreset={animationPreset}
                            formOptions={formOptions}
                        />
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
                                 )}/>
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
    </motion.div>
);

export default SideBySideLayout;
