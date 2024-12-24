// components/MenuComponent.tsx
'use client';

import React from 'react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { MenuItem } from '../types';
import { useMenu } from '../context';
import { useMenuSystem } from '../hooks';

interface MenuComponentProps {
    menuId: string;
    children: React.ReactNode;
    className?: string;
}

function renderMenuItem(item: MenuItem, onAction: (item: MenuItem) => void) {
    if (item.hidden) return null;

    if (item.children?.length) {
        return (
            <ContextMenuSub key={item.id}>
                <ContextMenuSubTrigger disabled={item.disabled}>
                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                    {item.label}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                    {item.children.map((child, index) => (
                        <React.Fragment key={child.id}>
                            {renderMenuItem(child, onAction)}
                            {index < item.children.length - 1 && <ContextMenuSeparator />}
                        </React.Fragment>
                    ))}
                </ContextMenuSubContent>
            </ContextMenuSub>
        );
    }

    return (
        <ContextMenuItem
            key={item.id}
            disabled={item.disabled}
            onClick={() => onAction(item)}
        >
            {item.icon && <item.icon className="mr-2 h-4 w-4" />}
            {item.label}
        </ContextMenuItem>
    );
}

export function MenuComponent({ menuId, children, className }: MenuComponentProps) {
    const { getMenu } = useMenu();
    const { handleMenuItem } = useMenuSystem();
    const menu = getMenu(menuId);

    if (!menu) {
        console.warn(`Menu with id "${menuId}" not found`);
        return null;
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger className={className}>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent>
                {menu.items.map((item, index) => (
                    <React.Fragment key={item.id}>
                        {renderMenuItem(item, handleMenuItem)}
                        {index < menu.items.length - 1 && <ContextMenuSeparator />}
                    </React.Fragment>
                ))}
            </ContextMenuContent>
        </ContextMenu>
    );
}