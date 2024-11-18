// EntityLayout.tsx
import React, {useState, useRef, useEffect} from 'react';
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
import {FormColumnOptions, FormDirectionOptions, FormLayoutOptions} from "@/types/componentConfigTypes";

// Types
export type LayoutVariant = 'split' | 'sideBySide' | 'stacked';
export type ComponentDensity = 'compact' | 'normal' | 'comfortable';
export type AnimationPreset = 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful';
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type QuickReferenceComponentType =
    | 'cards'
    | 'cardsEnhanced'
    | 'accordion'
    | 'accordionEnhanced'
    | 'list'
    | 'select';


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

// Enhanced layout transitions
const layoutTransitions = {
    split: {
        container: {
            initial: {opacity: 0},
            animate: {opacity: 1},
            exit: {opacity: 0},
            transition: {duration: 0.3, staggerChildren: 0.1}
        },
        sidebar: {
            initial: {opacity: 0, x: -20},
            animate: {opacity: 1, x: 0},
            exit: {opacity: 0, x: -20},
            transition: {duration: 0.3}
        },
        content: {
            initial: {opacity: 0, scale: 0.98},
            animate: {opacity: 1, scale: 1},
            exit: {opacity: 0, scale: 0.98},
            transition: {duration: 0.3}
        }
    },
    sideBySide: {
        container: {
            initial: {opacity: 0},
            animate: {opacity: 1},
            exit: {opacity: 0},
            transition: {duration: 0.3, staggerChildren: 0.1}
        },
        left: {
            initial: {opacity: 0, x: -20},
            animate: {opacity: 1, x: 0},
            exit: {opacity: 0, x: -20},
            transition: {duration: 0.3}
        },
        right: {
            initial: {opacity: 0, x: 20},
            animate: {opacity: 1, x: 0},
            exit: {opacity: 0, x: 20},
            transition: {duration: 0.3}
        }
    },
    stacked: {
        container: {
            initial: {opacity: 0},
            animate: {opacity: 1},
            exit: {opacity: 0},
            transition: {duration: 0.3, staggerChildren: 0.1}
        },
        item: {
            initial: {opacity: 0, y: 20},
            animate: {opacity: 1, y: 0},
            exit: {opacity: 0, y: -20},
            transition: {duration: 0.3}
        }
    }
};

// Enhanced animation variants based on preset
const getAnimationVariants = (preset: AnimationPreset) => ({
    none: {
        initial: {},
        animate: {},
        exit: {},
        transition: {duration: 0}
    },
    subtle: {
        initial: {opacity: 0},
        animate: {opacity: 1},
        exit: {opacity: 0},
        transition: {duration: 0.2}
    },
    smooth: {
        initial: {opacity: 0, y: 10},
        animate: {opacity: 1, y: 0},
        exit: {opacity: 0, y: -10},
        transition: {duration: 0.3}
    },
    energetic: {
        initial: {opacity: 0, scale: 0.95, y: 20},
        animate: {opacity: 1, scale: 1, y: 0},
        exit: {opacity: 0, scale: 0.95, y: -20},
        transition: {
            duration: 0.4,
            type: "spring",
            stiffness: 300,
            damping: 25
        }
    },
    playful: {
        initial: {opacity: 0, scale: 0.9, rotate: -2},
        animate: {opacity: 1, scale: 1, rotate: 0},
        exit: {opacity: 0, scale: 0.9, rotate: 2},
        transition: {
            duration: 0.5,
            type: "spring",
            stiffness: 200,
            damping: 20
        }
    }
});

// Animation Variants
const containerVariants = {
    none: {
        initial: {},
        animate: {},
        exit: {},
    },
    subtle: {
        initial: {opacity: 0},
        animate: {opacity: 1},
        exit: {opacity: 0},
        transition: {duration: 0.2}
    },
    smooth: {
        initial: {opacity: 0, y: 10},
        animate: {opacity: 1, y: 0},
        exit: {opacity: 0, y: -10},
        transition: {duration: 0.3, ease: 'easeInOut'}
    },
    energetic: {
        initial: {opacity: 0, scale: 0.95},
        animate: {opacity: 1, scale: 1},
        exit: {opacity: 0, scale: 0.95},
        transition: {duration: 0.4, type: 'spring', stiffness: 300, damping: 25}
    },
    playful: {
        initial: {opacity: 0, scale: 0.9, rotate: -2},
        animate: {opacity: 1, scale: 1, rotate: 0},
        exit: {opacity: 0, scale: 0.9, rotate: 2},
        transition: {duration: 0.5, type: 'spring', stiffness: 200, damping: 20}
    }
};

const cardVariants = {
    none: {},
    subtle: {
        initial: {opacity: 0},
        animate: {opacity: 1},
        transition: {duration: 0.2}
    },
    smooth: {
        initial: {opacity: 0, y: 20},
        animate: {opacity: 1, y: 0},
        transition: {duration: 0.3}
    },
    energetic: {
        initial: {opacity: 0, scale: 0.95, y: 20},
        animate: {opacity: 1, scale: 1, y: 0},
        transition: {type: 'spring', stiffness: 300, damping: 25}
    },
    playful: {
        initial: {opacity: 0, scale: 0.9, rotate: -2},
        animate: {opacity: 1, scale: 1, rotate: 0},
        transition: {type: 'spring', stiffness: 200, damping: 20}
    }
};

// Density Configurations
const densityConfig = {
    compact: {
        spacing: 'gap-2',
        padding: {
            xs: 'p-2',
            sm: 'p-3',
            md: 'p-4',
            lg: 'p-5',
            xl: 'p-6'
        },
        fontSize: 'text-sm',
        iconSize: 'h-4 w-4',
        buttonSize: 'size-sm',
        maxHeight: 'max-h-[500px]'
    },
    normal: {
        spacing: 'gap-4',
        padding: {
            xs: 'p-3',
            sm: 'p-4',
            md: 'p-5',
            lg: 'p-6',
            xl: 'p-8'
        },
        fontSize: 'text-base',
        iconSize: 'h-5 w-5',
        buttonSize: 'size-default',
        maxHeight: 'max-h-[600px]'
    },
    comfortable: {
        spacing: 'gap-6',
        padding: {
            xs: 'p-4',
            sm: 'p-6',
            md: 'p-8',
            lg: 'p-10',
            xl: 'p-12'
        },
        fontSize: 'text-lg',
        iconSize: 'h-6 w-6',
        buttonSize: 'size-lg',
        maxHeight: 'max-h-[700px]'
    }
};

// Props Interface
export interface EntityLayoutProps {
    className?: string;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    layoutVariant?: LayoutVariant;
    size?: ComponentSize;
    quickReferenceType?: QuickReferenceComponentType;
    formOptions?: {
        size?: ComponentSize;
        formLayout?: FormLayoutOptions;
        formColumns?: FormColumnOptions;
        formDirection?: FormDirectionOptions;
        formEnableSearch?: boolean;
        formIsSinglePage?: boolean;
        formIsFullPage?: boolean;
    };
}

interface EnhancedCardProps {
    children: React.ReactNode;
    className?: string;
    variants?: any;
    noAnimation?: boolean;
    cardRef?: React.RefObject<HTMLDivElement>;  // Add this instead of using ref directly
}


const ArmaniLayout: React.FC<EntityLayoutProps> = (
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

    // Preserve existing resize observer functionality
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
            cardRef
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
                    <AnimatePresence mode="wait">
                        {!isExpanded && (
                            <motion.div
                                className="flex flex-col gap-4 min-w-0"
                                initial={{opacity: 0, x: -20}}
                                animate={{opacity: 1, x: 0}}
                                exit={{opacity: 0, x: -20}}
                            >
                                <EnhancedCard>
                                    <CardHeader className="space-y-1.5">
                                        <CardTitle className={cn(
                                            "flex items-center gap-2",
                                            densityConfig[density].fontSize
                                        )}>
                                            Select Entity
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className={cn(
                                                            "text-muted-foreground",
                                                            densityConfig[density].iconSize
                                                        )}/>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Choose an entity to work with</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </CardTitle>
                                    </CardHeader>
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
