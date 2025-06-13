"use client";

import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MenuCore } from "./MenuCore";
import { MenuItemDefinition } from "./types";

interface GenericDropdownMenuProps {
    children: React.ReactNode;
    menuId: string;
    menuProps?: any;
}

export const GenericDropdownMenu: React.FC<GenericDropdownMenuProps> = ({
    children,
    menuId,
    menuProps,
}) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {children}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
                <MenuCore
                    menuId={menuId}
                    menuProps={menuProps}
                    renderMenuItem={(item: MenuItemDefinition) => (
                        <DropdownMenuItem 
                            key={item.id}
                            onClick={item.onClick} 
                            disabled={item.disabled}
                            className={item.destructive ? "text-destructive focus:text-destructive" : ""}
                        >
                            {item.icon}
                            {item.label}
                        </DropdownMenuItem>
                    )}
                    renderSeparator={() => <DropdownMenuSeparator />}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}; 