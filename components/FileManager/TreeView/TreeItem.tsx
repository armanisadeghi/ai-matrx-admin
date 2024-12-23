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
import {
    FileCategory,
    FileTypeDetails,
    FolderTypeDetails,
    IconComponent,
    StorageMetadata
} from "@/utils/file-operations";

interface TreeItemProps {
    name: string;
    path: string;
    level: number;
    contentType: 'BUCKET' | 'FOLDER' | 'FILE';
    details: FileTypeDetails | FolderTypeDetails;
    isEmpty: boolean;
    bucketName: string;
    isExpanded?: boolean;
    onToggle?: () => void;
}


export const TreeItem: React.FC<TreeItemProps> = (
    {
        name,
        path,
        level,
        contentType,
        details,
        bucketName,
        isExpanded,
        isEmpty,
        onToggle,
        ...rest
    }) => {
    const {getMenuComponent} = useContextMenu();
    const {
        downloadFile,
        navigateToPath,
        setCurrentBucket,
        setCurrentPath
    } = useFileSystem();

    const renderIcon = () => {
        if (!details?.icon) return null;

        const IconComponent = details.icon;
        const iconColor = details?.color || 'text-foreground';

        return <IconComponent className={cn('h-4 w-4 mr-2', iconColor)}/>;
    };

    const shouldShowChevron = () => {
        if (contentType === 'FILE') return false;
        return !isEmpty;
    };

    const menuType = contentType === 'BUCKET' ? 'FOLDER' : contentType;
    const MenuComponent = getMenuComponent(menuType);

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();

        const pathParts = path.split('/');

        if (contentType === 'BUCKET') {
            setCurrentBucket(path);
            setCurrentPath([]);
            onToggle?.();
        } else if (contentType === 'FOLDER') {
            navigateToPath(pathParts);
            onToggle?.();
        } else if (contentType === 'FILE') {
            navigateToPath(pathParts.slice(0, -1)); // Navigate to containing folder
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
        contentType,
        ...rest
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
                    <div className="flex items-center min-w-[24px]">
                        {shouldShowChevron() && (
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
                    </div>
                    <div className="flex items-center">
                        {renderIcon()}
                        <span className="truncate">{name}</span>
                    </div>
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
