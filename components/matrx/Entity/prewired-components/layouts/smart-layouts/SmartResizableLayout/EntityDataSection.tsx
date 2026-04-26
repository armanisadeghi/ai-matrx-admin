// EntityDataSection.tsx
import React from 'react';
import { CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EnhancedCard } from "../../parts/EnhancedCard";
import { LayoutHeader } from "../../parts/LayoutHeader";
import {useAppSelector} from "@/lib/redux/hooks";
import {selectEntityPrettyName} from "@/lib/redux/schema/globalCacheSelectors";
import EntitySmartContent from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/NotSmartEntityContent";
import {UnifiedLayoutProps} from "@/components/matrx/Entity/prewired-components/layouts/types";

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
