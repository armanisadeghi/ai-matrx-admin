import React from 'react';
import {useContextMenu} from '@/providers/ContextMenuProvider';
import {ChevronRight, ChevronDown} from 'lucide-react';
import {cn} from '@/lib/utils';
import {useFileSystem} from '@/providers/FileSystemProvider';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface TreeItemProps {
    label: string;
    path: string;
    level: number;
    type: 'bucket' | 'folder' | 'file';
    isExpanded?: boolean;
    onToggle?: () => void;
    icon?: React.ComponentType<{ className?: string }>;
    bucketName: string;
}

export const TreeItem: React.FC<TreeItemProps> = (
    {
        label,
        path,
        level,
        type,
        isExpanded,
        onToggle,
        icon,
        bucketName
    }) => {
    const {getMenuComponent} = useContextMenu();
    const {
        getFileIcon,
        getFileColor,
        downloadFile,
        navigateToPath,
        setCurrentBucket
    } = useFileSystem();

    const IconComponent = icon || (type === 'file' ? getFileIcon(label) : null);
    const color = type === 'file' ? getFileColor(label) : '';
    const menuType = type === 'bucket' ? 'folder' : type;
    const MenuComponent = getMenuComponent(menuType);

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (type === 'bucket') {
            setCurrentBucket(path);
            onToggle?.();
        } else if (type === 'folder') {
            navigateToPath(path.split('/'));
            onToggle?.();
        } else if (type === 'file') {
            await downloadFile(bucketName, path);
        }
    };

    const handleChevronClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle?.();
    };

    const menuData = {
        path,
        bucketName,
        type
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div
                    className={cn(
                        'flex items-center py-1 px-2 hover:bg-accent rounded-sm cursor-pointer',
                        'text-sm'
                    )}
                    style={{paddingLeft: `${level * 16}px`}}
                    onClick={handleClick}
                >
                    {type !== 'file' && (
                        <button
                            onClick={handleChevronClick}
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
            </ContextMenuTrigger>
            {MenuComponent && (
                <ContextMenuContent>
                    <MenuComponent
                        menuData={menuData}
                        onClose={() => {
                        }}
                    />
                </ContextMenuContent>
            )}
        </ContextMenu>
    );
};