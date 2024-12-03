'use client';

import React from 'react';
import { CardContent } from '@/components/ui';
import { EnhancedCard, LayoutHeader } from '../../parts';
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
