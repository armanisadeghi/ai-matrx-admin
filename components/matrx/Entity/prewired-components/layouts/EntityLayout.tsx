// EntityLayout.tsx
import React, {useState, useRef, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {Card, CardHeader, CardTitle} from '@/components/ui/card';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityError} from '@/lib/redux/entity/types/stateTypes';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';
import {cn} from '@/lib/utils';
import {animationPresets, densityConfig} from "@/config/ui/FlexConfig";
import EntityContent from "@/components/matrx/Entity/prewired-components/development/EntityContent";
import EntitySelection from '../entity-management/EntitySelection';
import {
    EntityQuickReferenceAccordion,
    EntityQuickReferenceAccordionEnhanced,
    EntityQuickReferenceCards,
    EntityQuickReferenceCardsEnhanced,
    EntityQuickReferenceList,
    EntityQuickReferenceSelect
} from '../quick-reference';




import {
    AnimationPreset,
    ComponentDensity,
    ComponentSize,
    FormColumnOptions,
    FormDirectionOptions,
    FormLayoutOptions,
    LayoutVariant, QuickReferenceComponentType
} from "@/types/componentConfigTypes";


const layoutTransitionVariants = {
    split: {
        container: {
            initial: {opacity: 0},
            animate: {opacity: 1},
            exit: {opacity: 0},
            transition: {duration: 0.3}
        },
        sidebar: {
            initial: {x: -20, opacity: 0},
            animate: {x: 0, opacity: 1},
            transition: {delay: 0.2}
        },
        content: {
            initial: {x: 20, opacity: 0},
            animate: {x: 0, opacity: 1},
            transition: {delay: 0.3}
        }
    },
    sideBySide: {
        container: {
            initial: {opacity: 0, scale: 0.95},
            animate: {opacity: 1, scale: 1},
            exit: {opacity: 0, scale: 0.95},
            transition: {duration: 0.3}
        },
        left: {
            initial: {y: 20, opacity: 0},
            animate: {y: 0, opacity: 1},
            transition: {delay: 0.2}
        },
        right: {
            initial: {y: -20, opacity: 0},
            animate: {y: 0, opacity: 1},
            transition: {delay: 0.3}
        }
    },
    stacked: {
        container: {
            initial: {opacity: 0},
            animate: {opacity: 1},
            transition: {duration: 0.3, staggerChildren: 0.1}
        },
        item: {
            initial: {y: 20, opacity: 0},
            animate: {y: 0, opacity: 1},
            transition: {duration: 0.3}
        }
    }
};

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


const EntityLayout: React.FC<EntityLayoutProps> = (
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

    const QuickReferenceComponent = React.useMemo(() => {
        if (!selectedEntity) return null;

        const commonProps = {
            entityKey: selectedEntity,
            className: 'w-full',
            density,
            animationPreset,
        };

        const components = {
            cards: <EntityQuickReferenceCards {...commonProps} showCreateNewButton
                                              onCreateEntityClick={onCreateEntityClick}/>,
            cardsEnhanced: <EntityQuickReferenceCardsEnhanced {...commonProps} showCreateNewButton showMultiSelectButton
                                                              onCreateEntityClick={onCreateEntityClick}/>,
            accordion: <EntityQuickReferenceAccordion {...commonProps} />,
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

    const densityStyles = densityConfig[density];
    const animation = animationPresets[animationPreset];

    const getLayoutContent = () => {
        const commonCardProps = {
            className: cn(
                densityStyles.padding[size],
                'relative overflow-hidden'
            )
        };

        const layouts = {
            split: (
                <motion.div
                    className="grid grid-cols-[400px_1fr] gap-4 h-full"
                    variants={layoutTransitionVariants.split.container}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    <motion.div
                        className="flex flex-col gap-4"
                        variants={layoutTransitionVariants.split.sidebar}
                    >
                        <Card {...commonCardProps}>
                            <CardHeader>
                                <CardTitle>Select Entity</CardTitle>
                                <EntitySelection
                                    selectedEntity={selectedEntity}
                                    onEntityChange={handleEntityChange}
                                    layout="sideBySide"
                                    selectHeight={selectHeight}
                                    density={density}
                                    animationPreset={animationPreset}
                                />
                            </CardHeader>
                        </Card>

                        <AnimatePresence mode="sync">
                            {selectedEntity && (
                                <motion.div
                                    initial={{opacity: 0, y: 20}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, y: -20}}
                                >
                                    <Card {...commonCardProps} ref={rightColumnRef}>
                                        <CardHeader>
                                            <CardTitle>Quick Reference</CardTitle>
                                        </CardHeader>
                                        {QuickReferenceComponent}
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <motion.div
                        variants={layoutTransitionVariants.split.content}
                        className={cn(
                            'transition-all duration-300',
                            isExpanded && 'col-span-2'
                        )}
                    >
                        <AnimatePresence mode="sync">
                            {selectedEntity ? (
                                <Card {...commonCardProps} className="h-full">
                                    <div className="absolute top-4 right-4 z-20">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setIsExpanded(!isExpanded)}
                                        >
                                            {isExpanded ? <Minimize2 className="h-4 w-4"/> : <Maximize2 className="h-4 w-4"/>}
                                        </Button>
                                    </div>
                                    <EntityContent
                                        entityKey={selectedEntity}
                                        density={density}
                                        animationPreset={animationPreset}
                                        formOptions={formOptions}
                                    />
                                </Card>
                            ) : (
                                 <motion.div
                                     className="h-full flex items-center justify-center"
                                     initial={{opacity: 0}}
                                     animate={{opacity: 1}}
                                     exit={{opacity: 0}}
                                 >
                                     <Card className="p-8 text-center text-muted-foreground">
                                         <p>Select an entity to begin</p>
                                     </Card>
                                 </motion.div>
                             )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            ),

            sideBySide: (
                <motion.div
                    className="grid grid-cols-2 gap-4 h-full"
                    variants={layoutTransitionVariants.sideBySide.container}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    <motion.div
                        className="flex flex-col gap-4"
                        variants={layoutTransitionVariants.sideBySide.left}
                    >
                        <Card {...commonCardProps}>
                            <CardHeader>
                                <CardTitle>Entity Selection</CardTitle>
                                <EntitySelection
                                    selectedEntity={selectedEntity}
                                    onEntityChange={handleEntityChange}
                                    layout="sideBySide"
                                    selectHeight={selectHeight}
                                    density={density}
                                    animationPreset={animationPreset}
                                />
                            </CardHeader>
                        </Card>

                        <AnimatePresence mode="sync">
                            {selectedEntity && (
                                <motion.div
                                    initial={{opacity: 0, scale: 0.95}}
                                    animate={{opacity: 1, scale: 1}}
                                    exit={{opacity: 0, scale: 0.95}}
                                >
                                    <Card {...commonCardProps} ref={rightColumnRef}>
                                        {QuickReferenceComponent}
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <motion.div
                        variants={layoutTransitionVariants.sideBySide.right}
                        className="h-full"
                    >
                        <AnimatePresence mode="sync">
                            {selectedEntity ? (
                                <Card {...commonCardProps} className="h-full">
                                    <EntityContent
                                        entityKey={selectedEntity}
                                        density={density}
                                        animationPreset={animationPreset}
                                        formOptions={formOptions}
                                    />
                                </Card>
                            ) : (
                                 <motion.div
                                     className="h-full flex items-center justify-center"
                                     initial={{opacity: 0}}
                                     animate={{opacity: 1}}
                                     exit={{opacity: 0}}
                                 >
                                     <Card className="p-8 text-center text-muted-foreground">
                                         <p>Select an entity to begin</p>
                                     </Card>
                                 </motion.div>
                             )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            ),

            stacked: (
                <motion.div
                    className="flex flex-col gap-4"
                    variants={layoutTransitionVariants.stacked.container}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    <motion.div variants={layoutTransitionVariants.stacked.item}>
                        <Card {...commonCardProps}>
                            <CardHeader>
                                <CardTitle>Entity Selection</CardTitle>
                                <EntitySelection
                                    selectedEntity={selectedEntity}
                                    onEntityChange={handleEntityChange}
                                    layout="stacked"
                                    selectHeight={selectHeight}
                                    density={density}
                                    animationPreset={animationPreset}
                                />
                            </CardHeader>
                        </Card>
                    </motion.div>

                    <AnimatePresence mode="sync">
                        {selectedEntity && (
                            <motion.div
                                variants={layoutTransitionVariants.stacked.item}
                                initial={{opacity: 0, y: 20}}
                                animate={{opacity: 1, y: 0}}
                                exit={{opacity: 0, y: -20}}
                            >
                                <Card {...commonCardProps} ref={rightColumnRef}>
                                    {QuickReferenceComponent}
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence mode="sync">
                        {selectedEntity && (
                            <motion.div variants={layoutTransitionVariants.stacked.item}>
                                <Card {...commonCardProps}>
                                    <EntityContent
                                        entityKey={selectedEntity}
                                        density={density}
                                        animationPreset={animationPreset}
                                        formOptions={formOptions}
                                    />
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )
        };

        return layouts[layoutVariant];
    };

    return (
        <div className={cn(
            'w-full h-full',
            densityStyles.spacing,
            className
        )}>
            <AnimatePresence mode="sync">
                <motion.div
                    className="h-full"
                    {...animation}
                >
                    {getLayoutContent()}
                </motion.div>
            </AnimatePresence>

            {error && (
                <motion.div
                    className="fixed bottom-4 right-4"
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: 20}}
                >
                    <Card className="bg-destructive text-destructive-foreground p-4">
                        <p>{error.message}</p>
                    </Card>
                </motion.div>
            )}
        </div>

    );
};

export default EntityLayout;
