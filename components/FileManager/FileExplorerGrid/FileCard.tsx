// components/FileManager/FileExplorerGrid/FileCard.tsx
import React from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { cn } from '@/lib/utils';
import { BucketStructure } from '@/utils/file-operations';
import { FolderIcon } from 'lucide-react';

interface FileCardProps {
    file: BucketStructure;
    isSelected: boolean;
    onClick: () => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, isSelected, onClick }) => {
    const { getFileIcon, getFileColor } = useFileSystem();
    const FileIcon = file.type === 'FOLDER' ? FolderIcon : getFileIcon(file.path);

    return (
        <div
            className={cn(
                'p-2 rounded border cursor-pointer hover:bg-accent/50 transition-colors',
                'flex flex-col items-center text-center',
                isSelected && 'bg-accent border-primary'
            )}
            onClick={onClick}
        >
            <FileIcon className={cn('h-6 w-6 mb-1', file.type === 'FOLDER' ? 'text-yellow-500' : getFileColor(file.path))} />
            <span className="text-xs truncate w-full">
                {file.path.split('/').pop()}
            </span>
        </div>
    );
};