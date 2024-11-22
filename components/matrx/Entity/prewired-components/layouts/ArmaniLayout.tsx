// EntityLayout.tsx
import React, {useState, useRef, useEffect, MutableRefObject} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {Card, CardHeader, CardTitle, CardContent} from '@/components/ui/card';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityError} from '@/lib/redux/entity/types';
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {ScrollArea} from "@/components/ui/scroll-area";
import EntityContent from "@/components/matrx/Entity/prewired-components/development/EntityContent";
import EntitySelection from '../entity-management/EntitySelection';
import {
    EntityQuickReferenceAccordionEnhanced,
    EntityQuickReferenceCardsEnhanced,
    EntityQuickReferenceList,
    EntityQuickReferenceSelect
} from '../quick-reference';
import {ComponentDensity} from "@/types/componentConfigTypes";
import {
    cardVariants, containerVariants,
    densityConfig, getAnimationVariants, layoutTransitions
} from "@/config/ui/entity-layout-config";
import {ArmaniLayoutProps} from "@/components/matrx/Entity/prewired-components/layouts/layout-sections/types";


const LayoutHeader: React.FC<{
    title: string;
    tooltip?: string;
    density: ComponentDensity;
    actions?: React.ReactNode;
}> = ({title, tooltip, density, actions}) => (
    <CardHeader className="space-y-1.5">
        <div className="flex items-center justify-between">
            <CardTitle className={cn(
                "flex items-center gap-2",
                densityConfig[density].fontSize
            )}>
                {title}
                {tooltip && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <HelpCircle className={cn(
                                    "text-muted-foreground",
                                    densityConfig[density].iconSize
                                )}/>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{tooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </CardTitle>
            {actions}
        </div>
    </CardHeader>
);

const ExpandButton: React.FC<{
    isExpanded: boolean;
    onClick: () => void;
    density: ComponentDensity;
}> = ({isExpanded, onClick, density}) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClick}
                    className="transition-all duration-200"
                >
                    {isExpanded ?
                     <Minimize2 className={densityConfig[density].iconSize}/> :
                     <Maximize2 className={densityConfig[density].iconSize}/>
                    }
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{isExpanded ? 'Collapse view' : 'Expand view'}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);


interface EnhancedCardProps {
    children: React.ReactNode,
    className?: string,
    variants?: any,
    noAnimation?: boolean,
    cardRef?: React.RefObject<HTMLDivElement>,
    ref?: MutableRefObject<HTMLDivElement>
}


const ArmaniLayout: React.FC<ArmaniLayoutProps> = (
    {
        className,
        density = 'normal',
        animationPreset = 'smooth',
        layoutVariant = 'split',
        size = 'md',
        splitRatio = 25,
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

    // Preserve all existing handlers
    const handleEntityChange = (value: EntityKeys) => {
        setSelectedEntity(value);
        setHasSelection(false);
        setRecordLabel('Select Record');
    };

    const handleRecordLoad = (record: EntityData<EntityKeys>) => {
        setHasSelection(true);
    };

    const handleError = (error: EntityError) => {
        setError(error);
    };

    const handleRecordLabelChange = (label: string) => {
        setRecordLabel(label);
    };

    const onCreateEntityClick = () => {
        console.log('Create new entity clicked');
    };

    // Enhanced QuickReference component selection
    const QuickReferenceComponent = React.useMemo(() => {
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
    }, [selectedEntity, quickReferenceType, density, animationPreset]);

    // Enhanced Card component with proper density and animation
    const EnhancedCard: React.FC<EnhancedCardProps> = (
        {
            children,
            className,
            variants,
            noAnimation,
            cardRef,
            ref
        }) => (
        <motion.div
            variants={!noAnimation ? variants || cardVariants[animationPreset] : undefined}
            className="w-full"
        >
            <Card
                ref={cardRef}
                className={cn(
                    'relative border shadow-sm',
                    densityConfig[density].padding[size],
                    className
                )}
            >
                {children}
            </Card>
        </motion.div>
    );

    // Layout content with enhanced styling and animations
    const getLayoutContent = () => {
        const layouts = {
            split: (
                <motion.div
                    className="relative h-full overflow-hidden"
                >
                    <motion.div
                        className={cn(
                            "grid h-full overflow-hidden mt-12", // added margin-top for the slider
                            isExpanded ? 'grid-cols-1' : 'grid-cols-[minmax(300px,1fr)_1fr]',
                            densityConfig[density].spacing
                        )}
                        style={{
                            gridTemplateColumns: isExpanded ? '1fr' : `${splitRatio}% ${100 - splitRatio}%`
                        }}
                        variants={containerVariants[animationPreset]}
                        initial="initial"
                        animate="animate"
                        exit="exit">
                        <AnimatePresence mode="wait">
                            {!isExpanded && (
                                <motion.div
                                    className="flex flex-col gap-4 min-w-0"
                                    initial={{opacity: 0, x: -20}}
                                    animate={{opacity: 1, x: 0}}
                                    exit={{opacity: 0, x: -20}}
                                >
                                    <EnhancedCard>
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

                                    {selectedEntity && (
                                        <EnhancedCard cardRef={rightColumnRef}>
                                            <CardHeader className="space-y-1.5">
                                                <CardTitle className={densityConfig[density].fontSize}>
                                                    Quick Reference
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <ScrollArea className={densityConfig[density].maxHeight}>
                                                    {QuickReferenceComponent}
                                                </ScrollArea>
                                            </CardContent>
                                        </EnhancedCard>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.div
                            className="min-w-0 relative"
                            layout
                        >
                            <AnimatePresence mode="wait">
                                {selectedEntity ? (
                                    <EnhancedCard className="h-full">
                                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setIsExpanded(!isExpanded)}
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
                                        <EntityContent
                                            entityKey={selectedEntity}
                                            density={density}
                                            animationPreset={animationPreset}
                                            formOptions={formOptions}
                                        />
                                    </EnhancedCard>
                                ) : null}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                </motion.div>
            ),

            sideBySide: (
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
                    <AnimatePresence mode="wait">
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

                                <AnimatePresence mode="wait">
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
                        <AnimatePresence mode="wait">
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
            ),

            stacked: (
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

                    <AnimatePresence mode="wait">
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
                                    <EnhancedCard className="h-full">
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
            )
        };

        return layouts[layoutVariant];
    };

    return (
        <div className={cn(
            'w-full h-full relative overflow-hidden',
            densityConfig[density].spacing,
            className
        )}>
            <AnimatePresence mode="wait">
                <motion.div
                    className="h-full"
                    variants={containerVariants[animationPreset]}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    {getLayoutContent()}
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
                        <EnhancedCard className="bg-destructive text-destructive-foreground">
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
};

export default ArmaniLayout;
