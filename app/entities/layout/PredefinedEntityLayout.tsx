'use client';
import React, {useState, useEffect, useRef, useMemo} from 'react';
import {cn} from '@/lib/utils';
import {ScrollArea} from '@/components/ui';
import {UnifiedLayoutProps} from "@/components/matrx/Entity";
import {useWindowSize} from "@uidotdev/usehooks";
import DynamicQuickReference from '@/app/entities/quick-reference/dynamic-quick-ref/DynamicQuickReference';
import {EntityKeys} from '@/types/entityTypes';
import EntityRightColumnLayout from './EntityRightColumnLayout';

const LeftColumn: React.FC<{
    selectedEntity: EntityKeys | null;
    availableHeight: number;
    unifiedLayoutProps: UnifiedLayoutProps;
    updateKey: number;
}> = ({selectedEntity, availableHeight, unifiedLayoutProps, updateKey}) => (
    <div className="w-[340px] min-w-[340px] max-w-[340px] border-r border-border" style={{height: availableHeight}}>
        <ScrollArea className="h-full">
            <div className="w-full overflow-hidden">
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

const PredefinedEntityLayout: React.FC<UnifiedLayoutProps> = (props) => {
    const { layoutState } = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const [availableHeight, setAvailableHeight] = useState(0);
    const windowSize = useWindowSize();
    const selectedEntity = layoutState?.selectedEntity || null;
    const updateKey = 0;

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

    return (
        <div ref={containerRef} className={cn('w-full')}>
            <div className="flex overflow-hidden" style={{ height: availableHeight }}>
                <LeftColumn
                    selectedEntity={selectedEntity}
                    availableHeight={availableHeight}
                    unifiedLayoutProps={props}
                    updateKey={updateKey}
                />
                <EntityRightColumnLayout
                    selectedEntity={selectedEntity}
                    unifiedLayoutProps={props}
                    availableHeight={availableHeight}
                    updateKey={updateKey}
                />
            </div>
        </div>
    );
};

export default PredefinedEntityLayout; 