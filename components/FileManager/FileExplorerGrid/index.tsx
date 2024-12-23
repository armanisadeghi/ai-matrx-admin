// components/FileManager/FileExplorerGrid/index.tsx
import React from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileCard } from './FileCard';
import { BucketStructure } from '@/utils/file-operations';

interface FileExplorerGridProps {
    onFileSelect: (file: BucketStructure) => void;
    selectedFile?: BucketStructure | null;
}

export const FileExplorerGrid: React.FC<FileExplorerGridProps> = ({
                                                                      onFileSelect,
                                                                      selectedFile
                                                                  }) => {
    const { currentBucket, currentPath, getBucketStructure } = useFileSystem();

    const structure = currentBucket ? getBucketStructure(currentBucket) : undefined;
    const currentItems = structure?.contents.filter(item => {
        const itemPath = item.path.split('/').slice(0, -1).join('/');
        return itemPath === currentPath.join('/');
    });

    return (
        <div className="border-b">
            <ScrollArea className="h-[240px]"> {/* Shows 3 rows of cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 p-2">
                    {currentItems?.map((item) => (
                        <FileCard
                            key={item.path}
                            file={item}
                            isSelected={selectedFile?.path === item.path}
                            onClick={() => onFileSelect(item)}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};