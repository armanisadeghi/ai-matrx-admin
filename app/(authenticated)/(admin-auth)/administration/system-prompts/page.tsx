'use client';

import React from 'react';
import { SystemPromptsManager } from '@/components/admin/SystemPromptsManager';

export default function SystemPromptsAdminPage() {
    return (
        <div className="h-full w-full overflow-auto">
            <SystemPromptsManager />
        </div>
    );
}
