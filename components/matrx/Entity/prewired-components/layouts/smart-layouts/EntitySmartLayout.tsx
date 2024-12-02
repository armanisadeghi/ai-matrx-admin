'use client';

import React, {useState, useRef, useEffect} from 'react';
import {cn} from '@/lib/utils';
import {QuickReferenceWrapper} from './QuickReferenceWrapper';
import {densityConfig} from "@/config/ui/entity-layout-config";
import {ErrorDisplay} from '../../../field-actions/components/StateComponents';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityError} from '@/lib/redux/entity/types/stateTypes';
import {DynamicStyleOptions, FormComponentOptions, FormStyleOptions, InlineEntityOptions} from "../types";
import {SMART_LAYOUT_COMPONENTS} from "./";

interface EntitySmartLayoutProps {
    componentOptions: FormComponentOptions;
    formStyleOptions: FormStyleOptions;
    inlineEntityOptions: InlineEntityOptions;
    dynamicStyleOptions: DynamicStyleOptions;
    className?: string;
    entityKey: EntityKeys;
}

const EntitySmartLayout: React.FC<EntitySmartLayoutProps> = (props) => {
    const {componentOptions, formStyleOptions, inlineEntityOptions, dynamicStyleOptions, className} = props;
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys>(props.entityKey);
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

    const LayoutComponent = SMART_LAYOUT_COMPONENTS[componentOptions.formLayoutType] || SMART_LAYOUT_COMPONENTS.split;

    return (
        <div className={cn(
            'w-full h-full',     // Take up all available space
            'relative',          // For error positioning
            'overflow-hidden',   // Prevent container from scrolling
            densityConfig[dynamicStyleOptions.density].spacing,
            className
        )}>
            <div className="w-full h-full relative p-0 gap-0"> {/* Inner container for layout components */}
                <LayoutComponent unifiedLayoutProps={{
                    handlers,
                    QuickReferenceComponent: (
                        <QuickReferenceWrapper
                            selectedEntity={selectedEntity}
                            quickReferenceType={componentOptions.quickReferenceType}
                            dynamicStyleOptions={dynamicStyleOptions}
                            onRecordLoad={handlers.handleRecordLoad}
                            onError={handlers.handleError}
                            onLabelChange={handlers.handleRecordLabelChange}
                            onCreateEntityClick={handlers.onCreateEntityClick}
                        />
                    ),
                    layoutState: {
                        selectedEntity,
                        isExpanded,
                        rightColumnRef,
                        selectHeight
                    },
                    dynamicLayoutOptions: {
                        componentOptions,
                        formStyleOptions,
                        inlineEntityOptions,
                    },
                    dynamicStyleOptions
                }}/>
            </div>

            {error && <ErrorDisplay error={error}/>}
        </div>
    );
}

export default EntitySmartLayout;
