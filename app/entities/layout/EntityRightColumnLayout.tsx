'use client';
import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui';
import { UnifiedLayoutProps } from "@/components/matrx/Entity";
import { EntityKeys } from '@/types/entityTypes';
import { getEntityFormComponent } from '../forms';

const EntityRightColumnLayout: React.FC<{
    selectedEntity: EntityKeys | null;
    unifiedLayoutProps: UnifiedLayoutProps;
    availableHeight: number;
    updateKey: number;
}> = ({ selectedEntity, unifiedLayoutProps, availableHeight, updateKey }) => {
    const FormComponent = useMemo(() => 
        getEntityFormComponent(unifiedLayoutProps.formComponent), 
        [unifiedLayoutProps.formComponent]
    );
    
    return selectedEntity ? (
        <div
            className="flex-1 overflow-hidden"
            style={{ height: availableHeight }}
        >
            <ScrollArea className="h-full">
                <div>
                    <FormComponent
                        key={`form-${selectedEntity}-${updateKey}`}
                        {...unifiedLayoutProps}
                    />
                </div>
            </ScrollArea>
        </div>
    ) : null;
};

export default EntityRightColumnLayout; 