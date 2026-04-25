'use client';

import EntityAnalyzerView from '@/components/admin/redux/EntityAnalysisSummary';
import React from 'react';


export default function TestPage() {
    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
            <div className="flex-1 overflow-auto">
                <EntityAnalyzerView entityKey="registeredFunction" />
            </div>
        </div>
    );
}
