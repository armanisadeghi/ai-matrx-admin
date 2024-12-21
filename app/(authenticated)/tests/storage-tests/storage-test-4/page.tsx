// app/(authenticated)/storage-explorer/page.tsx
'use client';

import { StorageProvider } from '@/contexts/StorageContext';
import { StorageExplorer } from '@/components/DirectoryTree/new/StorageExplorer';

export default function StorageExplorerPage() {
    return (
        <StorageProvider>
            <StorageExplorer />
        </StorageProvider>
    );
}