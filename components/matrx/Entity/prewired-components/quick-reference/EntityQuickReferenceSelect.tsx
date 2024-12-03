'use client';

import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityError} from '@/lib/redux/entity/types/stateTypes';
import {useQuickReference} from "@/lib/redux/entity/hooks/useQuickReference";
import {AnimationPreset, ComponentDensity} from "@/types/componentConfigTypes";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EntityQuickReferenceSelectProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    onRecordLoad: (record: EntityData<TEntity>) => void;
    onError?: (error: EntityError) => void;
    onLabelChange: (label: string) => void;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
}

function EntityQuickReferenceSelect<TEntity extends EntityKeys>(
    {
        entityKey,
        onRecordLoad,
        onError,
        onLabelChange,
        density = 'normal',
        animationPreset = 'smooth',
    }: EntityQuickReferenceSelectProps<TEntity>) {

    const {
        quickReferenceRecords,
        selectionMode,
        errorState,
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

    // Density-based styling configurations
    const densityConfig = React.useMemo(() => {
        const configs = {
            compact: {
                padding: 'px-2 py-1',
                fontSize: 'text-xs',
                itemPadding: 'py-0.5 px-1.5',
                gap: 'gap-0.5',
                itemHeight: 'h-7',
            },
            normal: {
                padding: 'px-3 py-2',
                fontSize: 'text-sm',
                itemPadding: 'py-1.5 px-2',
                gap: 'gap-1',
                itemHeight: 'h-9',
            },
            comfortable: {
                padding: 'px-4 py-2.5',
                fontSize: 'text-base',
                itemPadding: 'py-2 px-3',
                gap: 'gap-1.5',
                itemHeight: 'h-11',
            },
        };
        return configs[density];
    }, [density]);

    // Animation configurations
    const animationConfig = React.useMemo(() => {
        const configs = {
            none: {
                trigger: {},
                content: {
                    initial: {},
                    animate: {},
                    exit: {}
                },
                item: {},
            },
            subtle: {
                trigger: {
                    whileHover: { scale: 1.01 },
                    whileTap: { scale: 0.99 },
                },
                content: {
                    initial: { opacity: 0, y: -5 },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: 5 },
                },
                item: {
                    whileHover: { x: 2 },
                },
            },
            smooth: {
                trigger: {
                    whileHover: { scale: 1.02 },
                    whileTap: { scale: 0.98 },
                },
                content: {
                    initial: { opacity: 0, y: -10 },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: 10 },
                },
                item: {
                    whileHover: { x: 4 },
                },
            },
            energetic: {
                trigger: {
                    whileHover: { scale: 1.03 },
                    whileTap: { scale: 0.97 },
                },
                content: {
                    initial: { opacity: 0, y: -15 },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: 15 },
                },
                item: {
                    whileHover: { x: 6, scale: 1.02 },
                },
            },
            playful: {
                trigger: {
                    whileHover: { scale: 1.04, rotate: 1 },
                    whileTap: { scale: 0.96, rotate: -1 },
                },
                content: {
                    initial: { opacity: 0, y: -20, rotate: -2 },
                    animate: { opacity: 1, y: 0, rotate: 0 },
                    exit: { opacity: 0, y: 20, rotate: 2 },
                },
                item: {
                    whileHover: { x: 8, scale: 1.03, rotate: 1 },
                },
            },
        };
        return configs[animationPreset];
    }, [animationPreset]);

    const handleSelectionChange = React.useCallback(
        (recordKey: string) => {
            const selectedRecord = quickReferenceRecords.find(
                (record) => record.recordKey === recordKey
            );

            if (selectedRecord) {
                handleRecordSelect(recordKey);
                onRecordLoad(selectedRecord);
                onLabelChange(selectedRecord.displayValue);
            } else if (onError) {
                onError({
                    message: `Record with key ${recordKey} not found.`,
                });
            }
        },
        [quickReferenceRecords, handleRecordSelect, onRecordLoad, onError, onLabelChange]
    );

    React.useEffect(() => {
        if (errorState && onError) {
            onError(errorState);
        }
    }, [errorState, onError]);

    const quickReferenceOptions = quickReferenceRecords.map((record) => ({
        value: record.recordKey,
        label: record.displayValue,
    }));

    const MotionSelectTrigger = motion(SelectTrigger);

    return (
        <Select
            value={quickReferenceOptions.find((record) =>
                isSelected(record.value)
            )?.value || ''}
            onValueChange={handleSelectionChange}
        >
            <MotionSelectTrigger
                className={cn(
                    "bg-card text-card-foreground border-border",
                    densityConfig.padding,
                    densityConfig.fontSize
                )}
                {...(animationPreset !== 'none' ? animationConfig.trigger : {})}
            >
                <SelectValue placeholder="Select a record"/>
            </MotionSelectTrigger>

            <AnimatePresence>
                <SelectContent
                    className={cn(
                        "bg-card overflow-y-auto",
                    )}
                    align="start"
                    side="bottom"
                >
                    {quickReferenceOptions.map(({value, label}) => (
                        <SelectItem
                            key={value}
                            value={value}
                            className={cn(
                                "bg-card text-card-foreground hover:bg-muted",
                            )}
                        >
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </AnimatePresence>
        </Select>
    );
}

export default EntityQuickReferenceSelect;
