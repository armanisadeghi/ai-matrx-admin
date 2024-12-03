// EntityDataSection.tsx
import React from 'react';
import {
    CardContent,
    ScrollArea
} from '@/components/ui';
import {EnhancedCard, LayoutHeader} from '../../parts';
import {useAppSelector} from "@/lib/redux/hooks";
import {selectEntityPrettyName} from "@/lib/redux/schema/globalCacheSelectors";
import EntitySmartContent from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/SmartEntityContent";
import {UnifiedLayoutProps} from "@/components/matrx/Entity";

export const EntityDataSection: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const selectedEntity = unifiedLayoutProps.layoutState.selectedEntity;
    const formStyleOptions = unifiedLayoutProps.dynamicLayoutOptions.formStyleOptions;
    const density = unifiedLayoutProps.dynamicStyleOptions.density || 'normal';
    const entityPrettyName = useAppSelector(state =>
        selectEntityPrettyName(state, selectedEntity)
    );

    return (
        <EnhancedCard className="h-full">
            <LayoutHeader
                title={`${entityPrettyName} Data`}
                tooltip="View and edit entity records"
                density={density}
            />
            <CardContent className="p-0">
                <ScrollArea>
                    <EntitySmartContent
                        entityKey={selectedEntity}
                        density={density}
                        formOptions={formStyleOptions}
                    />
                </ScrollArea>
            </CardContent>
        </EnhancedCard>
    );
};
