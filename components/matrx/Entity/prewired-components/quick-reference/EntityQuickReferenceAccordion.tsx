'use client';

import * as React from 'react';
import {cn} from '@/lib/utils';
import {Card, CardContent} from '@/components/ui/card';
import {Check, ChevronDown, Grid2X2} from 'lucide-react';
import {EntityKeys} from '@/types/entityTypes';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';
import {motion, AnimatePresence} from 'framer-motion';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {AnimationPreset, ComponentDensity} from "@/types/componentConfigTypes";

interface EntityQuickReferenceAccordionBaseProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    onSelectionChange?: (recordId: string) => void;
    className?: string;
    customLabel?: string;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
}

export function EntityQuickReferenceAccordion<TEntity extends EntityKeys>(
    {
        entityKey,
        className = '',
        customLabel,
        density = 'normal',
        animationPreset = 'smooth',
    }: EntityQuickReferenceAccordionBaseProps<TEntity>) {

    const {
        quickReferenceRecords,
        selectionMode,
        isSelected,
        handleRecordSelect,
        toggleSelectionMode,
        fetchMode,
        entityDisplayName,
        setFetchMode,
    } = useQuickReference(entityKey);

    React.useEffect(() => {
        setFetchMode('fkIfk');
    }, [entityKey]);

    const [isOpen, setIsOpen] = React.useState<string>('items');
    const selectedRecord = React.useMemo(() =>
            quickReferenceRecords.find(record => isSelected(record.recordKey)),
        [quickReferenceRecords, isSelected]
    );

    // Density-based styling configurations
    const densityConfig = React.useMemo(() => {
        const configs = {
            compact: {
                padding: 'px-2 py-1.5',
                fontSize: 'text-xs',
                iconSize: 'h-3 w-3',
                maxHeight: 'max-h-[250px]',
                spacing: 'py-1',
                headerPadding: 'px-2 py-1.5',
                headerFontSize: 'text-base',
            },
            normal: {
                padding: 'px-4 py-2',
                fontSize: 'text-sm',
                iconSize: 'h-4 w-4',
                maxHeight: 'max-h-[300px]',
                spacing: 'py-2',
                headerPadding: 'px-4 py-2',
                headerFontSize: 'text-lg',
            },
            comfortable: {
                padding: 'px-6 py-3',
                fontSize: 'text-base',
                iconSize: 'h-5 w-5',
                maxHeight: 'max-h-[400px]',
                spacing: 'py-3',
                headerPadding: 'px-6 py-3',
                headerFontSize: 'text-xl',
            },
        };
        return configs[density];
    }, [density]);

    // Animation configurations
    const animationConfig = React.useMemo(() => {
        const configs = {
            none: {
                initial: {opacity: 1, x: 0},
                animate: {opacity: 1, x: 0},
                exit: {opacity: 1, x: 0},
                hover: {},
            },
            subtle: {
                initial: {opacity: 0, x: -2},
                animate: {opacity: 1, x: 0},
                exit: {opacity: 0, x: 2},
                hover: {x: 2},
            },
            smooth: {
                initial: {opacity: 0, x: -5},
                animate: {opacity: 1, x: 0},
                exit: {opacity: 0, x: 5},
                hover: {x: 4},
            },
            energetic: {
                initial: {opacity: 0, x: -10},
                animate: {opacity: 1, x: 0},
                exit: {opacity: 0, x: 10},
                hover: {x: 6},
            },
            playful: {
                initial: {opacity: 0, x: -15, scale: 0.95},
                animate: {opacity: 1, x: 0, scale: 1},
                exit: {opacity: 0, x: 15, scale: 0.95},
                hover: {x: 8, scale: 1.02},
            },
        };
        return configs[animationPreset];
    }, [animationPreset]);

    const getTransitionWithDelay = (index: number) => {
        const delayMultiplier = {
            none: 0,
            subtle: 0.01,
            smooth: 0.02,
            energetic: 0.03,
            playful: 0.04,
        }[animationPreset];

        return {
            duration: {
                none: 0,
                subtle: 0.15,
                smooth: 0.2,
                energetic: 0.25,
                playful: 0.3,
            }[animationPreset],
            delay: index * delayMultiplier,
        };
    };

    React.useEffect(() => {
        setIsOpen('items');
    }, [entityKey]);

    const handleSelect = (recordKey: string) => {
        handleRecordSelect(recordKey);
        setIsOpen('');
    };

    const displayLabel = selectedRecord
                         ? `Selected: ${selectedRecord.displayValue}`
                         : (customLabel ?? `Select ${entityDisplayName}`);

    return (
        <Accordion
            type="single"
            value={isOpen}
            onValueChange={setIsOpen}
            className={cn('w-full min-w-0', className)}
        >
            <AccordionItem value="items" className="border rounded-lg">
                <AccordionTrigger
                    className={cn(
                        "hover:no-underline",
                        densityConfig.headerPadding
                    )}
                >
                    <span className={cn(
                        "font-medium truncate",
                        densityConfig.headerFontSize
                    )}>
                        {displayLabel}
                    </span>
                </AccordionTrigger>
                <AccordionContent>
                    <div className={cn(
                        "overflow-y-auto",
                        densityConfig.spacing,
                        densityConfig.maxHeight
                    )}>
                        <AnimatePresence>
                            {quickReferenceRecords.slice(0, 100).map((ref, index) => (
                                <motion.div
                                    initial={animationConfig.initial}
                                    animate={animationConfig.animate}
                                    exit={animationConfig.exit}
                                    transition={getTransitionWithDelay(index)}
                                    whileHover={animationPreset !== 'none' ? animationConfig.hover : undefined}
                                    key={ref.recordKey}
                                >
                                    <button
                                        className={cn(
                                            'w-full text-left transition-colors duration-200',
                                            'hover:bg-accent flex items-center justify-between gap-2',
                                            densityConfig.padding,
                                            densityConfig.fontSize,
                                            isSelected(ref.recordKey) && 'bg-accent text-accent-foreground'
                                        )}
                                        onClick={() => handleSelect(ref.recordKey)}
                                    >
                                        <span className="truncate">{ref.displayValue}</span>
                                        {isSelected(ref.recordKey) && (
                                            <Check className={densityConfig.iconSize}/>
                                        )}
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

export default EntityQuickReferenceAccordion;
