'use client';
import React, {useState, useEffect, useRef, useMemo} from 'react';
import {cn} from '@/lib/utils';
import {ScrollArea} from '@/components/ui';
import {EntitySelection, UnifiedLayoutProps} from "@/components/matrx/Entity";
import {useWindowSize} from "@uidotdev/usehooks";
import DynamicQuickReference from '@/app/entities/quick-reference/dynamic-quick-ref/DynamicQuickReference';
import {EntityKeys} from '@/types/entityTypes';
import { getEntityFormComponent } from '../forms';

const LeftColumn: React.FC<{
    selectedEntity: EntityKeys | null;
    onEntityChange: (value: EntityKeys) => void;
    updateKey: number;
    availableHeight: number;
    unifiedLayoutProps: UnifiedLayoutProps;
}> = ({selectedEntity, onEntityChange, updateKey, availableHeight, unifiedLayoutProps}) => (
    <div className="w-[340px] min-w-[340px] max-w-[340px] border-r border-border" style={{height: availableHeight}}>
        <ScrollArea className="h-full">
            <div className="w-full overflow-hidden">
                <EntitySelection
                    key={`selection-${updateKey}`}
                    selectedEntity={selectedEntity}
                    onEntityChange={onEntityChange}
                    layout="sideBySide"
                    className="max-w-[320px]"
                />
                {selectedEntity && (
                    <div className="flex-1 max-w-[340px]">
                        <DynamicQuickReference
                            key={`quickref-${selectedEntity}-${updateKey}`}
                            entityKey={selectedEntity}
                            smartCrudProps={unifiedLayoutProps.dynamicLayoutOptions.componentOptions.quickReferenceCrudWrapperProps}
                        />
                    </div>
                )}
            </div>
        </ScrollArea>
    </div>
);

const RightColumn: React.FC<{
    selectedEntity: EntityKeys | null;
    unifiedLayoutProps: UnifiedLayoutProps;
    availableHeight: number;
    updateKey: number;
}> = ({selectedEntity, unifiedLayoutProps, availableHeight, updateKey}) => {
    const FormComponent = useMemo(() => 
        getEntityFormComponent(unifiedLayoutProps.formComponent), 
        [unifiedLayoutProps.formComponent]
    );
    return selectedEntity ? (
        <div
            className="flex-1 overflow-hidden"
            style={{height: availableHeight}}
        >
            <ScrollArea
                className="h-full"
            >
                <div>
                    <FormComponent
                        key={`form-${selectedEntity}-${updateKey}`}
                        {...unifiedLayoutProps}
                    />
                </div>
            </ScrollArea>
        </div>
    ) : null;
}

const MergedEntityLayout: React.FC<UnifiedLayoutProps> = (props) => {
    const { layoutState } = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const [availableHeight, setAvailableHeight] = useState(0);
    const [updateKey, setUpdateKey] = useState(0);
    const windowSize = useWindowSize();
    const selectedEntity = layoutState?.selectedEntity || null;

    useEffect(() => {
        const calculateHeight = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const topPosition = rect.top;
                const newHeight = viewportHeight - topPosition - 16;
                setAvailableHeight(newHeight);
            }
        };
        calculateHeight();
        window.addEventListener('resize', calculateHeight);
        return () => window.removeEventListener('resize', calculateHeight);
    }, [windowSize.height]);

    const handleEntityChange = (value: EntityKeys) => {
        layoutState.selectedEntity = value;
        setUpdateKey((prev) => prev + 1);
        if (props.handlers?.handleEntityChange) {
            props.handlers.handleEntityChange(value);
        }
    };

    const modifiedProps: UnifiedLayoutProps = {
        ...props,
        handlers: {
            ...props.handlers,
            handleEntityChange,
        },
        layoutState: {
            ...layoutState,
        },
    };

    return (
        <div ref={containerRef} className={cn('w-full')}>
            <div className="flex overflow-hidden" style={{ height: availableHeight }}>
                <LeftColumn
                    selectedEntity={selectedEntity}
                    onEntityChange={handleEntityChange}
                    updateKey={updateKey}
                    availableHeight={availableHeight}
                    unifiedLayoutProps={modifiedProps}
                />
                <RightColumn
                    selectedEntity={selectedEntity}
                    unifiedLayoutProps={modifiedProps}
                    availableHeight={availableHeight}
                    updateKey={updateKey}
                />
            </div>
        </div>
    );
};

export default MergedEntityLayout;