// components/GlobalContextMenu/menus/FileContextMenu.tsx
import React from 'react';
import {
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MenuData } from "@/providers/ContextMenuProvider";
import { useFileContextMenu } from '../hooks/useFileContextMenu';
import { cn } from '@/lib/utils';
import { ContextMenuItemProps } from '../types';

interface FileMenuProps {
    menuData: MenuData;
    onClose: () => void;
}

const renderMenuItem = (item: ContextMenuItemProps) => {
    const Icon = item.icon;

    if (item.items) {
        return (
            <ContextMenuSub key={item.id}>
                <ContextMenuSubTrigger className="flex items-center">
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    {item.label}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                    {item.items.map(subItem => renderMenuItem(subItem))}
                </ContextMenuSubContent>
            </ContextMenuSub>
        );
    }

    return (
        <ContextMenuItem
            key={item.id}
            onClick={item.onClick}
            disabled={item.disabled}
            className={cn(
                "flex items-center",
                item.danger && "text-red-600",
                item.disabled && "opacity-50"
            )}
        >
            {Icon && <Icon className="mr-2 h-4 w-4" />}
            {item.label}
            {item.shortcut && (
                <span className="ml-auto text-xs text-muted-foreground">
                    {item.shortcut}
                </span>
            )}
        </ContextMenuItem>
    );
};

export const FileContextMenu: React.FC<FileMenuProps> = ({ menuData, onClose }) => {
    const { path = '', bucketName = '' } = menuData as { path: string; bucketName: string };
    const {
        items,
        showDeleteAlert,
        setShowDeleteAlert,
        handleDelete
    } = useFileContextMenu({ path, bucketName, onClose });

    return (
        <>
            {items.map((item, index) => (
                <React.Fragment key={item.id}>
                    {renderMenuItem(item)}
                    {index < items.length - 1 && <ContextMenuSeparator />}
                </React.Fragment>
            ))}

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{path.split('/').pop()}"
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};