'use client';

import React, {useState, useEffect, useRef} from 'react';
import {cn} from '@/lib/utils';
import {ScrollArea} from '@/components/ui';
import {EntitySelection, UnifiedLayoutProps} from "@/components/matrx/Entity";
import {useAppSelector} from "@/lib/redux/hooks";
import {RootState} from "@/lib/redux/store";
import {selectEntityPrettyName} from "@/lib/redux/schema/globalCacheSelectors";
import {EntityKeys} from '@/types/entityTypes';
import {useWindowSize} from "@uidotdev/usehooks";
import ArmaniFormFinal from './ArmaniFormFinal';
import QuickReferenceFinal from './QuickReferenceFinal';

const LeftColumn: React.FC<{
    selectedEntity: EntityKeys | null;
    onEntityChange: (value: EntityKeys) => void;
    updateKey: number;
    availableHeight: number;
    unifiedLayoutProps: UnifiedLayoutProps;
}> = ({selectedEntity, onEntityChange, updateKey, availableHeight, unifiedLayoutProps}) => (
    <div className="w-[250px] border-r border-border" style={{height: availableHeight}}>
        <ScrollArea className="h-full">
            <div className="flex flex-col">
                <EntitySelection
                    selectedEntity={selectedEntity}
                    onEntityChange={onEntityChange}
                    layout="sideBySide"
                />
                {selectedEntity && (
                    <div className="flex-1">
                        <QuickReferenceFinal
                            key={`${selectedEntity}-${updateKey}`}
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
}> = ({selectedEntity, unifiedLayoutProps, availableHeight}) => (
    selectedEntity ? (
        <div
            className="flex-1"
            style={{height: availableHeight,}}
        >
            <ScrollArea
                className="h-full"
            >
                <div>
                    <ArmaniFormFinal {...unifiedLayoutProps} />
                </div>
            </ScrollArea>
        </div>
    ) : null
);

const MergedEntityLayout: React.FC<UnifiedLayoutProps> = (props) => {
    const { layoutState } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const [availableHeight, setAvailableHeight] = useState(0);
    const [updateKey, setUpdateKey] = useState(0);
    const windowSize = useWindowSize();

    const selectedEntity = layoutState?.selectedEntity || null;
    const entityPrettyName = useAppSelector((state: RootState) =>
        selectEntityPrettyName(state, selectedEntity)
    );

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

    useEffect(() => {
        setUpdateKey((prev) => prev + 1);
    }, [layoutState.selectedEntity]);

    const handleEntityChange = (value: EntityKeys) => {
        layoutState.selectedEntity = value;
        setUpdateKey((prev) => prev + 1);
    };

    const modifiedProps: UnifiedLayoutProps = {
        ...props,
        handlers: {
            ...props.handlers, // Preserve existing handlers
            handleEntityChange,
            onCreateEntityClick: () => {
                layoutState.selectedEntity = null;
                setUpdateKey((prev) => prev + 1);
            },
        },
        layoutState: {
            ...layoutState, // Ensure the full layoutState is propagated
        },
    };

    return (
        <div ref={containerRef} className={cn('w-full')}>
            <div className="flex" style={{ height: availableHeight }}>
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
                />
            </div>
        </div>
    );
};

export default MergedEntityLayout;
