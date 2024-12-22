// components/GlobalContextMenu/index.tsx
import React from 'react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {cn} from '@/lib/utils';
import {ContextMenuItemProps, ContextMenuOptions} from './types';

interface GlobalContextMenuProps {
    children: React.ReactNode;
    options?: ContextMenuOptions;
}

const renderMenuItem = (item: ContextMenuItemProps) => {
    const Icon = item.icon;

    if (item.items) {
        return (
            <ContextMenuSub key={item.id}>
                <ContextMenuSubTrigger className="flex items-center">
                    {Icon && <Icon className="mr-2 h-4 w-4"/>}
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
            {Icon && <Icon className="mr-2 h-4 w-4"/>}
            {item.label}
            {item.shortcut && (
                <span className="ml-auto text-xs text-muted-foreground">
                    {item.shortcut}
                </span>
            )}
        </ContextMenuItem>
    );
};

export const GlobalContextMenu: React.FC<GlobalContextMenuProps> = (
    {
        children,
        options
    }) => {
    // Default menu items that are available everywhere
    const defaultItems: ContextMenuItemProps[] = [
        {
            id: 'theme',
            label: 'Theme',
            items: [
                {
                    id: 'light',
                    label: 'Light',
                    onClick: () => {/* handle theme change */
                    }
                },
                {
                    id: 'dark',
                    label: 'Dark',
                    onClick: () => {/* handle theme change */
                    }
                }
            ]
        }
        // Add more default items as needed
    ];

    const allItems = [...defaultItems, ...(options?.items || [])];

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent>
                {allItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                        {renderMenuItem(item)}
                        {index < allItems.length - 1 && <ContextMenuSeparator/>}
                    </React.Fragment>
                ))}
            </ContextMenuContent>
        </ContextMenu>
    );
};
