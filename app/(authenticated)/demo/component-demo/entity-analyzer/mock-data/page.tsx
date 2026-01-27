'use client';

import React from 'react';
import { EntityKeys } from '@/types/entityTypes';
import EntityAnalyzerView from '@/components/admin/redux/EntityAnalysisSummary';

export default function TestPage() {
    return (
        <main className="flex min-h-0 flex-col">
            <EntityAnalyzerView entityKey="registeredFunction" />
        </main>
    );
}
