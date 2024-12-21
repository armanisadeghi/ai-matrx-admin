// components/FileManager/FileManagerHeader.tsx
import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFileSystem } from '@/providers/FileSystemProvider';

export const FileManagerHeader: React.FC = () => {
    const { currentBucket, currentPath, navigateToPath } = useFileSystem();

    const breadcrumbs = [
        { label: 'Home', path: [] },
        ...(currentBucket ? [{ label: currentBucket, path: [currentBucket] }] : []),
        ...currentPath.map((segment, index) => ({
            label: segment,
            path: currentPath.slice(0, index + 1)
        }))
    ];

    return (
        <div className="border-b p-4 flex items-center space-x-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateToPath([])}
                className="hover:bg-accent"
            >
                <Home className="h-4 w-4" />
            </Button>
            {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateToPath(crumb.path)}
                        className="hover:bg-accent"
                    >
                        {crumb.label}
                    </Button>
                </React.Fragment>
            ))}
        </div>
    );
};