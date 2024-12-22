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
import {ModuleType} from './types';
import {useContextMenu} from './hooks/useContextMenu';

interface GlobalContextMenuProps {
    children: React.ReactNode;
    module: ModuleType;
    show?: string[];
    hide?: string[];
    data?: any;
}

export const GlobalContextMenu: React.FC<GlobalContextMenuProps> = (
    {
        children,
        module,
        show,
        hide,
        data
    }) => {
    const {menuItems} = useContextMenu({module, show, hide, data});

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent>
                {menuItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                        {item.subItems ? (
                            <ContextMenuSub>
                                <ContextMenuSubTrigger className="flex items-center">
                                    {item.icon && <item.icon className="mr-2 h-4 w-4"/>}
                                    {item.label}
                                </ContextMenuSubTrigger>
                                <ContextMenuSubContent>
                                    {item.subItems.map(subItem => (
                                        <ContextMenuItem
                                            key={subItem.id}
                                            onClick={subItem.onClick}
                                            className="flex items-center"
                                        >
                                            {subItem.icon && <subItem.icon className="mr-2 h-4 w-4"/>}
                                            {subItem.label}
                                        </ContextMenuItem>
                                    ))}
                                </ContextMenuSubContent>
                            </ContextMenuSub>
                        ) : (
                            <ContextMenuItem
                                onClick={item.onClick}
                                disabled={item.disabled}
                                className="flex items-center"
                            >
                                {item.icon && <item.icon className="mr-2 h-4 w-4"/>}
                                {item.label}
                            </ContextMenuItem>
                        )}
                        {index < menuItems.length - 1 && <ContextMenuSeparator/>}
                    </React.Fragment>
                ))}
            </ContextMenuContent>
        </ContextMenu>
    );
};
