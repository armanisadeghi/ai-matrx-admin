// components/FileManager/FileManagerContent/index.tsx
import React from 'react';
import {FileList} from './FileList';
import {FilePreview} from './FilePreview';
import {FileMetadata} from './FileMetadata';
import {useFileSystem} from '@/providers/FileSystemProvider';
import {BucketStructure} from "@/utils/file-operations";

interface FileManagerContentProps {
    allowedFileTypes?: string[];
    maxFileSize?: number;  // in bytes
}

export const FileManagerContent: React.FC<FileManagerContentProps> = (
    {
        allowedFileTypes,
        maxFileSize
    }) => {
    const [selectedFile, setSelectedFile] = React.useState<BucketStructure | null>(null);
    const {currentBucket, currentPath, getBucketStructure} = useFileSystem();

    const structure = currentBucket ? getBucketStructure(currentBucket) : undefined;
    const currentItems = structure?.contents.filter(item => {
        const itemPath = item.path.split('/').slice(0, -1).join('/');
        return itemPath === currentPath.join('/');
    });

    // Filter items based on allowed file types and size
    const filteredItems = React.useMemo(() => {
        if (!currentItems) return [];

        return currentItems.filter(item => {
            // Always include folders
            if (item.type === 'FOLDER') return true;

            // Check file extension if allowedFileTypes is provided
            if (allowedFileTypes?.length) {
                const extension = item.path.split('.').pop()?.toLowerCase();
                if (!extension || !allowedFileTypes.includes(`.${extension}`)) {
                    return false;
                }
            }

            // Check file size if maxFileSize is provided
            if (maxFileSize && item.metadata?.size) {
                if (item.metadata.size > maxFileSize) {
                    return false;
                }
            }

            return true;
        });
    }, [currentItems, allowedFileTypes, maxFileSize]);

    const handleSelect = (item: BucketStructure) => {
        setSelectedFile(item);
    };

    return (
        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 p-4 overflow-auto">
                <FileList
                    items={filteredItems}
                    onSelect={handleSelect}
                    selectedFile={selectedFile}
                    allowedFileTypes={allowedFileTypes}
                    maxFileSize={maxFileSize}
                />
            </div>
            {selectedFile && selectedFile.type !== 'FOLDER' && (
                <div className="w-1/3 border-l p-4 flex flex-col">
                    <FilePreview file={selectedFile}/>
                    <FileMetadata file={selectedFile}/>
                </div>
            )}
        </div>
    );
};