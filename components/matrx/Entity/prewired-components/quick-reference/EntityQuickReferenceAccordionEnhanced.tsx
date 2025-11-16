'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, Grid2X2, Check } from 'lucide-react';
import { EntityKeys } from '@/types/entityTypes';
import { useQuickReference } from '@/lib/redux/entity/hooks/useQuickReference';
import { motion, AnimatePresence } from 'motion/react';
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

export function EntityQuickReferenceAccordionEnhanced<TEntity extends EntityKeys>({
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
        const baseSize = 180; // Base card width
        const configs = {
            compact: {
                padding: 'p-1 sm:p-2',
                gap: 'gap-1 sm:gap-2',
                cardPadding: 'p-1.5 sm:p-2',
                fontSize: 'text-xs sm:text-sm',
                iconSize: 'h-3 w-3 sm:h-4 sm:w-4',
                maxHeight: 'max-h-[300px]',
                minWidth: baseSize * 0.8,
            },
            normal: {
                padding: 'p-2 sm:p-4',
                gap: 'gap-2 sm:gap-3',
                cardPadding: 'p-2 sm:p-3',
                fontSize: 'text-sm',
                iconSize: 'h-4 w-4',
                maxHeight: 'max-h-[400px]',
                minWidth: baseSize,
            },
            comfortable: {
                padding: 'p-3 sm:p-6',
                gap: 'gap-3 sm:gap-4',
                cardPadding: 'p-3 sm:p-4',
                fontSize: 'text-sm sm:text-base',
                iconSize: 'h-5 w-5',
                maxHeight: 'max-h-[500px]',
                minWidth: baseSize * 1.2,
            },
        };
        return configs[density];
    }, [density]);

    // Animation configurations
    const animationConfig = React.useMemo(() => {
        const configs = {
            none: {
                initial: { opacity: 1, y: 0 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 1, y: 0 },
                transition: { duration: 0 },
                hover: {},
            },
            subtle: {
                initial: { opacity: 0, y: 5 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: -5 },
                transition: { duration: 0.2, delay: (index: number) => index * 0.01 },
                hover: { scale: 1.01 },
            },
            smooth: {
                initial: { opacity: 0, y: 10 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: -10 },
                transition: { duration: 0.2, delay: (index: number) => index * 0.02 },
                hover: { scale: 1.02 },
            },
            energetic: {
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: -20 },
                transition: { duration: 0.3, delay: (index: number) => index * 0.03 },
                hover: { scale: 1.03 },
            },
            playful: {
                initial: { opacity: 0, y: 30, rotate: -5 },
                animate: { opacity: 1, y: 0, rotate: 0 },
                exit: { opacity: 0, y: -30, rotate: 5 },
                transition: { duration: 0.4, delay: (index: number) => index * 0.04 },
                hover: { scale: 1.05, rotate: 2 },
            },
        };
        return configs[animationPreset];
    }, [animationPreset]);

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

    const getTransitionWithDelay = (index: number) => {
        const delayMultiplier = {
            none: 0,
            subtle: 0.01,
            smooth: 0.02,
            energetic: 0.03,
            playful: 0.04,
        }[animationPreset];

        return {
            ...animationConfig.transition,
            delay: index * delayMultiplier,
        };
    };


    return (
        <Accordion
            type="single"
            value={isOpen}
            onValueChange={setIsOpen}
            className={cn('w-full min-w-0', className)}
        >
            <AccordionItem value="items" className="border rounded-lg">
                <AccordionTrigger className={cn("px-2 py-1.5 hover:no-underline", density === 'compact' ? 'px-1.5 py-1' : density === 'comfortable' ? 'px-3 py-2' : 'px-2 py-1.5')}>
                    <span className={cn("font-medium truncate", densityConfig.fontSize)}>
                        {displayLabel}
                    </span>
                </AccordionTrigger>
                <AccordionContent>
                    <div
                        className={cn(
                            "grid auto-rows-fr overflow-y-auto",
                            densityConfig.padding,
                            densityConfig.gap,
                            densityConfig.maxHeight
                        )}
                        style={{
                            gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${densityConfig.minWidth}px), 1fr))`
                        }}
                    >
                        <AnimatePresence>
                            {quickReferenceRecords.slice(0, 100).map((ref, index) => (
                                <motion.div
                                    initial={animationConfig.initial}
                                    animate={animationConfig.animate}
                                    exit={animationConfig.exit}
                                    transition={getTransitionWithDelay(index)}
                                    whileHover={animationPreset !== 'none' ? animationConfig.hover : undefined}
                                    key={ref.recordKey}
                                    className="min-w-0"
                                >
                                    <Card
                                        className={cn(
                                            'group cursor-pointer transition-all',
                                            animationPreset !== 'none' && 'duration-300 hover:bg-accent/50',
                                            isSelected(ref.recordKey) && 'ring-2 ring-primary bg-accent'
                                        )}
                                        onClick={() => handleSelect(ref.recordKey)}
                                    >
                                        <CardContent className={cn(
                                            "flex items-center gap-2 min-w-0",
                                            densityConfig.cardPadding
                                        )}>
                                            <Grid2X2 className={cn(
                                                densityConfig.iconSize,
                                                "flex-shrink-0 text-muted-foreground",
                                                animationPreset !== 'none' && "group-hover:text-primary transition-colors duration-300"
                                            )} />
                                            <span className={cn(
                                                "font-medium truncate",
                                                densityConfig.fontSize,
                                                animationPreset !== 'none' && "group-hover:text-primary transition-colors duration-300"
                                            )}>
                                                {ref.displayValue}
                                            </span>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

export default EntityQuickReferenceAccordionEnhanced;
