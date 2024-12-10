'use client';

import React, {useState, useRef, useEffect} from 'react';
import {cn} from '@/lib/utils';
import {QuickReferenceWrapper} from './QuickReferenceWrapper';
import {densityConfig} from "@/config/ui/entity-layout-config";
import {ErrorDisplay} from '../../../field-actions/components/StateComponents';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityError} from '@/lib/redux/entity/types/stateTypes';
import {SMART_LAYOUT_COMPONENTS} from "./";
import { UnifiedLayoutProps } from "@/components/matrx/Entity";

const EntitySmartLayout: React.FC<UnifiedLayoutProps> = (props) => {
    const {
        dynamicStyleOptions,
        dynamicLayoutOptions: {
            componentOptions,
            formStyleOptions,
            inlineEntityOptions
        }
    } = props;

    const className = 'className' in props ? (props as any).className : undefined;

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
            props.layoutState.selectedEntity = value;
            setHasSelection(false);
            setRecordLabel('Select Record');
        },
        onCreateEntityClick: () => {
            props.layoutState.selectedEntity = null;
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

    const modifiedProps: UnifiedLayoutProps = {
        ...props,
        handlers,
        QuickReferenceComponent: (
            <QuickReferenceWrapper
                selectedEntity={props.layoutState.selectedEntity}
                quickReferenceType={componentOptions.quickReferenceType}
                dynamicStyleOptions={dynamicStyleOptions}
                onRecordLoad={handlers.handleRecordLoad}
                onError={handlers.handleError}
                onLabelChange={handlers.handleRecordLabelChange}
                onCreateEntityClick={handlers.onCreateEntityClick}
            />
        ),
        layoutState: {
            ...props.layoutState,
            isExpanded,
            rightColumnRef,
            selectHeight,
        }
    };

    return (
        <div className={cn(
            'w-full h-full',
            'relative',
            'overflow-hidden',
            densityConfig[dynamicStyleOptions.density].spacing,
            className
        )}>
            <div className="w-full h-full relative p-0 gap-0">
                <LayoutComponent {...modifiedProps} />
            </div>

            {error && <ErrorDisplay error={error}/>}
        </div>
    );
}

export default EntitySmartLayout;
