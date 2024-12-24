// app/test/file-manager/page.tsx
'use client';

import React from 'react';
import {FileManager} from '@/components/FileManager';

export default function FileManagerPage() {
    return (
        <div className="min-h-screen bg-background">
            <FileManager
                defaultBucket="any-file"
                showDebugger={true}
            />
        </div>
    );
}