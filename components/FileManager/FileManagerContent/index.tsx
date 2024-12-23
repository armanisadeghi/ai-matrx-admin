import React from 'react';
import { FileList } from './FileList';
import { FilePreview } from './FilePreview';
import { FileMetadata } from './FileMetadata';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { NodeStructure } from "@/utils/file-operations/types";

export const FileManagerContent: React.FC = () => {
    const [selectedFile, setSelectedFile] = React.useState<NodeStructure | null>(null);
    const { currentBucket, currentPath, getBucketStructure } = useFileSystem();

    const structure = currentBucket ? getBucketStructure(currentBucket) : undefined;
    const currentItems = structure?.contents.filter(item => {
        const itemPath = item.path.split('/').slice(0, -1).join('/'); // Parent directory of the item
        return itemPath === currentPath.join('/'); // Match the current path
    });

    const handleSelect = (item: NodeStructure) => {
        setSelectedFile(item);
    };

    return (
        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 p-4 overflow-auto">
                <FileList
                    items={currentItems || []}
                    onSelect={handleSelect}
                    selectedFile={selectedFile}
                />
            </div>
            {selectedFile && selectedFile.type !== 'folder' && (
                <div className="w-1/3 border-l p-4 flex flex-col">
                    <FilePreview file={selectedFile} />
                    <FileMetadata file={selectedFile} />
                </div>
            )}
        </div>
    );
};
