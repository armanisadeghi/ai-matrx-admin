'use client';

import React from 'react';
import { ConsolidatedSystemPromptsManager } from '@/components/admin/ConsolidatedSystemPromptsManager';

export default function SystemPromptsAdminPage() {
    return (
        <div className="h-full w-full overflow-hidden">
            <ConsolidatedSystemPromptsManager />
        </div>
    );
}

