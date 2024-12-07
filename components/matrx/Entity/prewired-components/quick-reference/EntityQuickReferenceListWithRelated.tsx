// components/EntityQuickReferenceListWithRelated.tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, CheckSquare } from 'lucide-react';
import { EntityKeys } from '@/types/entityTypes';
import { useQuickReference } from '@/lib/redux/entity/hooks/useQuickReference';
import { AnimationPreset, ComponentDensity } from "@/types/componentConfigTypes";
import { motion, AnimatePresence } from 'framer-motion';
import { getDensityConfig, getAnimationConfig } from './componentConfig';

interface EntityQuickReferenceListProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    onSelectionChange?: (recordId: string | string[]) => void;
    onCreateEntityClick?: () => void;
    showCreateNewButton?: boolean;
    className?: string;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    [key: string]: any;
}

function EntityQuickReferenceListWithRelated<TEntity extends EntityKeys>(
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
        fetchMode,
        entityDisplayName,
        setFetchMode,
    } = useQuickReference(entityKey);

    React.useEffect(() => {
        setFetchMode('fkIfk');
    }, [entityKey]);

    const densityConfig = React.useMemo(() => getDensityConfig(density), [density]);
    const animationConfig = React.useMemo(() => getAnimationConfig(animationPreset), [animationPreset]);

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

export default EntityQuickReferenceListWithRelated;
