// components/FileManager/FileManagerContent/index.tsx
import React from 'react';
import {FileList} from './FileList';
import {FilePreview} from './FilePreview';
import {FileMetadata} from './FileMetadata';
import {useFileSystem} from '@/providers/FileSystemProvider';
import {NodeStructure} from "@/utils/file-operations/types";

export const FileManagerContent: React.FC = () => {
    const [selectedFile, setSelectedFile] = React.useState<NodeStructure | null>(null);
    const {currentBucket, structures, activeNode,} = useFileSystem();

    const getCurrentContents = (): NodeStructure[] => {
        if (!currentBucket || !structures.has(currentBucket)) return [];

        if (activeNode?.children) {
            return activeNode.children;
        }

        const structure = structures.get(currentBucket);
        return structure?.contents || [];
    };

    const handleSelect = (item: NodeStructure) => {
        setSelectedFile(item);
    };

    const contents = getCurrentContents();

    return (
        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 p-4 overflow-auto">
                <FileList
                    items={contents}
                    onSelect={handleSelect}
                    selectedFile={selectedFile}
                />
            </div>
            {selectedFile && selectedFile.contentType === 'FILE' && (
                <div className="w-1/3 border-l p-4 flex flex-col">
                    <FilePreview file={selectedFile}/>
                    <FileMetadata file={selectedFile}/>
                </div>
            )}
        </div>
    );
};