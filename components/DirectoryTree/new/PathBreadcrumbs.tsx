// components/StorageExplorer/StorageExplorer.tsx
'use client';

import React from 'react';
import { useStorage } from '@/contexts/StorageContext';
import { Button } from '@/components/ui/button';
import {
    ChevronRight
} from 'lucide-react';

function PathBreadcrumbs() {
    const { currentPath, navigateToFolder } = useStorage();

    return (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => navigateToFolder([])}
            >
                root
            </Button>
            {currentPath.map((folder, index) => (
                <React.Fragment key={folder}>
                    <ChevronRight className="h-4 w-4" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => navigateToFolder(currentPath.slice(0, index + 1))}
                    >
                        {folder}
                    </Button>
                </React.Fragment>
            ))}
        </div>
    );
}

export default PathBreadcrumbs;