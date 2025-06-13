"use client";

import React from "react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { MenuCore } from "./MenuCore";
import { MenuItemDefinition } from "./types";

interface GenericContextMenuProps {
    children: React.ReactNode;
    menuId: string;
    menuProps?: any;
}

export const GenericContextMenu: React.FC<GenericContextMenuProps> = ({
    children,
    menuId,
    menuProps,
}) => {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                <MenuCore
                    menuId={menuId}
                    menuProps={menuProps}
                    renderMenuItem={(item: MenuItemDefinition) => (
                        <ContextMenuItem 
                            key={item.id}
                            onClick={item.onClick} 
                            disabled={item.disabled}
                            className={item.destructive ? "text-destructive focus:text-destructive" : ""}
                        >
                            {item.icon}
                            {item.label}
                        </ContextMenuItem>
                    )}
                    renderSeparator={() => <ContextMenuSeparator />}
                />
            </ContextMenuContent>
        </ContextMenu>
    );
}; 