// components/FileManager/FileExplorerGrid/index.tsx
import React from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileCard } from './FileCard';
import { NodeStructure } from '@/utils/file-operations';
import { FilePreview } from '../FilePreview';

export const FileExplorerGrid: React.FC = () => {
    const {
        activeNode,
        structures,
        currentBucket,
        navigateToNode
    } = useFileSystem();

    const [selectedFile, setSelectedFile] = React.useState<NodeStructure | null>(null);

    const currentItems = React.useMemo(() => {
        if (!currentBucket || !structures.has(currentBucket)) return [];

        // If active node is a folder, show its children
        if (activeNode?.contentType === 'FOLDER') {
            return activeNode.children || [];
        }

        // If we're at root level, show bucket contents
        const structure = structures.get(currentBucket);
        return structure?.contents || [];
    }, [activeNode, currentBucket, structures]);

    const handleFileSelect = (item: NodeStructure) => {
        setSelectedFile(item);

        if (item.contentType === 'FOLDER') {
            navigateToNode(item);
        }
    };

    const handleDoubleClick = (item: NodeStructure) => {
        if (item.contentType === 'FOLDER') {
            navigateToNode(item);
        }
        // For files, we'll handle preview/open logic
    };

    return (
        <div className="flex h-full">
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 p-2">
                        {currentItems.map((item) => (
                            <FileCard
                                key={item.path}
                                file={item}
                                isSelected={selectedFile?.path === item.path}
                                onClick={() => handleFileSelect(item)}
                                onDoubleClick={() => handleDoubleClick(item)}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </div>
            {selectedFile && selectedFile.contentType === 'FILE' && (
                <div className="w-1/3 border-l">
                    <FilePreview file={selectedFile} />
                </div>
            )}
        </div>
    );
};
