// components/FileManager/ContextMenus/FileSystemContextMenu.tsx
import React from 'react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {useContextMenu} from '@/providers/ContextMenuProvider';

interface FileSystemContextMenuProps {
    type: 'bucket' | 'folder' | 'file';
    menuData: {
        path: string;
        bucketName: string;
        type: string;
    };
    children: React.ReactNode;
}

export const FileSystemContextMenu: React.FC<FileSystemContextMenuProps> = (
    {
        type,
        menuData,
        children
    }) => {
    const {getMenuComponent} = useContextMenu();
    const menuType = type === 'bucket' ? 'folder' : type;
    const MenuComponent = getMenuComponent(menuType);

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                {children}
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