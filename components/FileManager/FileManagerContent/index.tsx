// components/FileManager/FileManagerContent/index.tsx
import React from 'react';
import {FileList} from './FileList';
import {FilePreview} from './FilePreview';
import {FileMetadata} from './FileMetadata';
import {useFileSystem} from '@/providers/FileSystemProvider';
import {BucketStructure} from "@/utils/file-operations";
import {shouldShowItem} from './utils';

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
        if (!shouldShowItem(item)) return false;

        const itemPath = item.path.split('/').slice(0, -1).join('/');
        return itemPath === currentPath.join('/');
    });

    const handleSelect = (item: BucketStructure) => {
        setSelectedFile(item);
    };

    return (
        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 p-4 overflow-auto">
                <FileList
                    items={currentItems || []}
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