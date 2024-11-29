// components/matrx/Entity/prewired-components/layouts/EntitySmartLayout.tsx
'use client';

import React, {useState, useRef, useEffect} from 'react';
import {cn} from '@/lib/utils';
import {QuickReferenceWrapper} from './QuickReferenceWrapper';
import {densityConfig} from "@/config/ui/entity-layout-config";
import {ErrorDisplay} from '../../../field-actions/components/StateComponents';
import {LAYOUT_COMPONENTS} from "../parts";
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityError} from '@/lib/redux/entity/types/stateTypes';
import {DynamicStyleOptions, FormComponentOptions, FormStyleOptions, InlineEntityOptions} from "../types";

interface EntitySmartLayoutProps {
    componentOptions: FormComponentOptions;
    formStyleOptions: FormStyleOptions;
    inlineEntityOptions: InlineEntityOptions;
    dynamicStyleOptions: DynamicStyleOptions;
    className?: string;
}

const EntitySmartLayout: React.FC<EntitySmartLayoutProps> = (
    {
        componentOptions,
        formStyleOptions,
        inlineEntityOptions,
        dynamicStyleOptions,
        className
    }) => {
    // State management (moved from EntityLayoutStateWrapper)
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const [error, setError] = useState<EntityError | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasSelection, setHasSelection] = useState(false);
    const [recordLabel, setRecordLabel] = useState<string>('Select Record');
    const [selectHeight, setSelectHeight] = useState<number>(0);
    const rightColumnRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (rightColumnRef.current) {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setSelectHeight(entry.contentRect.height);
                }
            });

            observer.observe(rightColumnRef.current);
            return () => observer.disconnect();
        }
    }, []);

    const handlers = {
        setIsExpanded,
        handleEntityChange: (value: EntityKeys) => {
            setSelectedEntity(value);
            setHasSelection(false);
            setRecordLabel('Select Record');
        },
        onCreateEntityClick: () => {
            setSelectedEntity(null);
            setHasSelection(false);
            setRecordLabel('Create New Record');
            setIsExpanded(false);
        },
        handleRecordLoad: (record: EntityData<EntityKeys>) => {
            setHasSelection(true);
        },
        handleError: (error: EntityError) => {
            setError(error);
        },
        handleRecordLabelChange: (label: string) => {
            setRecordLabel(label);
        },
        setError
    };

    const LayoutComponent = LAYOUT_COMPONENTS[componentOptions.formLayoutType] || LAYOUT_COMPONENTS.split;

    return (
        <div className={cn(
            'w-full h-full relative overflow-hidden',
            densityConfig[dynamicStyleOptions.density].spacing,
            className
        )}>
            <LayoutComponent
                layoutState={{
                    selectedEntity,
                    isExpanded,
                    rightColumnRef,
                    selectHeight
                }}
                handlers={handlers}
                QuickReferenceComponent={
                    <QuickReferenceWrapper
                        selectedEntity={selectedEntity}
                        quickReferenceType={componentOptions.quickReferenceType}
                        dynamicStyleOptions={dynamicStyleOptions}
                        onRecordLoad={handlers.handleRecordLoad}
                        onError={handlers.handleError}
                        onLabelChange={handlers.handleRecordLabelChange}
                        onCreateEntityClick={handlers.onCreateEntityClick}
                    />
                }
                formStyleOptions={formStyleOptions}
                inlineEntityOptions={inlineEntityOptions}
                dynamicStyleOptions={dynamicStyleOptions}
            />

            {error && <ErrorDisplay error={error}/>}
        </div>
    );
};

export default EntitySmartLayout;
