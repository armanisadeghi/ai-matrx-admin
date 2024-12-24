// components/FileManager/FileExplorerGrid/FileCard.tsx
import React, {useMemo} from 'react';
import {getFileDetails, getFolderDetails, NodeStructure} from '@/utils/file-operations';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { cn } from '@/lib/utils';

interface FileCardProps {
    file: NodeStructure;
    isSelected: boolean;
    onClick: () => void;
    onDoubleClick: () => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, isSelected, onClick }) => {

    const details = file.type === 'FOLDER' ?
        getFolderDetails(file.name) :
        getFileDetails(file.extension);
    const IconComponent = details.icon;
    const color = details.color;

    return (
        <div
            className={cn(
                'p-2 rounded border cursor-pointer hover:bg-accent/50 transition-colors',
                'flex flex-col items-center text-center',
                isSelected && 'bg-accent border-primary'
            )}
            onClick={onClick}
        >
            <IconComponent className={cn('h-6 w-6 mb-1', color)} />
            <span className="text-xs truncate w-full">
                {file.path.split('/').pop()}
            </span>
        </div>
    );
};