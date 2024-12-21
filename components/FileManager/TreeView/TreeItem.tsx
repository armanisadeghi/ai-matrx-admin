import React from 'react';
import {ChevronRight, ChevronDown} from 'lucide-react';
import {cn} from '@/lib/utils';
import {useFileSystem} from '@/providers/FileSystemProvider';

interface TreeItemProps {
    label: string;
    path: string;
    level: number;
    type: 'bucket' | 'folder' | 'file';
    isExpanded?: boolean;
    onToggle?: () => void;
    icon?: React.ComponentType<{ className?: string }>;
}

export const TreeItem: React.FC<TreeItemProps> = (
    {
        label,
        path,
        level,
        type,
        isExpanded,
        onToggle,
        icon
    }) => {
    const {getFileIcon, getFileColor} = useFileSystem();
    const IconComponent = icon || (type === 'file' ? getFileIcon(label) : null);
    const color = type === 'file' ? getFileColor(label) : '';

    return (
        <div
            className={cn(
                'flex items-center py-1 px-2 hover:bg-accent rounded-sm cursor-pointer',
                'text-sm'
            )}
            style={{paddingLeft: `${level * 16}px`}}
        >
            {type !== 'file' && (
                <button
                    onClick={onToggle}
                    className="p-1 hover:bg-accent rounded-sm"
                >
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4"/>
                    ) : (
                        <ChevronRight className="h-4 w-4"/>
                    )}
                </button>
            )}
            {IconComponent && <IconComponent className={cn('h-4 w-4 mr-2', color)}/>}
            <span className="truncate">{label}</span>
        </div>
    );
};