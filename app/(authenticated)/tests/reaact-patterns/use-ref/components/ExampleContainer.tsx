// ExampleContainer.tsx
'use client';

import React from 'react';
import ContentManager from './ContentManager';
import ActionPanel from './ActionPanel';
import { useRefManager } from '@/lib/refs';

export const ExampleContainer: React.FC = () => {
    const refManager = useRefManager();

    const handleShowContent = () => {
        refManager.call('content-manager', 'handleShowContent');
    };

    const handleReset = () => {
        refManager.call('content-manager', 'handleReset');
    };

    return (
        <div className="space-y-4">
            <ActionPanel
                componentId="action-panel"
                onCreateNew={handleShowContent}
                onReset={handleReset}
            />
            <ContentManager
                componentId="content-manager"
            />
        </div>
    );
};
