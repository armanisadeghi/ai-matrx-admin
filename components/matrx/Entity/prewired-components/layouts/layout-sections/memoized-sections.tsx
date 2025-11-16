// ArmaniLayout.tsx
import React, {useState, useRef, useEffect, useMemo, useCallback} from 'react';
import {motion, AnimatePresence} from 'motion/react';
import {EnhancedCard, EntitySelectionSection, QuickReferenceSection} from './EnhancedMemoizedCard';

import {
    containerVariants,
    layoutTransitions,
    getAnimationVariants,
    densityConfig
} from "@/config/ui/entity-layout-config";


import EntitySelection from '../../entity-management/EntitySelection';
import {
    EntityQuickReferenceAccordionEnhanced,
    EntityQuickReferenceCardsEnhanced,
    EntityQuickReferenceList,
    EntityQuickReferenceSelect
} from '../../quick-reference';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {AnimationPreset, ComponentDensity} from "@/types/componentConfigTypes";

import {Card, CardHeader, CardTitle, CardContent} from '@/components/ui/card';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityError} from '@/lib/redux/entity/types/stateTypes';
import {Button} from '@/components/ui/button';
import {
    Maximize2,
    Minimize2,
    HelpCircle,
    ArrowLeft,
    Settings,
    Plus
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {ScrollArea} from "@/components/ui/scroll-area";
import {EntityLayoutProps} from "@/components/matrx/Entity/prewired-components/layouts/layout-sections/types";
import {LayoutHeader} from "@/components/matrx/Entity/prewired-components/layouts/layout-sections/extras";


const EntityContent = React.memo((
    {
        entityKey,
        density,
        animationPreset,
        formOptions
    }: {
        entityKey: EntityKeys;
        density: ComponentDensity;
        animationPreset: AnimationPreset;
        formOptions?: any;
    }) => (
    <EntityContent
        entityKey={entityKey}
        density={density}
        animationPreset={animationPreset}
        formOptions={formOptions}
    />
));

EntityContent.displayName = 'EntityContent';

const ExpandButton = React.memo((
    {
        isExpanded,
        onClick,
        density
    }: {
        isExpanded: boolean;
        onClick: () => void;
        density: ComponentDensity;
    }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClick}
                >
                    {isExpanded ?
                     <Minimize2 className={densityConfig[density].iconSize}/> :
                     <Maximize2 className={densityConfig[density].iconSize}/>
                    }
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{isExpanded ? 'Show sidebar' : 'Hide sidebar 1'}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
));

ExpandButton.displayName = 'ExpandButton';

const ArmaniLayout: React.FC<EntityLayoutProps> = React.memo((
    {
        className,
        density = 'normal',
        animationPreset = 'smooth',
        layoutVariant = 'split',
        size = 'md',
        quickReferenceType = 'cardsEnhanced',
        formOptions
    }) => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const [error, setError] = useState<EntityError | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasSelection, setHasSelection] = useState(false);
    const [recordLabel, setRecordLabel] = useState<string>('Select Record');
    const [selectHeight, setSelectHeight] = useState<number>(0);
    const rightColumnRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (layoutVariant !== 'stacked' && rightColumnRef.current) {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setSelectHeight(entry.contentRect.height);
                }
            });

            observer.observe(rightColumnRef.current);
            return () => observer.disconnect();
        }
    }, [layoutVariant, selectedEntity]);

    const handleEntityChange = useCallback((value: EntityKeys) => {
        setSelectedEntity(value);
        setHasSelection(false);
        setRecordLabel('Select Record');
    }, []);

    const handleRecordLoad = useCallback((record: EntityData<EntityKeys>) => {
        setHasSelection(true);
    }, []);

    const handleError = useCallback((error: EntityError) => {
        setError(error);
    }, []);

    const handleRecordLabelChange = useCallback((label: string) => {
        setRecordLabel(label);
    }, []);

    const onCreateEntityClick = useCallback(() => {
        console.log('Create new entity clicked');
    }, []);

    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    const QuickReferenceComponent = useMemo(() => {
        if (!selectedEntity) return null;

        const commonProps = {
            entityKey: selectedEntity,
            className: 'w-full',
            density,
            animationPreset,
        };

        const components = {
            cards: <EntityQuickReferenceCardsEnhanced {...commonProps} showCreateNewButton
                                                      onCreateEntityClick={onCreateEntityClick}/>,
            cardsEnhanced: <EntityQuickReferenceCardsEnhanced {...commonProps} showCreateNewButton showMultiSelectButton
                                                              onCreateEntityClick={onCreateEntityClick}/>,
            accordion: <EntityQuickReferenceAccordionEnhanced {...commonProps} />,
            accordionEnhanced: <EntityQuickReferenceAccordionEnhanced {...commonProps} />,
            list: <EntityQuickReferenceList {...commonProps} />,
            select: <EntityQuickReferenceSelect
                {...commonProps}
                onRecordLoad={handleRecordLoad}
                onError={handleError}
                onLabelChange={handleRecordLabelChange}
            />,
        };

        return components[quickReferenceType];
    }, [selectedEntity, quickReferenceType, density, animationPreset, onCreateEntityClick, handleRecordLoad, handleError, handleRecordLabelChange]);

    const renderSplitLayout = useMemo(() => (
        <motion.div
            className={cn(
                "grid h-full overflow-hidden",
                isExpanded ? 'grid-cols-1' : 'grid-cols-[minmax(300px,400px)_1fr]',
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
                        className="flex flex-col gap-4 min-w-0"
                        initial={{opacity: 0, x: -20}}
                        animate={{opacity: 1, x: 0}}
                        exit={{opacity: 0, x: -20}}
                    >
                        <EntitySelectionSection
                            selectedEntity={selectedEntity}
                            handleEntityChange={handleEntityChange}
                            density={density}
                            animationPreset={animationPreset}
                            selectHeight={selectHeight}
                        />

                        {selectedEntity && (
                            <QuickReferenceSection
                                QuickReferenceComponent={QuickReferenceComponent}
                                density={density}
                                animationPreset={animationPreset}
                                cardRef={rightColumnRef}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div className="min-w-0 relative" layout>
                <AnimatePresence mode="sync">
                    {selectedEntity && (
                        <EnhancedCard
                            className="h-full"
                            density={density}
                            size={size}
                            animationPreset={animationPreset}
                        >
                            <div className="absolute top-4 right-4 z-20 flex gap-2">
                                <ExpandButton
                                    isExpanded={isExpanded}
                                    onClick={toggleExpanded}
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
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    ), [selectedEntity, isExpanded, density, size, animationPreset, handleEntityChange, selectHeight, QuickReferenceComponent, toggleExpanded, formOptions]);

    const renderSideBySideLayout = useMemo(() => (
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
                        <EnhancedCard
                            className="flex-shrink-0"
                            density={density}
                            size={size}
                            animationPreset={animationPreset}
                        >
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
                                    density={density}
                                    size={size}
                                    animationPreset={animationPreset}
                                    cardRef={rightColumnRef}
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
                        <EnhancedCard
                            className="h-full relative"
                            density={density}
                            size={size}
                            animationPreset={animationPreset}
                        >
                            <div className="absolute top-4 right-4 z-20 flex gap-2">
                                <ExpandButton
                                    isExpanded={isExpanded}
                                    onClick={toggleExpanded}
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
                             <EnhancedCard
                                 className="text-center max-w-md mx-auto"
                                 density={density}
                                 size={size}
                                 animationPreset={animationPreset}
                             >
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
    ), [selectedEntity, isExpanded, density, size, animationPreset, handleEntityChange, selectHeight, QuickReferenceComponent, toggleExpanded, formOptions]);

    const renderStackedLayout = useMemo(() => (
        <motion.div
            className={cn(
                "flex flex-col h-full overflow-hidden",
                densityConfig[density].spacing
            )}
            variants={layoutTransitions.stacked.container}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <motion.div
                variants={layoutTransitions.stacked.item}
                className="flex-shrink-0"
            >
                <EnhancedCard
                    density={density}
                    size={size}
                    animationPreset={animationPreset}
                >
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

            <AnimatePresence mode="sync">
                {selectedEntity && (
                    <>
                        <motion.div
                            variants={layoutTransitions.stacked.item}
                            className="flex-shrink-0"
                        >
                            <EnhancedCard
                                density={density}
                                size={size}
                                animationPreset={animationPreset}
                                cardRef={rightColumnRef}
                            >
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
                                <CardContent className="p-0">
                                    <ScrollArea className={cn(
                                        densityConfig[density].maxHeight,
                                        "px-4"
                                    )}>
                                        {QuickReferenceComponent}
                                    </ScrollArea>
                                </CardContent>
                            </EnhancedCard>
                        </motion.div>

                        <motion.div
                            variants={layoutTransitions.stacked.item}
                            className="flex-1 min-h-0"
                        >
                            <EnhancedCard
                                className="h-full"
                                density={density}
                                size={size}
                                animationPreset={animationPreset}
                            >
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
        </motion.div>
    ), [selectedEntity, density, size, animationPreset, handleEntityChange, selectHeight, QuickReferenceComponent, onCreateEntityClick, formOptions]);

    const layoutContent = useMemo(() => {
        const layouts = {
            split: renderSplitLayout,
            sideBySide: renderSideBySideLayout,
            stacked: renderStackedLayout
        };
        return layouts[layoutVariant];
    }, [layoutVariant, renderSplitLayout, renderSideBySideLayout, renderStackedLayout]);

    return (
        <div className={cn(
            'w-full h-full relative overflow-hidden',
            densityConfig[density].spacing,
            className
        )}>
            <AnimatePresence mode="sync">
                <motion.div
                    className="h-full"
                    variants={containerVariants[animationPreset]}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    {layoutContent}
                </motion.div>
            </AnimatePresence>

            <AnimatePresence>
                {error && (
                    <motion.div
                        className="fixed bottom-4 right-4 z-50"
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: 20}}
                    >
                        <EnhancedCard
                            className="bg-destructive text-destructive-foreground"
                            density={density}
                            size={size}
                            animationPreset={animationPreset}
                        >
                            <CardContent className="flex items-center gap-2">
                                <p>{error.message}</p>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setError(null)}
                                    className="text-destructive-foreground"
                                >
                                    <ArrowLeft className={densityConfig[density].iconSize}/>
                                </Button>
                            </CardContent>
                        </EnhancedCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

ArmaniLayout.displayName = 'ArmaniLayout';

export default ArmaniLayout;
