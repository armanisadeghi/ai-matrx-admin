'use client';

import * as React from 'react';
import {cn} from '@/lib/utils';
import {Card, CardContent} from '@/components/ui/card';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Plus, CheckSquare} from 'lucide-react';
import {EntityKeys} from '@/types/entityTypes';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';
import {AnimationPreset, ComponentDensity} from "@/types/componentConfigTypes";
import {motion, AnimatePresence} from 'framer-motion';

interface EntityQuickReferenceListProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    onSelectionChange?: (recordId: string | string[]) => void;
    onCreateEntityClick?: () => void;
    showCreateNewButton?: boolean;
    className?: string;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    [key: string]: any; // Allow additional props

}

function EntityQuickReferenceList<TEntity extends EntityKeys>(
    {
        entityKey,
        onCreateEntityClick,
        showCreateNewButton = false,
        className = '',
        density = 'normal',
        animationPreset = 'smooth',
        ...rest
    }: EntityQuickReferenceListProps<TEntity>) {
    const {
        quickReferenceRecords,
        selectionMode,
        isSelected,
        handleRecordSelect,
        toggleSelectionMode,
    } = useQuickReference(entityKey);

    const densityConfig = React.useMemo(() => {
        const configs = {
            compact: {
                padding: 'p-1',
                gap: 'space-y-1',
                buttonSize: 'xs',
                fontSize: 'text-xs',
                cardPadding: 'p-2',
                headerPadding: 'p-1.5',
                iconSize: 'h-3 w-3',
                checkboxSize: 'h-3 w-3',
                buttonIconGap: 'mr-0.5',
                headerGap: 'mb-1',
                itemGap: 'gap-1',
            },
            normal: {
                padding: 'p-2',
                gap: 'space-y-2',
                buttonSize: 'sm',
                fontSize: 'text-sm',
                cardPadding: 'p-3',
                headerPadding: 'p-2',
                iconSize: 'h-4 w-4',
                checkboxSize: 'h-4 w-4',
                buttonIconGap: 'mr-1',
                headerGap: 'mb-2',
                itemGap: 'gap-2',
            },
            comfortable: {
                padding: 'p-3',
                gap: 'space-y-3',
                buttonSize: 'default',
                fontSize: 'text-base',
                cardPadding: 'p-4',
                headerPadding: 'p-3',
                iconSize: 'h-5 w-5',
                checkboxSize: 'h-5 w-5',
                buttonIconGap: 'mr-2',
                headerGap: 'mb-3',
                itemGap: 'gap-3',
            },
        };
        return configs[density];
    }, [density]);

    // Animation configurations
    const animationConfig = React.useMemo(() => {
        const configs = {
            none: {
                initial: {},
                animate: {},
                exit: {},
                transition: {duration: 0},
                hover: {},
                listItem: {},
            },
            subtle: {
                initial: {opacity: 0, x: -5},
                animate: {opacity: 1, x: 0},
                exit: {opacity: 0, x: 5},
                transition: {duration: 0.2},
                hover: {scale: 1.01},
                listItem: {transition: {staggerChildren: 0.02}},
            },
            smooth: {
                initial: {opacity: 0, x: -10},
                animate: {opacity: 1, x: 0},
                exit: {opacity: 0, x: 10},
                transition: {duration: 0.3},
                hover: {scale: 1.02},
                listItem: {transition: {staggerChildren: 0.03}},
            },
            energetic: {
                initial: {opacity: 0, x: -20},
                animate: {opacity: 1, x: 0},
                exit: {opacity: 0, x: 20},
                transition: {duration: 0.4, type: "spring"},
                hover: {scale: 1.03, y: -2},
                listItem: {transition: {staggerChildren: 0.04}},
            },
            playful: {
                initial: {opacity: 0, x: -30, rotate: -5},
                animate: {opacity: 1, x: 0, rotate: 0},
                exit: {opacity: 0, x: 30, rotate: 5},
                transition: {duration: 0.5, type: "spring", bounce: 0.4},
                hover: {scale: 1.05, rotate: 1},
                listItem: {transition: {staggerChildren: 0.05}},
            },
        };
        return configs[animationPreset];
    }, [animationPreset]);

    const getCardClassName = React.useCallback(
        (recordKey: string) => {
            const baseClasses = cn(
                'cursor-pointer transition-all',
                animationPreset !== 'none' && 'hover:bg-accent/50'
            );
            const isMultiple = selectionMode === 'multiple';
            return cn(
                baseClasses,
                isSelected(recordKey)
                ? `border-primary ${isMultiple ? 'bg-accent' : 'border-2 bg-accent'}`
                : 'border-transparent'
            );
        },
        [selectionMode, isSelected, animationPreset]
    );

    return (
        <div className={cn('h-full flex flex-col border-r', className)}>
            <div className={cn('border-b', densityConfig.headerPadding)}>
                <div className={cn('flex justify-between items-center', densityConfig.headerGap)}>
                    <div className={cn('flex', densityConfig.itemGap)}>
                        {selectionMode !== 'none' && (
                            <Button
                                onClick={toggleSelectionMode}
                                size={densityConfig.buttonSize as any}
                                variant={selectionMode === 'multiple' ? 'secondary' : 'outline'}
                            >
                                <CheckSquare className={cn(densityConfig.iconSize, densityConfig.buttonIconGap)}/>
                                {selectionMode === 'multiple' ? 'Cancel Multi' : 'Multi'}
                            </Button>
                        )}
                        {onCreateEntityClick && showCreateNewButton && (
                            <Button
                                onClick={onCreateEntityClick}
                                size={densityConfig.buttonSize as any}
                            >
                                <Plus className={cn(densityConfig.iconSize, densityConfig.buttonIconGap)}/>
                                New
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            <ScrollArea className="flex-grow">
                <motion.div
                    className={cn(densityConfig.padding, densityConfig.gap)}
                    initial="initial"
                    animate="animate"
                    variants={animationConfig.listItem}
                >
                    <AnimatePresence mode="sync">
                        {quickReferenceRecords.map((ref, index) => (
                            <motion.div
                                key={ref.recordKey}
                                initial={animationConfig.initial}
                                animate={animationConfig.animate}
                                exit={animationConfig.exit}
                                transition={{
                                    ...animationConfig.transition,
                                    delay: index * 0.05,
                                }}
                                whileHover={animationPreset !== 'none' ? animationConfig.hover : undefined}
                            >
                                <Card
                                    className={getCardClassName(ref.recordKey)}
                                    onClick={() => handleRecordSelect(ref.recordKey)}>
                                    <CardContent className={densityConfig.cardPadding}>
                                        <div className={cn('flex items-center', densityConfig.itemGap)}>
                                            {selectionMode === 'multiple' && (
                                                <Checkbox
                                                    checked={isSelected(ref.recordKey)}
                                                    onClick={e => e.stopPropagation()}
                                                    className={densityConfig.checkboxSize}
                                                />
                                            )}
                                            <div className={densityConfig.fontSize}>{ref.displayValue}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </ScrollArea>
        </div>
    );
}

export default EntityQuickReferenceList;
