'use client';

import React from 'react';
import { ContentBlocksManager } from '@/components/admin/ContentBlocksManager';

export default function ContentBlocksAdminPage() {
    return (
        <div className="h-full w-full">
            <ContentBlocksManager className="h-full" />
        </div>
    );
}
