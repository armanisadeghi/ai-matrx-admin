'use client';

import React from 'react';
import { CardContent } from "@/components/ui/card";
import { EnhancedCard } from "../../parts/EnhancedCard";
import { LayoutHeader } from "../../parts/LayoutHeader";
import { UnifiedLayoutProps } from '../../types';
import SmartEntitySelection from './SmartEntitySelection';

export const EntitySelectionSection: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    console.log('EntitySelectionSection unifiedLayoutProps', unifiedLayoutProps);
    console.log('EntitySelectionSection dynamicStyleOptions', unifiedLayoutProps.dynamicStyleOptions);
    console.log('EntitySelectionSection density', unifiedLayoutProps.dynamicStyleOptions.density);

    return (
        <EnhancedCard>
            <LayoutHeader
                title="Entity Selection"
                tooltip="Select an entity to begin working"
                density={unifiedLayoutProps.dynamicStyleOptions.density}
            />
            <CardContent>
                <SmartEntitySelection {...unifiedLayoutProps} />
            </CardContent>
        </EnhancedCard>
    );
};
