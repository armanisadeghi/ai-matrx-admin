import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui';
import { UnifiedLayoutProps } from "@/components/matrx/Entity";
import { EntityKeys } from '@/types/entityTypes';
import { getEntityFormComponent } from '@/app/entities/forms';

interface UnifiedEntityFormProps {
    selectedEntity: EntityKeys | null;
    unifiedLayoutProps: UnifiedLayoutProps;
    availableHeight?: number;
    updateKey?: number;
    useScrollArea?: boolean;
    className?: string;
}

const UnifiedEntityForm: React.FC<UnifiedEntityFormProps> = ({ 
    selectedEntity, 
    unifiedLayoutProps, 
    availableHeight,
    updateKey = 0,
    useScrollArea = true,
    className = ""
}) => {
    const FormComponent = useMemo(() => 
        getEntityFormComponent(unifiedLayoutProps.formComponent), 
        [unifiedLayoutProps.formComponent]
    );
    
    if (!selectedEntity) return null;

    const formContent = (
        <FormComponent
            key={`form-${selectedEntity}-${updateKey}`}
            {...unifiedLayoutProps}
        />
    );

    if (!useScrollArea) {
        return (
            <div className={className}>
                {formContent}
            </div>
        );
    }
    
    return (
        <div
            className={`flex-1 overflow-hidden ${className}`}
            style={availableHeight ? { height: availableHeight } : undefined}
        >
            <ScrollArea className="h-full">
                <div>
                    {formContent}
                </div>
            </ScrollArea>
        </div>
    );
};

export default UnifiedEntityForm; 