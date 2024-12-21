// app/test/file-manager/page.tsx
'use client';

import React from 'react';
import { FileManager } from '@/components/FileManager';
import { FileSystemProvider } from '@/providers/FileSystemProvider';

export default function FileManagerPage() {
    return (
        <FileSystemProvider>
            <div className="min-h-screen bg-background">
                <FileManager
                    defaultBucket="any-file"
                    showDebugger={true}
                    allowedFileTypes={['jpg', 'png', 'pdf', 'mp4']}
                    maxFileSize={1024 * 1024 * 50} // 50MB
                />
            </div>
        </FileSystemProvider>
    );
}